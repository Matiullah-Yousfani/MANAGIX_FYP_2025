# MANAGIX — UML Diagrams (Textbook Style)

> **Updated:** Detailed black-and-white UML diagrams (component, activity, ER, swimlane, class, sequence, deployment) — suitable for FYP reports and academic books.
>
> **Source files:** `Documentation/diagrams/source/*.mmd`  
> **Export PNGs:** run `.\scripts\export-diagrams.ps1` or paste each `.mmd` into [Mermaid Live](https://mermaid.live) → Theme **neutral** → Export PNG **3×**
>
> The older coloured AI-generated images in `Documentation/diagrams/01-07*.png` are illustrative only. Use the **`.mmd` sources** for proper UML.

**Stack:** React/Vite `:5173` → Azure Functions .NET 8 `:7005` → SQL Server + Python AI `:8000` / `:8001` / `:8002`

---

## Quick export (best quality for thesis)

1. Open `Documentation/diagrams/source/01-component-diagram.mmd` (or any file)
2. Copy all text → https://mermaid.live
3. **Theme:** neutral | **Background:** white
4. **Actions → PNG/SVG** at **3×** scale
5. Save as Fig 1, Fig 2, … in your report

Or run: `.\scripts\export-diagrams.ps1` → outputs to `Documentation/diagrams/uml/`

---

## Figure index (UML type → source file)

| Fig | UML diagram type | Source | Standard notation |
|-----|------------------|--------|-------------------|
| 1 | **Component diagram** (system blocks) | `source/01-component-diagram.mmd` | «component», «service», «database», layers |
| 2 | **Activity diagram** (system flow) | `source/02-activity-flow.mmd` | ● start, ◎ end, decisions ◇, data stores |
| 3 | **ER diagram** | `source/03-er-diagram.mmd` | Crow's foot, PK/FK, attributes |
| 4 | **Swimlane activity** | `source/04-swimlane-activity.mmd` | Partitions: Admin, Manager, Employee, QA, System |
| 5 | **Class diagram** | `source/05-class-diagram.mmd` | «entity», «service», +/- attributes, associations |
| 6 | **Sequence diagram** | `source/06-sequence-ai-planning.mmd` | «boundary», «control», alt/else, autonumber |
| 7 | **Deployment diagram** | `source/07-deployment-diagram.mmd` | «device», «executionEnvironment», «artifact», ports |

---

## Cursor prompts (textbook UML — black & white)

Use with: `Read Documentation/diagrams/source/[file].mmd and refine for FYP thesis. Theme neutral only. No colours.`

### Fig 1 — Component diagram
```
Refine 01-component-diagram.mmd as a formal UML component diagram: presentation, application, integration, persistence tiers. Stereotypes «component», «service», «database», «external». Black lines, white fill, Times New Roman, no colour.
```

### Fig 2 — Activity diagram (system flow)
```
Refine 02-activity-flow.mmd as UML activity diagram: filled circle start, bullseye end, diamond decisions, dashed data stores. Full MANAGIX lifecycle from signup to timesheet approval. Monochrome.
```

### Fig 3 — ER diagram
```
Refine 03-er-diagram.mmd: all 27 MANAGIX tables with PK/FK types, crow's foot cardinality, relationship labels. Academic Chen/Crow notation, black and white.
```

### Fig 4 — Swimlane diagram
```
Refine 04-swimlane-activity.mmd: horizontal partitions Admin, Manager, Employee, QA, System/AI. Cross-lane dashed handoff arrows. UML activity swimlanes.
```

### Fig 5 — Class diagram
```
Refine 05-class-diagram.mmd: domain entities with «entity», services with «service», visibility +/- on attributes, association multiplicities, dependency dashed arrows to services.
```

### Fig 6 — Sequence diagram (collaboration)
```
Refine 06-sequence-ai-planning.mmd: UML sequence for AI project planning. Stereotypes «boundary» «control» «entity» «external». alt/else for validation failure. autonumber messages.
```

### Fig 7 — Deployment diagram
```
Refine 07-deployment-diagram.mmd: UML deployment nodes on Windows workstation, artifacts local.settings.json and .env, ports 5173/7005/8000-8002, external Groq and ngrok.
```

---

## Related docs

- `Documentation/diagrams/README.md` — export instructions
- `Documentation/ANALYTICS_LOGIC.md` — heatmap, delay risk, budget formulas
- `Documentation/NGROK_DEPLOY.md` — tunnel setup
- `scripts/export-diagrams.ps1` — batch PNG export
- `scripts/start-local.ps1` — full local stack
