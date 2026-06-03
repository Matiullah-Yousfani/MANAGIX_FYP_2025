# MANAGIX — Claude prompt for test CV PDFs

Use this in **Claude** (claude.ai or Claude in Cursor). Attach your **sample CV PDF** on the first message so layout/style can match it.

**Goal:** 18 dummy résumés for FYP testing — **no Admin** (admin account already exists).

| Role | Count | Use in MANAGIX |
|------|-------|----------------|
| Employee (developers, etc.) | 10 | Profile → AI résumé upload → suggest team / task allocation |
| Manager | 4 | Same upload path; used as managers in projects |
| QA | 4 | Same upload path; required on every project team |

---

## Copy everything below into Claude

```
You are helping me create TEST résumés for MANAGIX, a Final Year Project (FYP) web app.

## What MANAGIX does (so CV content fits)
- Azure Functions backend + React frontend.
- Users upload a PDF/DOC résumé; Python resume_parser (Groq LLM) extracts: name, email, phone, summary, education[], skills[], projects[], experience[].
- AI team suggestion only includes people with résumé uploaded AND skills listed.
- Every project team must have at least 1 Employee + 1 QA.
- Roles: Employee (devs), QA, Manager, Admin (Admin CV not needed).
- Pakistani context: use Pakistani names, cities (Lahore, Karachi, Islamabad, Rawalpindi), universities (FAST, NUST, LUMS, COMSATS, UET, GIKI, Bahria), and local company names (Systems Limited, NETSOL, Arbisoft, Confiz, 10Pearls, Folio3, Telenor Pakistan, Jazz, etc.) — all fictional job details are fine.

## My sample
I attached a sample CV PDF. Match its general structure (sections, length, professional tone) but each person must be UNIQUE — different skills, titles, projects, and experience. Do not copy the sample’s name or employers.

## Deliverables
Create **18 separate CVs** as **PDF-ready content** (see output format below).

### Roster (use these exact names and roles)

**Employees (10)** — vary specializations; skills must match role:
1. Ahmed Hassan — Full Stack Developer (React, Node, C#, SQL Server)
2. Fatima Zahra — Frontend Developer (React, TypeScript, Tailwind, Figma)
3. Usman Ali — Backend Developer (.NET, Azure Functions, EF Core, REST APIs)
4. Ayesha Malik — Mobile App Developer (Flutter, Dart, Firebase, REST)
5. Bilal Khan — DevOps / Cloud (Azure, Docker, CI/CD, Kubernetes basics)
6. Hira Sheikh — UI/UX + Frontend (Figma, React, accessibility)
7. Omar Farooq — Data / Backend (Python, SQL, ETL, reporting)
8. Zainab Qureshi — QA-minded Developer (automation, Selenium, C#) — still Employee role
9. Hassan Raza — .NET Developer (ASP.NET Core, MVC, SQL)
10. Mariam Noor — React Native / cross-platform mobile

**Managers (4)** — emphasize leadership, delivery, stakeholders; fewer deep tech stacks than devs:
11. Kamran Siddiqui — IT Project Manager (Agile, Scrum, Jira, stakeholder management)
12. Sana Tariq — Engineering Manager (team lead, code review, hiring, .NET projects)
13. Imran Javed — Product / Project Manager (roadmaps, requirements, UAT)
14. Rabia Ashraf — Senior PM (budget, risk, vendor coordination, Waterfall + Agile)

**QA (4)** — emphasize testing, quality, test plans, bug tracking; not primary developers:
15. Danish Mahmood — Manual + API QA (Postman, SQL, test cases, JIRA)
16. Laiba Akhtar — Automation QA (Selenium, Cypress, CI test pipelines)
17. Faisal Iqbal — QA Lead (test strategy, regression, UAT coordination)
18. Nida Sarwar — Mobile + Web QA (device testing, exploratory testing)

## Rules for every CV
- **Email:** firstname.lastname@test.managix.pk (unique per person)
- **Phone:** +92 3XX XXXXXXX (unique, realistic)
- **Address line:** City, Pakistan only
- **Summary:** 3–5 lines tailored to role (Manager = delivery/teams; QA = quality; Employee = tech stack)
- **Education:** 1–2 degrees (BS CS / SE / IT typical)
- **Skills:** 8–15 comma-separated or bullet skills — MUST be explicit (parser relies on this)
- **Experience:** 2–3 roles, 1–3 years each, Pakistani or remote-for-Pakistan companies
- **Projects:** 2–3 academic or freelance-style projects with 1–2 line descriptions
- **Length:** 1–2 pages equivalent; clean headings: Contact | Summary | Education | Skills | Experience | Projects
- **No photo required.** No Admin CV.

## Output format (important)
For **each** of the 18 people, output in this order:

---
### CV [number]: [Full Name] — [Role type: Employee | Manager | QA] — [Job title on CV]

Then provide **one** of the following (your choice, but all 18 must be easy to turn into PDF):
- **Option A:** Clean Markdown I can paste into Word/Google Docs and Export as PDF, OR
- **Option B:** A single HTML file per person in a fenced code block (`html ...`) with inline CSS for A4 print.

After all 18, add a **table**:
| # | Name | Role in MANAGIX | Primary skills (5) | Email |
|---|------|-----------------|-------------------|-------|

## Batch workflow
If context is limited, do **6 CVs per reply** in order (1–6, then 7–12, then 13–18) and ask me to say "continue" between batches.

Start with CV 1–6 now.
```

---

## After Claude responds

1. Paste each CV into **Word** or **Google Docs** → **File → Download as PDF**.
2. Name files clearly, e.g. `cv_ahmed_hassan_employee.pdf`, `cv_kamran_siddiqui_manager.pdf`, `cv_danish_mahmood_qa.pdf`.
3. In MANAGIX, register users (Employee / Manager / QA) with emails from the table, then **Profile → AI Résumé Parser** → upload matching PDF.
4. Fill **Skills** on profile if parser misses any (AI allocation needs skills + résumé).

## Shorter follow-up prompts

**Continue batch:**
```
Continue MANAGIX test CVs: generate CVs 7–12 only (same rules and roster from before). Same Markdown/HTML format.
```

**One role only:**
```
Generate only the 4 QA test CVs for MANAGIX (Danish Mahmood, Laiba Akhtar, Faisal Iqbal, Nida Sarwar). Pakistani names, skills heavy on testing tools, PDF-ready Markdown each.
```

**Match sample layout only:**
```
Rewrite CV #3 (Usman Ali — Backend) as print-ready HTML matching the attached sample PDF layout exactly. Keep Pakistani dummy data.
```

## Quick test matrix (suggested)

| Test | Who to use |
|------|------------|
| Suggest team (needs Employee + QA) | e.g. Ahmed + Danish on same project |
| Task allocation confidence | Employees with clear skill lists (Fatima, Usman) |
| Manager owns teams | Kamran / Sana as `CreatedBy` managers |
| QA review queue | Laiba / Faisal after employee submits task |

---

*Admin account is excluded on purpose — use your existing admin login.*
