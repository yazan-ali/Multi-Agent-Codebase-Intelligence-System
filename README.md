# Codebase Intelligence

A multi-agent codebase analysis system that scans a local folder, runs specialized AI agents in sequence and parallel, and streams live results to a React dashboard.

Three Gemini-powered agents analyze your code:

- **Explorer** — maps architecture, dependencies, tech stack, and file complexity
- **Engineer** — code quality, test coverage gaps, and suggested tests
- **Security** — vulnerabilities, secrets, missing auth guards, and dependency risks

A code-based **orchestrator** coordinates the workflow (not an LLM). Results are cached on disk so unchanged codebases replay instantly.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Tailwind)              │
│  Path Input → Agent Console → Explorer / Engineer /          │
│  Security / Final Report tabs                                │
└──────────────────────────┬──────────────────────────────────┘
                           │ SSE (Server-Sent Events)
┌──────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Node + Express)                 │
│  POST /api/analyze → file walker → orchestrator → agents    │
│                                                              │
│  Explorer (sequential) → Engineer + Security (parallel)      │
│  → aggregate final report → cache to disk                    │
└─────────────────────────────────────────────────────────────┘
```

**Key design decisions**

| Decision | Rationale |
|----------|-----------|
| Agents on the backend | Keeps API keys secure; avoids shipping file contents to the browser |
| Code-based orchestrator | Deterministic workflow — no LLM cost for coordination |
| SSE streaming | Live agent status updates without polling |
| Zod validation | Every agent output is schema-checked; retries on failure |
| JSON file cache | Simple persistence keyed by folder path hash |

## Features

### Explorer report
- Tech stack badges (languages, frameworks, libraries, testing)
- Architecture summary (Markdown)
- Interactive dependency graph (React Flow)
- Architecture layers, entry points, complexity heatmap

### Engineer report
- Quality scorecard (readability, test coverage, duplication, patterns)
- Expandable issues with before/after code snippets
- Test coverage map (source files only)
- Suggested tests (one entry per function, all scenarios in one test class)

### Security report
- Risk score with severity breakdown
- OWASP vulnerability list with recommended fixes
- Hardcoded secrets and missing auth guards
- Insecure dependency warnings

### Final report
- Executive summary
- Agent status badges
- Top priority issues aggregated from all three agents, sorted by severity

### Caching
- Results stored under `backend/cache/data/<pathHash>/`
- Invalidated automatically when any file's modification time or size changes
- Cache hits replay SSE events (including parallel Engineer + Security) without calling Gemini

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Tailwind CSS 4, Vite |
| Graphs | React Flow (dependency graph) |
| Charts | Recharts (available; used in report components) |
| Backend | Node.js, Express 5, TypeScript (ESM) |
| LLM | Google Gemini 2.5 Flash (`@google/genai`) |
| Validation | Zod 4 |
| Streaming | Server-Sent Events (SSE) |

## Prerequisites

- **Node.js** 18+ (22 recommended)
- **npm**
- A **Google Gemini API key** ([Google AI Studio](https://aistudio.google.com/apikey))

## Getting started

### 1. Clone and install

```bash
git clone <your-repo-url>
cd codebase-ai-agent

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure the backend

Create `backend/.env`:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash   # optional, this is the default
PORT=5000                        # optional, default 5000
```

### 3. Run the backend

```bash
cd backend
npm run dev
```

Server starts at `http://localhost:5000`.

### 4. Run the frontend

In a second terminal:

```bash
cd frontend
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). The dev server proxies `/api` requests to the backend.

### 5. Analyze a codebase

1. Enter an **absolute path** to a local folder (e.g. `D:/projects/my-api`)
2. Click **Analyze**
3. Watch agent status update live in the console
4. Switch tabs to view Explorer, Engineer, Security, and Final reports

> **Note:** The backend reads files directly from disk. Use a path the Node process can access.

## API

### `GET /api/health`

```json
{ "status": "ok" }
```

### `POST /api/analyze`

**Request body**

```json
{ "path": "D:/projects/my-api" }
```

**Response:** `text/event-stream`

| Event | Payload | Description |
|-------|---------|-------------|
| `status` | `{ agent, status }` | Agent lifecycle: `running`, `done`, `failed` |
| `result` | `{ agent, data }` | Agent output when complete |
| `complete` | `{ finalReport }` | Aggregated final report |
| `error` | `{ message, agent? }` | Error for a specific agent or the pipeline |

**Example (curl)**

```bash
curl -N -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d "{\"path\": \"D:/projects/my-api\"}"
```

## Project structure

```
codebase-ai-agent/
├── backend/
│   ├── src/
│   │   ├── server.ts              # Express entry + SSE endpoint
│   │   ├── agents/
│   │   │   ├── orchestrator.ts    # Workflow coordinator (not an LLM)
│   │   │   ├── explorer.ts        # Codebase mapper agent
│   │   │   ├── engineer.ts        # Code quality agent
│   │   │   ├── security.ts        # Vulnerability scanner agent
│   │   │   ├── schemas.ts         # Zod schemas for all agent outputs
│   │   │   ├── systemPrompts.ts   # Agent system prompts
│   │   │   ├── promptBuilder.ts   # User prompt construction
│   │   │   └── validateAgentOutput.ts
│   │   ├── cache/
│   │   │   └── cacheManager.ts    # Disk cache read/write/replay
│   │   ├── core/
│   │   │   ├── fileReader.ts      # Recursive folder walker
│   │   │   ├── filters.ts         # Ignore node_modules, .git, etc.
│   │   │   └── geminiClient.ts    # Gemini SDK wrapper
│   │   └── types/
│   │       └── codebase.types.ts  # Shared backend types
│   └── cache/data/                # Cached analysis results (gitignored)
├── frontend/
│   └── src/
│       ├── App.tsx                # Main layout + tab routing
│       ├── hooks/
│       │   └── useAnalysis.ts     # SSE stream consumer
│       ├── components/
│       │   ├── AgentConsole.tsx   # Agent status cards
│       │   ├── PathInput.tsx      # Folder path input
│       │   ├── DependencyGraph.tsx
│       │   └── reports/
│       │       ├── ExplorerReport.tsx
│       │       ├── EngineerReport.tsx
│       │       ├── SecurityReport.tsx
│       │       └── FinalReport.tsx
│       └── types/
│           └── agent.types.ts       # Frontend type mirrors
├── implementation-plan.md         # Full design doc + progress log
└── README.md
```

## How analysis works

```
1. User submits folder path
2. Backend walks files (ignores node_modules, .git, dist, .env, lock files, binaries)
3. Cache check — if files unchanged, replay cached SSE and return
4. Explorer agent runs (Gemini) → validated JSON → streamed to UI
5. Engineer + Security run in parallel (Gemini) → each validated → streamed
6. Orchestrator aggregates top priority issues from all agents
7. Results saved to cache; `complete` event sent with final report
```

Each LLM agent uses Gemini structured output (`responseMimeType: application/json` + JSON schema). If validation fails, the agent retries up to 3 times in the same chat session before marking as failed.

## Ignored paths and files

By default the file walker skips:

- Directories: `node_modules`, `.git`, `dist`, `build`, `coverage`
- Files: `.env`, `package-lock.json`, binary extensions
- Large/noisy content is not filtered yet — **context budget management is planned**

## Development status

| Stage | Status |
|-------|--------|
| Foundation (file reader, Explorer, SSE, cache) | Done |
| Analysis agents (Engineer, Security, parallel) | Done |
| Report UIs (all four tabs) | Done |
| Final report aggregation | Done |
| Token counting / context budget | Not started |
| Chat agent (follow-up Q&A) | Not started |

See [`implementation-plan.md`](implementation-plan.md) for the full architecture spec, schemas, and session-by-session progress log.

## Troubleshooting

### `GEMINI_API_KEY is missing`
Add your key to `backend/.env` and restart the backend.

### Engineer agent fails with JSON parse errors
Common on large codebases when the model returns raw code instead of JSON. Clear the cache folder for that path and re-analyze. Context budget management (planned) will address root cause for very large repos.

### Stale results after code changes
The cache invalidates on file `mtime` and `size` changes. If you suspect stale cache, delete the matching folder under `backend/cache/data/`.

### Frontend can't reach the backend
Ensure the backend is running on port 5000 and the Vite proxy in `frontend/vite.config.ts` points to `http://localhost:5000`.

## Scripts

**Backend**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon + tsx (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled `dist/server.js` |

**Frontend**

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

## License

ISC (see `backend/package.json`)
