# Build frontend with environment variables from .env file
$frontendDir = "apps/frontend"
$envFile = "$frontendDir/.env"

if (Test-Path $envFile) {
    Write-Host "Loading environment variables from $envFile"
    $envContent = Get-Content $envFile -Raw
    
    # Extract VITE_SUPABASE_ANON_KEY
    if ($envContent -match 'VITE_SUPABASE_ANON_KEY=(.+)') {
        $key = $matches[1].Trim()
        $env:VITE_SUPABASE_ANON_KEY = $key
        Write-Host "VITE_SUPABASE_ANON_KEY set (length: $($key.Length))"
    } else {
        Write-Host "WARNING: VITE_SUPABASE_ANON_KEY not found in .env file"
    }
} else {
    Write-Host "WARNING: .env file not found at $envFile"
}

# Build the frontend
Write-Host "Building frontend..."
npm run build --workspace=apps/frontend

