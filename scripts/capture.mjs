// Mirrors agent transcripts into append-only Markdown logs under .agent-logs/.
//
// Sources: Codex desktop (~/.codex/sessions) and Claude Code (~/.claude/projects).
// Only user prompts and the assistant's final response for each prompt are
// written. Reasoning, tool calls, commentary and harness-injected context are
// excluded. Entries are never rewritten once appended.
//
// Usage: node scripts/capture.mjs          watch and sync every two seconds
//        node scripts/capture.mjs --once   sync once and exit

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, '.agent-logs');
const CODEX_SESSIONS = path.join(os.homedir(), '.codex', 'sessions');
const CLAUDE_SESSIONS = path.join(
  os.homedir(),
  '.claude',
  'projects',
  ROOT.replace(/[^a-zA-Z0-9]/g, '-'),
);

// The Codex session that created this repository started in another folder, so
// it is matched by id and only from the project brief onwards.
const ORIGIN_SESSION = '01a0fdf5-203d-7c02-8746-da5e68dc3e22';
const ORIGIN_MARKER = '# Clone Higgsfield AI';
const POLL_MS = 2000;

// Harness-injected messages that are recorded with the user role but were not
// typed by the user.
const INJECTED_PREFIXES = [
  '<environment_context>',
  '<external_codex_apps_open_page>',
  '<local-command-caveat>',
  '<local-command-stdout>',
  '<command-name>',
  '<system-reminder>',
  '<task-notification>',
];
const AMBIENT_BLOCK = /<in-app-browser-context[\s\S]*?<\/in-app-browser-context>\s*/g;

// Project-origin branding is redacted at the user's explicit request.
const redactBranding = (body) =>
  body.replace(/\b8x\b/gi, '[project]').replace(/\bassignment\b/gi, 'project');

const isSameFolder = (dir) => !!dir && path.resolve(dir).toLowerCase() === ROOT.toLowerCase();

const readJsonLines = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });

function listJsonl(dir, recursive) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return recursive ? listJsonl(full, true) : [];
    return entry.name.endsWith('.jsonl') ? [full] : [];
  });
}

const joinText = (content) =>
  typeof content === 'string'
    ? content
    : (content || [])
        .filter((part) => part.type === undefined || part.type.endsWith('text'))
        .map((part) => part.text || '')
        .join('\n');

const cleanPrompt = (raw) => redactBranding(raw.replace(AMBIENT_BLOCK, '')).trim();
const isInjected = (raw) => INJECTED_PREFIXES.some((prefix) => raw.trimStart().startsWith(prefix));

/** @returns {{id: string, tool: string, records: object[]} | null} */
function readCodexSession(file) {
  const entries = readJsonLines(file);
  const meta = entries[0]?.type === 'session_meta' ? entries[0].payload : null;
  if (!meta) return null;
  const isOrigin = meta.id === ORIGIN_SESSION;
  if (!isOrigin && !isSameFolder(meta.cwd)) return null;

  let active = !isOrigin;
  let model = 'unknown';
  let number = 0;
  const records = [];
  for (const entry of entries) {
    if (entry.type === 'turn_context') model = entry.payload.model || model;
    const payload = entry.payload;
    if (entry.type !== 'response_item' || payload.type !== 'message') continue;
    const raw = joinText(payload.content);
    if (payload.role === 'user') {
      if (raw.includes(ORIGIN_MARKER)) active = true;
      if (!active || isInjected(raw)) continue;
      number += 1;
      records.push({
        kind: 'PROMPT',
        number,
        time: entry.timestamp,
        model,
        body: cleanPrompt(raw),
      });
    } else if (payload.role === 'assistant' && payload.phase === 'final_answer' && number) {
      records.push({
        kind: 'RESPONSE',
        number,
        time: entry.timestamp,
        model,
        body: redactBranding(raw).trim(),
      });
    }
  }
  return { id: meta.id, tool: 'codex-desktop', records };
}

/** @returns {{id: string, tool: string, records: object[]} | null} */
function readClaudeSession(file) {
  const entries = readJsonLines(file).filter(
    (entry) => !entry.isSidechain && (entry.type === 'user' || entry.type === 'assistant'),
  );
  const first = entries.find((entry) => entry.sessionId);
  if (!first || !isSameFolder(first.cwd)) return null;

  const records = [];
  let number = 0;
  // The last text block of a turn is the final response, so it is held back
  // until the turn has ended or the next prompt has started.
  let pending = null;
  const flush = (turnEnded) => {
    if (pending && turnEnded) records.push(pending);
    pending = null;
  };
  for (const entry of entries) {
    const { content } = entry.message || {};
    if (entry.type === 'user') {
      const isToolResult = Array.isArray(content) && content.some((p) => p.type === 'tool_result');
      const raw = joinText(content);
      if (entry.isMeta || isToolResult || !raw.trim() || isInjected(raw)) continue;
      flush(true);
      number += 1;
      records.push({
        kind: 'PROMPT',
        number,
        time: entry.timestamp,
        model: 'unknown',
        body: cleanPrompt(raw),
      });
    } else if (number) {
      const body = joinText((content || []).filter((part) => part.type === 'text')).trim();
      const model = entry.message.model || 'unknown';
      const prompt = records.findLast((record) => record.kind === 'PROMPT');
      if (prompt.model === 'unknown') prompt.model = model;
      if (!body) continue;
      pending = {
        kind: 'RESPONSE',
        number,
        time: entry.timestamp,
        model,
        body: redactBranding(body),
        ended: entry.message.stop_reason === 'end_turn',
      };
    }
  }
  flush(pending?.ended);
  return { id: first.sessionId, tool: 'claude-code', records };
}

/**
 * A sub-agent that a Claude Code session delegated work to. Its prompt is the
 * brief written by the parent agent, and its response is the report it handed
 * back. Its own tool calls and reasoning are excluded, as for any session.
 * Sub-agent transcripts sit inside this project's session folder, which is
 * what ties them to the project (they may run in a sub-directory).
 */
function readClaudeSubagent(file) {
  const entries = readJsonLines(file);
  const brief = entries.find((entry) => entry.type === 'user' && entry.agentId);
  if (!brief) return null;
  const metaFile = file.replace(/\.jsonl$/, '.meta.json');
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  const handback = entries
    .filter((entry) => entry.type === 'assistant')
    .flatMap((entry) =>
      (entry.message.content || [])
        .filter((part) => part.type === 'tool_use' && part.name === 'SubagentHandback')
        .map((part) => ({ entry, text: String(part.input?.message ?? '') })),
    )
    .at(-1);
  const model = entries.find((entry) => entry.type === 'assistant')?.message.model ?? 'unknown';
  const records = [
    {
      kind: 'PROMPT',
      number: 1,
      time: brief.timestamp,
      model,
      body: redactBranding(joinText(brief.message.content)).trim(),
    },
  ];
  if (handback)
    records.push({
      kind: 'RESPONSE',
      number: 1,
      time: handback.entry.timestamp,
      model,
      body: redactBranding(handback.text).trim(),
    });
  return {
    id: brief.agentId,
    file: `${brief.sessionId}_agent-${brief.agentId}`,
    tool: 'claude-code-subagent',
    extra: [
      `parent_session: ${brief.sessionId}`,
      `agent_type: ${meta.agentType ?? 'unknown'}`,
      `task: ${meta.description ?? 'unknown'}`,
    ],
    records,
  };
}

function appendSession({ id, file, tool, extra = [], records }) {
  if (!records.length) return;
  const stamp = records[0].time.replaceAll(':', '-').slice(0, 19).replace('T', '_');
  const target = path.join(OUTPUT, `${stamp}_${file ?? id}.md`);
  if (!fs.existsSync(target)) {
    fs.writeFileSync(
      target,
      [
        '---',
        `session_id: ${id}`,
        `date: ${records[0].time.slice(0, 10)}`,
        'author: Bhanu',
        `model: ${records[0].model}`,
        `tool: ${tool}`,
        ...extra,
        'project: xfield-clone',
        '---',
        '',
        tool === 'claude-code-subagent' ? '# Sub-agent Log' : '# Session Log',
        '',
      ].join('\n'),
    );
  }
  const prior = fs.readFileSync(target, 'utf8');
  for (const record of records) {
    const tag = `[LOG_ENTRY type=${record.kind} num=${record.number} session=${id}]`;
    if (prior.includes(tag)) continue;
    fs.appendFileSync(
      target,
      `\n\n${tag}\ntimestamp: ${record.time}\nmodel: ${record.model}\n\n${record.body}\n`,
    );
  }
}

const seen = new Map();
function sync() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  const sources = [
    ...listJsonl(CODEX_SESSIONS, true).map((file) => [file, readCodexSession]),
    ...listJsonl(CLAUDE_SESSIONS, false).map((file) => [file, readClaudeSession]),
    ...listJsonl(CLAUDE_SESSIONS, true)
      .filter((file) => path.basename(path.dirname(file)) === 'subagents')
      .map((file) => [file, readClaudeSubagent]),
  ];
  for (const [file, read] of sources) {
    const { mtimeMs } = fs.statSync(file);
    if (seen.get(file) === mtimeMs) continue;
    seen.set(file, mtimeMs);
    const session = read(file);
    if (session) appendSession(session);
  }
}

sync();
if (!process.argv.includes('--once')) {
  setInterval(() => {
    try {
      sync();
    } catch (error) {
      fs.appendFileSync(
        path.join(ROOT, 'capture-errors.log'),
        `${new Date().toISOString()} ${error.message}\n`,
      );
    }
  }, POLL_MS);
}
