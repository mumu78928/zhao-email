# Create self-signed code signing certificate - Signed by Zhao Youze
# Run this script as Administrator

$certName = [char]0x8D75 + [char]0x4F51 + [char]0x6CFD  # Zhao Youze in Chinese
$pfxPath = Join-Path $PSScriptRoot "certificate.pfx"
$pfxPassword = "zhaoyouze2026"
$securePassword = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText

Write-Host "Creating code signing certificate (CN=$certName)..." -ForegroundColor Cyan

# Check if certificate already exists
$existingCert = Get-ChildItem -Path "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq "CN=$certName" }

if ($existingCert) {
    Write-Host "Certificate already exists, using existing one." -ForegroundColor Yellow
    $cert = $existingCert[0]
} else {
    # Create self-signed code signing certificate
    $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -FriendlyName $certName -CertStoreLocation "Cert:\CurrentUser\My" -KeyUsage DigitalSignature -KeyAlgorithm RSA -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(5)
    Write-Host "Certificate created. Thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
}

# Export to PFX file
Write-Host "Exporting PFX to: $pfxPath" -ForegroundColor Cyan
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePassword -Force
Write-Host "PFX exported successfully." -ForegroundColor Green

# Install certificate to Trusted Root Certification Authorities
Write-Host "Installing to Trusted Root Certification Authorities..." -ForegroundColor Cyan
$rootStore = Get-Item "Cert:\LocalMachine\Root"
$rootStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$rootStore.Add($cert)
$rootStore.Close()

# Install certificate to Trusted Publishers
Write-Host "Installing to Trusted Publishers..." -ForegroundColor Cyan
$trustedStore = Get-Item "Cert:\LocalMachine\TrustedPublisher"
$trustedStore.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$trustedStore.Add($cert)
$trustedStore.Close()

Write-Host ""
Write-Host "Certificate setup complete!" -ForegroundColor Green
Write-Host "  Certificate Name: $certName" -ForegroundColor White
Write-Host "  PFX Path: $pfxPath" -ForegroundColor White
Write-Host "  PFX Password: $pfxPassword" -ForegroundColor White