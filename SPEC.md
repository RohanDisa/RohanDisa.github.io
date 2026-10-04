# rohandisa.github.io: Portfolio Website Spec

|  |  |  |
| --- | --- | --- |
|  |  |  |
|  |  |  |

Oct 4, 2026 · @Rowan

## 1. Overview and positioning

The site sells Rohan as an **AI agent engineer who understands the systems underneath**: agents first, with distributed systems and performance engineering as the proof that he knows what the agents are reasoning about. It is a single-author, static portfolio deployed free on GitHub Pages and built in Cursor from this spec.

**One-line pitch (hero):** "I build agents that do real engineering work, and the systems they run on."

**Why this framing works.** The resume already has a bridge between the two identities: the Ampere agent does performance root-cause analysis on real hardware, and the side projects (CPU inference engine, CUDA kernel, Raft KV store, capability broker) are all systems work. The site should make that bridge explicit instead of presenting two unrelated personas.

**Weighting rule for every page:** roughly 65% agentic (Ampere agent, eval harness, capability broker, LangChain/LangGraph work), 35% systems (Raft KV, inference engine, W4A16 kernel). The Raft project is a strong supporting piece, never the headline.

**Primary audiences**

- Recruiters and hiring managers for AI/agent engineer and applied AI roles: need the pitch, 3 to 4 flagship projects with numbers, and a resume link within 10 seconds.
- Engineers doing a technical screen: want depth pages with architecture, tradeoffs, measured results and code links.
- Infra and systems teams (secondary): need to see Raft, gRPC, C++, benchmarking and performance work without hunting.

**Success criteria**

- A visitor can name Rohan's focus and one flagship project after 10 seconds on the home page.
- Resume PDF and email are reachable in one click from every page.
- Home page loads under 1 second on a fast connection and scores 95+ on Lighthouse in all four categories.

## 2. Tech stack and GitHub Pages deployment

Use **Astro (static output) + Tailwind CSS + MDX**, with small interactive islands written in vanilla TypeScript or Preact, deployed by GitHub Actions to GitHub Pages. Astro ships zero JS by default, which keeps the Lighthouse score high while still allowing the animated pieces.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Astro 5, `output: 'static'` | Static HTML, content collections, islands for interactivity |
| Styling | Tailwind CSS v4 + CSS variables for tokens | Fast iteration in Cursor; tokens make light/dark trivial |
| Content | MDX files in `src/content/` | Projects and case studies written as Markdown with embedded components |
| Interactive islands | Preact (`@astrojs/preact`) or vanilla TS | Hero trace, command palette, Raft sim; under 15 KB each gzipped |
| Fonts | Geist + Geist Mono via `@fontsource` (self-hosted) | No third-party font requests |
| Icons | `lucide` (tree-shaken SVG) | Consistent stroke icons |
| Hosting | GitHub Pages | Free, HTTPS, custom domain support |
| CI/CD | GitHub Actions with `withastro/action` + `actions/deploy-pages` | Deploy on every push to `main` |

**Repo and URL**

- Name the repo `RohanDisa.github.io` so the site serves at `https://rohandisa.github.io/` with no base path. If a different repo name is used, set `base: '/<repo>'` in `astro.config.mjs` and prefix every internal link.
- Optional custom domain (for example `rohandisa.dev`, not planned for now): add `public/CNAME` and set the domain in repo Settings > Pages, then set `site` in `astro.config.mjs` to match.

**Deployment steps**

1. In repo Settings > Pages, set Source to "GitHub Actions".
2. Add `.github/workflows/deploy.yml` with two jobs: `build` (checkout, `withastro/action`) and `deploy` (`actions/deploy-pages`), triggered on push to `main` and `workflow_dispatch`.
3. Set `site: 'https://rohandisa.github.io'` in `astro.config.mjs` so the sitemap and canonical URLs are correct.
4. Push to `main`; the first deploy takes about 1 to 2 minutes.

**Constraint from static hosting:** there is no server. Anything "AI powered" on the site must run without a backend, and no API key may ever ship in client code. The agentic feel comes from design and scripted interactions, not live LLM calls.

## 3. Design system

The visual language is an **"agent console"**: the site looks like a clean, well-designed agent run viewer (think trace UIs, tool-call cards, structured logs), not a hacker terminal. Dark mode is the default; light mode is fully supported.

**Design principles**

- Structured, not noisy: monospace and trace motifs are accents on labels, metrics and timestamps, while body text stays in a readable sans-serif.
- Every claim carries a number: metric chips ("1.61x", "80%", "\~170 ns") are a first-class component.
- Motion explains state change (a step completing, a node becoming leader), never decorates.
- Generous whitespace, max content width 1120px, 12-column grid on desktop, single column under 768px.

**Color tokens** (define as CSS variables on `:root`, override under `[data-theme="light"]`)

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg` | `#0A0C10` | `#FAFAF9` | Page background |
| `--surface` | `#11141A` | `#FFFFFF` | Cards, panels |
| `--surface-2` | `#171B22` | `#F2F2EF` | Nested panels, code |
| `--border` | `#232833` | `#E4E4DF` | Hairlines, card borders |
| `--text` | `#E7E9EE` | `#14161A` | Body text |
| `--muted` | `#8B93A1` | `#5D6470` | Secondary text, labels |
| `--accent` | `#7CF2B4` | `#0E9F6E` | Agent "success" signal, links, focus ring |
| `--accent-2` | `#8AB4FF` | `#2F6FEB` | Tool calls, info states |
| `--warn` | `#FFC062` | `#B7791F` | Raft leader highlight, "in progress" |
| `--danger` | `#FF7A85` | `#C53030` | Killed node, failed step |

Accent pairs must pass WCAG AA contrast against their background; check them with a contrast tool before shipping.

**Typography**

- Sans: Geist (400, 500, 600). Headings 600 with -0.02em tracking.
- Mono: Geist Mono (400, 500) for labels, metrics, timestamps, trace lines, code.
- Scale (rem): 0.75 / 0.875 / 1 / 1.125 / 1.5 / 2 / 3 / 4.5 (hero only). Body 1rem at line-height 1.65.
- Section eyebrows in mono uppercase, 0.75rem, 0.12em tracking, `--muted`, prefixed with a step index, for example `03 / SELECTED WORK`.

**Core components**

- `TraceLine`: one row of an agent trace: timestamp, colored step-type badge (`plan`, `tool_call`, `observe`, `result`), text. Used in hero and experience.
- `ToolCallCard`: project card styled like a tool invocation: header shows `run_project(name)` in mono, status dot, 1 to 2 line summary, 2 to 3 `MetricChip`s, stack tags, links.
- `MetricChip`: mono value + muted label, for example `1.61x  throughput`.
- `SpanBar`: a horizontal bar sized by duration, used for the experience timeline.
- `LaneTag`: "agents", "systems" or "ml", colored with `--accent`, `--warn`, `--accent-2`.
- Subtle background: a faint dot grid (`radial-gradient`, 24px spacing, 4% opacity) on the hero only.

**Motion**

- Durations 150 to 250ms for UI, 400 to 600ms for reveals; easing `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Scroll reveal: fade + 8px rise, once per element, via `IntersectionObserver`.
- All motion is disabled under `prefers-reduced-motion: reduce`, and the hero shows its final state immediately.

## 4. Site map and section-by-section content

The site has four routes: `/` (home), `/work` (all projects), `/work/[slug]` (case study per project) and `/resume` (embedded PDF + download). A fixed top nav holds: logo mark `rd_`, Work, Experience (anchor), Resume, a `Cmd K` hint button, theme toggle, GitHub and LinkedIn icons.

**Home page, top to bottom**

1. **Hero** (100vh on desktop, auto on mobile)
   - Left: eyebrow `AI AGENTS · PERFORMANCE ENGINEERING · USC MS CS '26`; H1 "I build agents that do real engineering work, and the systems they run on."; one sub-line: "Most recently at Ampere Computing, building performance-engineering agents and supporting hands-on case studies on LLM inference and networking workloads. Previously: Raft-replicated storage, CPU and GPU inference kernels."; buttons "View work" (primary) and "Resume" (ghost); a small mono line "Graduating Dec 2026 · open to full-time roles in AI agents and performance engineering from January 2027".
   - Right: the animated agent trace panel (Section 5.1).
2. **What I build** (two lanes side by side)
   - Lane A "Agents" (larger card, 7 columns): agents with tool use via MCP, eval harnesses with statistical rigor, sandboxing and capability control. Lists 3 linked projects.
   - Lane B "Systems" (5 columns): consensus and replication, inference performance on CPU and GPU, benchmarking. Lists 3 linked projects. Includes the Raft mini-sim teaser (a 3-node ring that idles with heartbeats; click opens the KV case study).
3. **Selected work**: 4 `ToolCallCard`s in a 2x2 grid: Performance-engineering agent (Ampere), Agent Eval Harness, Capability Broker, Replicated KV store on Raft. Link "All projects" to `/work`.
4. **Experience** as a trace: each role is a `SpanBar` row (Ampere, USC ITS, Amogh Data Innovations) on a shared time axis from mid-2024 to now; expanding a row shows 3 bullet results with metric chips. Ampere's row is split into two labeled groups, "Agent" (what was built) and "Performance engineering" (the case studies worked on or supported), so it reads as both agent builder and performance engineer.
5. **Open source**: 4 compact rows, each with repo badge, one-line summary and a "merged" badge: the three LangChain PRs (langchain-aws #826, langchain #34919, langchain #34080, all merged) plus xarray-sql #76 (test suite migrated from unittest to pytest, shipped in v0.2.0).
6. **Contact**: "Send a request" styled as a final tool call: `contact(rohan)` with email (disa@usc.edu), LinkedIn, GitHub. Copy-email button with a toast.
7. **Footer**: "Built with Astro, deployed on GitHub Pages", last-updated date generated at build time, link to the site source.

**/work page**

- Filter chips: All, Agents, Systems, ML. Filtering is client-side, with the active filter stored in the URL query (`?lane=systems`) so it can be shared.
- Grid of every project card, sorted by `order` then date.

**/work/\[slug\] case study template**

- Header: title, `LaneTag`, period, stack tags, links (GitHub, write-up, demo).
- "Result" strip: 3 to 4 `MetricChip`s.
- Sections in order: Problem, Approach (with an architecture diagram as inline SVG), Key decisions and tradeoffs, Results (numbers, plots), What I'd do next.
- Optional embedded interactive component (the Raft sim on the KV page; a trace replay on the Ampere page).
- Prev/next project links at the bottom.

**/resume page**

- Embed `public/Rohan_Disa_Resume.pdf` in an `<iframe>` on desktop; on mobile show only a large Download button (mobile PDF embeds are unreliable).

## 5. Signature interactions

Three scripted interactions carry the "agentic" feel; all are deterministic, run fully client-side and need no backend or API key.

**5.1 Hero agent trace (island: `HeroTrace`)**

A panel styled like an agent run viewer streams about 8 trace lines over roughly 4 seconds, then settles. Header bar: `run: profile_candidate  ·  model: rohan-v1  ·  status: running` which flips to `status: done` with a green dot.

Scripted lines (store in `src/data/heroTrace.ts`, edit freely):

1. `plan` Profile candidate: agents + systems
2. `tool_call` read\_resume("Rohan\_Disa\_Resume.pdf")
3. `observe` AI SWE intern @ Ampere: perf-engineering agent, 80% less manual analysis
4. `tool_call` inspect\_repo("agent-eval-harness")
5. `observe` 32-task suite, Wilson 95% CIs, BH-corrected tests
6. `tool_call` run\_cluster(nodes=3, kill="leader")
7. `observe` new leader elected; 0 acknowledged writes lost
8. `result` Hire signal: strong. Next step: view\_work()

Behavior: characters type at \~12ms each, a 250ms pause between lines, tool-call lines show a 400ms spinner before their observation. Clicking "view\_work()" scrolls to Selected work. A small "replay" icon reruns it. Under reduced motion, render all lines instantly. Line 7 must match what the Raft project really guarantees; edit it if needed.

**5.2 Command palette (island: `CommandPalette`)**

Opened by `Cmd/Ctrl + K` or `/`, or by the nav hint button. A centered modal with a mono input prefixed by `>`, fuzzy matching (a \~40-line scorer, no library needed) over:

- Navigate: Home, Work, each project by name, Experience, Resume, Contact.
- Actions: Copy email, Download resume, Toggle theme, Open GitHub, Open LinkedIn.
- Filters: "show agents projects", "show systems projects" (jump to `/work?lane=...`).

Arrow keys move, Enter runs, Esc closes; focus is trapped while open and returns to the trigger on close. Results show a right-aligned mono hint such as `↵ open` or `⌘C copy`. Command list is generated at build time from the content collections.

**5.3 Raft mini-sim (island: `RaftSim`)**

The distributed-systems hook, placed in two spots: an idle 3-node teaser in the "Systems" lane on the home page, and the full interactive version on the KV case study. It is a teaching visualization, not the real implementation, and must say so in its caption.

- Rendering: SVG, nodes on a circle (3 or 5, toggle), each showing role (follower, candidate, leader), term number and a mini log of colored entries. The leader ring uses `--warn`; a killed node is greyed out with a `--danger` X.
- Messages: animated dots travel along edges for heartbeats (AppendEntries) and votes (RequestVote).
- Controls: "Client Put" (appends an entry on the leader, replicates, turns solid once a majority acknowledges, then shows `applied` and `KV_SUCCESS`), "Kill leader", "Restore node", "Partition" (splits the minority off; a Get sent to the minority leader returns `KV_TIMEOUT` instead of stale data), speed slider, pause.
- Logic: a simplified state machine with randomized election timeouts (150 to 300 sim-ms) and a step loop on `requestAnimationFrame`. Seeded RNG so it behaves the same each load. Target under 12 KB gzipped.
- A side log panel prints events in the same `TraceLine` style (`t=1840 node2 → leader term=3`), tying the systems visual back to the agentic look.

## 6. Project content

Eleven projects ship at launch: four featured on the home page, the rest on `/work`. Content is merged from both resume versions and the public GitHub repos. The Raft project uses the C++ implementation; the Go agent-memory store is left off the site.

| Order | Project | Lane | Featured | Headline metrics | Stack | Link |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Performance-engineering agent (Ampere, Jun to Aug 2026) | agents | yes | 80% less manual analysis (30+ hrs/week); 88% LLM-judge agreement with experts | MCP, Python, SSH, LLM-as-a-Judge | none (internal) |
| 2 | Agent Eval Harness | agents | yes | 32-task suite; N reruns with Wilson 95% CIs; BH-corrected tests | Python, pytest, SciPy, Docker | [agent-eval-harness](https://github.com/RohanDisa/agent-eval-harness) |
| 3 | Capability Broker | agents | yes | 10/10 attacks blocked at 0% false positives; \~170 ns policy checks | Go, GitHub Actions | [agent-broker](https://github.com/RohanDisa/agent-broker) |
| 4 | Replicated KV store on Raft (C++) | systems | yes | Linearizable, exactly-once; 3 nodes consistent across 50k writes | C++, gRPC, Raft, RocksDB, Docker | private (code on request) |
| 5 | Computer-Use Automation System | agents | no | Model explores once, then runs from a typed capability artifact with human handoff | Python, CDP browser control | [computer-use-agent](https://github.com/RohanDisa/computer-use-agent) |
| 6 | CPU Inference Engine | systems | no | 9.3x decode on Llama 3.2 1B; 56 to 73% of STREAM bandwidth | C++17, AVX2, OpenMP, GGUF | [agent-serve](https://github.com/RohanDisa/agent-serve) |
| 7 | W4A16 Decode Kernel | systems | no | 41% of HBM bandwidth on T4; 4.1x over uncoalesced baseline | CUDA, PyTorch, Nsight, Modal | [decode-kernel](https://github.com/RohanDisa/decode-kernel) |
| 8 | Deep Research Agent | agents | no | Multi-agent planning, parallel research, synthesis | LangGraph, Python | [deep\_research\_agent](https://github.com/RohanDisa/deep_research_agent) |
| 9 | Agentic Form Filler | agents | no | LLM agent that navigates college application portals | Python | [agenticformfiller](https://github.com/RohanDisa/agenticformfiller) |
| 10 | CodeRAG | ml | no | Code indexer with embeddings, FAISS, LLM Q&A | Python, FAISS | [CodeRAG](https://github.com/RohanDisa/CodeRAG) |
| 11 | AI Email Assistant | agents | no | Smart replies, task extraction, NL inbox queries | React, FastAPI, Redis, Celery | [ai\_email\_assistant](https://github.com/RohanDisa/ai_email_assistant) |

The KV store repo is likely private; if so, the card shows "code on request" instead of a link. On the W4A16 page, describe the A100 shortfall the way the repo README does: the warps-per-SM test ruled out memory-level parallelism, and dequantization cost is the leading remaining explanation, not yet confirmed with Nsight Compute.

**Featured card copy (home page)**

- **Performance-engineering agent.** "Performance engineering at Ampere, two ways: I built an agent that does root-cause analysis on real hardware (five CLI profilers over SSH through an async MCP server, with performance playbooks turned into executable skills), and I worked on and supported hands-on case studies across LLM inference, recommendation models and network regressions."
- **Agent Eval Harness.** "Agents are stochastic, so one run proves nothing. This domain-agnostic engine reruns each task N times, reports confidence intervals, and grades with invariants, LLM-judge traces and corrected statistical tests."
- **Capability Broker.** "An authority layer that assumes the agent is already compromised: scoped, single-use credentials per tool call, deny-by-default policy, hash-chained audit, mid-run revoke. Every control is proven load-bearing by ablation."
- **Replicated KV store on Raft.** "A linearizable key/value service on my own Raft implementation in C++ and gRPC, with exactly-once semantics under retries, durable storage and a benchmark suite I used to tune it."

**Ampere agent: case studies (described, no figures)**

Performance case studies I worked on or supported at Ampere, using the agent alongside hands-on profiling with hardware counters, roofline reasoning and controlled experiments. Show each as a short trace replay; describe the method and the finding, with no figures.

- **Llama token generation.** The agent compared instruction counts and memory-stall behavior across implementations, ruled out a slow library as the cause, and pointed to kernel and prefetch changes that improved batched throughput.
- **DLRM.** Per-function PMU analysis widened coverage of the hot kernels enough to attribute most of the throughput gap to ineffective L2 hardware prefetching.
- **Envoy regression across Linux kernel versions.** Cross-NIC reproduction and zero-copy experiments with iperf isolated a slowdown to virtio-net and identified the responsible kernel commit.

**What the Ampere page shows publicly (decided).** Keep everything at the level already on the resume, which is public. Show: the agent's architecture as a generic diagram (agent and skill system → async MCP server → SSH → one runner machine driving several systems under test); the idea of converting performance playbooks into executable skills; the evaluation approach (LLM-as-a-Judge over a 200-sample golden dataset of multi-turn trajectories, 88% agreement with expert assessments, Cohen's kappa 0.81); and the three case studies as method-plus-finding narratives without figures. Leave out: internal tool and host names, real screenshots or logs, prompts, unreleased hardware or customer details, and any code. No GitHub link; the card shows "Internal project". Trace replays on the page are illustrative and labeled as such.

**Replicated KV store: the engineering**

The repo is private, so the case study is the deliverable: it carries the design, the guarantees and the benchmark method in enough depth that a systems interviewer can probe it. The card shows "Private repo, code walkthrough on request" in place of a GitHub link. Everything below comes from the project spec and resume; nothing is invented.

**At a glance (metric chips):** `3 nodes` consistent across `50k writes` · `~12k writes/sec` single node · `linearizable` · `exactly-once`. Period: Jan to Feb 2026, with the replicated service and benchmarking work continuing into April 2026. Stack: C++, gRPC, Protocol Buffers, Raft, RocksDB, Docker Compose, OpenTelemetry, CMake, Python/matplotlib for plots.

1. **Problem.** Build a key/value service that behaves like a single copy of the data (linearizable) while running on several machines, keeps working when a minority fails, and never applies a retried request twice. Then make it fast.
2. **Node architecture.** Each node is one process running three gRPC services: Raft peer RPCs on port P, the client-facing KV service on port P+1000, and a control service for fault injection in tests. Nodes share no state and communicate only through the replicated log.
3. **Client API.** `KvService` exposes `Put(key, value)`, `Append(key, arg)` (acts as Put if the key is missing) and `Get(key)` (empty string if missing). Every request carries a `client_id` (64-bit) and a `seq_num`. Responses return `KV_SUCCESS`, `KV_NOTLEADER` or `KV_TIMEOUT`. The client library discovers the leader automatically and retries on `KV_NOTLEADER` or timeouts.
4. **Consensus core.** A from-scratch Raft: leader election with randomized timeouts, AppendEntries log replication with consistency checks, majority-based commit, and an apply queue (`MessageQueue<ApplyResult>`) that delivers committed entries in log order.
5. **Request path: propose → commit → apply → respond.** The RPC handler serializes the operation (type, key, value, client ID, sequence number) and calls `propose()`, which returns the log index the entry should occupy. The handler blocks on a waiter for that index. A dedicated apply thread drains the queue, executes each entry against the in-memory map, and wakes the waiter for its index. If a different entry commits at that index (leadership changed), the handler reports `KV_NOTLEADER` and the client retries; if nothing commits in time, it returns `KV_TIMEOUT`.
6. **Exactly-once semantics (RIFL pattern).** The server keeps a per-client record of the latest sequence number and its result. Duplicates are detected when the entry is applied, not when it arrives, so every replica makes the same decision from the same log and a retried Append is never applied twice. The cached result is returned to the retrying client.
7. **No stale reads.** Gets are ordered through consensus, so a leader that has been partitioned from the majority cannot answer from its local copy; it times out with `KV_TIMEOUT` instead of returning old data.
8. **Durability and deployment.** RocksDB-backed persistent storage, and a Docker Compose setup to run a multi-node cluster locally.
9. **Failure testing.** Verified with a correctness suite plus hidden fault scenarios: basic operations, concurrent clients, linearizability checks under concurrent access, leader crash and re-election mid-workload, network partitions, and unreliable networks that drop and reorder messages.
10. **Observability.** OpenTelemetry spans around propose, replication and apply, used to see where request latency goes before and after tuning.
11. **Benchmark tooling (built from scratch).**
    - `latency`: a closed-loop client that spins up a 3-node cluster and issues 1,000 sequential writes, reporting average, p50 and p99 latency.
    - `tput <maxClients> <putRatio>`: for client counts 1, 2, 4, 8 and up, starts a fresh cluster, pre-populates `key_1` to `key_1000`, runs N threads of 1,000 synchronous ops each with uniformly random keys and the chosen read/write mix, and records throughput plus avg/p50/p90/p99 latency to `result.txt`.
    - `lat-tput.py`: parses the results and plots latency (avg, p50, p90, p99) against throughput.
    - Compared 3-node and 5-node clusters to show the cost of a larger quorum on write latency and throughput.
12. **Performance target.** Tuned against a standardized benchmark run on identical hardware alongside peer implementations, on three metrics: median unloaded Put latency, and peak throughput with 64 concurrent clients at 50/50 and 90/10 read/write mixes. Any correctness regression disqualified a result, so every optimization had to keep the full fault suite passing.

**Page visuals (no plots needed):** the RaftSim (Section 5.3) between items 4 and 5; an inline SVG of the node architecture (three services, two ports, the log between nodes); and an SVG sequence diagram of the request path in item 5. If you later recover the latency-throughput plots, add them under item 11.

## 7. Data model and file structure

All content lives in typed Astro content collections, so adding a project means adding one MDX file and nothing else.

**File tree**

```text
.
├── .github/workflows/deploy.yml
├── .cursorrules
├── astro.config.mjs
├── public/
│   ├── Rohan_Disa_Resume.pdf
│   ├── favicon.svg
│   └── og/                      # generated OG images
├── src/
│   ├── content.config.ts         # zod schemas for collections
│   ├── content/
│   │   ├── projects/*.mdx        # one per project
│   │   ├── experience.yaml
│   │   └── oss.yaml
│   ├── data/
│   │   ├── site.ts               # name, email, socials, pitch
│   │   └── heroTrace.ts          # scripted hero lines
│   ├── components/
│   │   ├── ui/                   # MetricChip, LaneTag, TraceLine, SpanBar
│   │   ├── ToolCallCard.astro
│   │   ├── Nav.astro / Footer.astro
│   │   └── islands/              # HeroTrace, CommandPalette, RaftSim, ThemeToggle
│   ├── layouts/Base.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── resume.astro
│   │   └── work/index.astro, work/[slug].astro
│   ├── assets/                   # images, plots (optimized by astro:assets)
│   └── styles/global.css         # tokens + Tailwind
└── README.md
```

**Project frontmatter schema** (`src/content.config.ts`)

```ts
const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string().max(160),
    lane: z.enum(['agents', 'systems', 'ml']),
    period: z.string(),               // "Jan 2026 – Apr 2026"
    order: z.number(),
    featured: z.boolean().default(false),
    stack: z.array(z.string()),
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).max(4),
    links: z.object({
      github: z.string().url().optional(),
      writeup: z.string().url().optional(),
      demo: z.string().url().optional(),
    }).default({}),
    interactive: z.enum(['raft-sim', 'trace-replay']).optional(),
    draft: z.boolean().default(false),
  }),
});
```

**Experience entry** (`experience.yaml`): `company`, `role`, `location`, `start` (YYYY-MM), `end` (YYYY-MM or `present`), `bullets` (list of `{text, metric?}`). **OSS entry** (`oss.yaml`): `repo`, `pr`, `url`, `summary`, `status`.

`draft: true` hides a project in production builds, which lets you stage the Raft page until its numbers are filled in.

## 8. Performance, accessibility and SEO

The site targets Lighthouse 95+ in all four categories, and a portfolio for a performance-minded engineer should visibly be fast.

**Performance budgets**

| Metric | Budget |
| --- | --- |
| Home page JS (gzipped, all islands) | under 40 KB |
| Largest Contentful Paint | under 1.5 s on simulated 4G |
| Cumulative Layout Shift | under 0.05 |
| Total home page weight | under 400 KB |
| Fonts | 2 families, woff2, `font-display: swap`, preload the 2 most-used weights |

- Hydrate islands with `client:visible` (RaftSim, CommandPalette loads on first keypress or click via `client:idle`); only `HeroTrace` uses `client:load`.
- Images through `astro:assets` (AVIF/WebP, explicit width and height). Plots preferably as SVG.
- Optional fun detail: a footer line showing the page's real build size and Lighthouse score, generated in CI.

**Accessibility**

- Semantic landmarks (`header`, `nav`, `main`, `footer`), one H1 per page, logical heading order.
- Every interactive element reachable by keyboard with a visible 2px `--accent` focus ring.
- The hero trace panel has `aria-live="off"` while animating plus a visually hidden plain-text summary, so screen readers are not flooded.
- RaftSim exposes its controls as real buttons with labels and mirrors state changes into the text event log.
- Theme respects `prefers-color-scheme` on first visit, then stores the choice in `localStorage`; set the theme in an inline head script to avoid a flash.

**SEO and sharing**

- Title pattern: `Rohan Disa · AI Agent Engineer` on home, `<Project> · Rohan Disa` on case studies.
- Meta description on every page, canonical URLs, `@astrojs/sitemap`, `robots.txt`.
- JSON-LD `Person` schema with name, jobTitle, alumniOf (USC), sameAs (GitHub, LinkedIn).
- Open Graph images (1200x630) generated at build time with `satori` in the agent-console style: name, project title and one metric chip.
- Privacy-friendly analytics optional: GoatCounter (free) works on GitHub Pages with one script tag.

## 9. Cursor build plan and open questions

Build in five phases, one Cursor session each, committing and deploying after every phase so the site is live from day one. Paste this whole spec into the repo as `SPEC.md` and point Cursor at it in each prompt.

**`.cursorrules` starter**

```text
You are building a static Astro 5 portfolio. Read SPEC.md before any change.
- TypeScript strict. Tailwind v4 with the CSS variable tokens in src/styles/global.css; never hardcode colors.
- Zero client JS unless the component is listed as an island in SPEC.md section 5.
- Content comes only from src/content and src/data; never hardcode project text in components.
- Respect prefers-reduced-motion in every animation.
- No API keys, no runtime network calls, no new dependencies without asking.
- Never use em dashes in site copy.
```

**Phases**

1. **Scaffold and deploy:** `npm create astro@latest`, add Tailwind, MDX, Preact, sitemap; tokens and fonts in `global.css`; `Base` layout with Nav, Footer, ThemeToggle; GitHub Actions workflow. Done when an empty styled page is live on `rohandisa.github.io`.
2. **Content layer:** collections and schemas from Section 7; `site.ts`, `experience.yaml`, `oss.yaml`; all 10 project MDX files with frontmatter and placeholder bodies. Done when `astro check` passes.
3. **Static pages:** home sections 2 to 7, `/work` with lane filters, `/work/[slug]` template, `/resume`. Done when every page renders correctly with JS disabled.
4. **Islands:** HeroTrace, then CommandPalette, then RaftSim (build the sim's state machine as a pure TS module with unit tests via Vitest before drawing anything). Done when budgets in Section 8 still hold.
5. **Polish:** OG images, JSON-LD, scroll reveals, Lighthouse pass, mobile QA at 375px and 768px, write the three flagship case-study bodies.

**Open questions before launch**

- [x] Ampere dates: June to August 2026 (completed internship).
- [x] Ampere case studies: described on the site without figures, framed as performance engineering work.
- [x] Ampere public scope: resume-level detail only, no code, internal names or screenshots (Section 6).
- [x] Raft project: C++ version, standalone engineering case study, private repo with "code walkthrough on request".
- [x] LangChain PRs: all three merged.
- [x] Domain: `rohandisa.github.io`, no custom domain.
- [x] GitHub links: agent-serve (CPU Inference Engine) and decode-kernel (W4A16) added.
- [x] Hero availability line set.
- [x] GitHub profile pins updated.
- [ ] Optional: if you still have the KV latency-throughput plots or a list of the optimizations you shipped, add them to the KV page.
