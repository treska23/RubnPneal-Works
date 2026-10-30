# Aula Manager Portable 0.6

Aplicación nativa x86 para Windows 7 SP1 y Windows 10, en equipos de 32 o 64 bits. No necesita WPF, .NET ni instalar Visual C++ Redistributable.

## Contenido del ZIP

El paquete incluye el EXE, las **ISO oficiales de Windows 10 22H2 en español de España, de 32 y 64 bits**, el extractor portable y sus licencias/fuentes. **No incluye instaladores de LibreOffice**. El EXE ocupa menos de 1 MB; las ISO ocupan aproximadamente 9,77 GiB en conjunto. Se usa ZIP sin volver a comprimir sus datos WIM, ya comprimidos.

Extrae todo el ZIP y conserva `Windows10` y `Herramientas` junto al EXE. Usa un disco o pendrive NTFS/exFAT y al menos 12 GB disponibles para la carpeta. Cada ISO supera el límite de 4 GiB de FAT32. Puedes extraer el ZIP en el equipo moderno y copiar la carpeta completa al pendrive para usarla en Windows 7.

## Puesta a punto con un botón

Indica centro y puesto físico y pulsa **Preparar el equipo**. El permiso de administrador se solicita si hace falta. El botón encadena inventario, preparación previa de LibreOffice desde su web, reducción de telemetría, retirada del software externo, instalación/actualización de LibreOffice y exportación del informe.

Conserva LibreOffice, aplicaciones predeterminadas de Windows, actualizaciones, controladores y bibliotecas necesarias. Retira las demás aplicaciones registradas, incluidos antivirus, Microsoft Office y navegadores adicionales. En Windows 10 también revisa paquetes externos de Store y su aprovisionamiento. Las excepciones empiezan vacías; pueden guardarse como `Nombre exacto=1` en `[Conservar]` de `PerfilAula.ini` para todos los puestos.

La telemetría aplica y comprueba políticas CEIP/SQM, AppCompat, recopilación y errores; deshabilita tareas de CEIP, Application Experience y Feedback y detiene/deshabilita los servicios de diagnóstico presentes. Guarda respaldo para **Restaurar telemetría**. No certifica que Windows deje de realizar toda comunicación de diagnóstico.

Los desinstaladores utilizan MSI silencioso, QuietUninstallString del fabricante, Inno Setup, NSIS o Chromium. No se inventan parámetros para desinstaladores desconocidos. Contraseñas, protecciones del fabricante, reinicios o programas que sigan instalados dejan el resultado pendiente. Una instalación o un informe fallidos impiden marcar el puesto como preparado. Cancelar detiene las siguientes operaciones y conserva el informe parcial; no fuerza el cierre de un instalador en marcha.

## LibreOffice desde la web oficial

En **Windows 10**, consulta el catálogo estable de The Document Foundation, elige la versión numérica más reciente y obtiene su SHA256 desde el servidor oficial. Selecciona 32/64 bits según Windows o la arquitectura del LibreOffice ya instalado, descarga el MSI, comprueba hash e identidad/versión/arquitectura del paquete e instala o actualiza automáticamente. No rebaja versiones posteriores ya instaladas. No queda fijado a la versión que existía al compilar la aplicación.

En **Windows 7 SP1**, la última rama compatible es 25.2 y se descarga la edición final **25.2.7.2** del archivo oficial. Las funciones dependientes del Python incluido pueden no funcionar en Windows 7. No intenta instalar 25.8 ni versiones posteriores incompatibles.

Las descargas se guardan en `%LOCALAPPDATA%/AulaManager/Descargas` del equipo intervenido. Si no puede consultar la web o verificar/obtener el MSI, se detiene antes de cambiar servicios o retirar aplicaciones. Necesita Internet para LibreOffice. No distribuye ni utiliza MSI incluidos en el ZIP.

- Catálogo: https://download.documentfoundation.org/libreoffice/stable/
- Archivo para Windows 7: https://downloadarchive.documentfoundation.org/libreoffice/old/25.2.7.2/

## Instalar Windows 10 desde Windows 7 con la ISO incluida

La vista **Migración Windows** detecta la ISO que coincide con la arquitectura actual. Al iniciar, comprueba su SHA256 oficial y la extrae en el disco local con 7-Zip portable. Windows 7 no necesita montar la imagen ni ejecutar Media Creation Tool. Una vez preparado el medio abre `setup.exe` desde Windows; el asistente de Microsoft controla la actualización y la aceptación de sus condiciones.

Se requieren Windows 7 SP1, al menos 2 GB de RAM y 35 GB libres en el disco de Windows, copia externa verificada y licencia/idioma adecuados. Las ISO incluidas son de español de España. Una actualización que conserve programas debe mantener arquitectura e idioma base. La migración se inicia explícitamente desde esa vista: no se ejecuta como parte del botón de mantenimiento. No se formatea ni se arranca desde USB automáticamente.

El medio se prepara en `%LOCALAPPDATA%/AulaManager/Windows10`, con una carpeta distinta por ISO. Se comprueba la arquitectura real de `setup.exe` y la presencia de `sources/install.wim` o `install.esd`. La preparación verificada puede reutilizarse. Cancelar la extracción no abre el instalador. Abrirlo no equivale a completar la migración: queda pendiente de comprobar tras reiniciar.

Origen: https://www.microsoft.com/es-es/software-download/windows10ISO

- x86, `Win10_22H2_Spanish_x32v1.iso`: `db414636d7ec65b1aefcc1242d323e839823db21fd25a2a9c5dcecc3c16c3309`
- x64, `Win10_22H2_Spanish_x64v1.iso`: `0d48c6f236ca9f966eccd84d9be01b038516567aabf1c46dcbee785556b19813`

7-Zip 26.05 se distribuye sin modificar como herramienta externa. Incluye `License.txt`, documentación y código fuente oficial comprimido. Origen: https://github.com/ip7z/7zip/releases/tag/26.05. No se instala como programa en los puestos.

## Datos y compilación

`AulaManager.ini` guarda el último centro/puesto. `Datos/Registros`, `Datos/Respaldos` y `Datos/Informes` se crean junto al EXE. Los identificadores admiten Unicode y los informes llevan BOM UTF-8. Usa identificadores distintos para los puestos del mismo centro.

La fuente, herramientas, dependencias y compilación se mantienen fuera de OneDrive. La copia del ZIP final en OneDrive se hace por petición expresa del usuario.

```powershell
./AulaManagerPortable/scripts/build-portable.ps1 -Tests
./AulaManagerPortable/scripts/verify-portable.ps1
./AulaManagerPortable/scripts/package-portable.ps1
```

La compilación utiliza MSVC 2022/v143 fijado con SHA256, SDK de Windows y Node para la auditoría PE. El guard rechaza v145 y CLR. El auditor revisa la entrega x86, subsistema 6.1 y DLL/importaciones modernas conocidas, incluida la regresión por GetSystemTimePreciseAsFileTime. No equivale a una certificación de todas las APIs.

El empaquetado requiere las dos ISO oficiales verificadas en `Dependencies/Windows10ISO` y 7-Zip en `Dependencies/7zip`. Excluye todo MSI, confirma que las ISO están dentro del ZIP y verifica por SHA256 todos sus archivos. No copia datos ni cachés de los equipos intervenidos.

Pruebas: motor del botón con operaciones inyectadas; Unicode, vista previa, hashes, comandos de desinstalación y catálogo de versiones; 196 combinaciones de tamaño/DPI y cancelación/finalización en segundo plano. Las pruebas ampliadas pueden descargar/verificar el MSI actual y extraer/verificar ambas ISO mediante el código de producción, **sin instalar LibreOffice ni abrir setup.exe**. GitHub Actions usa Windows Server 2022. La apertura y las modificaciones reales siguen necesitando validación en equipos Windows 7 y Windows 10.
