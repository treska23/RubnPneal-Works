param([string]$OutputDirectory,[string]$PackagesDirectory,[string]$Destination)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$root = [IO.Path]::GetFullPath((Join-Path $project '..'))
if (!$OutputDirectory) { $OutputDirectory = Join-Path $project 'build\Win7' }
if (!$PackagesDirectory) { $PackagesDirectory = Join-Path $root 'Dependencies\Instaladores' }
if (!$Destination) { $Destination = Join-Path $root 'Entregas\AulaManagerPortable-v0.5' }
$Destination = [IO.Path]::GetFullPath($Destination)
if ($Destination -match '(?i)(^|\\)OneDrive(\\|$)') { throw 'La entrega debe quedar fuera de OneDrive' }
if (Test-Path -LiteralPath $Destination) { throw "Ya existe la entrega: $Destination" }
$packages = @(
 @{ file='LibreOffice_25.2.7.2_Win_x86.msi'; arch='x86'; hash='80339487132640e665a43924dfad16591b3bb150c585cb00d774f6d757b3d04c' },
 @{ file='LibreOffice_25.2.7.2_Win_x86-64.msi'; arch='x86_64'; hash='9fdd22f8ea7a92a67de5beaa08588ef6da58c1930ac86fd57c46b0c6d7ca9d34' }
)
New-Item -ItemType Directory -Path $PackagesDirectory -Force | Out-Null
foreach ($package in $packages) {
    $path = Join-Path $PackagesDirectory $package.file
    if (!(Test-Path -LiteralPath $path)) {
        Invoke-WebRequest "https://downloadarchive.documentfoundation.org/libreoffice/old/25.2.7.2/win/$($package.arch)/$($package.file)" -OutFile $path -UseBasicParsing
    }
    if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $package.hash) { throw "MSI alterado: $($package.file)" }
}
& (Join-Path $PSScriptRoot 'verify-portable.ps1') -OutputDirectory $OutputDirectory -OfflinePackages $PackagesDirectory
New-Item -ItemType Directory -Path (Join-Path $Destination 'Instaladores') -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $OutputDirectory 'AulaManagerPortable.exe') -Destination $Destination
Copy-Item -LiteralPath (Join-Path $project 'README.md') -Destination (Join-Path $Destination 'LEEME.md')
foreach ($package in $packages) { Copy-Item -LiteralPath (Join-Path $PackagesDirectory $package.file) -Destination (Join-Path $Destination 'Instaladores') }
$encoding = New-Object System.Text.UTF8Encoding($true)
[IO.File]::WriteAllText((Join-Path $Destination 'PerfilAula.ini'),"; Sin excepciones. Para conservar una aplicacion: Nombre exacto=1`r`n[Conservar]`r`n",[Text.Encoding]::Unicode)
[IO.File]::WriteAllText((Join-Path $Destination 'LEEME.txt'),@'
AULA MANAGER PORTABLE 0.5 - WINDOWS 7 SP1 Y WINDOWS 10

1. Extrae TODO el ZIP, incluida la carpeta Instaladores.
2. Abre AulaManagerPortable.exe e indica centro y puesto fisico.
3. Guarda documentos, cierra aplicaciones y pulsa PREPARAR EL EQUIPO.
4. Acepta el permiso de administrador de Windows si lo solicita.

El boton recoge propiedades, reduce telemetria, retira aplicaciones externas
y antivirus, instala/actualiza LibreOffice y guarda el informe automaticamente.
Conserva Windows, sus aplicaciones predeterminadas, controladores y bibliotecas
necesarias. No hay que elegir tareas ni seleccionar cada programa.

Si un fabricante exige contrasena, bloquea el modo silencioso o pide reiniciar,
el resultado queda PENDIENTE. No se da por eliminado algo que sigue instalado.
Los registros, respaldos e informes quedan en Datos junto al EXE.

Incluye LibreOffice 25.2.7.2 x86 y x64, version fijada compatible con Windows 7
SP1. No rebaja versiones posteriores compatibles. Con los MSI incluidos no
necesita Internet para LibreOffice. No necesita WPF, .NET ni instalar runtimes.

Se ha comprobado el binario y el flujo con operaciones de prueba. Falta validar
la ejecucion y las modificaciones en equipos reales Windows 7 y Windows 10.
Lee LEEME.md para detalles, limitaciones y excepciones.
'@,$encoding)
New-Item -ItemType Directory -Path (Join-Path $Destination 'Comprobaciones') | Out-Null
foreach ($name in @('compatibilidad-win7.json','layout-tests.txt','pe-tests.txt','pe-regression-tests.txt','automation-tests.txt','core-tests.txt','store-policy-tests.txt')) {
    Copy-Item -LiteralPath (Join-Path $OutputDirectory $name) -Destination (Join-Path $Destination 'Comprobaciones')
}
$manifest = Get-ChildItem -LiteralPath $Destination -File -Recurse | Sort-Object FullName | ForEach-Object {
    (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+$_.FullName.Substring($Destination.Length+1).Replace('\','/')
}
[IO.File]::WriteAllLines((Join-Path $Destination 'SHA256SUMS.txt'),[string[]]$manifest,$encoding)
$zipPath = $Destination+'.zip'
if (Test-Path -LiteralPath $zipPath) { throw "Ya existe el ZIP: $zipPath" }
[IO.Compression.ZipFile]::CreateFromDirectory($Destination,$zipPath,[IO.Compression.CompressionLevel]::Optimal,$true)
$zip = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    foreach ($item in Get-ChildItem -LiteralPath $Destination -File -Recurse) {
        $entryName = [IO.Path]::GetFileName($Destination)+'/'+$item.FullName.Substring($Destination.Length+1).Replace('\','/')
        $entry = $zip.GetEntry($entryName)
        if (!$entry) { throw "Falta un archivo en el ZIP: $entryName" }
        $stream = $entry.Open(); $sha = [Security.Cryptography.SHA256]::Create()
        try { $actual = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') } finally { $stream.Dispose(); $sha.Dispose() }
        if ($actual -ne (Get-FileHash -LiteralPath $item.FullName -Algorithm SHA256).Hash) { throw "Archivo incorrecto en ZIP: $entryName" }
    }
} finally { $zip.Dispose() }
Get-Item -LiteralPath $zipPath | Select-Object FullName,Length
Get-FileHash -LiteralPath $zipPath -Algorithm SHA256
