# MANAGIX — Module Test Cases (FYP Submission)

**Format:** Use this table in your report appendix. Fill the **Result** column when you execute tests: `Pass` | `Fail` | `Not Tested` | `Later`.

**Test environment prerequisites**

| Service | Port | Folder |
|---------|------|--------|
| SQL Server + EF migrations | — | `dotnet ef database update` |
| Backend (Azure Functions) | 7071 / 7005 | `MANAGIX_BACKEND\MANAGIX_FYP_2025` |
| Frontend (Vite) | 5173 | `MANAGIX_FRONTEND\managix` |
| Resume / CV AI | 8000 | `resume_parser` |
| AI Project Planner | 8001 | `resume_parser` (`ai_planner.py`) |
| AI Team & Task Allocation | 8002 | `ai_allocation` |

**Seeded admin (first backend start):** `admin@gmail.com` / `427736Admin*` / name `admin`  
**Roles auto-created:** Admin, Manager, Employee, QA

**Employee level rule (implemented):** Junior (0–2 completed projects), Intermediate (3–5), Senior (6+) — updated when a project is **closed**.

---

## 1. Authentication & authorization

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC01 | Authentication | Valid admin credentials (`admin@gmail.com`, `427736Admin*`) | Login success; JWT returned; role Admin; redirect to dashboard | |
| TC02 | Authentication | Valid approved user email + correct password | Login success; JWT; role matches approved role | |
| TC03 | Authentication | Valid email + wrong password | Login rejected; error message (authentication failure) | |
| TC04 | Authentication | Unregistered email | Login rejected; user not found or invalid credentials | |
| TC05 | Authentication | Empty email or password | Validation error; no token issued | |
| TC06 | User Registration | Valid signup (name, email, password, role request) | User request created with **Pending** status; not in active users table yet | |
| TC07 | User Registration | Duplicate email (already registered or pending) | Registration rejected; message indicates email already registered or pending | |
| TC08 | User Registration | Invalid email format | Client or server validation error | |
| TC09 | Authentication | Pending user attempts login (not yet approved) | Login blocked; message **Account pending approval** | |
| TC10 | Authentication | Rejected user attempts login | Login blocked; rejection message shown | |
| TC11 | User Approval | Admin approves pending user with Employee role | User moves to active directory; can login as Employee | |
| TC12 | User Approval | Admin approves pending user with Manager role | User can login as Manager; sees manager menu | |
| TC13 | User Approval | Admin rejects pending user with comment | Request status Rejected; user cannot login | |
| TC14 | User Approval | Non-admin calls `GET /management/pending-users` with employee JWT | HTTP **403 Forbidden** | |
| TC15 | User Approval | Non-admin calls approve-user API | HTTP **403 Forbidden** | |
| TC16 | Role Access Control | Employee opens `/create-project` in browser | Redirect or no access to manager create flow | |
| TC17 | Role Access Control | Manager opens `/admin` | Redirect away from admin portal | |
| TC18 | Role Access Control | QA opens manager-only team AI page | No manager team-setup actions (role-gated UI) | |
| TC19 | Database Bootstrap | Fresh DB; start backend first time | Roles Admin/Manager/Employee/QA exist; admin user seeded once | |
| TC20 | Database Bootstrap | Restart backend when admin already exists | No duplicate admin user (idempotent seed) | |
| TC21 | Authentication | Logout | Token cleared from storage; protected routes require login | |

---

## 2. Admin portal

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC22 | Admin Portal | Admin opens `/admin?tab=overview` | Overview tab with quick links loads | |
| TC23 | Admin Portal | Admin opens Requests tab | Pending users list; approve/decline actions | |
| TC24 | Admin Portal | Admin opens Directory tab | All approved users; change role; delete (except self) | |
| TC25 | Admin Portal | Admin opens **Projects** tab; selects a project | Project detail: title, milestones, tasks, members; Gantt timeline visible | |
| TC26 | Admin Portal | Admin opens closed project; clicks Closure report | Closure report modal loads; JSON download available | |
| TC27 | Admin Portal | Admin opens Workload tab | Workload heatmap / employee utilization list loads | |
| TC28 | Admin Portal | Admin opens Monitoring tab | System KPIs, project health, overloaded employees | |
| TC29 | Admin Portal | Admin opens Payroll tab | Organization payroll / labor cost summary | |
| TC30 | Admin Portal | Admin deletes own account from directory | Blocked; cannot delete self | |
| TC31 | Admin Portal | Admin deletes user assigned to active team | Delete blocked or conflict message (dependency) | |
| TC32 | Admin Portal | Admin deletes user with no assignments | User removed successfully | |
| TC33 | Admin Portal | Admin changes role of user on active project (blocked role) | Operation blocked with clear message | |
| TC34 | Admin Portal | Duplicate approve same pending request twice | No duplicate users; idempotent or error | |
| TC35 | Admin Portal | Admin views project not in system | Empty state or not found | |

---

## 3. Profile, CV upload & AI resume parsing

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC36 | Profile | Employee updates bio, skills, phone | Profile saved via PUT `/profile/{userId}` | |
| TC37 | Profile | Employee sets hourly rate on profile | Hourly rate persisted; visible on insights/payroll hints | |
| TC38 | Profile | User opens profile without login | Redirect to login | |
| TC39 | CV Upload (AI) | Valid PDF/DOCX resume upload (port 8000 running) | Parsed JSON returned; skills/education populated in form | |
| TC40 | CV Upload (AI) | Resume upload while Python service stopped | Clear error; backend indicates parser unavailable | |
| TC41 | CV Upload (AI) | Invalid file type (e.g. .txt only) | Upload rejected or parse error | |
| TC42 | CV Upload (AI) | Empty file upload | Validation error | |
| TC43 | CV Upload (AI) | Save parsed resume profile after review | Resume profile stored; usable for AI allocation signals | |
| TC44 | Profile | Manager/QA updates profile (non-employee) | Profile fields update; resume section per role rules | |

---

## 4. Create project & AI planning

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC45 | Create Project | Manager completes 3-step create with valid title, deadline, budget | Project created in database | |
| TC46 | Create Project | AI planner running (8001); manager requests AI plan | Milestones and tasks suggested/created from AI response | |
| TC47 | Create Project | AI planner stopped during create | Graceful error message; manager can still save manual plan or retry | |
| TC48 | Create Project | Missing required fields (title/deadline) | Validation error; project not created | |
| TC49 | Create Project | Invalid deadline (past date) | Validation error or warning | |
| TC50 | Create Project | Employee attempts create project API/UI | Access denied / route not available | |
| TC51 | Create Project | Manager launches project after plan | Project status active; visible on dashboard | |
| TC52 | Create Project | Duplicate project title (same manager) | Allowed or warning per business rules; no DB crash | |
| TC53 | Project Model | AI suggests methodology (Agile/Kanban/Waterfall) | Project model/methodology stored; dashboard view matches | |

---

## 5. Milestones & tasks

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC54 | Milestone Management | Create milestone with valid project ID and deadline | Milestone created; listed under project | |
| TC55 | Milestone Management | Milestone deadline after project deadline | Rejected: deadline cannot be after project deadline | |
| TC56 | Milestone Management | Negative milestone budget | Rejected: budget cannot be negative | |
| TC57 | Milestone Management | Update milestone status to Completed | Status updated; reflected in timeline/progress | |
| TC58 | Task Management | Create task under milestone with assignee | Task created with status Todo (or default) | |
| TC59 | Task Management | Create task without milestone (if allowed) | Task created or validation per API rules | |
| TC60 | Task Management | Manager edits task title/description | Task updated successfully | |
| TC61 | Task Management | Assign employee not on project team | Blocked or warning per assignment rules | |
| TC62 | Task Management | Delete task with submission | Blocked or cascade per implementation | |

---

## 6. Team creation & assignment (incl. AI)

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC63 | Team Management | Manager creates team and adds employees | Employees linked in TeamEmployees | |
| TC64 | Team Management | Assign team to project | ProjectTeam link; members active on project | |
| TC65 | Team Management | Add employee already on **another active project** | Rejected: already on active project team message | |
| TC66 | Team Management | Assign same team to two projects | Second assignment rejected (team already assigned) | |
| TC67 | AI Team Suggestion | AI allocation service up; suggest 3 team options | Up to 3 team options returned with scores; uses workload/hourly rate/level | |
| TC68 | AI Team Suggestion | Fewer than 3 employees available | Fewer options returned; no crash | |
| TC69 | AI Team Suggestion | No eligible employees (all busy) | Empty or message; no invalid UUID assignments | |
| TC70 | AI Team Suggestion | AI service down (8002) | HTTP 502/504 or error message; UI shows failure | |
| TC71 | AI Task Assignment | Manager clicks assign tasks via AI | Tasks distributed considering workload, skills, level | |
| TC72 | AI Task Assignment | Employee not on team excluded from assignment | Assignee only from project team members | |
| TC73 | Team Management | Duplicate same employee in same team twice | Prevented by unique index or UI validation | |

---

## 7. Kanban board & task status workflow

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC74 | Kanban Board | Employee drags task Todo → InProgress | Status updated | |
| TC75 | Kanban Board | Employee drags InProgress → Done | Status Done; available for QA review | |
| TC76 | Kanban Board | Employee skips Todo → Done | Rejected: invalid transition | |
| TC77 | Kanban Board | Employee sets status to Approved | Rejected: only QA can approve | |
| TC78 | Kanban Board | Manager views Kanban for project | All project tasks visible by column | |
| TC79 | Kanban Board | QA views task hub | QA sees review-related views; not manager assign UI | |
| TC80 | Kanban Board | Approved task dragged back to Todo | Rejected: approved tasks locked | |

---

## 8. Task submission (employee)

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC81 | Task Submission | Employee submits task with file when status Done | Submission stored; status Submitted/pending QA | |
| TC82 | Task Submission | Submit without file (if comment only allowed) | Per API: submission or validation message | |
| TC83 | Task Submission | Submit task still in Todo | Rejected or workflow error | |
| TC84 | Task Submission | Submit same task twice | Second handled (update or reject duplicate) | |
| TC85 | Task Submission | File too large / unsupported type | Upload error with message | |

---

## 9. QA portal

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC86 | QA Review | QA opens `/qa/review` | Queue shows tasks in Done/Submitted state | |
| TC87 | QA Review | QA approves submitted task | Task status **Approved** | |
| TC88 | QA Review | QA rejects with comment | Task returned to InProgress (or per reject flow); comment stored | |
| TC89 | QA Review | QA downloads submission file | File download succeeds | |
| TC90 | QA Review | Employee attempts QA approve API | Forbidden or unauthorized | |
| TC91 | QA Review | QA approves task not in Done state | Rejected: must be Done before Approved | |
| TC92 | QA Review | QA profile and meeting links accessible | Same as other roles where applicable | |

---

## 10. Project detail, timeline & close

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC93 | Project Detail | Open `/projects/{id}` as manager | Header, milestones, tasks, Gantt section load | |
| TC94 | Project Detail | Open project as assigned employee | Only assigned project data visible | |
| TC95 | Project Timeline | View Gantt/timeline API | Bars by milestones; overall % from tasks/milestones | |
| TC96 | Project Close | Manager closes active project | Status Completed/closed; team released (`IsActive` cleared) | |
| TC97 | Project Close | After close, employee available for new team | Can join new project team | |
| TC98 | Project Close | Employee `CompletedProjectsCount` increments | Level recalculated (Intermediate at 3+, Senior at 6+) | |
| TC99 | Project Close | Closure report on closed project | Report shows deliverables, QA stats, performance | |
| TC100 | Project Close | Close already closed project | Idempotent or conflict message | |
| TC101 | Project Detail | Unassigned employee opens project URL | No access or empty/not found | |

---

## 11. Workload management

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC102 | Workload | Manager opens `/workload` | All employees utilization displayed | |
| TC103 | Workload | Employee over 90% capacity threshold | Appears in overloaded alert list | |
| TC104 | Workload | Employee with zero tasks | Low utilization; no division-by-zero crash | |
| TC105 | Workload | AI allocation receives workload hours in payload | Allocation prefers less loaded employees | |
| TC106 | Workload | Multiple active tasks sum under weekly capacity | Utilization % calculated consistently | |

---

## 12. Meetings

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC107 | Meeting | Manager schedules meeting for project with date/time/link | Meeting created; participants notified | |
| TC108 | Meeting | Participants include project team + QA | Auto-enrolled per meeting rules | |
| TC109 | Meeting | Employee joins **before** start time | Join state **BeforeStart**; gate blocks or warns | |
| TC110 | Meeting | Employee joins during scheduled window | Join state **Active**; meeting accessible | |
| TC111 | Meeting | Employee joins after meeting day/end | Join state **Expired**; link invalid | |
| TC112 | Meeting | Today meeting banner on dashboard | Banner visible all day until expired that day | |
| TC113 | Meeting | Notification click opens join flow | Navigates to meeting with correct meetingId | |
| TC114 | Meeting | Manager extracts tasks from notes (AI 8001) | Suggested tasks returned or empty if no key | |
| TC115 | Meeting | Non-participant tries join | Access denied | |

---

## 13. Employee portal (timesheet, insights, notifications)

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC116 | Timesheet | Employee clock in | Open entry created; summary shows clocked in | |
| TC117 | Timesheet | Employee clock out | Hours calculated; entry closed | |
| TC118 | Timesheet | Heartbeat while logged in | `LastActiveAt` updated; **Online** on summary | |
| TC119 | Timesheet | No heartbeat for extended period | Shows offline | |
| TC120 | Employee Insights | Employee opens `/insights` | Tasks completed, hours, level, utilization shown | |
| TC121 | Employee Insights | Employee views only own insights | No other user’s data | |
| TC122 | Notifications | Bell shows unread count | Badge updates when notification created | |
| TC123 | Notifications | Mark notification read | Count decreases | |
| TC124 | Employee Dashboard | Employee sees only assigned projects on `/projects` | List matches team assignment | |

---

## 14. Manager tracking & payroll

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC125 | Manager Dashboard | Methodology-specific dashboard (Agile/Kanban/Waterfall) | Correct widgets for project model | |
| TC126 | Manager Dashboard | Performance link `/performance/{projectId}` | Performance metrics load | |
| TC127 | Payroll | Manager opens `/payroll`; selects project | Labor cost vs budget; per-employee hours × rate | |
| TC128 | Payroll | Employee without hourly rate | Default rate used in estimate (e.g. 25) | |
| TC129 | Payroll | Admin org payroll tab | All projects/employees cost summary | |

---

## 15. AI services integration (cross-cutting)

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC130 | AI Integration | All three Python services running | Health endpoints respond 200 | |
| TC131 | AI Integration | Invalid `GROQ_API_KEY` | AI endpoints fail gracefully with logged error | |
| TC132 | AI Integration | Suggest team returns only valid employee UUIDs | No assignment to non-existent users | |
| TC133 | AI Integration | Planner generates milestones with tasks | JSON structure matches backend DTO | |
| TC134 | AI Integration | Allocation uses `HourlyRate`, `EmployeeLevel`, workload | Request payload includes fields (verify logs/network) | |

---

## 16. Negative tests — delete, duplicate, security

| Test Case ID | Module | Input | Expected Output | Result |
|--------------|--------|-------|-----------------|--------|
| TC135 | Data Integrity | Delete project with active team | Cascade or block per rules; no orphan crash | |
| TC136 | Data Integrity | Delete user who is QA on meeting | Blocked or dependency message | |
| TC137 | Data Integrity | Register two users same email simultaneously | One succeeds; one duplicate error | |
| TC138 | Security | API call without JWT to protected endpoint | 401 Unauthorized | |
| TC139 | Security | Expired or tampered JWT | 401 Unauthorized | |
| TC140 | Security | Employee JWT on admin monitoring API | 403 Forbidden | |

---

## Test execution summary (fill after testing)

| Module | Total cases | Pass | Fail | Not tested |
|--------|-------------|------|------|------------|
| Authentication | 21 | | | |
| Admin portal | 14 | | | |
| Profile / CV / AI | 9 | | | |
| Create project | 9 | | | |
| Milestones & tasks | 9 | | | |
| Team & AI assign | 11 | | | |
| Kanban | 7 | | | |
| Task submission | 5 | | | |
| QA | 7 | | | |
| Project detail / close | 9 | | | |
| Workload | 5 | | | |
| Meetings | 9 | | | |
| Employee / timesheet | 9 | | | |
| Manager / payroll | 5 | | | |
| AI integration | 5 | | | |
| Negative / security | 6 | | | |
| **Total** | **140** | | | |

---

## Report deliverables checklist (your “missing” items)

Use this when preparing the final FYP document.

### A. Database tables update

| # | Item | Done? |
|---|------|-------|
| A1 | ER diagram includes: Users, UserRequests, Roles, Projects, Milestones, Tasks, TeamEmployees, Meetings, Notifications, TimeEntries, UserProfiles | ⬜ |
| A2 | Table descriptions mention `IsActive` / single active project rule | ⬜ |
| A3 | New columns documented: `HourlyRate`, `EmployeeLevel`, `CompletedProjectsCount`, `LastActiveAt`, `TimeEntries` | ⬜ |
| A4 | Migration names listed in appendix | ⬜ |

### B. Screenshots (suggested list)

| # | Screenshot | Done? |
|---|------------|-------|
| B1 | Login + signup pending message | ⬜ |
| B2 | Admin portal — each tab (Overview, Requests, Projects, Workload, Monitoring, Payroll) | ⬜ |
| B3 | Manager — create project + AI plan | ⬜ |
| B4 | Team setup + 3 AI team options | ⬜ |
| B5 | AI task assignment | ⬜ |
| B6 | Kanban board (manager + employee) | ⬜ |
| B7 | Task submission + QA approve/reject | ⬜ |
| B8 | Project detail + Gantt timeline | ⬜ |
| B9 | Project close + closure report | ⬜ |
| B10 | Meeting schedule + join gate + today banner | ⬜ |
| B11 | Employee profile + CV parse + timesheet | ⬜ |
| B12 | Employee insights page | ⬜ |
| B13 | Workload panel | ⬜ |
| B14 | Payroll (manager + admin) | ⬜ |

### C. Appendix contents

| # | Appendix section | File / reference |
|---|------------------|------------------|
| C1 | Test cases (this document) | `Documentation/FYP_MODULE_TEST_CASES.md` |
| C2 | Detailed phase test steps | `Documentation/TEST_CASES_PHASE_0_TO_5.md` |
| C3 | Feature status vs spec | `Documentation/PROJECT_FLOW_STATUS.md` |
| C4 | Submission walkthrough | `Documentation/FYP_SUBMISSION_CHECKLIST.md` |
| C5 | API endpoint list (optional) | Backend Functions / Swagger if generated |
| C6 | AI service ports diagram | 8000 / 8001 / 8002 |

---

## Notes for examiner / viva

1. **Approval gate:** Registration does not allow login until admin approves (TC09–TC13).  
2. **Single active project:** Enforced in DB index + `TeamProjectGuards` (TC65–TC66).  
3. **AI is optional at runtime** but required for full demo of planning/allocation (TC46–TC47, TC67–TC70).  
4. **Employee level** increases on project **close**, not merely assignment (TC98).  
5. **Admin power** has dependency checks — cannot freely delete assigned users/projects (TC31–TC33).

---

*Document version: FYP submission — align Result column with your own test run before printing the appendix.*
