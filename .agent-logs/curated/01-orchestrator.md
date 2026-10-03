---
document_type: curated_prompt
historical_transcript: false
execution_status: not_executed
source: ../service-agent-prompts.jsonl
---

# Orchestrator — planning only

This is an edited prompt prepared afterwards. It is not an original submitted prompt or evidence of an agent execution. No agent response or test result has been invented.

## Curated prompt

I'm building Xfield, an AI image/video generation studio, as an npm-workspaces monorepo: Next.js 16 web, a framework-independent API package, a Drizzle/Postgres database package and shared Zod contracts.

Don't write code or start implementation agents yet. Inspect the current repository and distinguish existing behavior from proposed changes. Produce:

1. A phased implementation plan with priorities, dependencies and explicit exclusions.
2. The service split and exclusive file ownership for each agent.
3. The API contract list: methods, endpoints, request/response schemas, status codes and authentication rules.
4. The agent run order, safe parallel work and verification gates.

Include landing, signup/onboarding, studio, assets, projects and account journeys in the scope assessment. Identify external credentials or services required for real generation and deployment. Do not promise unsupported functionality. Wait for my approval before implementation.
