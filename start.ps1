# Start TestRail Buddy (backend + frontend)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .venv\Scripts\activate; python -m uvicorn app.main:app --reload --port 8000"

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

# Wait a moment for servers to start then open browser
Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"