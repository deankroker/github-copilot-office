; Inno Setup Script for GitHub Copilot Office Add-in
; Requires Inno Setup 6.x: https://jrsoftware.org/isinfo.php

#define MyAppName "GitHub Copilot Office Add-in"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "GitHub"
#define MyAppURL "https://github.com/your-org/copilot-sdk-office-sample"
#define MyAppExeName "copilot-office-server.exe"

[Setup]
AppId={{12345678-1234-1234-1234-123456789012}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\..\build\windows
OutputBaseFilename=CopilotOfficeAddin-Setup-{#MyAppVersion}
SetupIconFile=app.ico
UninstallDisplayIcon={app}\app.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "startatlogin"; Description: "Start automatically when Windows starts"; GroupDescription: "Additional options:"

[Files]
; Main executable (built with pkg)
Source: "..\..\build\windows\copilot-office-server.exe"; DestDir: "{app}"; Flags: ignoreversion

; Application icon
Source: "app.ico"; DestDir: "{app}"; Flags: ignoreversion

; Static files
Source: "..\..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Certificates (may be regenerated during install)
Source: "..\..\certs\*"; DestDir: "{app}\certs"; Flags: ignoreversion

; Manifest - use production manifest
Source: "..\..\manifest-prod.xml"; DestDir: "{app}"; DestName: "manifest.xml"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"

[Registry]
; Register the add-in manifest with Office
Root: HKCU; Subkey: "Software\Microsoft\Office\16.0\WEF\Developer"; ValueType: string; ValueName: "CopilotOfficeAddin"; ValueData: "{app}\manifest.xml"; Flags: uninsdeletevalue

[Run]
; Start the service after install
Filename: "{app}\{#MyAppExeName}"; Description: "Start {#MyAppName} now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Stop the service before uninstall
Filename: "taskkill.exe"; Parameters: "/F /IM {#MyAppExeName}"; Flags: runhidden

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
var
  StartupTaskCreated: Boolean;
  CertThumbprint: string;

// Save the certificate thumbprint to a file for later removal
procedure SaveCertThumbprint(Thumbprint: string);
var
  ThumbprintFile: string;
begin
  ThumbprintFile := ExpandConstant('{app}\certs\.thumbprint');
  SaveStringToFile(ThumbprintFile, Thumbprint, False);
end;

// Load the certificate thumbprint from file
function LoadCertThumbprint(): string;
var
  ThumbprintFile: string;
begin
  Result := '';
  ThumbprintFile := ExpandConstant('{app}\certs\.thumbprint');
  if FileExists(ThumbprintFile) then
    LoadStringFromFile(ThumbprintFile, Result);
  Result := Trim(Result);
end;

// Generate a self-signed certificate using PowerShell if needed, or use existing
function GenerateOrImportCertificate(): Boolean;
var
  ResultCode: Integer;
  CertPath, KeyPath: string;
  PSScript: string;
begin
  Result := True;
  CertPath := ExpandConstant('{app}\certs\localhost.pem');
  KeyPath := ExpandConstant('{app}\certs\localhost-key.pem');
  
  // PowerShell script to:
  // 1. Check if valid certs exist
  // 2. If not, generate new self-signed cert
  // 3. Import cert to Trusted Root store
  // 4. Output the thumbprint
  PSScript := 
    '$ErrorActionPreference = "Stop"; ' +
    '$certPath = ''' + CertPath + '''; ' +
    '$keyPath = ''' + KeyPath + '''; ' +
    '$certsDir = Split-Path $certPath; ' +
    '' +
    '# Check if we need to generate new certificates ' +
    '$needNewCert = $false; ' +
    'if (-not (Test-Path $certPath) -or -not (Test-Path $keyPath)) { ' +
    '  $needNewCert = $true; ' +
    '} else { ' +
    '  # Check if existing cert is valid (not expired) ' +
    '  try { ' +
    '    $existingCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath); ' +
    '    if ($existingCert.NotAfter -lt (Get-Date).AddDays(30)) { ' +
    '      $needNewCert = $true; ' +
    '    } ' +
    '  } catch { ' +
    '    $needNewCert = $true; ' +
    '  } ' +
    '} ' +
    '' +
    'if ($needNewCert) { ' +
    '  # Generate new self-signed certificate ' +
    '  $cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "Cert:\CurrentUser\My" ' +
    '    -NotAfter (Get-Date).AddYears(2) -KeyUsage DigitalSignature,KeyEncipherment ' +
    '    -FriendlyName "GitHub Copilot Office Add-in Development"; ' +
    '  ' +
    '  # Export to PEM format ' +
    '  $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert); ' +
    '  $certBase64 = [Convert]::ToBase64String($certBytes, [Base64FormattingOptions]::InsertLineBreaks); ' +
    '  $certPem = "-----BEGIN CERTIFICATE-----`n$certBase64`n-----END CERTIFICATE-----"; ' +
    '  Set-Content -Path $certPath -Value $certPem -NoNewline; ' +
    '  ' +
    '  # Export private key (requires accessing the key) ' +
    '  $keyBytes = $cert.PrivateKey.ExportPkcs8PrivateKey(); ' +
    '  $keyBase64 = [Convert]::ToBase64String($keyBytes, [Base64FormattingOptions]::InsertLineBreaks); ' +
    '  $keyPem = "-----BEGIN PRIVATE KEY-----`n$keyBase64`n-----END PRIVATE KEY-----"; ' +
    '  Set-Content -Path $keyPath -Value $keyPem -NoNewline; ' +
    '  ' +
    '  # Remove from personal store (we only need it in Root) ' +
    '  Remove-Item "Cert:\CurrentUser\My\$($cert.Thumbprint)" -ErrorAction SilentlyContinue; ' +
    '  $thumbprint = $cert.Thumbprint; ' +
    '} else { ' +
    '  $existingCert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath); ' +
    '  $thumbprint = $existingCert.Thumbprint; ' +
    '} ' +
    '' +
    '# Import certificate to Trusted Root CA store ' +
    '$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath); ' +
    '$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser"); ' +
    '$store.Open("ReadWrite"); ' +
    '$existing = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }; ' +
    'if (-not $existing) { ' +
    '  $store.Add($cert); ' +
    '} ' +
    '$store.Close(); ' +
    '' +
    '# Output thumbprint for later removal ' +
    'Write-Output $thumbprint;';
  
  // Run PowerShell script and capture thumbprint
  if Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -Command "' + PSScript + '"', 
          '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Result := (ResultCode = 0);
  end
  else
  begin
    Result := False;
  end;
end;

// Simpler certificate import that uses existing PEM file
function ImportCertificateToStore(): Boolean;
var
  ResultCode: Integer;
  CertPath: string;
  PSScript: string;
  OutputFile: string;
begin
  Result := True;
  CertPath := ExpandConstant('{app}\certs\localhost.pem');
  OutputFile := ExpandConstant('{tmp}\cert_thumbprint.txt');
  
  // PowerShell script to import PEM certificate to Trusted Root store
  PSScript := 
    '$ErrorActionPreference = "Stop"; ' +
    '$certPath = ''' + CertPath + '''; ' +
    '$outputFile = ''' + OutputFile + '''; ' +
    '' +
    'if (-not (Test-Path $certPath)) { ' +
    '  Write-Error "Certificate file not found: $certPath"; ' +
    '  exit 1; ' +
    '} ' +
    '' +
    '# Load the certificate ' +
    '$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath); ' +
    '' +
    '# Check if certificate is expired or expiring soon ' +
    'if ($cert.NotAfter -lt (Get-Date)) { ' +
    '  Write-Error "Certificate has expired. Please regenerate certificates."; ' +
    '  exit 1; ' +
    '} ' +
    '' +
    '# Import to Trusted Root CA store for current user ' +
    '$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser"); ' +
    '$store.Open("ReadWrite"); ' +
    '' +
    '# Check if already trusted ' +
    '$existing = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }; ' +
    'if (-not $existing) { ' +
    '  $store.Add($cert); ' +
    '  Write-Host "Certificate added to Trusted Root store"; ' +
    '} else { ' +
    '  Write-Host "Certificate already trusted"; ' +
    '} ' +
    '' +
    '$store.Close(); ' +
    '' +
    '# Save thumbprint for uninstall ' +
    '$cert.Thumbprint | Out-File -FilePath $outputFile -NoNewline;';
  
  if Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -Command "' + PSScript + '"', 
          '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Result := (ResultCode = 0);
    // Load the thumbprint from the output file
    if Result and FileExists(OutputFile) then
    begin
      LoadStringFromFile(OutputFile, CertThumbprint);
      CertThumbprint := Trim(CertThumbprint);
    end;
  end
  else
  begin
    Result := False;
  end;
end;

// Remove certificate from Trusted Root store by thumbprint
function RemoveCertificateFromStore(): Boolean;
var
  ResultCode: Integer;
  Thumbprint: string;
  PSScript: string;
begin
  Result := True;
  Thumbprint := LoadCertThumbprint();
  
  if Thumbprint = '' then
  begin
    // No thumbprint saved, try to find by subject name
    PSScript := 
      '$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser"); ' +
      '$store.Open("ReadWrite"); ' +
      '$certs = $store.Certificates | Where-Object { $_.Subject -eq "CN=localhost" -and $_.FriendlyName -like "*Copilot*" }; ' +
      'foreach ($cert in $certs) { ' +
      '  $store.Remove($cert); ' +
      '} ' +
      '$store.Close();';
  end
  else
  begin
    PSScript := 
      '$thumbprint = ''' + Thumbprint + '''; ' +
      '$store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser"); ' +
      '$store.Open("ReadWrite"); ' +
      '$cert = $store.Certificates | Where-Object { $_.Thumbprint -eq $thumbprint }; ' +
      'if ($cert) { ' +
      '  $store.Remove($cert); ' +
      '} ' +
      '$store.Close();';
  end;
  
  Exec('powershell.exe', '-NoProfile -ExecutionPolicy Bypass -Command "' + PSScript + '"', 
       '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := (ResultCode = 0);
end;

procedure CreateStartupTask();
var
  TaskXML: string;
  TaskFile: string;
  ResultCode: Integer;
begin
  TaskXML := '<?xml version="1.0" encoding="UTF-16"?>' + #13#10 +
    '<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">' + #13#10 +
    '  <Triggers>' + #13#10 +
    '    <LogonTrigger>' + #13#10 +
    '      <Enabled>true</Enabled>' + #13#10 +
    '    </LogonTrigger>' + #13#10 +
    '  </Triggers>' + #13#10 +
    '  <Principals>' + #13#10 +
    '    <Principal id="Author">' + #13#10 +
    '      <LogonType>InteractiveToken</LogonType>' + #13#10 +
    '      <RunLevel>LeastPrivilege</RunLevel>' + #13#10 +
    '    </Principal>' + #13#10 +
    '  </Principals>' + #13#10 +
    '  <Settings>' + #13#10 +
    '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>' + #13#10 +
    '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>' + #13#10 +
    '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>' + #13#10 +
    '    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>' + #13#10 +
    '    <Hidden>true</Hidden>' + #13#10 +
    '  </Settings>' + #13#10 +
    '  <Actions Context="Author">' + #13#10 +
    '    <Exec>' + #13#10 +
    '      <Command>"' + ExpandConstant('{app}\{#MyAppExeName}') + '"</Command>' + #13#10 +
    '      <WorkingDirectory>' + ExpandConstant('{app}') + '</WorkingDirectory>' + #13#10 +
    '    </Exec>' + #13#10 +
    '  </Actions>' + #13#10 +
    '</Task>';
  
  TaskFile := ExpandConstant('{tmp}\CopilotOfficeTask.xml');
  SaveStringToFile(TaskFile, TaskXML, False);
  
  Exec('schtasks.exe', '/Create /TN "CopilotOfficeAddin" /XML "' + TaskFile + '" /F', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  StartupTaskCreated := (ResultCode = 0);
end;

procedure RemoveStartupTask();
var
  ResultCode: Integer;
begin
  Exec('schtasks.exe', '/Delete /TN "CopilotOfficeAddin" /F', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    // Import SSL certificate to Trusted Root store
    if not ImportCertificateToStore() then
    begin
      MsgBox('Warning: Failed to install SSL certificate. The add-in may not work correctly. ' +
             'You can manually trust the certificate at: ' + ExpandConstant('{app}\certs\localhost.pem'), 
             mbError, MB_OK);
    end
    else if CertThumbprint <> '' then
    begin
      // Save thumbprint for uninstall
      SaveCertThumbprint(CertThumbprint);
    end;
    
    // Create startup task if selected
    if IsTaskSelected('startatlogin') then
      CreateStartupTask();
  end;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    // Remove certificate from store
    RemoveCertificateFromStore();
    // Remove startup task
    RemoveStartupTask();
  end;
end;
