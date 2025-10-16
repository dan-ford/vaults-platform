# PowerShell script to start the FastAPI agent service
# Run this from the level-ops directory

# Check if we're in the correct directory
if (-not (Test-Path "agent\main.py")) {
    Write-Host "ERROR: Must run this script from the level-ops directory!" -ForegroundColor Red
    Write-Host "Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "Please run: cd level-ops" -ForegroundColor Cyan
    Write-Host "Then run: .\start-agent.ps1" -ForegroundColor Cyan
    exit 1
}

Write-Host "Starting VAULTS RAG Agent Service..." -ForegroundColor Green
Write-Host "Running from: $PWD" -ForegroundColor Cyan

# Set PYTHONPATH to include the current directory
$env:PYTHONPATH = "$PWD"

# Start uvicorn
Write-Host "Starting uvicorn on http://127.0.0.1:8000 ..." -ForegroundColor Green
uvicorn agent.main:app --reload --port 8000 --host 0.0.0.0
