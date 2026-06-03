# MANAGIX — FYP submission checklist

Use this over the next few days. For each item mark:

- **✅ Pass** — tested, works, screenshot/note taken if needed  
- **❌ Fail** — broken; write what happened under **Notes**  
- **⏳ Later** — OK for submission if minor; fix after demo/viva  
- **⬜ Not tested** — still to do  

Keep a simple notebook or copy the **Notes / Later** section at the bottom.

**Related docs:** `PROJECT_FLOW_STATUS.md` (what’s built), `TEST_CASES_PHASE_0_TO_5.md` (detailed TCs).

---

## Suggested schedule (few days before submit)

| Day | Focus |
|-----|--------|
| **Day 1** | Environment + DB + all 4 services start reliably |
| **Day 2** | Auth → Admin → Manager (create project, team, AI, close) |
| **Day 3** | Employee + QA + meetings + notifications |
| **Day 4** | New features: timesheet, insights, Gantt, closure, payroll, admin tabs |
| **Day 5** | Full demo run + record video + fix only **blockers** |
| **Day 6** | Report/slides align with what you actually demo |

You do **not** need 50 users. Use **1 admin, 1 manager, 1 QA, 5–10 employees**, **2 projects** (one active, one closed).

---

## A. Environment (do first)

| # | Check | Status | Notes |
|---|--------|--------|-------|
| A1 | SQL Server running; connection string in `local.settings.json` correct | ⬜ | |
| A2 | `dotnet ef database update` succeeds (or “already up to date”) | ⬜ | |
| A3 | Backend starts: `cd MANAGIX_BACKEND\MANAGIX_FYP_2025` → `func start` | ⬜ | Port ~7071 or 7005 |
| A4 | Frontend: `cd MANAGIX_FRONTEND\managix` → `npm run dev` → http://localhost:5173 | ⬜ | |
| A5 | AI resume parser :8000 — `resume_parser\.env` has `GROQ_API_KEY` | ⬜ | http://127.0.0.1:8000/ |
| A6 | AI planner :8001 — same folder `.env` | ⬜ | http://127.0.0.1:8001/docs |
| A7 | AI allocation :8002 — `ai_allocation\.env` | ⬜ | http://127.0.0.1:8002/docs |
| A8 | Quick start script: `cd scripts` → `.\start-ai-services.ps1` | ⬜ | |
| A9 | Admin auto-seed: login `admin@gmail.com` / `427736Admin*` | ⬜ | |

**Optional fresh DB for clean demo:** new database name or drop DB → migrate → restart backend → re-register users only.

---

## B. Auth & roles

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| B1 | Signup new user → status pending | ⬜ | |
| B2 | Pending user **cannot** login (clear message) | ⬜ | |
| B3 | Admin approves with role Employee / Manager / QA | ⬜ | |
| B4 | Approved user can login; JWT stored; sidebar role correct | ⬜ | |
| B5 | Admin rejects user with comment | ⬜ | |
| B6 | Wrong password → error | ⬜ | |
| B7 | Logout clears session | ⬜ | |

---

## C. Admin portal (`/admin?tab=...`)

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| C1 | Non-admin redirected away from admin routes | ⬜ | |
| C2 | Tab **Overview** loads | ⬜ | |
| C3 | Tab **Requests** — approve / decline | ⬜ | |
| C4 | Tab **Directory** — change role, delete user (not self) | ⬜ | |
| C5 | Tab **Projects** — list, detail, Gantt, closure report (closed project) | ⬜ | |
| C6 | Tab **Workload** — heatmap / list loads | ⬜ | |
| C7 | Tab **Monitoring** — KPIs, project health | ⬜ | |
| C8 | Tab **Payroll** — organization summary | ⬜ | |
| C9 | Management API without admin token → **403** (optional Postman) | ⬜ | |

---

## D. Manager flow

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| D1 | Create project (3-step) + AI plan generates milestones/tasks | ⬜ | Needs :8001 |
| D2 | Dashboard shows project; methodology view (Agile/Kanban/Waterfall) | ⬜ | |
| D3 | Team setup — add employees to team | ⬜ | |
| D4 | **One active project per employee** — second assign blocked or handled | ⬜ | |
| D5 | AI suggest **3 team options** (Teams page) | ⬜ | Needs :8002 |
| D6 | AI task allocation | ⬜ | |
| D7 | Create / edit milestones and tasks | ⬜ | |
| D8 | Kanban / task hub works | ⬜ | |
| D9 | Schedule meeting → participants notified | ⬜ | |
| D10 | Workload panel (`/workload`) | ⬜ | |
| D11 | Close project → team released; status completed | ⬜ | |
| D12 | After close: **closure report** button + download JSON | ⬜ | |
| D13 | **Gantt / timeline** on project detail | ⬜ | |
| D14 | Payroll by project (`/payroll`) | ⬜ | |

---

## E. Employee flow

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| E1 | `/projects` shows only assigned projects | ⬜ | |
| E2 | Open project → tasks / milestones | ⬜ | |
| E3 | Task hub / Kanban — move task, submit work | ⬜ | |
| E4 | Profile — edit bio/skills; **hourly rate** saves | ⬜ | |
| E5 | Resume upload + AI parse | ⬜ | Needs :8000 |
| E6 | **Timesheet** — clock in / clock out | ⬜ | |
| E7 | **Online** indicator (heartbeat after login) | ⬜ | |
| E8 | **Insights** page (`/insights`) | ⬜ | |
| E9 | Meeting room — join gate (before / during / after) | ⬜ | |
| E10 | Today meeting banner on dashboard | ⬜ | |
| E11 | Notifications — bell, join meeting from notification | ⬜ | |

---

## F. QA flow

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| F1 | QA review queue lists submitted tasks | ⬜ | |
| F2 | Approve task → status Approved | ⬜ | |
| F3 | Reject → back to employee with comment | ⬜ | |
| F4 | Download / view submission file if applicable | ⬜ | |

---

## G. AI integration (viva talking points)

| # | Check | Status | Notes |
|---|--------|--------|-------|
| G1 | Planner down → create project still degrades gracefully (error message, not crash) | ⬜ | |
| G2 | Allocator down → team suggest shows error, app usable | ⬜ | |
| G3 | Resume parser down → profile upload fails clearly | ⬜ | |
| G4 | Meeting notes → extract tasks (if you demo this) | ⬜ | |

---

## H. Regression (must not break)

| # | Scenario | Status | Notes |
|---|----------|--------|-------|
| H1 | Login / signup still OK | ⬜ | |
| H2 | Manager create project end-to-end | ⬜ | |
| H3 | Employee submit → QA approve path | ⬜ | |
| H4 | Performance dashboard `/performance/:projectId` | ⬜ | |

---

## I. Submission deliverables (non-code)

| # | Item | Status | Notes |
|---|------|--------|-------|
| I1 | Final report chapters match **what you demo** | ⬜ | |
| I2 | Architecture diagram (FE → API → DB → AI ports) | ⬜ | |
| I3 | Demo video (10–15 min): full role walkthrough | ⬜ | |
| I4 | Screenshots for each module in report | ⬜ | |
| I5 | GitHub repo clean README: how to run (DB, AI, backend, FE) | ⬜ | |
| I6 | Remove/secrets: `.env` not committed; rotate Groq key if shared | ⬜ | |

---

## J. 15-minute demo script (practice twice)

1. **Login Admin** — show portal tabs (requests → projects → monitoring → payroll).  
2. **Login Manager** — create project with AI plan → team + 3 AI options → one task assigned.  
3. **Login Employee** — profile (rate + timesheet) → task submit → insights.  
4. **Login QA** — approve one task.  
5. **Manager** — schedule meeting; show notification on employee.  
6. **Manager** — close project → closure report + Gantt.  
7. Mention: JWT admin on management APIs, single active project rule, Groq on 8000/8001/8002.

---

## K. Known “Later” backlog (OK to defer if not blocking viva)

Copy issues here as you test:

| Item | Priority | Your notes |
|------|----------|------------|
| Closure report PDF (JSON works today) | Low | |
| Performance recalc / full performance module | Low | |
| JWT on every project endpoint (management covered) | Medium | |
| 50+ seed users for scale demo only | Optional | |
| Velocity sparkline real data (Agile dashboard) | Low | |
| AI risk summary in monitoring | Low | |
| | | |
| | | |

---

## L. Blockers log (fix before submit)

Only things that **stop the demo**:

| # | Problem | Fix attempted | Fixed? |
|---|---------|---------------|--------|
| 1 | | | ⬜ |
| 2 | | | ⬜ |
| 3 | | | ⬜ |

---

## Quick commands reference

```powershell
# DB
cd D:\FYP-MANAGIX
dotnet ef database update --project "MANAGIX_BACKEND\MANAGIX.DataAccess\MANAGIX.DataAccess.csproj" --startup-project "MANAGIX_BACKEND\MANAGIX_FYP_2025\MANAGIX_FYP_2025.csproj"

# AI (3 windows)
cd D:\FYP-MANAGIX\scripts
.\start-ai-services.ps1

# Backend
cd D:\FYP-MANAGIX\MANAGIX_BACKEND\MANAGIX_FYP_2025
func start

# Frontend
cd D:\FYP-MANAGIX\MANAGIX_FRONTEND\managix
npm run dev
```

---

*Last updated: submission prep — tick boxes in this file or your own notebook as you go.*
