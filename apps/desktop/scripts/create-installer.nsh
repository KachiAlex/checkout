; NSIS Installer Script for Checkout POS
; This creates a simple installer without code signing

!include "MUI2.nsh"

; Installer Information
Name "Checkout POS"
OutFile "release\Checkout POS Setup.exe"
InstallDir "$PROGRAMFILES64\Checkout POS"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "Install" SecInstall
    SetOutPath "$INSTDIR"
    
    ; Copy all files from portable build
    File /r "release\Checkout POS-win32-x64\*.*"
    
    ; Create shortcuts
    CreateDirectory "$SMPROGRAMS\Checkout POS"
    CreateShortcut "$SMPROGRAMS\Checkout POS\Checkout POS.lnk" "$INSTDIR\Checkout POS.exe"
    CreateShortcut "$DESKTOP\Checkout POS.lnk" "$INSTDIR\Checkout POS.exe"
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Registry entries
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CheckoutPOS" "DisplayName" "Checkout POS"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CheckoutPOS" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CheckoutPOS" "Publisher" "Checkout POS"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CheckoutPOS" "DisplayVersion" "1.0.0"
SectionEnd

; Uninstaller Section
Section "Uninstall"
    ; Remove files
    RMDir /r "$INSTDIR"
    
    ; Remove shortcuts
    Delete "$SMPROGRAMS\Checkout POS\Checkout POS.lnk"
    RMDir "$SMPROGRAMS\Checkout POS"
    Delete "$DESKTOP\Checkout POS.lnk"
    
    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\CheckoutPOS"
SectionEnd

