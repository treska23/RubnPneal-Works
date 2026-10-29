# Aula Manager WPF — Windows 7 SP1 / 10 / 11

Esta es la aplicación C# WPF existente, adaptada a .NET Framework 4.8.
Mantenimiento, limpieza, CEIP/SQM, servicios opcionales, inventario, informes,
LibreOffice y asistente de migración permanecen en WPF. No se ha vuelto a C++.
System.Windows.Forms se usa solamente para el selector de carpetas; esa API
también existe en Framework 4.8 y no impide ejecutar en Windows 7.

## Uso portable y requisitos

1. Windows 7 **SP1**, x86 o x64, con .NET Framework **4.8** instalado y sus
   actualizaciones necesarias. Windows 10/11 con Framework 4.8 o posterior.
2. Descarga el ZIP x86 para Windows de 32 bits; en Windows de 64 bits puedes usar
   x86 o x64. Extrae todo el ZIP en una carpeta o USB con permisos de escritura.
3. Ejecuta AulaManager.exe. Conserva AulaManager.exe.config a su lado.
4. Identificación, registros, respaldos e informes se guardan junto al ejecutable.
   Elevar permisos solo es necesario para las operaciones que lo solicitan.

La aplicación no necesita instalarse, pero **no es un paquete sin runtime**.
Framework es un componente del sistema y no admite despliegue self-contained
copiando sus DLL junto al EXE. Si falta 4.8, hay que instalarlo una vez con
permisos de administrador (puede usarse el instalador offline oficial).
No se instala ningún runtime automáticamente. No usar 4.8.1 en Windows 7.
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
