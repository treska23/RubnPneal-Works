param([string]$OutputDirectory, [switch]$Tests)
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$root = [IO.Path]::GetFullPath((Join-Path $project '..'))
if (!$OutputDirectory) { $OutputDirectory = Join-Path $project 'build\Win7' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$tools = Join-Path $root 'Tools\MSVC2022\VC\Tools\MSVC\14.44.35207'
$compiler = Join-Path $tools 'bin\Hostx64\x86\cl.exe'
if (!(Test-Path -LiteralPath $compiler)) { & (Join-Path $PSScriptRoot 'provision-msvc2022.ps1') }
$signature = Get-AuthenticodeSignature -LiteralPath $compiler
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft') { throw 'El compilador no tiene firma Microsoft vÃ¡lida' }
$sdkRoot = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows Kits\Installed Roots').KitsRoot10
$sdkVersion = Get-ChildItem -LiteralPath (Join-Path $sdkRoot 'Include') -Directory | Where-Object { $_.Name -match '^10\.' } | Sort-Object Name -Descending | Select-Object -First 1 -ExpandProperty Name
$savedInclude=$env:INCLUDE; $savedLib=$env:LIB; $savedPath=$env:PATH
New-Item -ItemType Directory -Path (Join-Path $OutputDirectory 'obj') -Force | Out-Null
try {
 $env:INCLUDE = @((Join-Path $tools 'include'),(Join-Path $sdkRoot "Include\$sdkVersion\ucrt"),(Join-Path $sdkRoot "Include\$sdkVersion\shared"),(Join-Path $sdkRoot "Include\$sdkVersion\um"),(Join-Path $sdkRoot "Include\$sdkVersion\winrt")) -join ';'
 $env:LIB = @((Join-Path $tools 'lib\x86'),(Join-Path $sdkRoot "Lib\$sdkVersion\ucrt\x86"),(Join-Path $sdkRoot "Lib\$sdkVersion\um\x86")) -join ';'
 $env:PATH = (Join-Path $tools 'bin\Hostx64\x86') + ';' + (Join-Path $sdkRoot "bin\$sdkVersion\x64") + ';' + $savedPath
 $flags = @('/nologo','/std:c++17','/O2','/MT','/EHsc','/W4','/utf-8','/DUNICODE','/D_UNICODE','/DWIN32_LEAN_AND_MEAN','/D_WIN32_WINNT=0x0601','/DWINVER=0x0601')
 $resource = Join-Path $OutputDirectory 'obj\resources.res'
 & (Join-Path $sdkRoot "bin\$sdkVersion\x64\rc.exe") /nologo /I (Join-Path $project 'src') "/fo$resource" (Join-Path $project 'src\resources.rc')
 if ($LASTEXITCODE) { throw 'No se pudieron compilar los recursos' }
 $coreSources = @('Core.cpp','InstalledSoftware.cpp','OfficePackage.cpp','Telemetry.cpp','StoreApps.cpp','WindowsMedia.cpp') | ForEach-Object {Join-Path $project "src\$_"}
 & $compiler @flags (Join-Path $project 'src\main.cpp') @coreSources "/Fo$(Join-Path $OutputDirectory 'obj')\" "/Fe$(Join-Path $OutputDirectory 'AulaManagerPortable.exe')" $resource /link /SUBSYSTEM:WINDOWS,6.01 /MANIFEST:EMBED "/MANIFESTINPUT:$(Join-Path $project 'app.manifest')" user32.lib gdi32.lib comctl32.lib
 if ($LASTEXITCODE) { throw 'La aplicaciÃ³n no compila' }
 & node (Join-Path $PSScriptRoot 'check-win7-pe.cjs') (Join-Path $OutputDirectory 'AulaManagerPortable.exe')
 if ($LASTEXITCODE) { throw 'El ejecutable no supera la comprobaciÃ³n binaria Windows 7' }
 if ($Tests) {
  New-Item -ItemType Directory -Path (Join-Path $OutputDirectory 'tests\obj') -Force | Out-Null
  & $compiler @flags (Join-Path $project 'tests\CoreTests.cpp') @coreSources "/Fo$(Join-Path $OutputDirectory 'tests\obj')\" "/Fe$(Join-Path $OutputDirectory 'tests\CoreTests.exe')" /link /SUBSYSTEM:CONSOLE,6.01 user32.lib
  if ($LASTEXITCODE) { throw 'Las pruebas no compilan' }
  & $compiler @flags (Join-Path $project 'tests\AutomationTests.cpp') "/Fo$(Join-Path $OutputDirectory 'tests\obj')\" "/Fe$(Join-Path $OutputDirectory 'tests\AutomationTests.exe')" /link /SUBSYSTEM:CONSOLE,6.01
  if ($LASTEXITCODE) { throw 'Las pruebas de automatizaciÃ³n no compilan' }
 }
} finally { $env:INCLUDE=$savedInclude; $env:LIB=$savedLib; $env:PATH=$savedPath }
