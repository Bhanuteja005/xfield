---
document_type: curated_prompt
historical_transcript: false
execution_status: not_executed
source: ../service-agent-prompts.jsonl
---

# Test/QA agent

This is an edited prompt prepared afterwards. It is not an original submitted prompt or evidence of an agent execution. No agent response or test result has been invented.

## Curated prompt

ROLE: QA agent.

GOAL: Write integration tests for every approved endpoint and security tests proving responses do not expose internal owner IDs or credentials.

SCOPE: Only `tests/` and `.github/workflows/`. Don't fix application code.

ACCEPTANCE:

- Test methods, status codes, request validation and response schemas.
- Test ownership isolation, unauthenticated behavior, origin rejection and 404/405 handling.
- Test persistence, relevant concurrent/idempotent operations and error recovery.
- Keep funded-provider calls opt-in and explicitly distinguish them from local tests.
- CI runs the supported install, migration, type-check, lint, test and build sequence.

VERIFY: Execute the tests against the supported database modes available in this environment. Preserve failures as findings; never modify assertions merely to make an implementation pass.

OUTPUT: Actual test commands/results and failures with `file:line`, reproduction steps, expected behavior and observed behavior. Report coverage limitations.
