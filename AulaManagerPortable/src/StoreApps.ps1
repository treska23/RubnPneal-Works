param([string]$ProfilePath,[string]$CancelPath,[switch]$SelfTest)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$ProgressPreference = 'SilentlyContinue'
$exceptions = @()
if ($ProfilePath -and (Test-Path -LiteralPath $ProfilePath)) {
    $inSection = $false
    foreach ($line in [IO.File]::ReadAllLines($ProfilePath)) {
        if ($line -match '^\s*\[(.+)\]') { $inSection = $Matches[1] -eq 'Conservar' }
        elseif ($inSection -and $line -match '^\s*(.+?)\s*=\s*1\s*$') { $exceptions += $Matches[1] }
    }
}
$defaults = @('Microsoft.3DBuilder','Microsoft.BingWeather','Microsoft.DesktopAppInstaller',
 'Microsoft.GetHelp','Microsoft.Getstarted','Microsoft.HEVCVideoExtension','Microsoft.Messaging',
 'Microsoft.Microsoft3DViewer','Microsoft.MicrosoftOfficeHub','Microsoft.MicrosoftSolitaireCollection',
 'Microsoft.MicrosoftStickyNotes','Microsoft.MSPaint','Microsoft.Office.OneNote','Microsoft.OneConnect',
 'Microsoft.People','Microsoft.Print3D','Microsoft.SkypeApp','Microsoft.StorePurchaseApp','Microsoft.Wallet',
 'Microsoft.Windows.Photos','Microsoft.WindowsAlarms','Microsoft.WindowsCalculator','Microsoft.WindowsCamera',
 'microsoft.windowscommunicationsapps','Microsoft.WindowsFeedbackHub','Microsoft.WindowsMaps',
 'Microsoft.WindowsSoundRecorder','Microsoft.WindowsStore','Microsoft.Xbox.TCUI','Microsoft.XboxApp',
 'Microsoft.XboxGameOverlay','Microsoft.XboxGamingOverlay','Microsoft.XboxIdentityProvider',
 'Microsoft.XboxSpeechToTextOverlay','Microsoft.ZuneMusic','Microsoft.ZuneVideo','Microsoft.ScreenSketch',
 'Microsoft.MicrosoftEdge','Microsoft.MicrosoftEdge.Stable','Microsoft.WindowsNotepad','Microsoft.Paint',
 'Microsoft.YourPhone','Microsoft.WebMediaExtensions','Microsoft.WebpImageExtension','Microsoft.VP9VideoExtensions',
 'Microsoft.RawImageExtension','Microsoft.HEIFImageExtension','Microsoft.WindowsTerminal')
function Keep-Package($package) {
    $name = if ($package.Name) { $package.Name } else { $package.DisplayName }
    if ($name -in $exceptions -or $name -like 'LibreOffice*') { return $true }
    if ($package.IsFramework -or $package.IsResourcePackage -or $package.NonRemovable -or $package.SignatureKind -eq 'System') { return $true }
    if ($name -match '^Microsoft\.(VCLibs|NET\.Native|UI\.Xaml)\.') { return $true }
    $microsoft = $package.Publisher -match 'O=Microsoft Corporation' -or $package.PackageName -match '_(8wekyb3d8bbwe|cw5n1h2txyewy)$'
    return ($microsoft -and $name -in $defaults)
}
if ($SelfTest) {
    $fixtures = @(
        @(@{Name='Microsoft.WindowsCalculator';Publisher='CN=Microsoft Corporation, O=Microsoft Corporation'},$true),
        @(@{Name='Microsoft.Office.Desktop';Publisher='CN=Microsoft Corporation, O=Microsoft Corporation'},$false),
        @(@{Name='king.com.CandyCrushSaga';Publisher='CN=King'},$false),
        @(@{Name='Vendor.Framework';IsFramework=$true},$true),
        @(@{Name='Microsoft.WindowsStore';PackageName='Microsoft.WindowsStore_1_neutral_8wekyb3d8bbwe'},$true),
        @(@{Name='Vendor.Provisioned';PackageName='Vendor.Provisioned_1_neutral_abc'},$false)
    )
    foreach ($test in $fixtures) { if ((Keep-Package ([pscustomobject]$test[0])) -ne $test[1]) { throw "Policy failed: $($test[0].Name)" } }
    'PASS 6 Store package policy checks (fixtures only)'; exit 0
}
function Check-Cancel { if ($CancelPath -and (Test-Path -LiteralPath $CancelPath)) { 'CANCELLED Store cleanup'; exit 3 } }
$issues = 0
try {
    $packages = @(Get-AppxPackage -AllUsers -PackageTypeFilter Main,Bundle | Where-Object { !(Keep-Package $_) } |
       Group-Object Name | ForEach-Object { $_.Group | Sort-Object IsBundle -Descending | Select-Object -First 1 })
    $provisioned = @(Get-AppxProvisionedPackage -Online | Where-Object { !(Keep-Package $_) })
    foreach ($package in $packages) {
        Check-Cancel
        try {
            if ((Get-Command Remove-AppxPackage).Parameters.ContainsKey('AllUsers')) {
                Remove-AppxPackage -Package $package.PackageFullName -AllUsers -ErrorAction Stop
            } else { Remove-AppxPackage -Package $package.PackageFullName -ErrorAction Stop }
            "REMOVED Store: $($package.Name)"
        } catch { ++$issues; "PENDING Store: $($package.Name): $($_.Exception.Message)" }
    }
    foreach ($package in $provisioned) {
        Check-Cancel
        try { Remove-AppxProvisionedPackage -Online -PackageName $package.PackageName -ErrorAction Stop | Out-Null; "REMOVED provisioning: $($package.DisplayName)" }
        catch { ++$issues; "PENDING provisioning: $($package.DisplayName): $($_.Exception.Message)" }
    }
    Check-Cancel
    $remaining = @(Get-AppxPackage -AllUsers -PackageTypeFilter Main,Bundle | Where-Object { !(Keep-Package $_) })
    $remainingProvisioned = @(Get-AppxProvisionedPackage -Online | Where-Object { !(Keep-Package $_) })
    foreach ($package in $remaining) { ++$issues; "STILL INSTALLED Store: $($package.Name)" }
    foreach ($package in $remainingProvisioned) { ++$issues; "STILL PROVISIONED: $($package.DisplayName)" }
    if ($issues) { exit 2 }
    'VERIFIED Store: no external packages remain'; exit 0
} catch { "ERROR Store inventory: $($_.Exception.Message)"; exit 2 }
