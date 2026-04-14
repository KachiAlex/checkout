# 🧪 Offline Desktop App - Test Checklist

## Pre-Test Setup

- [ ] Backend running on port 3000
- [ ] Frontend available (React dev server or built version)
- [ ] Neon database connected
- [ ] Test license created in database
- [ ] Desktop app compiled (`npm run build` succeeded)

## Test Suite 1: Online Activation Flow

### T1.1 - License Input Screen Renders
```
Steps:
1. cd d:\checkout\apps\desktop
2. npm start  (launches Electron)
3. Observe license input screen appears

Expected: ✅ Beautiful UI with input field, activate button, help text
```

### T1.2 - Activate License (Online)
```
Steps:
1. Get test license key from backend (create new license via API)
2. Enter license key in input field
3. Click "Activate"
4. Monitor network traffic (should call backend)

Expected:
✅ License validated with backend
✅ Response shows valid license
✅ License saved to disk (encrypted)
✅ "License Activated!" success message
✅ App main window opens (if integration complete)
```

### T1.3 - Hardware Binding
```
Steps:
1. After activation, check: ~/.config/checkout-app/license/
2. license.enc should exist (encrypted file)

Expected:
✅ File created and readable by app only
✅ If you try to open with text editor, shows encrypted gibberish
✅ Size approximately 500 bytes
```

## Test Suite 2: Offline Validation

### T2.1 - Offline Mode (Day 1)
```
Prerequisites:
- License activated (from T1.2)
- license.enc file exists

Steps:
1. Disconnect internet (WiFi off, Ethernet disconnected)
2. Kill all running apps
3. Wait 10 seconds
4. Launch desktop app
5. Observe: App does NOT show license input screen

Expected:
✅ App loads directly to main window
✅ UI shows "OFFLINE MODE" badge/indicator
✅ License displays: "Valid - Offline (13 days grace remaining)"
✅ All features work normally
✅ User can work without internet
```

### T2.2 - Grace Period Display
```
Steps:
1. Check license info display
2. Should show days remaining

Expected:
✅ Shows accurate grace period countdown
✅ Example: "13 days offline grace period remaining"
✅ Every 24h the number decreases
```

### T2.3 - Offline File Operations
```
Prerequisites:
- App running in offline mode (T2.1 success)

Steps:
1. Try to open/save documents
2. Create a new file
3. Save it

Expected:
✅ All file operations work normally
✅ No "offline" restrictions on features
```

## Test Suite 3: Time Tamper Detection

### T3.1 - Clock Forward Tamper Detection
```
Prerequisites:
- License activated
- Internet disconnected (offline mode)
- License.enc file exists

Steps:
1. Windows System Settings → Date & Time
2. Change system date forward 20 days
3. Save changes
4. Kill app
5. Launch app again

Expected:
⚠️ App detects clock tampering:
✅ Shows error: "System clock has been modified"
✅ OR: "Offline grace period exceeded"
❌ Does NOT allow continued offline use
❌ Prompts user to: "Connect to internet or fix system time"
```

### T3.2 - Clock Backward Tamper Detection
```
Steps:
1. Activate license on current date
2. Disconnect internet
3. Set system clock backward 5 days
4. Kill app
5. Launch app

Expected:
✅ App detects backward tampering
✅ Shows: "System time appears incorrect"
✅ Does not extend trial period
✅ Still enforces grace period countdown
```

### T3.3 - System Clock Corrected
```
Steps (continuing from T3.2):
1. Set system clock back to correct current time
2. Kill app
3. Launch app

Expected:
✅ App detects correct time
✅ Resumes normal operation
✅ Grace period countdown continues from where it was
```

## Test Suite 4: Hardware Binding

### T4.1 - License Locked to Device
```
Steps:
1. Copy license.enc file
2. Transfer to different PC/VM
3. Paste at same path: ~/.config/checkout-app/license/
4. Launch app on new device

Expected:
❌ App displays error:
✅ "License is bound to different device"
✅ "Please activate on this device"
❌ Does NOT allow access
```

### T4.2 - Hardware ID Consistency
```
Steps:
1. Run app multiple times on same PC
2. Check hardware ID calculation

Expected:
✅ Same hardware ID generated each time
✅ License remains valid
✅ Proves binding is stable and deterministic
```

## Test Suite 5: Sync & Online Mode

### T5.1 - Online Sync
```
Prerequisites:
- App running offline (from T2.1)
- Grace period has passed 1+ days

Steps:
1. Reconnect internet
2. Wait for auto-sync (or click "Sync Now")
3. Monitor network traffic

Expected:
✅ App makes HTTP request to backend
✅ Backend returns fresh validation
✅ Grace period resets to 14 days
✅ Server time updated (pinned again)
✅ No user action required (or minimal prompt)
```

### T5.2 - Sync While Always Connected
```
Steps:
1. Internet connected throughout
2. Launch app
3. Observe every startup

Expected:
✅ App validates online every time
✅ No offline badge shown
✅ Shows "Online" indicator
✅ Grace period not consumed (stays at max)
```

## Test Suite 6: Expired License

### T6.1 - Offline Expiration
```
Steps:
1. Activate license that expires in 5 days
2. Disconnect internet
3. Wait (or simulate) 6 days passing
4. Launch app

Expected:
❌ App blocked:
✅ Shows: "License has expired"
✅ "Please purchase a renewal or connect to internet"
❌ Does NOT allow access
```

### T6.2 - Online with Expired License
```
Steps:
1. Connect to internet
2. License is actually expired
3. Launch app
4. App syncs online

Expected:
❌ Backend returns: "License expired"
✅ App displays: "License has expired on [date]"
❌ Does NOT allow access
✅ Prompts to "Renew license on our website"
```

## Test Suite 7: Error Handling

### T7.1 - No Cached License + No Internet
```
Steps:
1. Fresh installation (no license.enc)
2. Disconnect internet
3. Launch app
4. License input screen appears
5. No internet available
6. Try to activate

Expected:
❌ Shows: "Cannot activate license offline"
✅ Prompts: "Please connect to internet to activate your first license"
```

### T7.2 - Corrupted License File
```
Steps:
1. Navigate to ~/.config/checkout-app/license/
2. Open license.enc in text editor
3. Change some characters (corrupt it)
4. Save
5. Launch app

Expected:
✅ App detects corruption:
❌ Shows: "License file corrupted"
✅ Prompts: "Please reactivate your license"
❌ Does NOT load corrupted data
```

### T7.3 - Network Timeout
```
Steps:
1. Launch app
2. Start activation
3. Immediately disconnect internet
4. App tries to reach backend

Expected:
⏱️ App waits ~10 seconds
✅ Shows: "Connection timeout"
✅ Falls back to offline cache (if available)
OR
❌ Shows: "Cannot reach server" (if no cache)
```

## Test Suite 8: Encryption Verification

### T8.1 - Plaintext Never Stored
```
Steps:
1. Activate license
2. Check: ~/.config/checkout-app/license/license.enc
3. Try to open with notepad

Expected:
✅ File is 100% unreadable
✅ Shows complete gibberish (encrypted bytes)
❌ NO plaintext keys visible
❌ NO expiry dates readable
❌ NO business names visible
```

### T8.2 - Key Derivation
```
Technical verification:
- Source file in code: DesktopLicensingService.ts
- Function: decrypt()
- Uses: crypto.scryptSync(encryptionKey, 'salt', 32)

Expected:
✅ Encryption key derived from master key using scrypt
✅ Takes ~100ms to compute (intentionally slow)
✅ Prevents brute force attacks
```

## Test Suite 9: User Experience

### T9.1 - First Launch Experience
```
Steps:
1. First time launching app
2. Observe user journey

Expected:
✅ License input screen immediately
✅ Clear instructions visible
✅ Example license format shown
✅ "Need a license?" link provided
✅ Beautiful UI (dark theme, modern design)
```

### T9.2 - License Valid Indicator
```
Steps:
1. License activated
2. App running
3. Check title bar or status area

Expected:
✅ Shows license status
✅ If online: "Licensed - Connected"
✅ If offline: "Licensed - Offline (13 days)"
✅ If near expiry: "Licensed - Expires in 2 days"
```

### T9.3 - Offline Notification
```
Steps:
1. Run in offline mode
2. Observe UI

Expected:
✅ Subtle "OFFLINE MODE" indicator visible
✅ Not intrusive (doesn't block work)
✅ Shows grace period remaining
✅ Optional: "Sync when online" prompt
```

## Test Results Template

```
Test Suite: [Name]
Date: ____________________
Tester: ____________________
Environment: [Online/Offline/Mixed]

Test ID | Expected | Result | Status | Notes
--------|----------|--------|--------|-------
T1.1    | ✅ UI    |        |  ☐ P   | 
        |          |        |  ☐ F   | 
        |          |        |  ☐ S   | 

☐ P = PASSED
☐ F = FAILED  
☐ S = SKIPPED

Summary:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Skipped: ___
- Success Rate: ___%
```

## Critical Pass Criteria

For app to be considered "offline-ready":

- ✅ T2.1: Offline mode works (license in cache)
- ✅ T3.1: Clock tampering detected
- ✅ T4.1: Hardware binding enforced
- ✅ T5.1: Online sync resets grace period
- ✅ T6.1: Expired licenses blocked offline
- ✅ T7.2: Corrupted files detected
- ✅ T8.1: Plaintext never stored

## Optional Advanced Tests

- [ ] Concurrent app instances
- [ ] Virtual machine transfer
- [ ] Network simulation (latency, packet loss)
- [ ] Backup creation offline
- [ ] Backup restore offline
- [ ] Performance under load (1000 license checks)
- [ ] Battery consumption measurement
- [ ] Memory leak testing

---

**Testing Status**: 🟡 READY FOR EXECUTION  
**Estimated Duration**: 2-3 hours (full suite)  
**Required Tools**: 
- Desktop app (built)
- Backend API (running)
- Network control tools
- File explorer
- Text editor

**Notes**:
- Tests can be run in any order (except T1 → T2 dependency)
- Offline tests should use actual internet disconnect (not VPN)
- System time tests require admin privileges
