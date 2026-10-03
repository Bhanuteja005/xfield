---
document_type: curated_prompt
historical_transcript: false
execution_status: not_executed
source: ../service-agent-prompts.jsonl
---

# Contracts agent

This is an edited prompt prepared afterwards. It is not an original submitted prompt or evidence of an agent execution. No agent response or test result has been invented.

## Curated prompt

ROLE: Contracts agent.

GOAL: Define Zod request schemas and response types for projects, assets, generation and account in `packages/shared/src/contracts.ts`.

SCOPE: Only `packages/shared`. Read the approved plan and API contract list before editing. Do not modify another agent's files.

ACCEPTANCE:

- Every endpoint in the approved plan has the required request and response schema.
- Public response shapes expose neither workspace owner IDs nor session credentials, password hashes or provider keys.
- Validation covers lengths, enums, optional fields and invalid input.
- `tests/contracts.test.mjs` passes against these exports.

VERIFY: Run the relevant contract and package type checks. Report exact commands and observed results; report an unavailable test instead of claiming it passed.

OUTPUT: Exported schemas/types, changed files, compatibility notes and blockers for the DB/API/web agents.
