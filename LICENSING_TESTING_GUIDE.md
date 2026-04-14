# 🧪 Licensing System Testing Guide

## Quick Start

### Backend Server Status
Server is running on **http://localhost:3000**

### Database
- **Host**: ep-late-wind-aemwrxse-pooler.c-2.us-east-2.aws.neon.tech
- **Database**: migration
- **Tables**: License, LicenseAudit, DeviceRegistration, BackupManifest

## Testing Endpoints

### 1. Create a License (Admin Only)
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$body = @{
    businessId = "test-biz-001"
    businessName = "Test Business Ltd"
    tier = "STARTER"
    expiryDate = "2026-12-31T23:59:59Z"
    features = @("offline-enabled", "backup-enabled")
    maxUsers = 5
    maxLocations = 1
    offlineEnabled = $true
    backupEnabled = $true
    createdBy = "admin-user-id"
    updatedBy = "admin-user-id"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/platform/licenses" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected Response**: 201 Created
```json
{
  "id": "<generated-uuid>",
  "licenseKey": "<generated-key>",
  "businessId": "test-biz-001",
  "status": "PENDING",
  "isActivated": false,
  "createdAt": "2026-02-04T09:15:00.000Z"
}
```

### 2. List Licenses
```powershell
$headers = @{
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/platform/licenses" `
    -Method GET `
    -Headers $headers

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected Response**: 200 OK
```json
{
  "data": [ /* array of licenses */ ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "pages": 1
}
```

### 3. Validate License (Public - No Auth Required)
```powershell
$headers = @{ "Content-Type" = "application/json" }

$body = @{
    licenseKey = "<generated-license-key>"
    hardwareId = "hardware-device-id-123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/platform/licenses/validate" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

**Expected Response**: 200 OK (if valid)
```json
{
  "isValid": true,
  "license": {
    "id": "<license-id>",
    "businessName": "Test Business Ltd",
    "tier": "STARTER",
    "expiryDate": "2026-12-31T23:59:59.000Z",
    "status": "ACTIVE",
    "features": ["offline-enabled", "backup-enabled"]
  }
}
```

### 4. Register a Device
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$body = @{
    hardwareId = "device-fingerprint-xyz"
    deviceName = "POS-Terminal-01"
    platform = "Windows"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/platform/licenses/<LICENSE_ID>/devices" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

### 5. Create a Backup
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$body = @{
    backupKey = "backup-key-12345"
    storagePath = "gs://bucket/backups/backup-001"
    size = 1024000
    checksum = "abc123def456"
    encryptionKey = "encrypted-key-data"
    iv = "initialization-vector"
    authTag = "authentication-tag"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/backups/<LICENSE_ID>" `
    -Method POST `
    -Headers $headers `
    -Body $body

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

### 6. List Backups for a License
```powershell
$headers = @{
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/backups/license/<LICENSE_ID>" `
    -Method GET `
    -Headers $headers

$response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 7. Get License Statistics
```powershell
$headers = @{
    "Authorization" = "Bearer <JWT_TOKEN>"
}

$response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/platform/licenses/stats/overview" `
    -Method GET `
    -Headers $headers

$response.Content | ConvertFrom-Json | ConvertTo-Json
```

## JWT Token Generation

The backend uses JWT authentication. Use this token from `.env`:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJRWnhnRk1ad201bkZkcVRTMEJNdCIsInJvbGUiOiJhZG1pbiIsImxvY2F0aW9uSWQiOiJDU1Z4UXFMSFA5YTdrRlhoUFN5dyIsImRldmljZUlkIjoiZGVidWctZGV2aWNlLTEiLCJ0ZW5hbnRJZCI6Ijkxb3E0RDd5SkZsRWN5VEtWeXdLIiwiaXNQbGF0Zm9ybUFkbWluIjp0cnVlLCJpYXQiOjE3Njc5MDM1NjUsImV4cCI6MTc2Nzk4OTk2NX0.aabbccdd
```

**Claims**:
- `sub`: User ID
- `isPlatformAdmin`: true (admin access)
- `tenantId`: Tenant ID
- `role`: "admin"

## Testing Workflow

### Phase 1: Backend Endpoints (15 minutes)
1. ✅ Test Create License (returns licenseKey)
2. ✅ Test List Licenses (verify database insert)
3. ✅ Test Get License by ID
4. ✅ Test Public Validation (no auth required)
5. ✅ Verify audit logs created in LicenseAudit table

### Phase 2: Device Management (10 minutes)
1. Register device 1 on license
2. Register device 2 on license
3. Verify DeviceRegistration table has entries
4. Suspend license (should fail public validation)
5. Reactivate license
6. Revoke device 1
7. Verify device 1 can't use license anymore

### Phase 3: Backup Operations (10 minutes)
1. Create backup for license
2. List backups for license
3. Get backup details
4. Verify backup data in BackupManifest table
5. Restore from backup
6. Delete backup

### Phase 4: Desktop Integration (15 minutes)
1. Run desktop app
2. License input screen should appear
3. Enter license key from Phase 1
4. Verify offline validation works
5. Check encrypted cache in `~/.config/checkout-app/licenses/`

### Phase 5: Frontend Integration (10 minutes)
1. Open SuperAdmin portal
2. Navigate to Licenses tab
3. Verify list of created licenses
4. Test create license from UI
5. Test device registration from UI
6. Verify real-time stats update

## Database Queries (Neon SQL Editor)

### Check Licenses
```sql
SELECT id, businessName, tier, status, isActivated, createdAt 
FROM "License" 
ORDER BY createdAt DESC;
```

### Check Audit Trail
```sql
SELECT "licenseId", action, details, createdAt 
FROM "LicenseAudit" 
ORDER BY createdAt DESC;
```

### Check Device Registrations
```sql
SELECT "licenseId", "hardwareId", "deviceName", platform, "registeredAt" 
FROM "DeviceRegistration" 
ORDER BY "registeredAt" DESC;
```

### Check Backups
```sql
SELECT id, "licenseId", "backupKey", size, status, "createdAt" 
FROM "BackupManifest" 
ORDER BY "createdAt" DESC;
```

## Common Issues

### Issue: 401 Unauthorized
- **Cause**: Invalid or missing JWT token
- **Solution**: Use token from .env with `isPlatformAdmin: true`

### Issue: 403 Forbidden
- **Cause**: User is not platform admin
- **Solution**: Ensure JWT has `isPlatformAdmin: true` claim

### Issue: 404 Not Found
- **Cause**: License ID doesn't exist
- **Solution**: Create a license first, then use the returned ID

### Issue: 409 Conflict
- **Cause**: License key already exists
- **Solution**: The system auto-generates unique keys. This shouldn't happen in normal flow.

### Issue: License validation returns invalid
- **Cause**: Expired, suspended, or not activated
- **Solution**: Check license status in database. Activate before use.

## Performance Expectations

- Create License: < 100ms
- List Licenses: < 200ms (depending on result count)
- Validate License: < 50ms (cached)
- Register Device: < 100ms
- Create Backup: < 500ms (depending on file size)

## Security Checklist

Before production deployment:
- [ ] JWT secret rotated
- [ ] Database password changed
- [ ] CORS origin updated from localhost:5173
- [ ] SSL/TLS enabled for all endpoints
- [ ] Rate limiting configured (currently 60 req/min)
- [ ] Encryption keys stored in secure vault (not .env)
- [ ] Audit logs retention policy set
- [ ] Monitoring and alerting enabled
