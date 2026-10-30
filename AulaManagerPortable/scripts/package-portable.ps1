param([string]$OutputDirectory,[string]$WindowsIsoDirectory,[string]$SevenZipDirectory,[string]$Destination)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$root = [IO.Path]::GetFullPath((Join-Path $project '..'))
if (!$OutputDirectory) { $OutputDirectory = Join-Path $project 'build\Win7' }
if (!$WindowsIsoDirectory) { $WindowsIsoDirectory = Join-Path $root 'Dependencies\Windows10ISO' }
if (!$SevenZipDirectory) { $SevenZipDirectory = Join-Path $root 'Dependencies\7zip' }
if (!$Destination) { $Destination = Join-Path $root 'Entregas\AulaManagerPortable-v0.6' }
$Destination = [IO.Path]::GetFullPath($Destination)
if ($Destination -match '(?i)(^|\\)OneDrive(\\|$)') { throw 'Construye fuera de OneDrive; copia despues el ZIP terminado a la carpeta solicitada' }
if (Test-Path -LiteralPath $Destination) { throw "Ya existe la entrega: $Destination" }
$isos = @(
 @{ file='Win10_22H2_Spanish_x32v1.iso'; hash='db414636d7ec65b1aefcc1242d323e839823db21fd25a2a9c5dcecc3c16c3309' },
 @{ file='Win10_22H2_Spanish_x64v1.iso'; hash='0d48c6f236ca9f966eccd84d9be01b038516567aabf1c46dcbee785556b19813' }
)
$tools = @(
 @{file='7z.exe';hash='c3598543c41918b5c94dafb9dd724c16c9a217d36b5ee530e3bc10c9f12aca6c'},
 @{file='7z.dll';hash='1c57100cc237db626259f68fe91c5a632a5128e0e01bab1452baa1104ff84311'},
 @{file='7z2605-src.tar.xz';hash='0b6080b8c3e7a579161d2d495224c0e51c467576cb4c7048b0ab485ef44cc22e'}
)
foreach ($iso in $isos) {
 $path=Join-Path $WindowsIsoDirectory $iso.file
 if (!(Test-Path -LiteralPath $path) -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $iso.hash) { throw "Falta la ISO oficial verificada: $($iso.file)" }
}
foreach ($tool in $tools) {
 $path=Join-Path $SevenZipDirectory $tool.file
 if (!(Test-Path -LiteralPath $path) -or (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $tool.hash) { throw "Falta herramienta verificada: $($tool.file)" }
}
& (Join-Path $PSScriptRoot 'verify-portable.ps1') -OutputDirectory $OutputDirectory
New-Item -ItemType Directory -Path (Join-Path $Destination 'Windows10') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $Destination 'Herramientas\7zip') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $OutputDirectory 'AulaManagerPortable.exe') -Destination $Destination
Copy-Item -LiteralPath (Join-Path $project 'README.md') -Destination (Join-Path $Destination 'LEEME.md')
foreach ($iso in $isos) { Copy-Item -LiteralPath (Join-Path $WindowsIsoDirectory $iso.file) -Destination (Join-Path $Destination 'Windows10') }
foreach ($tool in $tools) { Copy-Item -LiteralPath (Join-Path $SevenZipDirectory $tool.file) -Destination (Join-Path $Destination 'Herramientas\7zip') }
foreach ($name in @('License.txt','readme.txt')) { Copy-Item -LiteralPath (Join-Path $SevenZipDirectory $name) -Destination (Join-Path $Destination 'Herramientas\7zip') }
$encoding = New-Object System.Text.UTF8Encoding($true)
[IO.File]::WriteAllLines((Join-Path $Destination 'PerfilAula.ini'),@('; Sin excepciones. Nombre exacto=1 para conservar una aplicacion','[Conservar]'),[Text.Encoding]::Unicode)
[IO.File]::WriteAllText((Join-Path $Destination 'LEEME.txt'),@'
AULA MANAGER PORTABLE 0.6 - WINDOWS 7 SP1 Y WINDOWS 10

Extrae TODO el ZIP en un disco o pendrive NTFS/exFAT, con al menos 12 GB libres.
Conserva Windows10 y Herramientas junto al EXE. Las ISO no caben en FAT32.

PREPARAR EL EQUIPO: recoge propiedades, reduce telemetria, retira programas
externos y antivirus, descarga LibreOffice de su web oficial, lo instala o
actualiza y guarda el informe. NO se incluyen instaladores de LibreOffice.
En Windows 10 consulta la version estable mas reciente; en Windows 7 descarga
25.2.7.2, ultima version compatible. Necesita Internet para LibreOffice.

WINDOWS 10 DESDE WINDOWS 7: abre Migracion Windows. El programa detecta la ISO
incluida de la misma arquitectura que Windows, verifica SHA256 de Microsoft y
la extrae en el disco local sin tener que montarla. Tras confirmar copia de
seguridad y licencia/idioma, abre setup.exe. El asistente de Microsoft controla
la actualizacion y la aceptacion de condiciones. La migracion no forma parte
del boton de mantenimiento. Necesita 35 GB libres y al menos 2 GB de RAM.
Las ISO son Windows 10 22H2 oficial en espanol de Espana, 32 y 64 bits.

Registros, respaldos e informes en Datos junto al EXE. Descargas temporales y
medio Windows extraido en LocalAppData\AulaManager del equipo intervenido.

Un bloqueo del fabricante, contrasena o reinicio deja el resultado PENDIENTE.
Las pruebas no ejecutan desinstaladores ni setup.exe en el equipo de desarrollo.
Falta comprobar apertura y modificaciones reales en Windows 7 y Windows 10.
'@,$encoding)
New-Item -ItemType Directory -Path (Join-Path $Destination 'Comprobaciones') | Out-Null
$reports=@('compatibilidad-win7.json','layout-tests.txt','pe-tests.txt','pe-regression-tests.txt','automation-tests.txt','core-tests.txt','store-policy-tests.txt','media-x64-test.txt','media-x86-test.txt','office-download-test.txt')
foreach ($name in $reports) { if(Test-Path -LiteralPath (Join-Path $OutputDirectory $name)) { Copy-Item -LiteralPath (Join-Path $OutputDirectory $name) -Destination (Join-Path $Destination 'Comprobaciones') } }
if (Get-ChildItem -LiteralPath $Destination -File -Recurse -Filter '*.msi') { throw 'No debe haber MSI de LibreOffice en la entrega' }
$manifest=Get-ChildItem -LiteralPath $Destination -File -Recurse | Sort-Object FullName | ForEach-Object { (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+$_.FullName.Substring($Destination.Length+1).Replace('\','/') }
[IO.File]::WriteAllLines((Join-Path $Destination 'SHA256SUMS.txt'),[string[]]$manifest,$encoding)
$zipPath=$Destination+'.zip'
if(Test-Path -LiteralPath $zipPath){throw "Ya existe el ZIP: $zipPath"}
[IO.Compression.ZipFile]::CreateFromDirectory($Destination,$zipPath,[IO.Compression.CompressionLevel]::NoCompression,$true)
$zip=[IO.Compression.ZipFile]::OpenRead($zipPath)
try {
 foreach($item in Get-ChildItem -LiteralPath $Destination -File -Recurse){
  $entryName=[IO.Path]::GetFileName($Destination)+'/'+$item.FullName.Substring($Destination.Length+1).Replace('\','/')
  $entry=$zip.GetEntry($entryName);if(!$entry){throw "Falta archivo en ZIP: $entryName"}
  $stream=$entry.Open();$sha=[Security.Cryptography.SHA256]::Create()
  try{$actual=[BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','')}finally{$stream.Dispose();$sha.Dispose()}
  if($actual -ne (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash){throw "Contenido ZIP incorrecto: $entryName"}
 }
 if($zip.Entries | Where-Object FullName -like '*.msi'){throw 'El ZIP contiene MSI no solicitados'}
 foreach($iso in $isos){if(!$zip.GetEntry([IO.Path]::GetFileName($Destination)+'/Windows10/'+$iso.file)){throw 'La ISO debe estar dentro del ZIP'}}
}finally{$zip.Dispose()}
Get-Item -LiteralPath $zipPath | Select-Object FullName,Length
Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
