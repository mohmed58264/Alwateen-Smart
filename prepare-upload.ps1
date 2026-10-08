$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    New-Item -ItemType Directory -Path 'upload' -Force | Out-Null
    Compress-Archive -LiteralPath 'index.html','assets','data' -DestinationPath 'upload/alwateen-website.zip' -Force
    Write-Host 'Ready: upload/alwateen-website.zip'
} finally {
    Pop-Location
}
