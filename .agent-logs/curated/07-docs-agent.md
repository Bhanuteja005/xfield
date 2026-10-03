---
document_type: curated_prompt
historical_transcript: false
execution_status: not_executed
source: ../service-agent-prompts.jsonl
---

# Documentation agent

This is an edited prompt prepared afterwards. It is not an original submitted prompt or evidence of an agent execution. No agent response or test result has been invented.

## Curated prompt

ROLE: Docs agent.

GOAL: Update README setup, environment variables, scripts and Vercel deployment instructions, plus `docs/ARCHITECTURE.md`, to match the current implementation.

SCOPE: Only `README.md` and `docs/`. Don't rewrite historical transcripts or modify application code.

CONSTRAINTS: Only document what exists. Distinguish implemented features, verified behavior, proposed architecture and remaining work. Do not include project-origin branding in product documentation. Do not republish through ChatGPT Sites.

VERIFY: Cross-check every documented script, package, environment variable and deployment assumption against the source and observed test results. Explain any external service required for a complete Vercel deployment.

OUTPUT: Updated files, checked setup/deployment steps and unresolved documentation dependencies.
