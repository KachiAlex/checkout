#!/usr/bin/env pwsh

param(
  [Parameter(Mandatory=$true)] [string]$TenantAToken,
  [Parameter(Mandatory=$true)] [string]$TenantBToken
)

$api = 'http://localhost:3000'

Write-Host "=== Create an order as Tenant A ==="
$body = @{ items = @( @{ sku = 'demo-sku'; qty = 1 } ); total = 100 } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri "$api/api/orders" -Method Post -Body $body -ContentType 'application/json' -Headers @{ Authorization = "Bearer $TenantAToken" }
Write-Host ($resp | ConvertTo-Json -Depth 5)

Write-Host "`n=== List orders as Tenant A (should show the order) ==="
$listA = Invoke-RestMethod -Uri "$api/api/orders" -Method Get -Headers @{ Authorization = "Bearer $TenantAToken" }
Write-Host ($listA | ConvertTo-Json -Depth 5)

Write-Host "`n=== Try to GET orders as Tenant B (should be empty or not include A's order) ==="
$listB = Invoke-RestMethod -Uri "$api/api/orders" -Method Get -Headers @{ Authorization = "Bearer $TenantBToken" }
Write-Host ($listB | ConvertTo-Json -Depth 5)

Write-Host "`n=== If you have a sync worker running, watch worker logs for processing of the order.created event ==="
