# PowerShell script to copy checkout icons to Android launcher icons
# This script copies the checkout-icon.png to Android launcher icon locations

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidPath = Split-Path -Parent $scriptPath
$frontendPath = Split-Path -Parent $androidPath
$sourceIcon = Join-Path $frontendPath "public\checkout-icon.png"
$iconSizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

$resDir = "app\src\main\res"

foreach ($density in $iconSizes.Keys) {
    $targetDir = "$resDir\$density"
    if (Test-Path $targetDir) {
        # Copy to ic_launcher.png
        Copy-Item $sourceIcon -Destination "$targetDir\ic_launcher.png" -Force
        # Copy to ic_launcher_round.png (same icon)
        Copy-Item $sourceIcon -Destination "$targetDir\ic_launcher_round.png" -Force
        # Copy to ic_launcher_foreground.png (same icon)
        Copy-Item $sourceIcon -Destination "$targetDir\ic_launcher_foreground.png" -Force
        Write-Host "Updated icons in $density"
    }
}

Write-Host "Icon update complete!"

