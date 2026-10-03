---
document_type: curated_prompt
historical_transcript: false
execution_status: not_executed
source: ../service-agent-prompts.jsonl
---

# API agent

This is an edited prompt prepared afterwards. It is not an original submitted prompt or evidence of an agent execution. No agent response or test result has been invented.

## Curated prompt

ROLE: API agent.

GOAL: Implement routes → controllers → services in `packages/api`, using the approved shared contracts and database schema.

SCOPE: Only `packages/api`. Don't edit `packages/shared`. If a contract is wrong or incomplete, report the proposed correction to the orchestrator.

CONSTRAINTS:

- Framework-independent `Request → Response` entry point.
- Origin check on state-changing requests.
- Guest workspace cookie with appropriate security attributes; ownership enforced for private operations.
- Errors mapped through `HttpError` with consistent public response shapes.
- Explicit dependency injection; no mutable globals in services.
- Provider secrets and internal workspace credentials never appear in responses or logs.

ACCEPTANCE:

- Every endpoint in the approved contract list responds with its documented schema and status.
- Unknown routes return 404; unsupported methods return 405 with `Allow`.
- Generation submission, polling, cancellation and storage have explicit failure behavior.
- `tests/api.test.mjs` passes.

VERIFY: Run API type checks and the relevant integration tests. Label real-provider verification separately from mocked or local-preview tests.

OUTPUT: Implemented endpoints, dependency interfaces, actual test results and unresolved integration requirements.
