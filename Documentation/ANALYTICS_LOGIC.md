# MANAGIX Analytics Logic

This document explains how the **Control Center → Analytics** view computes workload, delay risk, budget figures, and weekly charts. All values come from `MonitoringService.GetAdminDashboardAsync` (backend) and are shown in `AdminDashboard.tsx` (frontend).

---

## 1. Workload heatmap & user status

### Employees

| Input | Source |
|-------|--------|
| Active tasks | Tasks assigned to the user with status `Todo` or `InProgress` |
| Capacity | `UserProfile.WeeklyCapacityHours` (default **40h**) |
| Clocked hours | Sum of closed `TimeEntry` rows since start of current UTC week |
| Utilization | `clockedHours / capacity` if any clocked time this week, else `estimatedHours / capacity` |
| Estimated hours | Sum of `EstimatedHours` on active tasks (default **4h** per task if missing) |

**Status bands**

| Utilization | Label |
|-------------|--------|
| ≥ 100% | **Overloaded** |
| ≥ 85% | **Busy** |
| &lt; 85% | **Normal** |

**Example reason string:**  
`12.0h clocked this week vs 40h capacity · 3 active task(s)`

### Managers

Managers use a separate formula (they are not always assigned tasks directly):

```
utilization = min(1.0, activeProjects/5 + openTasksOnProjects/20)
```

| Term | Meaning |
|------|---------|
| `activeProjects` | Non-closed projects where `Project.CreatedBy == managerId` |
| `openTasksOnProjects` | Todo + InProgress tasks on those projects |

**Example (Sana at 100%):**  
`5 active project(s) (benchmark: 5) · 12 open task(s) on your projects (benchmark: 20) · Combined load at or above 100%`

### QA reviewers

```
utilization = min(1.0, pendingReviews / 8)
```

`pendingReviews` = submissions with status `Submitted` on projects where the QA is on the team.

### People list status (Online / Busy / Overloaded / Offline)

| Status | Rule |
|--------|------|
| **Online** | `LastActiveAt` within last **15 minutes** |
| **Overloaded** | Not online, but workload row is Overloaded |
| **Busy** | Not online, but workload row is Busy |
| **Offline** | Otherwise |

`StatusReason` on each user row repeats the workload explanation when applicable.

### Heatmap colors (frontend)

| Utilization | Color |
|-------------|--------|
| ≥ 100% | Red `#EF4444` |
| ≥ 85% | Amber `#F59E0B` |
| ≥ 60% | Indigo `#6366F1` |
| &lt; 60% | Green `#10B981` |

Hover a cell to see `WorkloadReason` from the API.

---

## 2. Delay risk (per project)

Computed in `ComputeDelayRisk(project, tasks, now)`:

| Condition | Risk % | Reason |
|-----------|--------|--------|
| Closed project | 0 | Completed |
| Past deadline with incomplete work | 95 | Past deadline with open work |
| Progress &gt; 35% behind expected pace | 85 | Behind schedule (actual vs elapsed timeline) |
| Deadline within 14 days and progress &lt; 75% | 72 | Deadline within 2 weeks |
| Progress &gt; 20% behind | 58 | Slightly behind pace |
| Progress ≥ expected | 12 | On track |
| Default | 28 | Normal pace |

**Expected progress** = `elapsedDays / totalProjectSpanDays` (capped at 100%).

**Dashboard cards**

- **Delay risk (count)** = active projects with `DelayRiskPct ≥ 55`
- **Avg risk** = mean `DelayRiskPct` across active projects

---

## 3. Budget overview

| Field | Calculation |
|-------|-------------|
| **Total budget** | Sum of `Budget` on all active (non-closed) projects |
| **Labor cost (est.)** | `PayrollService.GetOrganizationPayrollAsync()` — clocked hours × hourly rate, or estimated task hours × rate, or monthly salary fallback |
| **Budget remaining** | `Total budget − Total labor cost` |
| **Per-project labor** (health table) | Quick estimate: assigned tasks × `(EstimatedHours ?? 4) × $25` default rate |

---

## 4. Weekly charts

### Tasks approved per week

Counts `TaskSubmission` rows where:

- `Status == Approved`
- `ReviewedAt` falls in the UTC week bucket

Week labels start on Sunday (`today.DayOfWeek` offset). Eight buckets are shown (oldest → current).

### Hours worked per week

For each day in the week:

```
dayHours = max(submittedTimesheetHours, clockedTimeEntryHours)
weekTotal = sum(dayHours)
```

This includes **today's clocked time** even before a timesheet is submitted, fixing the "0 hours this week" gap when only live clock data exists.

Data sources:

- `DailyTimesheets` (last 60 days, up to 500 rows)
- Closed `TimeEntry` rows (last 60 days)

---

## 5. Task allocation dropdown (AI Team Hub)

Endpoint: `GET /api/ai/task-allocation-projects?managerId=...`

| Filter | Rule |
|--------|------|
| Scope | All projects if **Admin**; else `CreatedBy == managerId` |
| Status | Not closed |
| Tasks | At least one **open** task with **no assignee** (`AssignedEmployeeId` null or empty) |
| Team | `HasTeam` flag — `false` if no `ProjectTeam` row; project still listed so the title appears |

AI assignment requires `HasTeam == true` (team members are assignment targets).

---

## 6. Backend stability notes

- Start the API with **`dotnet run -- --port 7005`** (not raw `func start` on isolated .NET 8) — see `scripts/_managix-common.ps1`.
- Admin dashboard avoids per-project payroll HTTP-style loops; labor per project uses inline task estimates.
- **AI project creation** needs `resume_parser/ai_planner.py` on port **8001** with `GROQ_API_KEY` set. Worker crash `0xC00000FD` usually means restart the Functions host after heavy dashboard load or run AI services separately.

---

## 7. Quick troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Manager shows 100% / Overloaded | ≥5 active projects or ≥20 open tasks on their projects |
| Hours chart missing today | Old build — ensure clocked `TimeEntry` merge is deployed |
| No projects in task allocation | Admin logged in with manager filter (fixed: admin sees all); or no unassigned open tasks |
| Project in list but AI disabled | `HasTeam: false` — run **Suggest Team** first |
| AI planner toast on create | `ai_planner.py` not running or missing `GROQ_API_KEY` |
