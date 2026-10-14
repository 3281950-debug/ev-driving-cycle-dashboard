param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
$output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory)
if (Test-Path -LiteralPath $output) { throw '输出目录已存在；请选择新的空目录，脚本不会覆盖已有交付。' }
if (-not (Test-Path -LiteralPath (Join-Path $sourceRoot 'dist\index.html'))) { throw '请先执行 npm ci 和 npm run build。' }
$version = 'v22.23.3'
$filename = 'node-' + $version + '-win-x64.zip'
$expected = '2b0ff57b049cda1bbcea2240eec20467018713c1efe1f7360c2681859b90ed71'
$stage = Join-Path ([IO.Path]::GetTempPath()) ('ev-dashboard-package-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage -Force | Out-Null
# Downloads are needed only when reproducing the package, never on the recipient computer.
Invoke-WebRequest -UseBasicParsing -Uri ('https://nodejs.org/dist/' + $version + '/' + $filename) -OutFile (Join-Path $stage $filename)
if ((Get-FileHash -LiteralPath (Join-Path $stage $filename) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw '官方 Node 压缩包 SHA256 不匹配，已停止打包。' }
Expand-Archive -LiteralPath (Join-Path $stage $filename) -DestinationPath (Join-Path $stage 'node')
New-Item -ItemType Directory -Path $output,(Join-Path $output 'runtime'),(Join-Path $output 'launcher') | Out-Null
Copy-Item -LiteralPath (Join-Path $sourceRoot 'dist') -Destination (Join-Path $output 'web') -Recurse
$nodeRoot = Join-Path (Join-Path $stage 'node') ('node-' + $version + '-win-x64')
Copy-Item -LiteralPath (Join-Path $nodeRoot 'node.exe'),(Join-Path $nodeRoot 'LICENSE') -Destination (Join-Path $output 'runtime')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'server.mjs') -Destination (Join-Path $output 'launcher')
$utf8BOM = New-Object System.Text.UTF8Encoding($true)
[IO.File]::WriteAllText((Join-Path $output 'launcher\launch.ps1'), [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'launch.ps1')), $utf8BOM)
$entry = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'entry.vbs'))
foreach ($name in @('启动仪表盘.vbs','关闭仪表盘.vbs')) { [IO.File]::WriteAllText((Join-Path $output $name), $entry, [Text.Encoding]::Unicode) }
foreach ($stop in @($false,$true)) {
  $name = if ($stop) { '备用关闭.cmd' } else { '备用启动.cmd' }
  $argument = if ($stop) { ' -Stop' } else { '' }
  $content = '@echo off' + "`r`n" + '"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\launch.ps1"' + $argument + "`r`n" + 'if errorlevel 1 pause' + "`r`n"
  [IO.File]::WriteAllText((Join-Path $output $name), $content, [Text.Encoding]::ASCII)
}
Copy-Item -LiteralPath (Join-Path $sourceRoot 'LICENSE') -Destination $output
Write-Output ('便携包已生成：' + $output)
Write-Output ('临时下载保留在：' + $stage)
