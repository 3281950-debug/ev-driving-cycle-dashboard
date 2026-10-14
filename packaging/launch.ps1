param([switch]$Stop, [switch]$NoBrowser, [switch]$NoDialog)
$ErrorActionPreference = 'Stop'
$appRoot = Split-Path -Parent $PSScriptRoot
$nodePath = Join-Path $appRoot 'runtime\node.exe'
$serverPath = Join-Path $PSScriptRoot 'server.mjs'
$webRoot = Join-Path $appRoot 'web'
$hash = [System.Security.Cryptography.SHA256]::Create()
$instance = ([BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($appRoot.ToLowerInvariant())))).Replace('-', '').Substring(0,24)
$hash.Dispose()
$runtimeDir = Join-Path $env:LOCALAPPDATA ('EV-Dashboard\' + $instance)
$stateFile = Join-Path $runtimeDir 'server.json'
$started = $null
$gate = $null
$locked = $false
function Log($message) { Add-Content -LiteralPath (Join-Path $runtimeDir 'launcher.log') -Value ((Get-Date -Format 's') + ' ' + $message) -Encoding UTF8 }
function Read-Ready {
  if (-not (Test-Path -LiteralPath $stateFile)) { return $null }
  try {
    $state = Get-Content -LiteralPath $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($state.app -ne 'ev-dashboard-portable-1' -or $state.instance -ne $instance -or $state.url -notmatch '^http://127\.0\.0\.1:\d+/$') { return $null }
    $process = Get-Process -Id $state.pid -ErrorAction Stop
    if ($process.Path -ne $nodePath) { return $null }
    $health = Invoke-RestMethod -Uri ($state.url + '__ev_health') -TimeoutSec 2
    if ($health.app -ne $state.app -or $health.instance -ne $instance -or $health.pid -ne $state.pid -or $health.token -ne $state.token) { return $null }
    return $state
  } catch { return $null }
}
try {
  New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
  $gate = [System.Threading.Mutex]::new($false, ('Local\EV_Dashboard_Portable_' + $instance))
  try { $locked = $gate.WaitOne(30000) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
  if (-not $locked) { throw '另一启动或关闭操作仍在进行，请稍后重试。' }
  $state = Read-Ready
  if ($Stop) {
    if (-not $state) { Log '服务未运行，无需关闭。'; exit 0 }
    Invoke-WebRequest -UseBasicParsing -Uri ($state.url + '__ev_shutdown') -Method Post -Headers @{'X-EV-Token'=$state.token} -TimeoutSec 3 | Out-Null
    $deadline = [DateTime]::UtcNow.AddSeconds(10)
    while ([DateTime]::UtcNow -lt $deadline) {
      if (-not (Get-Process -Id $state.pid -ErrorAction SilentlyContinue)) { Log '服务已正常退出。'; exit 0 }
      Start-Sleep -Milliseconds 100
    }
    throw '服务未能正常退出，请查看日志。不会强制结束其他进程。'
  }
  if ($state) {
    Log ('复用已有服务：' + $state.url)
    if (-not $NoBrowser) { Start-Process -FilePath $state.url }
    Write-Output $state.url
    exit 0
  }
  if (-not (Test-Path -LiteralPath $nodePath)) { throw '随包运行时缺失：runtime\node.exe。请完整解压交付 ZIP 后再启动。' }
  if (-not (Test-Path -LiteralPath (Join-Path $webRoot 'index.html'))) { throw '生产页面缺失：web\index.html。请重新完整解压。' }
  if (-not (Test-Path -LiteralPath $serverPath)) { throw '启动服务文件缺失：launcher\server.mjs。' }
  $started = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $serverPath + '"'), ('"' + $webRoot + '"'), ('"' + $stateFile + '"'), $instance) -WorkingDirectory $appRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.stdout.log') -RedirectStandardError (Join-Path $runtimeDir 'server.stderr.log') -PassThru
  Log ('启动 PID=' + $started.Id)
  $deadline = [DateTime]::UtcNow.AddSeconds(20)
  while ([DateTime]::UtcNow -lt $deadline) {
    if ($started.HasExited) { throw ('服务提前退出。' + (Get-Content -LiteralPath (Join-Path $runtimeDir 'server.stderr.log') -Raw -ErrorAction SilentlyContinue)) }
    $state = Read-Ready
    if ($state -and $state.pid -eq $started.Id) {
      $page = Invoke-WebRequest -UseBasicParsing -Uri $state.url -TimeoutSec 3
      if ($page.StatusCode -ne 200 -or $page.Content -notmatch 'BYD ATTO 3') { throw '页面完整性检查失败。' }
      if (-not $NoBrowser) { Start-Process -FilePath $state.url }
      Log ('启动成功：' + $state.url)
      Write-Output $state.url
      exit 0
    }
    Start-Sleep -Milliseconds 100
  }
  throw '等待服务就绪超时。'
} catch {
  if ($started -and -not $started.HasExited) { $started.Kill() }
  $message = '仪表盘启动/关闭失败：' + $_.Exception.Message + "`r`n日志目录：" + $runtimeDir
  try { Log $message } catch { }
  if (-not $NoDialog) { try { (New-Object -ComObject WScript.Shell).Popup($message, 0, '电动车仪表盘', 16) | Out-Null } catch { Write-Error $message } }
  else { Write-Output $message }
  exit 1
} finally { if ($locked) { $gate.ReleaseMutex() }; if ($gate) { $gate.Dispose() } }
