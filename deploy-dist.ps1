# Script para deployment de solo archivos compilados
# deploy-dist.ps1

Write-Host "🚀 Preparando deployment de archivos compilados..." -ForegroundColor Green

# Verificar que existe la carpeta dist
if (-not (Test-Path "dist")) {
    Write-Host "❌ Error: No existe la carpeta dist. Ejecuta 'npm run build:prod' primero." -ForegroundColor Red
    exit 1
}

# Crear/limpiar carpeta temporal para deployment
$deployDir = "tuentis-deploy"
if (Test-Path $deployDir) {
    Remove-Item $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir | Out-Null

Write-Host "📦 Copiando archivos compilados..." -ForegroundColor Yellow

# Copiar archivos necesarios
Copy-Item -Path "dist" -Destination "$deployDir\dist" -Recurse -Force
Copy-Item -Path "README-DEPLOY.md" -Destination "$deployDir\" -Force
Copy-Item -Path ".gitignore-dist" -Destination "$deployDir\.gitignore" -Force

Write-Host "✅ Archivos preparados en la carpeta '$deployDir'" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "1. cd $deployDir" -ForegroundColor White
Write-Host "2. git init" -ForegroundColor White
Write-Host "3. git add ." -ForegroundColor White
Write-Host "4. git commit -m 'Deploy: aplicación compilada'" -ForegroundColor White
Write-Host "5. git remote add origin TU-REPO-DE-DEPLOYMENT" -ForegroundColor White
Write-Host "6. git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "🌐 O subir contenido de '$deployDir\dist\' a tu hosting" -ForegroundColor Magenta
Write-Host ""
Write-Host "📁 Contenido de la carpeta de deployment:" -ForegroundColor Yellow
Get-ChildItem $deployDir -Recurse | Select-Object Name, @{Name="Type";Expression={if($_.PSIsContainer){"Folder"}else{"File"}}} | Format-Table -AutoSize