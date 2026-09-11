param(
    [string]$Message = "Aggiornamento modifiche progetto"
)

$gitExe = "C:\Users\Utente\AppData\Local\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe"
if (-not (Test-Path $gitExe)) {
    $gitExe = "git"
}

Write-Host "Verifica stato Git..." -ForegroundColor Cyan
& $gitExe add .
$status = & $gitExe status --porcelain
if ($status) {
    Write-Host "Creazione commit: '$Message'..." -ForegroundColor Yellow
    & $gitExe commit -m $Message
} else {
    Write-Host "Nessun nuovo file da salvare." -ForegroundColor Green
}

Write-Host "Invio su GitHub (origin main)..." -ForegroundColor Cyan
& $gitExe push origin main
Write-Host "Sincronizzazione completata!" -ForegroundColor Green
