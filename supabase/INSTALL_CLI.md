# Installing Supabase CLI on Windows

You have 3 options. Choose the easiest for you:

## Option 1: Install Scoop First (Recommended)

### Step 1: Install Scoop

Run this in PowerShell (as Administrator):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
```

### Step 2: Install Supabase CLI

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Step 3: Verify Installation

```powershell
supabase --version
```

---

## Option 2: Using Chocolatey (If you have it)

```powershell
choco install supabase
```

---

## Option 3: Manual Download (No package manager needed)

1. Go to: https://github.com/supabase/cli/releases/latest
2. Download: `supabase_windows_amd64.zip`
3. Extract the ZIP file
4. Copy `supabase.exe` to a folder in your PATH (e.g., `C:\Windows\System32` or create `C:\Tools\supabase` and add it to PATH)
5. Or just run it from the extracted folder

### Add to PATH (if needed):

1. Right-click "This PC" → Properties
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find "Path" and click "Edit"
5. Click "New" and add the folder containing `supabase.exe`
6. Click OK on all dialogs
7. Restart PowerShell

### Verify Installation

```powershell
supabase --version
```

---

## After Installation

Once Supabase CLI is installed, continue with:

```powershell
# Login
supabase login

# Link your project
supabase link --project-ref cdazlztdllykbtfnssma
```

See `SETUP_SUPABASE.md` for the complete setup process.

