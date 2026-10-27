#include "Interface.h"
#include "Batch.h"
namespace {
void Navigate(int page){
    SaveIdentity();
    currentPage=page;
    Clear();
    const wchar_t* pages[]={L"Resumen del equipo",L"Mantenimiento y limpieza",L"Programas y antivirus",
                            L"LibreOffice",L"Migración de Windows 7 a Windows 10",L"Registro e informes",L"Puesta a punto completa"};
    const wchar_t* subtitles[]={
        L"Información del sistema y acceso rápido a las principales tareas de mantenimiento.",
        L"Selecciona las operaciones. Ninguna tarea se ejecuta automáticamente.",
        L"Inventario de programas instalados y desinstalación controlada.",
        L"Actualización mediante instaladores oficiales compatibles con este equipo.",
        L"Comprueba requisitos antes de abrir el instalador original de Microsoft.",
        L"Registro de intervenciones por centro y por puesto físico.",
        L"El trabajo se encadena automáticamente. Aquí puedes seguir el avance o cancelarlo."
    };
    Text(L"heading",pages[page],true);
    Text(L"subtitle",subtitles[page],false,true);
    if(page==0){
        aula::Inspection i=UiInspection();
        Text(L"centerCaption",L"Centro municipal");
        Edit(L"centerEdit",layoutTesting?L"Centro municipal de ejemplo":aula::IniRead(L"Centro"),centerEdit);
        Text(L"stationCaption",L"Puesto físico (p. ej., PC10)");
        Edit(L"stationEdit",layoutTesting?L"PC10":aula::IniRead(L"Puesto"),stationEdit);

        if(jobRunning){EnableWindow(centerEdit,FALSE);EnableWindow(stationEdit,FALSE);}
        Strong(L"fullTitle",L"Un botón. Todo el proceso.");
        Text(L"fullDescription",L"Limpieza, ajustes recomendados, antivirus de terceros, LibreOffice e informe final.",false,true);
        Btn(L"fullRun",jobRunning?L"Ver progreso de la puesta a punto":L"Puesta a punto completa",FULL_RUN);
        Text(L"detailsTitle",L"Información del equipo",true);
        std::vector<std::pair<std::wstring,std::wstring>> rows={
            {L"Nombre del equipo",i.machine},
            {L"Sistema operativo",i.windows},
            {L"Arquitectura",i.architecture},
            {L"Procesador",i.cpu},
            {L"Memoria RAM",std::to_wstring(i.ramMb)+L" MB"},
            {L"Espacio libre (C:)",std::to_wstring(i.freeGb)+L" GB"},
            {L"LibreOffice",i.libreoffice},
            {L"Administrador",i.administrator?L"Sí":L"No"}
        };
        for(int n=0;n<8;n++){
            Text((L"key"+std::to_wstring(n)).c_str(),rows[n].first);
            Text((L"value"+std::to_wstring(n)).c_str(),rows[n].second);
        }
        if(!i.administrator)Btn(L"admin",L"Reiniciar como administrador",ELEVATE);
        Strong(L"actionsTitle",L"Acciones rápidas");
        const wchar_t* names[]={L"Limpiar archivos temporales",L"Programas y antivirus",L"Actualizar LibreOffice",
                                L"Migración de Windows",L"Generar informe"};
        const int actionIds[]={QUICK_CLEAN,QUICK_AV,QUICK_LO,QUICK_MIG,QUICK_REPORT};
        for(int n=0;n<5;n++)Btn((L"action"+std::to_wstring(n)).c_str(),names[n],actionIds[n]);
        Text(L"hint",L"Registros junto al ejecutable.",false,true);
        // Resumen inferior con datos reales, sin inventar uso de CPU ni estado del antivirus integrado.
        Strong(L"lowTitle0",L"Estado del equipo");
        Text(L"lowLine0a",L"Sistema operativo identificado");
        Text(L"lowLine0b",L"Administrador: "+std::wstring(i.administrator?L"Sí":L"No"));
        auto av=UiPrograms();
        unsigned thirdParty=0;
        for(const auto& p:av)if(p.antivirus)++thirdParty;
        Text(L"lowLine0c",L"Posibles antivirus de terceros: "+std::to_wstring(thirdParty));
        Strong(L"lowTitle1",L"Recursos del sistema");
        MEMORYSTATUSEX mem={};mem.dwLength=sizeof(mem);
        std::wstring memoryText=L"RAM física: "+std::to_wstring(i.ramMb)+L" MB";
        if(GlobalMemoryStatusEx(&mem))memoryText+=L"  ·  "+std::to_wstring(layoutTesting?42:mem.dwMemoryLoad)+L"% utilizado";
        Text(L"lowLine1a",memoryText);
        Text(L"lowLine1b",L"Disco de Windows libre: "+std::to_wstring(i.freeGb)+L" GB");
        Text(L"lowLine1c",L"Comprobar espacio antes de migrar");
        Strong(L"lowTitle2",L"Trabajo recomendado");
        Text(L"lowLine2a",L"1. Identificar el puesto físico");
        Text(L"lowLine2b",L"2. Revisar y previsualizar cambios");
        Text(L"lowLine2c",L"3. Exportar informe al terminar");
    }else if(page==1){
        Text(L"explain",L"Selecciona únicamente los ajustes que necesites. Los cambios de servicios y registro guardan su estado anterior.");
        Box(L"check0",L"Limpiar temporales del usuario con más de 7 días",checkTemp,true);
        Box(L"check1",L"Incluir C:\\Windows\\Temp (administrador)",checkSysTemp);
        Box(L"check2",L"Reducir telemetría CEIP/SQM (con respaldo)",checkCeip);
        Box(L"check3",L"Deshabilitar servicios de diagnóstico opcionales",checkDiag);
        Box(L"check4",L"Deshabilitar Fax y compartir Windows Media",checkServices);
        Box(L"check5",L"Deshabilitar TabletInputService (solo si no hay pantalla táctil)",checkTablet);
        Box(L"check6",L"Deshabilitar Registro remoto (puede afectar administración remota)",checkRemote);
        Btn(L"preview",L"Vista previa",PREVIEW);
        Btn(L"execute",L"Aplicar operaciones seleccionadas",EXECUTE);
        Btn(L"restore",L"Restaurar servicios",RESTORE);
        Btn(L"ceip",L"Restaurar CEIP",RESTORE_CEIP);
        Text(L"note",L"Windows Update, el cortafuegos y Microsoft Defender no se desactivan. Algunos cambios requieren reinicio.",false,true);
    }else if(page==2){
        Text(L"explain",L"Posibles antivirus al principio. La apertura de un desinstalador no garantiza su eliminación.");
        programList=Element(L"LISTBOX",L"",LBS_NOTIFY|LBS_NOINTEGRALHEIGHT|WS_VSCROLL|WS_HSCROLL|WS_TABSTOP,0,0,200,300,0,fontNormal);
        Put(L"programs",programList);
        installed=UiPrograms();
        for(const auto& p:installed){
            std::wstring label=(p.antivirus?L"[POSIBLE ANTIVIRUS] ":L"")+p.name+
                (p.version.empty()?L"":L"  ("+p.version+L")");
            SendMessageW(programList,LB_ADDSTRING,0,(LPARAM)label.c_str());
        }
        Btn(L"refresh",L"Actualizar listado",REFRESH);
        Btn(L"remove",L"Desinstalar seleccionado",REMOVE_APP);
        Btn(L"windowsApps",L"Programas de Windows",OPEN_WIN);
        Text(L"note",L"Si el desinstalador pide contraseña o reinicio, resuélvelo desde Windows y vuelve a actualizar la lista.",false,true);
    }else if(page==3){
        aula::Inspection i=UiInspection();
        Text(L"installed",L"Versión detectada: "+i.libreoffice,true);
        Text(L"explain",L"Selecciona un MSI oficial de LibreOffice guardado en el pendrive. No se realizan descargas ocultas.");
        Text(L"compat",i.windows7?
             L"Windows 7 SP1: utiliza una versión compatible de LibreOffice 7.4.x. Las versiones actuales no son compatibles.":
             L"Revisa firma digital, versión e idioma del instalador antes de ejecutarlo.");
        Btn(L"pick",L"Seleccionar archivo MSI",MSI_PICK);
        Text(L"filename",selectedMsi.empty()?L"No se ha elegido ningún instalador.":selectedMsi,false,true);
        Btn(L"update",L"Iniciar actualización",MSI_INSTALL);
        Btn(L"official",L"Web oficial de LibreOffice",OPEN_LO);
        Text(L"note",L"Se abrirá el instalador visible. Después comprueba que la versión nueva figura instalada.",false,true);
    }else if(page==4){
        aula::Inspection i=UiInspection();
        Text(L"explain",L"Prepara una ISO oficial en un equipo moderno y copia su contenido a un USB. No uses Media Creation Tool en Windows 7.");
        Text(L"system",L"Sistema: "+i.windows+L"   ·   "+i.architecture+
             L"   ·   RAM: "+std::to_wstring(i.ramMb)+L" MB   ·   Libre: "+std::to_wstring(i.freeGb)+L" GB");
        Text(L"compat",L"La actualización que conserve programas debe iniciarse desde Windows, con arquitectura, idioma y edición compatibles. Windows 10 ya está fuera de soporte general.");
        Btn(L"pick",L"Seleccionar carpeta ISO / USB",FOLDER_PICK);
        Text(L"folder",selectedFolder.empty()?L"No se ha seleccionado ningún medio.":selectedFolder,false,true);
        Btn(L"scan",L"Comprobar requisitos",SCAN);
        Text(L"scanText",L"Esperando selección del instalador.");
        Box(L"backup",L"He realizado y verificado una copia de seguridad externa.",checkBackup);
        Box(L"license",L"Dispongo de medio oficial, licencia válida y arquitectura/idioma adecuados.",checkLicense);
        Btn(L"migrate",L"Abrir instalador Windows",MIGRATE);
    }else if(page==5){
        Text(L"identity",Identity());
        logEdit=Element(L"EDIT",aula::ReadLog(),WS_TABSTOP|ES_MULTILINE|ES_AUTOVSCROLL|ES_READONLY|WS_VSCROLL,
                        0,0,200,280,0,fontSmall);
        Put(L"log",logEdit);
        Btn(L"report",L"Exportar informe TXT",REPORT);
        Btn(L"openReports",L"Abrir carpeta de informes",OPEN_REPORTS);
        Text(L"note",L"Los informes distinguen tareas iniciadas de intervenciones finalizadas.",false,true);
    }
    if(page==6){
        Text(L"jobStatus",JobStatus(),true);
        Put(L"jobLog",Element(L"EDIT",JobText(),WS_TABSTOP|ES_MULTILINE|ES_AUTOVSCROLL|ES_READONLY|WS_VSCROLL,0,0,300,250,0,fontSmall));
        Btn(L"cancelJob",L"Cancelar proceso",CANCEL_JOB);EnableWindow(Find(L"cancelJob"),jobRunning);
        Btn(L"jobReports",L"Ver registro e informes",QUICK_REPORT);
        Text(L"note",L"Los cambios aplicados se conservan al cancelar. Los asistentes del fabricante pueden pedir contraseña o reinicio.",false,true);
    }
    AlignPage();
    InvalidateRect(mainWindow,nullptr,FALSE);
}
void DoMaintenance(bool preview){if(preview)StartPreview();else StartSelectedMaintenance();}
void DoRemove(){
    if(!programList)return;
    LRESULT index=SendMessageW(programList,LB_GETCURSEL,0,0);
    if(index==LB_ERR||(size_t)index>=installed.size()){Notice(L"Selecciona un programa.");return;}
    aula::Program p=installed[(size_t)index];
    std::wstring question=L"¿Abrir el desinstalador de «"+p.name+L"»?\n\n"+
       L"La operación puede requerir interacción, contraseña y reinicio.\nNo se marcará como eliminada hasta verificarlo.";
    if(p.antivirus){
        aula::Inspection i=aula::Inspect();
        if(i.windows7) question+=L"\n\nATENCIÓN: Windows 7 no dispone de una protección antivirus moderna integrada equivalente a Windows 10.";
        question+=L"\n\nNo desinstales la última protección sin valorar la seguridad del equipo.";
    }
    if(!Confirm(question))return;
    std::wstring error;
    if(!aula::UninstallProgram(p,mainWindow,error)){
        AppendLog(L"Desinstalación no iniciada de "+p.name+L": "+error);
        Notice(error,MB_ICONWARNING);
    }else Notice(L"Se abrió el desinstalador. Cuando termine, pulsa «Actualizar listado» para verificar si sigue instalado.");
}
void DoMigration(){
    aula::Inspection i=aula::Inspect();
    std::wstring reason;
    if(!aula::ValidInstallerFolder(selectedFolder,i,reason)){Notice(reason,MB_ICONWARNING);AppendLog(L"Migración bloqueada: "+reason);return;}
    if(!Checked(checkBackup)||!Checked(checkLicense)){
        Notice(L"Marca ambas comprobaciones de copia de seguridad y licencia/arquitectura antes de continuar.",MB_ICONWARNING);return;
    }
    if(!Confirm(L"¿Abrir ahora setup.exe desde Windows?\n\nNo se formateará nada desde Aula Manager. El instalador de Microsoft mostrará sus propias opciones.\nNo inicies desde USB si buscas conservar aplicaciones y archivos."))return;
    if(aula::OpenInstaller(selectedFolder,mainWindow))AppendLog(L"Instalador de Windows iniciado. Resultado de migración PENDIENTE.");
    else{AppendLog(L"No se pudo abrir setup.exe; no se inició la migración.");Notice(L"No se pudo abrir el instalador.",MB_ICONWARNING);}
}
void Action(int id){
    if(id==FULL_RUN){StartFullMaintenance();return;}
    if(id==CANCEL_JOB){CancelJob();return;}
    if(jobRunning&&id>=PREVIEW){Navigate(6);return;}
    if(id>=NAV_BASE&&id<NAV_BASE+6){Navigate(id-NAV_BASE);return;}
    switch(id){
    case QUICK_CLEAN: Navigate(1); break;
    case QUICK_AV: Navigate(2); break;
    case QUICK_LO: Navigate(3); break;
    case QUICK_MIG: Navigate(4); break;
    case QUICK_REPORT: Navigate(5); break;
    case SAVE_ID:
        SaveIdentity();AppendLog(L"Identificación del puesto guardada: "+Identity());Notice(L"Centro y puesto guardados junto al ejecutable.");break;
    case ELEVATE:
        if(aula::Elevate(mainWindow))DestroyWindow(mainWindow);
        else Notice(L"No se pudo solicitar elevación.",MB_ICONWARNING);
        break;
    case PREVIEW:DoMaintenance(true);break;
    case EXECUTE:DoMaintenance(false);break;
    case RESTORE:{
        std::wstring message;
        if(Confirm(L"¿Restaurar el tipo de arranque anterior de los servicios respaldados en ESTE puesto?")){
            aula::RestoreServices(message);Notice(message);
        }
        break;
    }
    case RESTORE_CEIP:{
        std::wstring message;
        if(Confirm(L"¿Restaurar el valor CEIP original respaldado para este puesto?")){
            aula::ChangeCeip(true,message);Notice(message);
        }
        break;
    }
    case REFRESH:
        AppendLog(L"Listado de programas actualizado para comprobar el estado tras la desinstalación.");
        Navigate(2);break;
    case REMOVE_APP:DoRemove();break;
    case OPEN_WIN:
        ShellExecuteW(mainWindow,L"open",L"control.exe",L"appwiz.cpl",nullptr,SW_SHOWNORMAL);break;
    case MSI_PICK:
        selectedMsi=aula::ChooseMsi(mainWindow);
        SetLabel(L"filename",selectedMsi.empty()?L"Ningún MSI seleccionado.":selectedMsi);
        break;
    case MSI_INSTALL:{
        std::wstring message;
        if(!aula::InstallLibreOffice(selectedMsi,mainWindow,message)){
            AppendLog(L"LibreOffice: no se inició la instalación. "+message);
            Notice(message,MB_ICONWARNING);
        }else Notice(L"Se ha iniciado la instalación. Verifica la versión al terminar y consulta el registro.");
        break;
    }
    case OPEN_LO:aula::LaunchUrl(L"https://es.libreoffice.org/descarga/libreoffice/");break;
    case FOLDER_PICK:
        selectedFolder=aula::ChooseFolder(mainWindow);
        SetLabel(L"folder",selectedFolder.empty()?L"No seleccionada.":selectedFolder);
        break;
    case SCAN:{
        std::wstring msg;bool valid=aula::ValidInstallerFolder(selectedFolder,aula::Inspect(),msg);
        SetLabel(L"scanText",msg);
        AppendLog(std::wstring(valid?L"Medio de instalación: ":L"Medio rechazado: ")+msg);
        Notice(msg,valid?MB_ICONINFORMATION:MB_ICONWARNING);break;
    }
    case MIGRATE:DoMigration();break;
    case REPORT:{
        bool ok=aula::SaveReport(aula::IniRead(L"Centro"),aula::IniRead(L"Puesto"));
        if(ok)AppendLog(L"Informe de intervención TXT exportado.");Notice(ok?
         L"Informe guardado en Datos\\Informes, junto al ejecutable.":
         L"No se pudo guardar el informe. Comprueba permisos y espacio en el pendrive.",
         ok?MB_ICONINFORMATION:MB_ICONWARNING);
        break;
    }
    case OPEN_REPORTS:{
        std::wstring p=aula::DataFolder()+L"\\Informes";
        CreateDirectoryW(p.c_str(),nullptr);
        ShellExecuteW(mainWindow,L"open",p.c_str(),nullptr,nullptr,SW_SHOWNORMAL);break;
    }
    default:break;
    }
}

}
#include "Window.h"
