#!/usr/bin/env pwsh

param()

$secret = $env:JWT_SECRET
if (-not $secret) { $secret = 'demo-secret' }

$temp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), ([System.Guid]::NewGuid().ToString() + '.js'))

$js = @"
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || '$secret';
const make = (tenantId, role, isPlatformAdmin=false) => jwt.sign({ sub: 'demo-user', role, tenantId, isPlatformAdmin }, secret, { expiresIn: '7d' });
console.log('TENANT_A_TOKEN=' + make('demo-tenant-a','USER',false));
console.log('TENANT_A_ADMIN_TOKEN=' + make('demo-tenant-a','ADMIN',false));
console.log('TENANT_B_TOKEN=' + make('demo-tenant-b','USER',false));
"@

Set-Content -Path $temp -Value $js -Encoding UTF8

try {
    node $temp
} finally {
    Remove-Item -Path $temp -Force -ErrorAction SilentlyContinue
}
