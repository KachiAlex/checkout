#!/usr/bin/env bash
# Simple script to print two demo JWTs (tenant A and tenant B)
# Requires: node present. Uses JWT_SECRET env or falls back to 'demo-secret'.

set -euo pipefail

JWT_SECRET=${JWT_SECRET:-"demo-secret"}

node - <<'NODE'
const jwt = require('jsonwebtoken');
const secret = process.env.JWT_SECRET || 'demo-secret';
const make = (tenantId, role, isPlatformAdmin=false) => jwt.sign({ sub: 'demo-user', role, tenantId, isPlatformAdmin }, secret, { expiresIn: '7d' });
console.log('TENANT_A_TOKEN=' + make('demo-tenant-a','USER',false));
console.log('TENANT_A_ADMIN_TOKEN=' + make('demo-tenant-a','ADMIN',false));
console.log('TENANT_B_TOKEN=' + make('demo-tenant-b','USER',false));
NODE

echo "\nTokens printed. Use them as: ./run-demo.sh \"$TENANT_A_TOKEN\" \"$TENANT_B_TOKEN\""
