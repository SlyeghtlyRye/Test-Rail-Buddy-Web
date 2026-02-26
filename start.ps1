$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Kill-SafePort {
    param([int]$Port)
    $allowedNames = @("python", "node", "uvicorn")
    $connections = netstat -ano | Select-String ":$Port\s"
    $pids = $connections | ForEach-Object {
        ($_.ToString().Trim() -split '\s+')[-1]
    } | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique

    foreach ($p in $pids) {
        $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
        if ($null -ne $proc) {
            if ($allowedNames -contains $proc.Name) {
                Write-Host "Stopping $($proc.Name) (PID $p) on port $Port" -ForegroundColor Yellow
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            } else {
                Write-Host "Skipping PID $p ($($proc.Name)) on port $Port - not a known app process" -ForegroundColor Red
            }
        }
    }
}

Write-Host "Checking ports..." -ForegroundColor Cyan
Kill-SafePort -Port 8000
Kill-SafePort -Port 5173
Start-Sleep -Seconds 1

Write-Host "Starting backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; python -m uvicorn app.main:app --port 8000 --log-level info"

Write-Host "Starting frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
Write-Host "TestRail Buddy is running." -ForegroundColor Green