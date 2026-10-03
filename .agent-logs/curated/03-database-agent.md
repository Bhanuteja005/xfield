---
document_type: curated_prompt
historical_transcript: false
execution_status: not_executed
source: ../service-agent-prompts.jsonl
---

# Database agent

This is an edited prompt prepared afterwards. It is not an original submitted prompt or evidence of an agent execution. No agent response or test result has been invented.

## Curated prompt

ROLE: DB agent.

GOAL: Implement the Drizzle schema and migrations matching the approved domain contracts.

SCOPE: Only `packages/db`. Report a required change outside that package to the orchestrator.

CONSTRAINTS: Postgres; must also run on PGlite when `DATABASE_URL` is absent. Keep database ownership fields internal. Preserve applied migrations and add new migrations for subsequent schema changes.

ACCEPTANCE:

- Migrations apply cleanly on a fresh PGlite database.
- Tables, relationships and constraints support the approved API behavior.
- Indexes support owner and `created_at` query patterns without redundant indexes.
- Connection and migration lifecycle work in both supported modes.

VERIFY: Run the migration and package type checks. Include the actual output summary, database mode and any unverified Postgres behavior.

OUTPUT: Schema exports, migration files, connection/migration interfaces and handoff notes for the API agent.
