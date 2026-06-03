# MANAGIX — Project Flow Status (vs FYP-2 Spec)

Use with **`Documentation/MANAGIX_FYP2_CURSOR_PROMPT.md`** for continued work.

**After pulling latest code, run:**

```powershell
cd D:\FYP-MANAGIX
dotnet ef database update --project "MANAGIX_BACKEND\MANAGIX.DataAccess\MANAGIX.DataAccess.csproj" --startup-project "MANAGIX_BACKEND\MANAGIX_FYP_2025\MANAGIX_FYP_2025.csproj"
```

Restart the Functions host so **admin seed** runs once.

---

## Auth module

| Requirement | Status |
|-------------|--------|
| Roles: Admin, Manager, Employee, QA | **Was available** — via DB / `POST /roles` |
| Auto seed roles + admin on startup | **Was NOT** → **Now added** (`DatabaseBootstrapService`) |
| Admin: `admin@gmail.com` / `427736Admin*` / name `admin` | **Now added** (first run only) |
| Register → pending, cannot login until approved | **Was available** — working |
| Reject/pending messages on login | **Was available** |

---

## Admin module

| Requirement | Status |
|-------------|--------|
| Approve/reject users, directory, role change | **Was available** |
| Admin-only page guard | **Was NOT** → **Now added** (client redirect) |
| Project list with full detail | **Was available** — `/dashboard` modal + `GET /projects/admin/{id}` |
| Users tab in one portal | **Now added** — unified `AdminPortal` tabs (overview, requests, directory, projects, workload, monitoring, payroll) |
| Workload graphs | **Now in portal** — Workload tab; `/workload` still works for managers |
| Server-side JWT admin on management APIs | **Now added** — `AuthHttpHelper.RequireAdminAsync` on pending-users, approve/reject/delete, monitoring, org payroll |
| Delete with dependency checks (users) | **Was available** |
| Delete project (cascade) | **Was available** — no soft dependency UI for all entities |

---

## Manager module

| Requirement | Status |
|-------------|--------|
| Create project + AI plan + launch | **Was available** |
| AI team suggestion | **Was available** (1 team) |
| **3 team options** | **Was NOT** → **Now added** (`/ai/suggest-team-options`) |
| Single employee / one active project | **Partial in DB** → **Now enforced** on add-to-team + assign + close |
| AI task assign + workload in AI payload | **Was available** |
| Kanban + task hub | **Was available** |
| Schedule meeting + notifications | **Was available** (recent) |
| Project close frees team | **Was NOT** → **Now added** |
| Employee level on close | **Was NOT** → **Now added** (Junior / Intermediate / Senior) |
| Timeline bar (Gantt) | **Now added** — `GET /projects/{id}/timeline` + `ProjectGantt` on project detail & admin projects tab |
| Project closure report | **Now added** — `GET /projects/{id}/closure-report` + `ClosureReportModal` |
| Payroll (manager/admin) | **Now added** — `/payroll` + admin Payroll tab |

---

## Employee module

| Requirement | Status |
|-------------|--------|
| Profile + CV parse | **Was available** |
| See assigned projects | **Was broken** on `/projects` → **Now fixed** (`getByEmployee`) |
| Kanban + submit task | **Was available** |
| Meeting join + notifications | **Was available** |
| **Sticky meeting banner all day** | **Was NOT** → **Now added** (`TodayMeetingBanner`) |
| Timesheets / online presence | **Now added** — clock in/out, heartbeat in `Layout`, `TimesheetWidget` on profile |
| Personal insights dashboard | **Now added** — `/insights` (`EmployeeInsights`) |
| Hourly rate on profile (AI hints) | **Now added** — editable on Employee/Manager profile |

---

## QA module

| Requirement | Status |
|-------------|--------|
| Review queue, approve/reject, download | **Was available** |

---

## AI services (ports 8000 / 8001 / 8002)

Must be running for planner / allocation / resume. Backend sends **workload hours, capacity, approval rate, employee level, hourly rate** to allocation AI.

---

## Still to build (optional polish)

- Closure report **PDF** export (JSON download exists)
- Performance recalc completion
- Broader server-side JWT on all project endpoints (management routes are covered)
