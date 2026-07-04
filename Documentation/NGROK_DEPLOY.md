# Ngrok public access for MANAGIX

## How it works (free ngrok plan)
- **One tunnel** exposes port **5173** (Vite frontend).
- Vite **proxies** `/api` to `http://127.0.0.1:7005` (Azure Functions backend).
- AI services **8000 / 8001 / 8002** stay on localhost; the backend calls them directly (no ngrok needed for AI).

## Prerequisites
1. **Backend:** `func start` in `MANAGIX_BACKEND/MANAGIX_FYP_2025`
2. **Frontend:** `npm run dev` in `MANAGIX_FRONTEND/managix`
3. **AI:** `.\scripts\start-ai-services.ps1` from repo root

## CORS (one-time)
In `MANAGIX_BACKEND/MANAGIX_FYP_2025/local.settings.json`:
```json
"Host": {
  "CORS": "*",
  "CORSCredentials": false,
  "LocalHttpPort": 7005
}
```
Restart `func start` after changing CORS.

## Start ngrok
```powershell
cd D:\FYP-MANAGIX
.\scripts\start-ngrok.ps1
```

The script will print your **public URL** (e.g. `https://xxxx.ngrok-free.dev`).

## After starting
1. **Restart Vite** if it was already running (`Ctrl+C` then `npm run dev`).
2. Open the **printed ngrok URL** in the browser (not only 127.0.0.1:4040).
3. Optional: inspect tunnels at http://127.0.0.1:4040 (local dashboard only).

## Stop ngrok
```powershell
Stop-Process -Name ngrok -Force
```

## Troubleshooting
| Problem | Fix |
|---------|-----|
| `127.0.0.1:4040` won't load | ngrok did not start — re-run `.\scripts\start-ngrok.ps1` and read errors |
| API calls fail on ngrok URL | Restart Vite after script runs; ensure backend on 7005 |
| Meeting AI fails | Run `.\scripts\start-ai-services.ps1` (planner on **8001**) |
| Old `ngrok.yml` error | Use `start-ngrok.ps1` only; it uses `ngrok http 5173` |

## Token
Stored in gitignored `ngrok.local.env`. Configure once:
```powershell
ngrok config add-authtoken YOUR_TOKEN
```
