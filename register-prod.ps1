$manifestPath = "$PSScriptRoot\manifest-prod.xml"
$manifestFullPath = (Resolve-Path $manifestPath).Path
$certPath = "$PSScriptRoot\certs\localhost.pem"

Write-Host "Setting up Office Add-in (PRODUCTION) for development..." -ForegroundColor Cyan
Write-Host "This registers the add-in on port 52390 (for installed version)" -ForegroundColor Yellow
Write-Host ""

# Step 1: Trust the SSL certificate
Write-Host "Step 1: Trusting development SSL certificate..." -ForegroundColor Yellow

if (!(Test-Path $certPath)) {
    Write-Host "Error: Certificate not found at $certPath" -ForegroundColor Red
    Write-Host "Certificates are required for HTTPS. Please ensure certs are in the repository." -ForegroundColor Red
    exit 1
}

$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$store.Open("ReadWrite")

# Check if certificate is already trusted
$existing = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
if ($existing) {
    Write-Host "  ✓ Certificate already trusted" -ForegroundColor Green
} else {
    $store.Add($cert)
    Write-Host "  ✓ Certificate trusted" -ForegroundColor Green
}

$store.Close()

Write-Host ""

# Step 2: Register manifest
Write-Host "Step 2: Registering add-in manifest (production)..." -ForegroundColor Yellow
Write-Host "  Manifest: $manifestFullPath"

$regPath = "HKCU:\Software\Microsoft\Office\16.0\WEF\Developer"

if (!(Test-Path $regPath)) {
    New-Item -Path $regPath -Force | Out-Null
}

# Remove any existing registration first to avoid duplicates
$existingManifests = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
foreach ($prop in $existingManifests.PSObject.Properties) {
    if ($prop.Value -like "*manifest*.xml") {
        Remove-ItemProperty -Path $regPath -Name $prop.Name -ErrorAction SilentlyContinue
    }
}

New-ItemProperty -Path $regPath -Name "CopilotOfficeAddinProd" -Value $manifestFullPath -PropertyType String -Force | Out-Null

Write-Host "  ✓ Add-in registered" -ForegroundColor Green
Write-Host ""

Write-Host "Setup complete! Next steps:" -ForegroundColor Cyan
Write-Host "1. Close Word, PowerPoint, Excel, and OneNote if they are open"
Write-Host "2. Start the production server: npm run start"
Write-Host "3. Open Word, PowerPoint, Excel, or OneNote"
Write-Host "4. Look for 'GitHub Copilot' button on the Home ribbon"
Write-Host ""
Write-Host "Note: This uses port 52390. For development (port 3000), use .\register.ps1" -ForegroundColor Gray
Write-Host "To unregister, run: .\unregister.ps1" -ForegroundColor Gray
