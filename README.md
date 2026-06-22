# Codebase Intelligence

A multi-agent system that analyzes a local codebase the way a small expert team would — one agent maps the architecture, another reviews code quality and tests, and a third hunts for security risks. Results stream live to a dashboard with four visual report tabs.

The goal is actionable insight, not a chat transcript. Every agent returns structured JSON validated against a schema, and the UI turns that into scorecards, graphs, issue lists, and a unified priority ranking.

## The problem it solves

Understanding an unfamiliar codebase usually means manually reading files, tracing imports, checking test coverage, and scanning for security smells. That work is repetitive, easy to miss things on, and hard to present in one place.

Codebase Intelligence automates that first pass:

- **Where does execution start?** What depends on what?
- **What is the quality and test posture?** Where are the concrete fixes?
- **What are the security risks?** Secrets, missing auth, OWASP issues?
- **What should I fix first?** A merged priority list across all agents.

Point it at a folder path. Minutes later you have structured reports you can explore tab by tab.

## How it works

```
User enters folder path
        │
        ▼
   File walker ──► filters noise (node_modules, .git, binaries, …)
        │
        ▼
   Cache check ──► unchanged? replay instantly : run agents
        │
        ▼
   ┌─────────────┐
   │  Explorer   │  maps the codebase (sequential — others depend on this)
   └──────┬──────┘
          │ shared context
          ▼
   ┌──────────────┐     ┌──────────────┐
   │   Engineer   │     │   Security   │   run in parallel
   └──────┬───────┘     └──────┬───────┘
          │                    │
          └────────┬───────────┘
                   ▼
          Orchestrator aggregates
                   │
                   ▼
          Final report + cache to disk
```

**Explorer runs first** because Engineer and Security use its output as shared context — tech stack, dependency map, complexity scores, and architecture summary. That lets downstream agents prioritize the right files instead of treating every file equally.

**Engineer and Security run in parallel** after Explorer finishes. They are independent analyses that both consume the same Explorer report, so there is no reason to wait on each other.

**The orchestrator is plain TypeScript**, not an LLM. Its job is deterministic: call agents in order, handle failures gracefully, merge findings, cache results, and stream status over SSE. Using an LLM for coordination would add cost and unpredictability with no benefit.

## The agents

### Explorer — codebase cartographer

Builds the shared knowledge base every other agent consumes.

| Output               | What it tells you                                  |
| -------------------- | -------------------------------------------------- |
| Tech stack           | Languages, frameworks, libraries, test frameworks  |
| Dependency map       | Which files import which                           |
| Architecture layers  | How files group into UI / logic / data layers      |
| Entry points         | Where execution starts                             |
| File complexity      | 1–10 score per file with reasoning                 |
| High coupling flags  | Files with tight coupling or too many dependencies |
| Architecture summary | Markdown overview of structure and data flow       |

**Powers:** stack badges, interactive dependency graph (React Flow), complexity heatmap, layered architecture view.

### Engineer — code quality specialist

Reviews best practices, maintainability, and testing using Explorer's context to focus on high-complexity and critical-path files.

| Output                    | What it tells you                                                     |
| ------------------------- | --------------------------------------------------------------------- |
| Overall + category scores | Readability, test coverage, duplication, patterns (0–100)             |
| Issues                    | File, line, priority, category, description, before/after fix         |
| Test coverage map         | Which source files have tests (excludes config/docs)                  |
| Suggested tests           | One entry per function — a complete test class with up to 5 scenarios |

**Powers:** quality scorecard, expandable issue diffs, coverage checklist, suggested test code.

### Security — threat analyst

Scans for vulnerabilities and attack surface, prioritizing files that handle auth, data, and external input.

| Output                | What it tells you                                     |
| --------------------- | ----------------------------------------------------- |
| Risk score            | 0–100 overall security posture                        |
| Vulnerabilities       | Severity, OWASP category, file:line, description, fix |
| Hardcoded secrets     | API keys, passwords, tokens in source                 |
| Missing auth guards   | Endpoints without authentication/authorization        |
| Insecure dependencies | Risky packages from manifest files                    |

**Powers:** risk gauge, severity breakdown, OWASP category chart, secrets and auth-guard panels.

### Apply Fix — on-demand code patcher

Runs when you accept an Engineer issue fix from the UI. It is not part of the analysis pipeline.

| Input | What it does |
| ----- | ------------ |
| Full source file | Reads the file from disk |
| Issue description + before/after preview | Applies the fix across the whole file, not just the snippet shown in the report |

Engineer issues show short before/after previews. A rename or refactor often affects more than those lines. Apply Fix uses Gemini to return the complete corrected file and writes it back.

**Powers:** **Apply Fix** button on Engineer issues — one click to patch the codebase.

## The dashboard

Four tabs, each fed by one agent or the aggregation layer:

### Explorer tab

Walk the codebase structure visually — dependency graph with layer colors and complexity-sized nodes, architecture summary, entry points, and coupling warnings.

### Engineer tab

See quality at a glance, drill into issues grouped by file with before/after snippets, and apply fixes with the Apply Fix agent.

### Security tab

Understand risk level, read vulnerabilities sorted by severity with recommended fixes, and spot secrets or unprotected endpoints.

### Final report tab

The executive view: architecture summary, which agents succeeded or failed, and **top priority issues** merged from all three agents — Security findings, Engineer issues, and Explorer coupling flags — sorted Critical → High → Medium → Low.

## Live agent console

While analysis runs, the agent console shows real-time status for each agent (`idle` → `running` → `done` / `failed`) via Server-Sent Events. You can switch tabs as each report arrives without waiting for the full pipeline to finish.

If one agent fails, the others still complete. The final report reflects partial results instead of crashing the whole run.

## Reliability layer

Every LLM response is validated with **Zod** against a strict schema. Malformed JSON triggers a retry in the same chat session (up to 3 attempts) before the agent is marked failed. Structured output mode (`application/json` + JSON schema) keeps responses predictable.

Agent outputs are **cached per codebase path**. On re-analysis, the system compares file modification times and sizes — if nothing changed, cached reports replay instantly with simulated SSE events (including parallel Engineer + Security), with no Gemini API calls.

## Design principles

| Principle               | In practice                                   |
| ----------------------- | --------------------------------------------- |
| Agents on the backend   | API keys and file contents stay on the server |
| Code-based orchestrator | Deterministic workflow, no LLM for routing    |
| Structured outputs      | JSON schemas, not free-form prose             |
| Shared context          | Explorer feeds Engineer and Security          |
| Graceful degradation    | One agent failing does not block the rest     |
| Cache by path hash      | Repeat analysis of unchanged code is instant  |

## Tech stack

React + TypeScript + Tailwind on the frontend. Node + Express + TypeScript on the backend. Gemini 2.5 Flash for agent calls (Explorer, Engineer, Security, Apply Fix). React Flow for dependency graphs. Zod for validation. SSE for streaming.

## Quick start

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Set `GEMINI_API_KEY` in `backend/.env`, open the frontend, enter an absolute folder path, and click Analyze.
