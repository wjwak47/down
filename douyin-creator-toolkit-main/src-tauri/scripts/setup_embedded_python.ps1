# 嵌入式 Python 环境设置脚本
# 用于打包时创建独立的 Python 环境

$ErrorActionPreference = "Stop"

$PYTHON_VERSION = "3.10.11"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip"
$TARGET_DIR = "$PSScriptRoot\..\resources\python-embed"
$TEMP_ZIP = "$env:TEMP\python-embed.zip"

Write-Host "=== 设置嵌入式 Python 环境 ===" -ForegroundColor Cyan

# 1. 清理旧目录
if (Test-Path $TARGET_DIR) {
    Write-Host "清理旧的 python-embed 目录..."
    Remove-Item -Recurse -Force $TARGET_DIR
}

# 2. 下载嵌入式 Python
Write-Host "下载 Python $PYTHON_VERSION 嵌入式版本..."
Invoke-WebRequest -Uri $PYTHON_URL -OutFile $TEMP_ZIP

# 3. 解压
Write-Host "解压到 $TARGET_DIR..."
New-Item -ItemType Directory -Path $TARGET_DIR -Force | Out-Null
Expand-Archive -Path $TEMP_ZIP -DestinationPath $TARGET_DIR -Force

# 4. 启用 pip (修改 python310._pth 文件)
$pthFile = Get-ChildItem -Path $TARGET_DIR -Filter "python*._pth" | Select-Object -First 1
if ($pthFile) {
    Write-Host "配置 Python 路径..."
    $content = Get-Content $pthFile.FullName
    # 取消注释 import site
    $content = $content -replace '#import site', 'import site'
    # 添加 Lib\site-packages
    $content += "`nLib\site-packages"
    Set-Content -Path $pthFile.FullName -Value $content
}

# 5. 下载 get-pip.py 并安装 pip
Write-Host "安装 pip..."
$getPipUrl = "https://bootstrap.pypa.io/get-pip.py"
$getPipPath = "$TARGET_DIR\get-pip.py"
Invoke-WebRequest -Uri $getPipUrl -OutFile $getPipPath

# 运行 get-pip.py
Push-Location $TARGET_DIR
& ".\python.exe" get-pip.py --no-warn-script-location
Pop-Location

# 6. 安装必要的依赖
Write-Host "安装依赖包..."
$pythonExe = "$TARGET_DIR\python.exe"
$sitePackages = "$TARGET_DIR\Lib\site-packages"

# 基础依赖 (抖音解析)
Write-Host "  - 安装 requests..."
& $pythonExe -m pip install requests --target $sitePackages --no-warn-script-location

# GPU ASR 依赖 (sherpa-onnx)
Write-Host "  - 安装 sherpa-onnx (GPU 加速)..."
& $pythonExe -m pip install sherpa-onnx --target $sitePackages --no-warn-script-location

# FastAPI 依赖 (ASR 服务)
Write-Host "  - 安装 fastapi uvicorn..."
& $pythonExe -m pip install fastapi uvicorn --target $sitePackages --no-warn-script-location

# 7. 清理不需要的文件
Write-Host "清理临时文件..."
Remove-Item -Force $TEMP_ZIP -ErrorAction SilentlyContinue
Remove-Item -Force $getPipPath -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$TARGET_DIR\Lib\site-packages\pip*" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$TARGET_DIR\Lib\site-packages\setuptools*" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== 完成! ===" -ForegroundColor Green
Write-Host "嵌入式 Python 已安装到: $TARGET_DIR"
Write-Host "Python 可执行文件: $TARGET_DIR\python.exe"
