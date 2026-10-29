# Aula Manager WPF v0.4.2 — Windows 7 SP1 / 10 / 11

Esta es la aplicación C# WPF existente, adaptada a .NET Framework 4.8.
Mantenimiento, limpieza, CEIP/SQM, servicios opcionales, inventario, informes,
LibreOffice y asistente de migración permanecen en WPF. No se ha vuelto a C++.
System.Windows.Forms se usa solamente para el selector de carpetas; esa API
también existe en Framework 4.8 y no impide ejecutar en Windows 7.

## Hacer todo el mantenimiento

En Resumen y Mantenimiento aparece el botón **Hacer todo el mantenimiento**.
Después de identificar centro y puesto y abrir con permisos de administrador,
una sola confirmación muestra y ejecuta el lote completo: temporales del usuario
y Windows de más de siete días, CEIP/SQM, DiagTrack, dmwappushservice, Fax,
WMPNetworkSvc, TabletInputService y RemoteRegistry. Conserva el respaldo previo
de CEIP y servicios, busca/descarga/instala LibreOffice compatible, actualiza el inventario y genera el informe automáticamente.
Muestra el progreso y registra incidencias; los servicios ausentes no se cuentan
como cambios correctos. La confirmación advierte de los efectos sobre la entrada
táctil y la administración remota. La limpieza de temporales es irreversible.

Las operaciones seleccionadas siguen disponibles para mantenimiento individual.
LibreOffice ya no requiere buscar un MSI: Actualizar automáticamente realiza todo el proceso. Desinstalar un programa concreto y migrar Windows conservan sus asistentes específicos.

## Uso portable y requisitos

1. Windows 7 **SP1**, x86 o x64, con .NET Framework **4.8** instalado y sus
   actualizaciones necesarias. Windows 10/11 con Framework 4.8 o posterior.
2. Descarga el ZIP x86 para Windows de 32 bits; en Windows de 64 bits puedes usar
   x86 o x64. Extrae todo el ZIP en una carpeta o USB con permisos de escritura.
3. Abre Iniciar-AulaManager.cmd para comprobar primero Framework y conservar
   un diagnóstico de arranque. Conserva AulaManager.exe.config junto al EXE.
4. Identificación, registros, respaldos e informes se guardan junto al ejecutable.
   Elevar permisos solo es necesario para las operaciones que lo solicitan.

La aplicación no necesita instalarse, pero **no es un paquete sin runtime**.
Framework es un componente del sistema y no admite despliegue self-contained
copiando sus DLL junto al EXE. Si falta 4.8, hay que instalarlo una vez con
permisos de administrador (puede usarse el instalador offline oficial).
No se instala ningún runtime automáticamente. No usar 4.8.1 en Windows 7.
Si aparece un aviso de incompatibilidad, conserva su texto exacto y el archivo
AulaManager-arranque.txt generado por el iniciador. Indica qué ZIP has usado.
El x64 no puede abrirse en Windows de 32 bits: utiliza el ZIP x86 también si
no estás seguro de la arquitectura. Si no se detecta 4.8, el iniciador lo explica
sin intentar cargar primero la aplicación WPF. No se considera solucionado un
fallo concreto de Windows 7 solamente porque las pruebas de CI pasen.
No se elige .NET Core 3.1/.NET 6 como alternativa: están fuera de soporte y
sus paquetes autocontenidos también tienen requisitos nativos del sistema.

Fuentes oficiales:
- https://learn.microsoft.com/dotnet/framework/get-started/system-requirements
- https://learn.microsoft.com/dotnet/framework/deployment/deployment-guide-for-developers
- https://support.microsoft.com/en-us/servicing/dotnetframework/2019/10/microsoft-net-framework-4-8-offline-installer-for-windows

## Compilación y comprobaciones

En Windows, con SDK .NET 8 (solo herramienta de compilación):

```
dotnet build AulaManagerWpf/AulaManagerWpf.csproj -c Release -p:Platform=x86
dotnet build AulaManagerWpf/AulaManagerWpf.csproj -c Release -p:Platform=x64
```

El paquete de reference assemblies es privado de compilación; el programa
no depende de .NET 8 ni de paquetes NuGet en el equipo de destino.
Las APIs modernas de argumentos, cadenas, JSON, Clamp y ProcessPath se han
sustituido por equivalentes Framework. El manifiesto declara Windows 7–11
y DPI. Inventario y recorrido de temporales se ejecutan en segundo plano;
se impiden operaciones simultáneas mientras la ventana sigue repintándose.

GitHub Actions compila ambas arquitecturas, arranca cada EXE, recorre las seis
páginas a tres anchuras y verifica JSON de identidad/respaldos y argumentos
Windows. Guarda capturas y publica ZIP y SHA256 solo tras pasar ambos trabajos.
Estas pruebas no aplican mantenimiento ni prueban desinstalaciones.

**Límite de validación:** CI usa Windows Server 2022. Compilar para net48 y
pasar allí las pruebas no acredita ejecución real en Windows 7. Antes de un
despliegue masivo hay que probar en máquinas o VM Windows 7 SP1 x86/x64 con
4.8, y Windows 10/11: arranque, selección de carpetas, identificación persistente,
vista previa, informe y, en una VM desechable, respaldo/restauración CEIP y
servicios con permisos. CEIP y dos servicios no equivalen a eliminar toda la
telemetría. Un servicio ausente se registra como incidencia, sin inventar éxito.

## Actualización automática de LibreOffice

El botón de LibreOffice y el lote completo consultan los servidores oficiales
de The Document Foundation, descargan el MSI y comparan su SHA-256 con el oficial
antes de instalar. Se conserva la arquitectura del LibreOffice ya instalado;
si no está instalado, se usa la del sistema. No se fuerza un descenso de versión.
Windows Installer se ejecuta con progreso visible y sin reiniciar automáticamente.
Se espera a su terminación y se comprueba la versión registrada, sin presentar
un simple lanzamiento del instalador como una actualización terminada.

Windows 7/8: se utiliza 25.2.7.2, última revisión de la última serie compatible,
desde el archivo oficial. La antigua restricción artificial a 7.4 se elimina.
La serie 25.2 está archivada; Windows 7 SP1 puede requerir KB3063858 y otras
actualizaciones. Windows 10/11: se descubre la última versión del directorio
oficial stable que dispone de MSI para esa arquitectura.

Se necesita conexión, espacio en la carpeta Descargas y permisos para instalar.
Si LibreOffice tiene documentos abiertos, se pide cerrarlos sin forzar el cierre.
Una descarga, comprobación o instalación fallida se registra como incidencia;
en el lote se continúa hasta generar el informe. Los MSI verificados quedan en
Descargas para reutilizarlos en otros equipos de igual arquitectura/versión.

CI verifica metadatos oficiales para las cuatro combinaciones de Windows/arquitectura,
descarga el MSI completo, verifica el hash e instala 25.2 x86 y la versión actual x64
en los runners desechables Windows Server 2022. No modifica el LibreOffice del
ordenador de desarrollo. Las pruebas no acreditan la instalación en Windows 7 real.

Fuentes de compatibilidad y descargas:
- https://books.libreoffice.org/en/WG252/WG2500-Preface.html
- https://www.libreoffice.org/system-requirements/
- https://download.documentfoundation.org/libreoffice/stable/
- https://downloadarchive.documentfoundation.org/libreoffice/old/25.2.7.2/
