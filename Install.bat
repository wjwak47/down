@echo off
title Video Downloader 安装程序
color 0A
echo ========================================
echo   Video Downloader 安装程序
echo ========================================
echo.

:: 请求管理员权限
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo 请求管理员权限...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

:: 设置安装目录
set "INSTALL_DIR=%ProgramFiles%\VideoDownloader"

echo.
echo 将安装到: %INSTALL_DIR%
echo.
set /p CONFIRM=确认安装? (Y/N): 
if /i not "%CONFIRM%"=="Y" (
    echo 安装已取消。
    pause
    exit /b
)

echo.
echo 正在安装...

:: 创建安装目录
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: 复制文件
echo 复制文件...
xcopy /E /I /Y "%~dp0dist-packager\VideoDownloader-win32-x64\*" "%INSTALL_DIR%\"

:: 创建桌面快捷方式
echo 创建桌面快捷方式...
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Video Downloader.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\VideoDownloader.exe'; $Shortcut.Save()"

:: 创建开始菜单快捷方式
echo 创建开始菜单快捷方式...
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\Video Downloader" mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\Video Downloader"
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\Video Downloader\Video Downloader.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\VideoDownloader.exe'; $Shortcut.Save()"

:: 创建卸载脚本
echo 创建卸载程序...
(
echo @echo off
echo title Video Downloader 卸载程序
echo echo 正在卸载 Video Downloader...
echo.
echo :: 删除桌面快捷方式
echo del "%%USERPROFILE%%\Desktop\Video Downloader.lnk" /f /q 2^>nul
echo.
echo :: 删除开始菜单快捷方式
echo rmdir /s /q "%%ProgramData%%\Microsoft\Windows\Start Menu\Programs\Video Downloader" 2^>nul
echo.
echo :: 删除安装目录
echo cd /d "%%PROGRAMFILES%%"
echo rmdir /s /q "VideoDownloader"
echo.
echo :: 删除注册表项
echo reg delete "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" /f 2^>nul
echo.
echo 卸载完成！
echo pause
) > "%INSTALL_DIR%\Uninstall.bat"

:: 创建卸载快捷方式
powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%ProgramData%\Microsoft\Windows\Start Menu\Programs\Video Downloader\卸载.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\Uninstall.bat'; $Shortcut.Save()"

:: 写入注册表（添加到程序列表）
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" /v DisplayName /t REG_SZ /d "Video Downloader" /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" /v UninstallString /t REG_SZ /d "%INSTALL_DIR%\Uninstall.bat" /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" /v DisplayIcon /t REG_SZ /d "%INSTALL_DIR%\VideoDownloader.exe" /f
reg add "HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\VideoDownloader" /v Publisher /t REG_SZ /d "Antigravity" /f

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 桌面快捷方式已创建
echo 开始菜单快捷方式已创建
echo.
set /p RUN=是否现在运行 Video Downloader? (Y/N): 
if /i "%RUN%"=="Y" (
    start "" "%INSTALL_DIR%\VideoDownloader.exe"
)

pause
