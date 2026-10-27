# Aula Manager Portable (prototipo técnico 0.1)

Aplicación **nativa de escritorio Windows (Win32, C++17, Visual Studio 2022)**, en español, orientada a las revisiones de aulas de centros municipales de mayores. **No tiene instalador** y la compilación Release/Win32 utiliza **CRT estática (/MT)**: el ejecutable puede llevarse en un pendrive y arrancar tanto en Windows 7 SP1 de 32 bits como en Windows 10 de 32 o 64 bits, sin instalar .NET ni Visual C++ Redistributable. El funcionamiento en cada equipo real debe verificarse antes de uso en producción.

> ESTADO: **primera versión funcional en desarrollo**, no sustituye todavía todas las operaciones de Nivel 3 de Aurora/Aula Optimizer. No se ha probado en los ordenadores reales de los centros. No ejecute mantenimiento masivo antes de validarlo en un PC piloto. El compilador de GitHub Actions valida que el proyecto se puede generar, pero no demuestra compatibilidad de hardware ni ausencia de regresiones.

## Cómo abrir y compilar

1. Abrir \`AulaManagerPortable.sln\` en Visual Studio 2022 con el componente **Desarrollo para el escritorio con C++** y el SDK de Windows.
2. Seleccionar **Release | Win32** y compilar.
3. Copiar **solo** \`build\Release\AulaManagerPortable.exe\` al pendrive.
4. Ejecutar directamente. Si se quieren almacenar registros, el pendrive debe permitir escritura. El programa crea \`Datos\\\` y \`AulaManager.ini\` junto a sí mismo; **no escribe su configuración en AppData**.
5. Los cambios que requieren administrador se hacen después de elegir **Reiniciar como administrador**. El programa nunca instala un servicio residente.

En la rama \`feat/aula-manager-portable\` hay un flujo de GitHub Actions que compila Win32 Release. Si termina correctamente, se puede obtener el \`.exe\` desde el artefacto de esa ejecución (se requiere acceder a las acciones de GitHub).

## Módulos implementados

| Módulo | Operaciones | Seguridad/estado |
|---|---|---|
| Resumen | Nombre Windows, sistema, arquitectura, CPU, memoria, espacio libre y LibreOffice | El **centro y puesto físico** se introducen independientemente del nombre de Windows (evita mezclar equipos clonados). |
| Mantenimiento | Vista previa y eliminación de temporales con antigüedad superior a 7 días | No entra en reparse points/junctions; evita eliminar carpetas completas. Archivos en uso o protegidos se omiten si Windows los bloquea. |
| Telemetría y servicios | CEIP/SQM y arranque opcional de DiagTrack, dmwappushservice, Fax, WMPNetworkSvc, TabletInputService y RemoteRegistry | Opt-in. Respalda valores por centro/puesto y permite restaurarlos. No toca Windows Update, Firewall ni Microsoft Defender. **No equivale a eliminar toda la telemetría**. |
| Software | Inventario por Registro, detección orientativa de antivirus de terceros y apertura del desinstalador registrado | Interacción con asistentes del fabricante, sin garantía de eliminación. Los antivirus de Microsoft no se eliminan. Actualizar listado para verificar. |
| LibreOffice | Detección y ejecución interactiva de un archivo MSI local seleccionado por el técnico | En Windows 7 restringido preventivamente a instaladores LibreOffice 7.4.x. La aplicación no descarga ejecutables ni comprueba todavía la firma digital del MSI. |
| Migración | Revisión preliminar de SP1, RAM, disco y presencia de archivos de ISO/USB; lanzamiento visible de setup.exe | **Nunca formatea ni modifica particiones por su cuenta**. Requiere confirmación de copia de seguridad, licencia y arquitectura. |
| Informes | Registro de actuaciones y exportación TXT UTF-8 por centro y puesto | No afirma que una desinstalación o migración haya finalizado sin comprobarla. |

## Migrar Windows 7 a Windows 10 evitando Media Creation Tool en el ordenador antiguo

1. Preparar desde otro equipo actualizado una ISO **oficial de Windows 10 22H2**, normalmente desde <https://www.microsoft.com/es-es/software-download/windows10iso>.
2. Extraer todos sus archivos en un USB con suficiente capacidad, por ejemplo desde un Windows 10/11.
3. En el equipo Windows 7 SP1 iniciar sesión, guardar copia externa de los datos y abrir la aplicación desde el pendrive.
4. En «Migración», elegir la **carpeta raíz** con \`setup.exe\` y \`sources\install.wim\` o \`sources\install.esd\`.
5. Comprobar **idioma, edición, arquitectura del medio y validez de licencia**. Para intentar conservar aplicaciones y datos, la instalación debe iniciarse **desde Windows 7 en funcionamiento** y con la misma arquitectura de 32/64 bits. El cambio de 32 a 64 bits precisa instalación limpia con copia/recuperación de datos.
6. La aplicación hace una precomprobación básica y abre el instalador original de Windows mediante UAC, **sin automatizar la decisión de particionado**. El instalador de Microsoft determina la compatibilidad final.

**Avisos importantes**: Windows 10 Home/Pro llegó a fin del soporte el **14/10/2025**; estudiar ESU empresarial o migrar a hardware soportado. Microsoft cerró la posibilidad de obtener una nueva actualización gratuita desde Windows 7/8. El instalador puede requerir clave/licencia válida. No se debe confiar en que el equipo quedará activado automáticamente.

El error de Media Creation Tool \`0x80072F8F-0x20000\` **puede estar relacionado** con fecha/hora o incompatibilidad TLS/certificados; no demuestra que el PC sea incapaz de ejecutar Windows 10. Microsoft documenta KB3140245 y los ajustes WinHTTP/SChannel para TLS 1.2 en Windows 7, pero el programa **no hace cambios TLS peligrosos a ciegas**.

### Fuentes oficiales para mantenimiento

- [Microsoft: Windows 10 fin de soporte](https://support.microsoft.com/es-es/windows/deployment/updates-lifecycle/windows-10-support-has-ended-on-october-14-2025)
- [Microsoft: retirada de la actualización gratuita de Windows 7/8](https://devicepartner.microsoft.com/en-US/communications/comm-windows-ends-installation-path-for-free-windows-7-8-upgrade)
- [Microsoft: habilitar TLS 1.2 en Windows 7](https://learn.microsoft.com/es-es/intune/configmgr/core/plan-design/security/enable-tls-1-2-client)
- [Microsoft: descargar ISO de Windows 10](https://www.microsoft.com/es-es/software-download/windows10iso)
- [LibreOffice: requisitos de versiones actuales](https://es.libreoffice.org/requisitos-del-sistema/)
- [LibreOffice 7.4: requisitos del sistema, documentación histórica](https://wiki.documentfoundation.org/images/d/df/GS7400-Preface.pdf)

## Diferencias respecto al nivel 3 de Aula Optimizer

Los registros proporcionados en el proyecto CURRO muestran operaciones de CEIP/SQM, tareas programadas CEIP, servicios, efectos visuales, limpieza, eliminación de programas y LibreOffice. Esta versión **no** realiza aún de forma automática:
- reversión/cambios en todas las tareas programadas CEIP;
- optimización de efectos visuales;
- eliminación automatizada de todos los antivirus de terceros, especialmente si disponen de autoprotección;
- gestión de todos los programas prescindibles del nivel 3 sin lista blanca/negra por centro;
- actualización LibreOffice mediante descarga automática con firma, hash y detección fiable de compatibilidad;
- auditoría de cables/periféricos, red SIM, disco SMART y generación avanzada de informes por aula;
- copia externa automática de perfiles/datos ni validación avanzada del contenido/arquitectura de ISO.

Las desinstalaciones registradas como iniciadas deben revisarse y los resultados técnicos han de recogerse por **puesto físico**. No desinstalar sin verificar programas docentes, drivers, herramientas de accesibilidad ni software necesario para cada aula.

## Arquitectura y limitaciones

- Fuente \`src/Core.cpp\`: inventario, registro, temporales, servicios, software y migración.
- Fuente \`src/main.cpp\`: navegación gráfica de 6 apartados y acciones.
- \`AulaManager.ini\`: último centro/puesto; \`Datos/Registros\`, \`Datos/Respaldos\`, \`Datos/Informes\`.
- No usa PowerShell, \`chcp 65001\`, \`Write-Host\` ni scripts PS; evita la ruta que falló en PC10 de Monteolivete.
- La eliminación de temporales es permanente y **no reversible**. Las copias de seguridad de servicios/CEIP dependen del identificador de centro y puesto físico en el mismo pendrive; no usar puestos con identificadores repetidos en el mismo centro.
- Aplicación creada con Win32 clásico para maximizar compatibilidad/portabilidad. Se puede modernizar la interfaz manteniendo un ejecutable nativo.
- Necesita validación en un PC Windows 7 y otro Windows 10; Microsoft ya no mantiene Windows 7.
