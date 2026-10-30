param([string]$Destination = (Join-Path $PSScriptRoot '..\..\Tools\MSVC2022'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$Destination = [IO.Path]::GetFullPath($Destination)
New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$lock = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'msvc2022.lock.json') -Raw | ConvertFrom-Json
$receipts = @()
foreach ($payload in $lock.packages) {
 $id = $payload.id
  $uri = [Uri]$payload.url
  if ($uri.Scheme -ne 'https' -or $uri.Host -notin @('download.visualstudio.microsoft.com','download.microsoft.com')) { throw 'Origen de herramientas no admitido' }
  $archive = Join-Path $Destination $payload.fileName
  if (!(Test-Path -LiteralPath $archive) -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $payload.sha256) {
   Write-Output "Descargando $id ($([math]::Round($payload.size/1MB,1)) MB)"
   Invoke-WebRequest $payload.url -OutFile $archive -UseBasicParsing
  }
  if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $payload.sha256) { throw "SHA256 no válido: $id" }
  $zip = [IO.Compression.ZipFile]::OpenRead($archive)
  try {
   foreach ($entry in $zip.Entries) {
    if (!$entry.FullName.StartsWith('Contents/')) { continue }
    $relative = $entry.FullName.Substring(9).Replace('/',[IO.Path]::DirectorySeparatorChar)
    if (!$relative) { continue }
    $target = [IO.Path]::GetFullPath((Join-Path $Destination $relative))
    if (!$target.StartsWith($Destination + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta de paquete fuera de destino' }
    if ($entry.FullName.EndsWith('/')) { New-Item -ItemType Directory -Path $target -Force | Out-Null; continue }
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($target)) -Force | Out-Null
    if ((Test-Path -LiteralPath $target) -and (Get-Item -LiteralPath $target).Length -eq $entry.Length) {
     $sourceStream=$entry.Open(); $existingStream=[IO.File]::OpenRead($target)
     try {
      $sha=[Security.Cryptography.SHA256]::Create()
      $sourceHash=[BitConverter]::ToString($sha.ComputeHash($sourceStream))
      $existingHash=[BitConverter]::ToString($sha.ComputeHash($existingStream))
     } finally { $sourceStream.Dispose();$existingStream.Dispose() }
     if ($sourceHash -eq $existingHash) { continue }
    }
    [IO.Compression.ZipFileExtensions]::ExtractToFile($entry,$target,$true)
   }
  } finally { $zip.Dispose() }
  $receipts += [pscustomobject]@{package=$id;version=$payload.version;url=$payload.url;sha256=$payload.sha256}
}
$receipts | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Destination 'download-receipt.json') -Encoding utf8
Write-Output "Herramientas MSVC 2022 preparadas en $Destination"
