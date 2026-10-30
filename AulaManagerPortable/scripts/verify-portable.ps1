param([string]$OutputDirectory,[string]$OfflinePackages)
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (!$OutputDirectory) { $OutputDirectory = Join-Path $project 'build\Win7' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$encoding = New-Object System.Text.UTF8Encoding($true)
function Invoke-Check([string]$Program,[string[]]$Arguments,[string]$Report) {
    $lines = & $Program @Arguments
    $result = $LASTEXITCODE
    $lines | Write-Output
    if ($Report) { [IO.File]::WriteAllLines((Join-Path $OutputDirectory $Report),[string[]]$lines,$encoding) }
    if ($result) { throw "Falló la comprobación: $Program ($result)" }
}
Invoke-Check 'node' @((Join-Path $PSScriptRoot 'check-win7-pe.cjs'),(Join-Path $OutputDirectory 'AulaManagerPortable.exe')) 'pe-tests.txt'
Invoke-Check 'node' @('--test',(Join-Path $project 'tests\PeAuditTests.cjs')) 'pe-regression-tests.txt'
Invoke-Check (Join-Path $OutputDirectory 'tests\AutomationTests.exe') @() 'automation-tests.txt'
$coreArguments = @()
if ($OfflinePackages) { $coreArguments = @('--packages',[IO.Path]::GetFullPath($OfflinePackages)) }
Invoke-Check (Join-Path $OutputDirectory 'tests\CoreTests.exe') $coreArguments 'core-tests.txt'
$storeResult = & (Join-Path $project 'src\StoreApps.ps1') -SelfTest
$storeCode = $LASTEXITCODE
$storeResult | Write-Output
[IO.File]::WriteAllLines((Join-Path $OutputDirectory 'store-policy-tests.txt'),[string[]]$storeResult,$encoding)
if ($storeCode) { throw 'Fallaron las pruebas de la política Store' }
$test = Start-Process -FilePath (Join-Path $OutputDirectory 'AulaManagerPortable.exe') -ArgumentList '--self-test' -WindowStyle Hidden -PassThru -Wait
Get-Content -LiteralPath (Join-Path $OutputDirectory 'layout-tests.txt')
if ($test.ExitCode) { throw 'Falló la comprobación de la interfaz' }
Write-Output 'PASS verificaciones completadas sin ejecutar mantenimiento sobre el equipo de desarrollo'
