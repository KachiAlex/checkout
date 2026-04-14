#!/usr/bin/env pwsh
Write-Host "Running demo DB seed (Prisma)"

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js not found in PATH. Install Node.js to run this script."
  exit 1
}

Push-Location (Split-Path -Path $MyInvocation.MyCommand.Definition -Parent)
try {
  node .\seed-demo-data.js
} finally {
  Pop-Location
}
