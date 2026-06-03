# Cursor Agent Prompt — Managix FYP-2 Production Completion

Copy everything below into a new Cursor chat when continuing this project.

---

## Context

**Repo:** `D:\FYP-MANAGIX` (GitHub: `Matiullah-Yousfani/MANAGIX_FYP_2025`)

**Stack:**
- Backend: .NET 8 Azure Functions (`MANAGIX_BACKEND/MANAGIX_FYP_2025`), port **7005**
- Frontend: React + Vite (`MANAGIX_FRONTEND/managix`)
- AI: `resume_parser` (8000, 8001), `ai_allocation` (8002)

**Database:**
1. `dotnet ef database update` (DataAccess + FYP_2025 startup)
2. Run SQL scripts in order:
   - `MANAGIX.DataAccess/Migrations/Sql/20260510_FoundationFields.sql`
   - `MANAGIX.DataAccess/Migrations/Sql/20260531_MeetingLinkFields.sql`

**Branches:** `master` includes merged `Dev-Daniyal` (latest feature work). Other remotes may be behind.

---

## Your mission

Deliver a **production-ready FYP demo** by implementing and validating the roadmap below. Work end-to-end (backend + frontend + AI wiring). Match existing code style. Minimize unrelated diffs.

**Do NOT implement** large-scale test datasets, automated test suites, or Phase 8–9 testing documentation unless explicitly asked.

---

## Already done (verify, don’t redo blindly)

- Auth, roles, projects, teams, tasks, milestones, QA flow
- Resume parsing (AI L1), planner (L2), allocation (L3) — design + partial integration
- Methodology dashboards (Agile/Kanban/Waterfall)
- Workload panel, admin monitoring snapshots
- **Meeting module (partial):** manager schedules via `/meeting/schedule`, notifications with join link, join window (BeforeStart / Active / Expired), link cleared on expire

---

## Phase 1 — Core system stabilization (highest priority)

Validate and fix business rules across:

| Area | Rules |
|------|--------|
| Users | Unique email/username, approval login, role auth, block/delete dependencies |
| Projects | No duplicate names per manager, valid deadlines, ownership, closure workflow |
| Teams | Assignment rules, no duplicate memberships, remove/delete behavior |
| Tasks | Assignment, lifecycle, workload, status transitions |
| QA | Approve/reject/rollback |
| Meetings | Manager-only create, project required, participants = team + QA, join window, expire links |

---

## Phase 2 — Meeting module (extend if gaps)

Expected flow:
1. Manager creates meeting for a **selected project** (title, description, date/time, duration).
2. System resolves **project team employees + QA** as participants.
3. **Notifications** per participant: title, date/time, join button (disabled before window, enabled during, disabled/expired after).
4. After end time: status **Expired**, **MeetingLink** cleared.

Endpoints: `POST /meetings`, `GET /meetings/{id}/join-status/{userId}`, `GET /meetings/project/{id}/participants`.

Frontend: `/meeting/schedule`, `/meeting?meetingId=`, `NotificationCenter` join UX.

---

## Phase 3 — Admin monitoring dashboard

Ensure metrics are accurate and wired:
- Users: total, active, pending, blocked
- Projects: total, active, completed, delayed
- Tasks: todo, in progress, completed, approved, rejected
- Teams, meetings, AI usage stats

Backend: `MonitoringFunction` / `MonitoringService`. Frontend: `/admin/monitoring`.

---

## Phase 4 — Project closure report

When `Project.Status = Completed`, generate report with:
- Project info, team, milestones, tasks, performance, deliverables, AI insights

Implement API + PDF or printable UI if missing.

---

## Phase 5 — Workload management

- Active tasks = Todo | In Progress
- Categories: Low (0–2), Normal (3–5), High (6–8), Overloaded (>8)
- Block/warn on assign when overloaded; respect skills

Backend: `WorkloadService`. Frontend: `/workload`.

---

## Phase 6 — Detailed module views

Add or complete:
- Task detail (history, comments, deliverables, QA feedback)
- Milestone detail (% complete, child tasks)
- Team detail (members, projects, workload)
- Employee detail (skills, tasks, workload)
- Insights dashboard (trends, delays)

---

## Phase 7 — AI module validation

| Layer | Validate |
|-------|----------|
| L1 Resume | Skills, experience, education, projects extraction |
| L2 Planner | Milestone/task quality, budget, timeline |
| L3 Allocation | Skill match, workload, confidence scores |

Ensure `local.settings.json` has `AiPlannerUrl`, `AiAllocationUrl`, `ResumeParserUrl` and Python services run.

---

## Phase 10 — Project model views

Agile / Waterfall / Hybrid tabs — extend `MethodologyDashboard` if incomplete.

---

## Final demo checklist

- [ ] Full lifecycle: Register → Project → AI plan → Team → Tasks → Meeting → QA → Close
- [ ] No critical console/API errors on happy path
- [ ] SQL migrations applied
- [ ] Docs: architecture, AI design, user manual (as available)

---

## Working rules

1. Fetch `git fetch --all` before large changes; merge only if ahead of local `master`.
2. Build backend (`dotnet build`) and frontend (`npm run build`) after substantive edits.
3. Never commit secrets (`.env`, `local.settings.json` keys).
4. Ask the user only when business rules are ambiguous; otherwise follow this doc.

---

## Quick run order

1. SQL scripts + EF update  
2. `MANAGIX_FYP_2025` (7005)  
3. `npm run dev` in `managix`  
4. Python: `fastapi_app.py` (8000), `ai_planner.py` (8001), `ai_allocation_app.py` (8002)
