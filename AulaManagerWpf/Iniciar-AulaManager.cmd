@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
title Aula Manager - comprobacion de arranque
set "report=%~dp0AulaManager-arranque.txt"
>"%report%" echo Aula Manager - diagnostico de arranque
ver >>"%report%"
>>"%report%" echo Arquitectura del proceso: %PROCESSOR_ARCHITECTURE%
>>"%report%" echo Arquitectura nativa adicional: %PROCESSOR_ARCHITEW6432%
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v ProductName >>"%report%" 2>&1
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion" /v CSDVersion >>"%report%" 2>&1
reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Release /reg:32 >>"%report%" 2>&1
set "packageArch="
if exist "AulaManager.arch" set /p "packageArch=" <"AulaManager.arch"
>>"%report%" echo Arquitectura del paquete: %packageArch%
if /i "%packageArch%"=="x64" if /i "%PROCESSOR_ARCHITECTURE%"=="x86" if not defined PROCESSOR_ARCHITEW6432 goto wrongArchitecture
set "frameworkRelease=0"
for /f "tokens=3" %%R in ('reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Release /reg:32 2^>nul') do set /a "frameworkRelease=%%R" >nul 2>&1
if %frameworkRelease% LSS 528040 goto missingFramework
if not exist "AulaManager.exe" goto missingFiles
if not exist "AulaManager.exe.config" goto missingFiles
if /i "%~1"=="--check" goto checked
echo Iniciando AulaManager.exe...
"%~dp0AulaManager.exe"
set "appExit=%errorlevel%"
>>"%report%" echo Resultado del proceso: %appExit%
if "%appExit%"=="0" exit /b 0
echo.
echo El programa no ha podido arrancar. Codigo: %appExit%
echo Comparte el aviso exacto y el archivo AulaManager-arranque.txt.
goto failure
:missingFramework
>>"%report%" echo RESULTADO: falta .NET Framework 4.8 o no se ha podido detectar.
echo.
echo No se detecta .NET Framework 4.8 en este equipo.
echo Esta aplicacion WPF necesita ese componente instalado.
echo En Windows 7 se requiere SP1. El instalador puede requerir actualizaciones.
echo Descarga oficial: https://dotnet.microsoft.com/download/dotnet-framework/net48
echo No uses Framework 4.8.1 en Windows 7.
goto failure
:missingFiles
>>"%report%" echo RESULTADO: faltan el ejecutable o su archivo de configuracion.
echo Extrae TODO el ZIP antes de abrir el programa.
goto failure
:wrongArchitecture
>>"%report%" echo RESULTADO: paquete x64 en Windows de 32 bits.
echo Este paquete es de 64 bits y tu Windows es de 32 bits.
echo Descarga el ZIP x86 de Aula Manager.
goto failure
:checked
>>"%report%" echo RESULTADO: Framework detectado y archivos presentes. Falta probar el arranque.
exit /b 0
:failure
echo.
echo Diagnostico: %report%
if /i not "%~1"=="--check" pause
exit /b 1
