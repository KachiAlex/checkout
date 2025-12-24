$subject = "CN=Checkout POS, O=Kreatix Technologies, C=NG"
$certStore = "Cert:\CurrentUser\My"
$validTo = (Get-Date).AddYears(2)
$pfxPasswordPlain = "CheckoutTest123!"
$exportPath = Join-Path -Path $PSScriptRoot -ChildPath "checkout-code-signing.pfx"

Write-Host "Generating self-signed code signing certificate..."
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject -CertStoreLocation $certStore -NotAfter $validTo

Write-Host "Exporting certificate to $exportPath"
$pfxPassword = ConvertTo-SecureString -String $pfxPasswordPlain -AsPlainText -Force
Export-PfxCertificate -Cert $cert -FilePath $exportPath -Password $pfxPassword | Out-Null

Write-Host "Certificate exported successfully."
