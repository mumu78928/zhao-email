# 一键构建简易邮箱客户端EXE - 签名：赵佑泽
# 需要以管理员身份运行

$projectRoot = $PSScriptRoot
Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  简易邮箱客户端 EXE 构建脚本" -ForegroundColor Cyan
Write-Host "  签名名称：赵佑泽" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: 创建代码签名证书
Write-Host "[1/5] 创建代码签名证书..." -ForegroundColor Yellow
$pfxPath = Join-Path $projectRoot "certificate.pfx"
$pfxPassword = "zhaoyouze2026"

if (Test-Path $pfxPath) {
    Write-Host "  证书已存在，跳过创建。" -ForegroundColor Green
} else {
    & (Join-Path $projectRoot "create-cert.ps1")
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  证书创建失败，请确保以管理员身份运行。" -ForegroundColor Red
        exit 1
    }
}

# 设置签名环境变量
$env:CSC_LINK = $pfxPath
$env:CSC_KEY_PASSWORD = $pfxPassword
Write-Host "  签名环境变量已设置。" -ForegroundColor Green

# Step 2: 安装依赖
Write-Host ""
Write-Host "[2/5] 检查依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  安装项目依赖..." -ForegroundColor Cyan
    npm install --legacy-peer-deps
} else {
    Write-Host "  依赖已安装。" -ForegroundColor Green
}

# Step 3: 构建React前端
Write-Host ""
Write-Host "[3/5] 构建React前端..." -ForegroundColor Yellow
npm run build:client
if ($LASTEXITCODE -ne 0) {
    Write-Host "  前端构建失败！" -ForegroundColor Red
    exit 1
}
Write-Host "  前端构建成功。" -ForegroundColor Green

# Step 4: 打包Express服务器
Write-Host ""
Write-Host "[4/5] 打包Express服务器..." -ForegroundColor Yellow
npm run build:server
if ($LASTEXITCODE -ne 0) {
    Write-Host "  服务器打包失败！" -ForegroundColor Red
    exit 1
}
Write-Host "  服务器打包成功。" -ForegroundColor Green

# Step 5: 构建Electron EXE
Write-Host ""
Write-Host "[5/5] 构建Electron EXE（含签名）..." -ForegroundColor Yellow
npm run electron:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  EXE构建失败！" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  构建成功！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "EXE文件位于: release/ 目录" -ForegroundColor White
$exeFiles = Get-ChildItem -Path "release" -Filter "*.exe" -Recurse
foreach ($file in $exeFiles) {
    Write-Host "  -> $($file.FullName)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "双击EXE文件即可安装并运行简易邮箱客户端。" -ForegroundColor White
Write-Host "签名名称：赵佑泽" -ForegroundColor White