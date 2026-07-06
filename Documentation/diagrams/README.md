# Export UML diagrams to PNG (textbook style)

Requires Node.js. Installs `@mermaid-js/mermaid-cli` on first run.

```powershell
cd D:\FYP-MANAGIX
.\scripts\export-diagrams.ps1
```

Output: `Documentation/diagrams/uml/` — black-and-white, high-resolution PNGs.

## Manual export (Mermaid Live Editor)

1. Open `Documentation/diagrams/source/*.mmd`
2. Paste into https://mermaid.live
3. Theme: **neutral**
4. Export PNG at **3×** scale for thesis print

## Files

| File | UML type |
|------|----------|
| `02-activity-flow| `01-component-diagram.mmd` | Component diagram (layered architecture) |
.mmd` | Activity diagram (main business flow) |
| `03-er-diagram.mmd` | Entity-relationship diagram |
| `04-swimlane-activity.mmd` | Activity diagram with swimlane partitions |
| `05-class-diagram.mmd` | Class diagram (domain + services) |
| `06-sequence-ai-planning.mmd` | Sequence diagram (AI project planning) |
| `07-deployment-diagram.mmd` | Deployment diagram |
