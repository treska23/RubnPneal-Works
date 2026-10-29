# Aula Manager Portable 0.5

Herramienta de puesta a punto para **Windows 7 SP1 y Windows 10, de 32 o 64 bits**. El EXE es nativo Win32, x86, con CRT estática; no necesita WPF, .NET ni instalar Visual C++ Redistributable. La carpeta WPF del repositorio es independiente y no forma parte de esta entrega.

## Uso

Extrae el paquete completo en un pendrive o carpeta con escritura. Conserva `Instaladores` junto al EXE. Abre `AulaManagerPortable.exe`, indica centro y puesto físico y pulsa **Preparar el equipo**. Concede el permiso de administrador de Windows si lo solicita. No hay selección de tareas ni confirmación programa por programa.

El botón ejecuta en segundo plano:

1. Inventario del ordenador: Windows, arquitectura, CPU, RAM, disco y software registrado.
2. Preparación de LibreOffice, antes de retirar ningún programa: selección de arquitectura, comprobación SHA256 oficial y lectura de identidad y versión del MSI.
3. Respaldo y reducción de telemetría: políticas CEIP/SQM, AppCompat, recopilación y errores; tareas de CEIP, Application Experience y Feedback; desactivación y parada de DiagTrack, dmwappushservice y WerSvc cuando existen. Comprueba los valores y estados aplicados. La ausencia de un componente se distingue de un error. Esto no certifica que Windows deje de realizar toda comunicación de diagnóstico.
4. Desinstalación de las aplicaciones externas registradas, incluidos antivirus, navegadores adicionales y Microsoft Office. Conserva LibreOffice, aplicaciones predeterminadas de Windows, actualizaciones, controladores y bibliotecas compartidas necesarias. No se conserva todo el software de Microsoft por el hecho de ser de Microsoft.
5. En Windows 10, retirada de aplicaciones externas de Store y sus paquetes aprovisionados para nuevos usuarios, conservando las aplicaciones predeterminadas y componentes del sistema. Se vuelve a consultar el inventario. Este módulo utiliza el PowerShell de Windows 10 sin mostrar una consola; Windows 7 nunca lo ejecuta.
6. Instalación/actualización silenciosa de LibreOffice y comprobación de la versión realmente registrada.
7. Verificación final e informe automático con propiedades, operaciones, errores y reinicios pendientes.

El programa identifica MSI, QuietUninstallString del fabricante, Inno Setup, NSIS y desinstaladores Chromium. No inventa parámetros de silencio para un instalador desconocido. Una contraseña, protección del fabricante, reinicio, modo desatendido no reconocido o programa que siga instalado deja el puesto **pendiente**, nunca como completamente preparado. No puede garantizarse la retirada silenciosa de cualquier antivirus existente. Se conserva Windows Update, cortafuegos y protección integrada de Microsoft.

Cancelar impide iniciar la siguiente operación y guarda el informe parcial. No fuerza el cierre de un instalador en marcha ni revierte desinstalaciones. La migración de Windows y la limpieza de temporales quedan en herramientas avanzadas, fuera de la secuencia de puesta a punto solicitada.

## LibreOffice incluido

El paquete completo contiene los MSI oficiales x86 y x64 de **LibreOffice 25.2.7.2**, rama compatible con Windows 7 SP1. Es la versión fijada para este perfil, no una promesa de instalar la versión más reciente para Windows 10. Las funciones que requieren el Python incluido de LibreOffice pueden no estar disponibles en Windows 7. No se rebaja una versión posterior compatible ya instalada. Si existe LibreOffice de 32 bits en Windows de 64 bits, mantiene esa arquitectura al actualizar.

Si falta un MSI o su SHA256 no coincide, el programa intenta obtener la copia exacta por HTTPS desde el archivo oficial de The Document Foundation y vuelve a comprobarla. Con el paquete completo no necesita conexión para LibreOffice. Si la preparación falla, se detiene antes de cambiar servicios o desinstalar aplicaciones.

- x86: `80339487132640e665a43924dfad16591b3bb150c585cb00d774f6d757b3d04c`
- x64: `9fdd22f8ea7a92a67de5beaa08588ef6da58c1930ac86fd57c46b0c6d7ca9d34`

Los instaladores proceden de https://downloadarchive.documentfoundation.org/libreoffice/old/25.2.7.2/. Sus metadatos se pueden consultar abriendo la base MSI en modo de solo lectura; las pruebas de este repositorio no los instalan en el equipo de desarrollo.

## Excepciones y datos

El perfil empieza sin excepciones. Para una futura excepción, añade el nombre exacto mostrado por el inventario como `Nombre del programa=1` en `[Conservar]` de `PerfilAula.ini`. En Store utiliza el nombre de paquete. Esa lista se aplica a todos los puestos sin elegir programas en cada ordenador.

`AulaManager.ini` guarda el último centro/puesto. `Datos/Registros`, `Datos/Respaldos` y `Datos/Informes` se crean junto al EXE. Los informes tienen BOM UTF-8 y los identificadores admiten Unicode. Utiliza un identificador diferente para cada puesto físico del mismo centro. La opción avanzada **Restaurar telemetría** recupera las políticas, tareas y servicios respaldados; no reinstala las aplicaciones retiradas.

## Compilación y comprobaciones

Ejecuta en PowerShell desde la raíz del repositorio:

```powershell
./AulaManagerPortable/scripts/build-portable.ps1 -Tests
./AulaManagerPortable/scripts/verify-portable.ps1
./AulaManagerPortable/scripts/package-portable.ps1
```

Las herramientas, caché y entregas se guardan en `Tools`, `Dependencies` y `Entregas` dentro del repositorio, que debe estar fuera de OneDrive. La compilación usa MSVC 2022/v143 fijado mediante URLs y SHA256 de los paquetes oficiales de Microsoft en `scripts/msvc2022.lock.json`. Necesita un SDK de Windows instalado y Node para la auditoría PE. No modifica la instalación de Visual Studio. El guard de compilación rechaza MSVC 2026/v145; ese runtime introducía en la entrega anterior una importación de `GetSystemTimePreciseAsFileTime`, ausente en Windows 7.

La auditoría revisa el EXE que se va a empaquetar: PE32 x86, sin CLR, subsistema 6.1, enlazador anterior a v145, DLL del sistema y ausencia de importaciones modernas conocidas. Sus pruebas incluyen una regresión para la función que impedía abrir v0.4. Es un filtro estático, no una certificación de todas las APIs posibles.

Las pruebas del motor compartido con el botón usan inventarios y operaciones inyectadas: retirada de todo el software externo, antivirus, actualización de LibreOffice, ausencia de MSI, desinstalador fallido, cancelación e informe fallido. Las pruebas Core comprueban Unicode, SHA256, comandos silenciosos, vista previa de temporales e informes; con `-OfflinePackages` validan los MSI reales sin instalarlos. La política Store se prueba con paquetes ficticios y nunca ejecuta una retirada real durante las pruebas.

`--self-test` comprueba las siete vistas con textos largos en siete tamaños (640×480 a 1920×1080) y cuatro escalas DPI: 196 combinaciones. También comprueba finalización y cancelación de una tarea de vista previa en una carpeta vacía aislada. No ejecuta mantenimiento. Genera `layout-tests.txt` y capturas del propio renderizador, sin capturar otras ventanas del escritorio.

GitHub Actions usa Windows Server 2022 y la misma compilación fijada y comprobaciones. Las pruebas locales se realizan en el Windows disponible de desarrollo. **La apertura y las modificaciones reales en equipos Windows 7 y Windows 10 siguen necesitando una prueba en esos sistemas**; no se afirma que las pruebas con operaciones inyectadas equivalgan a una desinstalación real. El paquete incluye el informe de comprobación binaria y los resultados reproducibles.
