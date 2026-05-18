# MANAGIX — End-to-End Test Cases (Phase 0 → Phase 5)

> Branch: `Dev-Daniyal` (already synced to `master`).
> Run every step in order. Each test is independent enough to run on its own once the prerequisites are met, but the database/SQL prep must come first.

---

## 0. One-time setup

### 0.1 Apply the database migration

1. Open SSMS or Azure Data Studio and connect to the **MANAGIX** database used by your local backend.
2. Open
   `MANAGIX_BACKEND/MANAGIX.DataAccess/Migrations/Sql/20260510_FoundationFields.sql`.
3. Execute the entire file. It is **idempotent** — re-running is safe.
4. Confirm at the bottom of the messages pane:
   `PHASE 0 — FoundationFields migration applied successfully.`

#### How to confirm the schema looks right
Run these read-only checks; they should all return rows:

```sql
SELECT TOP 1 ModelName, Methodology FROM ProjectModels;
SELECT TOP 1 ProjectId, IsActive, CreatedAt FROM TeamEmployees;
SELECT TOP 1 EstimatedHours, StoryPoints, Priority, RequiredSkillsJson FROM Tasks;
SELECT TOP 1 WeeklyCapacityHours FROM userProfiles;
SELECT name FROM sys.tables WHERE name IN ('Meetings','MeetingParticipants','Notifications','MonitoringSnapshots');
SELECT name FROM sys.indexes WHERE name = 'IX_TeamEmployee_Employee_ActiveProject';
```

The last query must return one row — that's the filtered unique index that enforces "one active project per employee".

### 0.2 Backfill methodology values (optional, only if your existing rows have weird names)

The script already pattern-matches `Agile`/`Scrum`/`Kanban`/`Waterfall`/`Hybrid`/`Lean`/`XP`. If you have a custom name like "Spiral", run:

```sql
UPDATE ProjectModels SET Methodology = 'Hybrid' WHERE Methodology IS NULL;
```

### 0.3 Start the services

In separate terminals:

| Service | Folder | Command | Port |
|---|---|---|---|
| Backend (.NET Functions) | `MANAGIX_BACKEND/MANAGIX_FYP_2025` | `func start` (or run from VS) | 7005 |
| AI Planner / Extractor (Python) | `resume_parser` | `python ai_planner.py` | 8001 |
| AI Allocator (Python) | `ai_allocation` | `python ai_allocation_app.py` | 8002 |
| Frontend (Vite) | `MANAGIX_FRONTEND/managix` | `bun run dev` | 5173 |

If you don't have a Groq key set in `.env`, the AI extractor still works — it returns an empty task list gracefully (no 500). The C# backend logs a warning and the modal shows "no clear action items".

---

## Phase 0 — Foundation (schema)

### TC-0.1 Single-active-project DB constraint

**Goal:** Prove the database itself rejects double-booking an employee.

1. Pick any active employee — call their UUID `<EMP>`. They should already be on a team that's linked to a project (so a row in `TeamEmployees` with `IsActive = 1` and `ProjectId` set exists).
2. In SSMS try to insert a *second* active row for the same employee on a different project:

   ```sql
   INSERT INTO TeamEmployees (Id, TeamId, EmployeeId, ProjectId, IsActive, CreatedAt)
   VALUES (NEWID(), '<some other TeamId>', '<EMP>', '<some other ProjectId>', 1, SYSUTCDATETIME());
   ```

3. **Expected:** SQL Server raises a unique-constraint violation referencing
   `IX_TeamEmployee_Employee_ActiveProject`. The insert fails. ✅
4. As a control, insert a row with `IsActive = 0` — that **must succeed** because the index is filtered.

---

## Phase 1 — AI allocation fixes

### TC-1.1 `Suggest Employees` excludes already-assigned employees

**Goal:** verify the cross-project filter.

1. Make sure you have **at least 5 employees**, of which 2 are already on Project A's team (rows in `TeamEmployees` with `ProjectId = <A>`, `IsActive = 1`).
2. Log in as a **Manager** who owns Project B (different from A) and open the AI allocation page (sidebar → Team Setup → AI Suggest Employees, or directly call the endpoint).
3. Run **Suggest Employees** with a project description but **without** specifying `projectId` (company-wide search).
4. **Expected:** the recommendation list does not include the 2 employees who are already on Project A. ✅
5. Now repeat with the same call but with `IncludeAlreadyAssigned: true` in the request body — the 2 employees re-appear.

> Quick API check (PowerShell):
> ```powershell
> Invoke-RestMethod -Uri "http://localhost:7005/api/ai/suggest-employees" -Method Post -ContentType application/json -Body '{"projectDescription":"e-commerce backend","includeAlreadyAssigned":false}'
> ```

### TC-1.2 Task allocation never lands on a non-team member

1. Open Project B in the manager dashboard.
2. Add a few tasks (a couple with `Priority = High`, fill `EstimatedHours = 8`, `RequiredSkillsJson = ["C#","SQL"]`).
3. Trigger AI Suggest Task Allocation for Project B.
4. **Expected response:**
   - Every `userId` in `taskAssignments` is one of the project's team members.
   - Each entry has the new `scoreSkill / scoreCapacity / scoreApproval / scoreTotal` numbers.
   - When the LLM mis-fires, you see `overrodeLlm: true` plus a Reason ending with
     "Overridden by deterministic skill/capacity scoring." ✅

### TC-1.3 Workload rebalance keeps anyone under 120% capacity

1. On a fresh project, give a single employee `WeeklyCapacityHours = 8`.
2. Create 3 tasks each `EstimatedHours = 5` (total 15h → 187%).
3. Run Suggest Task Allocation.
4. **Expected:** the lowest-priority task is reassigned to another team member (its Reason ends with "Rebalanced to keep workload under 120%"). The chosen employee is now ≤ 9.6h (120% of 8). ✅

---

## Phase 2 — Methodology dashboards

### TC-2.1 Different layout per project type

1. In the database, set methodology values manually (or via project model name) so you have at least one project per type:

   ```sql
   UPDATE ProjectModels SET Methodology = 'Scrum'     WHERE ModelId = '<A>';
   UPDATE ProjectModels SET Methodology = 'Kanban'    WHERE ModelId = '<B>';
   UPDATE ProjectModels SET Methodology = 'Waterfall' WHERE ModelId = '<C>';
   ```

2. Make sure each project's `ModelId` points to the right `ProjectModel`.
3. Login as the Manager / Admin who can see all of them and open `/dashboard`.
4. **Expected:** you see three separate sections — *Scrum / Agile sprints*, *Kanban flow*, *Waterfall phases* — each with its own layout and accent colour. ✅
   - Scrum cards: 3 KPI tiles (Active / Done / Backlog), velocity bar mini-chart, indigo accent.
   - Kanban cards: 3 columns (Backlog / In Progress / Done), WIP-limit warning when In Progress > 5, blue accent.
   - Waterfall cards: phase strip with circular phase markers, orange accent, deadlines visible.
5. Each card shows the methodology pill in the top-right corner (uses `MethodologyBadge`).

### TC-2.2 Admin edit/delete still works

The old inline admin edit/delete buttons moved into the project details modal (since the inline cards are gone).

1. Login as Admin.
2. Click any project card on `/dashboard` → details modal opens with all info.
3. Click **Edit Project** → the modal switches to the edit form. Change a title, save → toast shows success, dashboard refreshes. ✅
4. Click a project again, then **Delete** → confirmation modal → confirm → project disappears.

---

## Phase 3 — Workload management

### TC-3.1 Workload panel renders

1. Login as Manager or Admin.
2. Sidebar shows a new **Workload** entry → click it → URL `/workload`.
3. **Expected:** KPI strip (Tracked employees / Avg utilisation / Over 90%) + a heatmap of every employee's utilization band (green ≤ 60%, indigo ≤ 90%, orange ≥ 90%, red ≥ 100%). ✅

### TC-3.2 Capacity math

1. Pick an employee; in SQL set `WeeklyCapacityHours = 10` for them.
2. Assign two tasks of `EstimatedHours = 4` each to them, status `Todo` or `InProgress`.
3. Refresh `/workload`.
4. **Expected:** their row shows 8.0h / 10h, 80% utilisation. ✅
5. Add a third task of 4h. Refresh.
6. **Expected:** 12.0h / 10h, 120% utilisation, **red** band, employee appears in the *Capacity alerts* card and `/workload/overloaded?threshold=0.9` returns them.

### TC-3.3 API smoke

```powershell
Invoke-RestMethod http://localhost:7005/api/workload/employee/<userId>
Invoke-RestMethod http://localhost:7005/api/workload/project/<projectId>
Invoke-RestMethod "http://localhost:7005/api/workload/overloaded?threshold=0.9"
```

Each should return JSON matching the DTO shapes from `WorkloadDto.cs`.

---

## Phase 4 — Meetings, AI task generation, notifications

### TC-4.1 Notification bell appears + polls

1. Login as any user. The bell icon appears top-right of the main content area.
2. Insert a test notification:

   ```sql
   INSERT INTO Notifications (NotificationId, UserId, Type, Title, Body, Link, IsRead, CreatedAt)
   VALUES (NEWID(), '<your userId>', 'TaskAssigned', 'Test notification', 'Hello from SQL', '/dashboard', 0, SYSUTCDATETIME());
   ```

3. Within 30 seconds the bell badge shows **1** without refreshing the page. ✅
4. Click the bell → dropdown shows the notification. Click it → it marks read (badge → 0) and navigates to `/dashboard`.
5. Click "Mark all read" — works and clears any unread.

### TC-4.2 Schedule a meeting via API

```powershell
$body = @{
  projectId = "<projectId>"
  title = "Sprint planning"
  scheduledAt = (Get-Date).AddMinutes(30).ToString("o")
  durationMinutes = 30
  jitsiRoomName = "MANAGIXSprintPlanning"
  createdBy = "<your userId>"
  participantUserIds = @("<userId1>", "<userId2>")
} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:7005/api/meetings -ContentType application/json -Body $body
```

**Expected:**
- 201 with the persisted meeting (including `meetingId`).
- Each participant (other than the creator) receives a `MeetingInvite` notification — visible in their bell. ✅

### TC-4.3 Full meeting → transcript → AI extraction → tasks

1. Login as a Manager, navigate to `/meeting`.
2. Conduct a short Jitsi meeting (or use the existing manual "Upload Recording" path with a known WAV/MP3 file).
3. Wait for the transcript card to appear.
4. Click **Generate Tasks with AI** (the new emerald button next to "Download Transcript").
5. The new modal opens. Pick a target project from the dropdown. Click *Generate suggestions*.
6. **Expected:**
   - Loader spinner.
   - A list of suggested tasks appears (could be 0 if transcript is short / planner offline — see "graceful degrade" below).
   - Each suggestion shows: title (editable), description (editable), suggested assignee chip, priority chip, hours chip, skills chips, a **Keep** checkbox.
7. Untick suggestions you don't want, edit titles freely, click *Create N tasks*.
8. **Expected:** all kept suggestions appear under the project's tasks (verify on `/projects/<projectId>` or by reading `/api/tasks/project/<projectId>`).

#### Graceful-degrade test
Stop the Python planner (Ctrl-C in the `ai_planner.py` terminal) and re-run step 5. **Expected:** modal shows the error "AI extractor unreachable …" with a *Try again* link — no white screen, no crash.

### TC-4.4 Cross-service notifications

After TC-4.3, if your account was a participant of the meeting, your bell shows the `MeetingInvite` from when the meeting was created. ✅

---

## Phase 5 — Admin monitoring

### TC-5.1 Admin gating

1. Login as a non-Admin and visit `/admin/monitoring` directly.
2. **Expected:** "Admin only" card with the orange triangle icon. ✅
3. Login as Admin. Sidebar now shows **Monitoring** under *Admin Control* → click → page loads.

### TC-5.2 KPI strip + project health

On the Admin monitoring page you should see:

| Tile | Sanity check |
|---|---|
| Active projects | Count matches `SELECT COUNT(*) FROM Projects WHERE IsClosed = 0`. |
| Overdue | Active projects whose `Deadline < UtcNow` AND not all tasks are Done. |
| Avg utilisation | Average across all employees with at least one active task; tile turns red ≥ 100%. |
| Overloaded | Same threshold as `/workload/overloaded?threshold=0.9`. |
| Blocked tasks | Count of tasks with `Status = 'InProgress' AND CreatedAt < UtcNow - 7 days`. |

### TC-5.3 Project health drill-down

1. Click any row in the *Project health* table.
2. **Expected:** modal with 6 small stats:
   - Tasks done X/Y, On-time ratio %, Avg utilisation %, Overloaded members count, Milestones X/Y, Status badge (Healthy/Overdue). ✅
3. Force-create an overdue project (set `Deadline` to yesterday in SQL, leave at least one non-Done task).
4. Refresh the panel — the row's Status pill flips to **Overdue** and the project appears in the overdue KPI count.

### TC-5.4 API contract (smoke)

```powershell
Invoke-RestMethod http://localhost:7005/api/monitoring/system
Invoke-RestMethod http://localhost:7005/api/monitoring/project/<projectId>
```

Both should return JSON matching `SystemHealthDto` / `ProjectHealthDto`.

---

## Regression tests (don't break existing flows)

These are the scenarios I deliberately preserved while making the changes — please re-verify:

| # | Test | Pass criteria |
|---|---|---|
| R1 | Login + signup | Same as before. |
| R2 | Manager creates a new project (3-step CreateProject) | AI planning still works; project saves; lands on the dashboard. |
| R3 | Manager assigns a team to a project | Team Setup page works; new TeamEmployee rows now also have `ProjectId` and `IsActive=1` set (insert UI may not fill these — for now backfill with: `UPDATE TeamEmployees SET ProjectId = '<id>' WHERE TeamId = '<tid>'`). |
| R4 | Employee submits a task, QA reviews | `/qa/review` and TaskSubmit flow unchanged. |
| R5 | Resume parsing | Resume parser still works (Phase 1 only added DTO fields; service unchanged). |
| R6 | Existing `/projects/{id}/dashboard` endpoint | Still returns the original `ProjectDashboardDto` shape — Phase 2 reuses it for aggregates. |

---

## Known limitations / scope notes

- **Auth on new endpoints:** the new Notification / Meeting / Workload / Monitoring functions are `AuthorizationLevel.Anonymous` to match the rest of the codebase. Role gating is client-side. A future security pass should add JWT-claim validation.
- **Single TeamEmployee insertion path:** existing code paths that insert into `TeamEmployees` without setting `ProjectId` / `IsActive` will create rows that are *invisible* to the cross-project filter (default IsActive=1 from the DB default still applies, ProjectId will be NULL). The Phase-0 SQL backfill handles this for existing rows; new inserts should also start setting these (TODO for the team).
- **Velocity sparkline (Agile view):** placeholder array — not yet sourced from real sprint data. The view renders without it; we'll wire it in once we have a sprint table.
- **AI risk summary** in Project Health is `null` for now. The infra is in place — the Python planner just needs a `/risk-summary` endpoint to return a 2-sentence narrative; trivial to add later.

---

## Quick smoke recipe (5-minute sanity)

If you only have 5 minutes before a demo:

1. ✅ Run the SQL migration (TC-0.1 control insert).
2. ✅ Start backend + planner + allocator + frontend.
3. ✅ `/dashboard` shows methodology-aware sections.
4. ✅ `/workload` loads with at least one row.
5. ✅ `/admin/monitoring` (as Admin) loads with KPI tiles populated.
6. ✅ Bell icon visible top-right; insert a test notification, see badge bump.
7. ✅ Hit Suggest Task Allocation on any project — response includes `scoreTotal` and never assigns to a non-team member.

If all 7 pass, you're good for the demo.
