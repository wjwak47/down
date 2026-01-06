; Video Downloader NSIS Installer Script
!include "MUI2.nsh"

; Basic Information
Name "Video Downloader"
OutFile "dist\VideoDownloader-Setup.exe"
InstallDir "$PROGRAMFILES64\VideoDownloader"
RequestExecutionLevel admin

; UI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"

; Installation Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstallation Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Language
!insertmacro MUI_LANGUAGE "English"

; Installation Section
Section "Install"
    SetOutPath "$INSTDIR"
    
    ; Copy all files
    File /r "dist-packager\VideoDownloader-win32-x64\*.*"
    
    ; Create desktop shortcut
    CreateShortCut "$DESKTOP\Video Downloader.lnk" "$INSTDIR\VideoDownloader.exe"
    
    ; Create start menu shortcuts
    CreateDirectory "$SMPROGRAMS\Video Downloader"
    CreateShortCut "$SMPROGRAMS\Video Downloader\Video Downloader.lnk" "$INSTDIR\VideoDownloader.exe"
    CreateShortCut "$SMPROGRAMS\Video Downloader\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
    
    ; Write uninstall information
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" "DisplayName" "Video Downloader"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" "DisplayIcon" "$INSTDIR\VideoDownloader.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" "Publisher" "Antigravity"
SectionEnd

; Uninstallation Section
Section "Uninstall"
    ; Delete files
    RMDir /r "$INSTDIR"
    
    ; Delete shortcuts
    Delete "$DESKTOP\Video Downloader.lnk"
    RMDir /r "$SMPROGRAMS\Video Downloader"
    
    ; Delete registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader"
SectionEnd
