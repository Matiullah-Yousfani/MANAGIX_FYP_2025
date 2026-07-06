# Ngrok public access for MANAGIX

## Scripts

| Action | Local (no tunnel) | Ngrok (public URL) |
|--------|-------------------|---------------------|
| **Start** | `.\scripts\start-local.ps1` | `.\scripts\start-ngrok.ps1` |
| **Stop** | `.\scripts\stop-local.ps1` | `.\scripts\stop-ngrok.ps1` |

**Local** starts backend + frontend + AI on your machine only.  
**Ngrok** starts the same stack, then exposes port 5173 with a public URL.

Options:
```powershell
.\scripts\start-local.ps1 -SkipAi    # skip Python AI (8000-8002)
.\scripts\start-ngrok.ps1 -SkipAi   # same, with ngrok
```

## How it works (free ngrok plan)
- **One tunnel** exposes port **5173** (Vite frontend).
- Vite **proxies** `/api` to `http://127.0.0.1:7005` (Azure Functions backend).
- AI services **8000 / 8001 / 8002** stay on localhost; the backend calls them directly (no ngrok needed for AI).

## Prerequisites (auto-detected)
- **func** — Azure Functions Core Tools (PATH, npm global, or `%LOCALAPPDATA%\AzureFunctionsTools\...`)
- **npm** — Node.js
- **ngrok** — only for `start-ngrok.ps1`

Install func if missing:
```powershell
winget install Microsoft.Azure.FunctionsCoreTools
# or
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

## CORS (one-time)
In `MANAGIX_BACKEND/MANAGIX_FYP_2025/local.settings.json`:
```json
"Host": {
  "CORS": "*",
  "CORSCredentials": false,
  "LocalHttpPort": 7005
}
```
Restart backend after changing CORS.

## After starting ngrok
1. Open the **printed ngrok URL** in the browser (not only 127.0.0.1:4040).
2. Click **Visit Site** on the ngrok warning page if shown.
3. Restart Vite if `.env.development.local` was updated.

## Tunnel only (Vite already running)
```powershell
.\scripts\start-ngrok-tunnel.ps1
.\scripts\restart-ngrok.ps1   # fix ERR_NGROK_8012
```

## Troubleshooting
| Problem | Fix |
|---------|-----|
| `func not found` | Install Core Tools (see above), then re-run |
| `127.0.0.1:4040` won't load | ngrok did not start — re-run `start-ngrok.ps1` |
| API calls fail on ngrok URL | Ensure backend on 7005; restart Vite |
| `ERR_NGROK_8012` | Restart Vite, then `.\scripts\restart-ngrok.ps1` |
| Meeting AI fails | AI must be running (don't use `-SkipAi`) |

## Token
Stored in gitignored `ngrok.local.env`. Configure once:
```powershell
ngrok config add-authtoken YOUR_TOKEN
```
