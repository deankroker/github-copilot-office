# Building Installers

This directory contains scripts to build standalone installers for Windows and macOS.

## Prerequisites

1. **Node.js 18+** installed
2. **npm dependencies** installed: `npm install`

### Windows-specific
- [Inno Setup 6](https://jrsoftware.org/isinfo.php) for creating the installer executable

### macOS-specific
- Xcode Command Line Tools: `xcode-select --install`

## Building

### Quick Build (both platforms)

```bash
npm run build:installer
```

### macOS Only

```bash
npm run build:macos
# or
./installer/macos/build.sh
```

**Output:** `build/macos/CopilotOfficeAddin-1.0.0.pkg`

### Windows Only

From Windows (PowerShell):
```powershell
.\installer\windows\build.ps1
```

From macOS/Linux (cross-compile executable only):
```bash
npm run build:windows
# or
./installer/windows/build.sh
```

**Output:** `build/windows/CopilotOfficeAddin-Setup-1.0.0.exe`

## What the Installers Do

### Windows Installer
1. Installs the server executable to `C:\Program Files\GitHub Copilot Office Add-in\`
2. Copies the built frontend, certificates, and manifest
3. Trusts the SSL certificate (adds to user's Root certificate store)
4. Registers the add-in manifest with Office (registry key)
5. Optionally creates a scheduled task to start on login
6. Starts the service immediately after install

### macOS Installer
1. Installs to `/Applications/GitHub Copilot Office Add-in/`
2. Copies the built frontend, certificates, and manifest
3. Trusts the SSL certificate (adds to System keychain)
4. Registers the add-in with Word, PowerPoint, and Excel (wef folders)
5. Installs a LaunchAgent to start on login
6. Starts the service immediately after install

## Uninstalling

### Windows
Use "Add or Remove Programs" in Windows Settings, or run the uninstaller from the Start Menu.

### macOS
```bash
sudo ./installer/macos/uninstall.sh
```

Or manually:
1. Stop the service: `launchctl unload ~/Library/LaunchAgents/com.github.copilot-office-addin.plist`
2. Delete the app: `sudo rm -rf "/Applications/GitHub Copilot Office Add-in"`
3. Remove LaunchAgent: `rm ~/Library/LaunchAgents/com.github.copilot-office-addin.plist`
4. Remove manifest from wef folders

## Code Signing (Optional)

For distribution outside your organization, you should sign the installers.

### Windows
Use `signtool.exe` from Windows SDK:
```powershell
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com build\windows\CopilotOfficeAddin-Setup-1.0.0.exe
```

### macOS
Use `productsign`:
```bash
productsign --sign "Developer ID Installer: Your Name (TEAMID)" \
    build/macos/CopilotOfficeAddin-1.0.0.pkg \
    build/macos/CopilotOfficeAddin-1.0.0-signed.pkg
```

## Troubleshooting

### Service not starting
- **Windows**: Check Task Scheduler for "CopilotOfficeAddin" task
- **macOS**: Check `launchctl list | grep copilot` and logs in `/tmp/copilot-office-addin.log`

### Add-in not appearing in Office
1. Ensure the service is running: visit https://localhost:3000 in browser
2. Restart the Office application
3. Check the manifest is registered:
   - **Windows**: `reg query "HKCU\Software\Microsoft\Office\16.0\WEF\Developer"`
   - **macOS**: Check `~/Library/Containers/com.microsoft.Word/Data/Documents/wef/`

### SSL Certificate issues
1. Visit https://localhost:3000 in your browser
2. If you see a certificate warning, the cert isn't trusted
3. Re-run the installer or manually trust the certificate
