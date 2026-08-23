$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Write-Output "killed $($conn.OwningProcess)"
}
Start-Sleep -Seconds 2
if (Test-Path .next) { Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue }
Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev > dev-server.log 2>&1" -WorkingDirectory "C:\Users\Mash\Desktop\Project Apps\Edyfra" -WindowStyle Minimized
Start-Sleep -Seconds 25
try {
  $r = Invoke-WebRequest -Uri "http://localhost:3000/changelog" -UseBasicParsing -TimeoutSec 240
  Write-Output "changelog: $($r.StatusCode)"
} catch {
  Write-Output "changelog ERR: $($_.Exception.Message)"
}
