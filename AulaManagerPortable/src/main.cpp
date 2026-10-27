#define UNICODE
#define _UNICODE
#include "Core.h"
#include "Skin.h"
#include <windows.h>
#include <shellapi.h>
#include <commctrl.h>
#include <algorithm>
#include <vector>

#pragma comment(lib, "user32.lib")
#pragma comment(lib, "gdi32.lib")
#pragma comment(lib, "shell32.lib")

namespace {
constexpr int NAV_BASE=100;
constexpr int PREVIEW=200,EXECUTE=201,RESTORE=202,ELEVATE=203,REFRESH=204,
              REMOVE_APP=205,MSI_PICK=206,MSI_INSTALL=207,OPEN_LO=208,
              FOLDER_PICK=209,SCAN=210,MIGRATE=211,REPORT=212,OPEN_REPORTS=213,
              RESTORE_CEIP=214,SAVE_ID=215,OPEN_WIN=216,QUICK_CLEAN=217,QUICK_AV=218,QUICK_LO=219,QUICK_MIG=220,QUICK_REPORT=221;
HWND mainWindow=nullptr,centerEdit=nullptr,stationEdit=nullptr,logEdit=nullptr;
HWND programList=nullptr,msiLabel=nullptr,folderLabel=nullptr,scanLabel=nullptr;
HWND checkTemp=nullptr,checkSysTemp=nullptr,checkCeip=nullptr,checkDiag=nullptr,
     checkServices=nullptr,checkTablet=nullptr,checkRemote=nullptr,checkBackup=nullptr,checkLicense=nullptr;
HFONT fontNormal=nullptr,fontTitle=nullptr,fontSmall=nullptr;
HBRUSH background=nullptr;
HBRUSH whiteEdit=nullptr;
ULONG_PTR gdipToken=0;
std::vector<HWND> children;
std::vector<aula::Program> installed;
std::wstring selectedMsi,selectedFolder;
int currentPage=0;
std::wstring TextOf(HWND h){
    if(!h)return L"";
    int n=GetWindowTextLengthW(h);
    std::vector<wchar_t> b(n+1);GetWindowTextW(h,b.data(),n+1);
    return b.data();
}
void Font(HWND h,HFONT f){
    if(h)SendMessageW(h,WM_SETFONT,(WPARAM)f,TRUE);
}
HWND Element(const wchar_t* cls,const std::wstring& label,DWORD style,
             int x,int y,int width,int height,int id=0,HFONT f=nullptr){
    DWORD ex=wcscmp(cls,L"STATIC")==0?WS_EX_TRANSPARENT:0;
    HWND h=CreateWindowExW(ex,cls,label.c_str(),WS_CHILD|WS_VISIBLE|style,
                           x,y,width,height,mainWindow,(HMENU)(INT_PTR)id,GetModuleHandleW(nullptr),nullptr);
    Font(h,f?f:fontNormal);children.push_back(h);return h;
}
HWND Label(const std::wstring& t,int x,int y,int w,int h,bool title=false){
    return Element(L"STATIC",t,SS_LEFT,x,y,w,h,0,title?fontTitle:fontNormal);
}
HWND Button(const wchar_t* t,int x,int y,int w,int h,int id){
    return Element(L"BUTTON",t,BS_OWNERDRAW|WS_TABSTOP,x,y,w,h,id);
}
HWND Check(const wchar_t* t,int x,int y,int w,int h,bool initial=false){
    HWND hWnd=Element(L"BUTTON",t,BS_OWNERDRAW|WS_TABSTOP,x,y,w,h);
    SetPropW(hWnd,L"AulaCheckbox",(HANDLE)1);
    if(initial)SetPropW(hWnd,L"AulaChecked",(HANDLE)1);
    InvalidateRect(hWnd,nullptr,TRUE);
    return hWnd;
}
bool Checked(HWND h){return h && GetPropW(h,L"AulaChecked")!=nullptr;}
void Clear(){
    for(HWND h:children)if(h&&IsWindow(h))DestroyWindow(h);
    children.clear();
    centerEdit=stationEdit=logEdit=programList=msiLabel=folderLabel=scanLabel=nullptr;
    checkTemp=checkSysTemp=checkCeip=checkDiag=checkServices=checkTablet=checkRemote=checkBackup=checkLicense=nullptr;
}
void Notice(const std::wstring& message,UINT icon=MB_ICONINFORMATION){
    MessageBoxW(mainWindow,message.c_str(),L"Aula Manager Portable",MB_OK|icon);
}
void SaveIdentity(){
    if(centerEdit) aula::IniWrite(L"Centro",TextOf(centerEdit));
    if(stationEdit) aula::IniWrite(L"Puesto",TextOf(stationEdit));
}
void RefreshLog(){
    if(logEdit){SetWindowTextW(logEdit,aula::ReadLog().c_str());
        SendMessageW(logEdit,EM_SETSEL,(WPARAM)-1,(LPARAM)-1);
        SendMessageW(logEdit,EM_SCROLLCARET,0,0);}
}
void AppendLog(const std::wstring& s){aula::Log(s);RefreshLog();}
std::wstring Identity(){
    std::wstring c=aula::IniRead(L"Centro"),p=aula::IniRead(L"Puesto");
    return L"Centro: "+(c.empty()?L"(no indicado)":c)+L"   |   Puesto físico: "+(p.empty()?L"(no indicado)":p);
}
bool Confirm(const std::wstring& question){
    return MessageBoxW(mainWindow,question.c_str(),L"Confirmar operación",
        MB_YESNO|MB_ICONWARNING|MB_DEFBUTTON2)==IDYES;
}
void Navigate(int page){
    SaveIdentity();
    currentPage=page;
    Clear();
    InvalidateRect(mainWindow,nullptr,TRUE);
    const int x=282;
    if(page==0){
        aula::Inspection i=aula::Inspect();
        Label(L"Resumen del equipo",x,38,830,46,true);
        Label(L"Identifica cada ordenador por su puesto físico. Dos PCs clonados pueden compartir nombre de Windows.",x,95,790,48);
        Label(L"Centro municipal",x,155,240,23);
        centerEdit=Element(L"EDIT",aula::IniRead(L"Centro"),WS_BORDER|ES_AUTOHSCROLL|WS_TABSTOP,x,182,365,30);
        Label(L"Puesto físico (ej. PC10, Profesor)",x+395,155,300,23);
        stationEdit=Element(L"EDIT",aula::IniRead(L"Puesto"),WS_BORDER|ES_AUTOHSCROLL|WS_TABSTOP,x+395,182,320,30);
        Button(L"Guardar identificación",x,227,210,37,SAVE_ID);
        Label(L"Información detectada",x,292,710,28,true);
        std::wstring data=L"Equipo Windows: "+i.machine+L"\r\nSistema: "+i.windows+
          L"\r\nArquitectura: "+i.architecture+
          L"\r\nCPU: "+i.cpu+L"\r\nRAM: "+std::to_wstring(i.ramMb)+
          L" MB     Espacio libre (unidad Windows): "+std::to_wstring(i.freeGb)+
          L" GB\r\nLibreOffice: "+i.libreoffice+
          L"\r\nPrivilegios de administrador: "+(i.administrator?L"SÍ":L"NO");
        Label(data,x,345,555,235);
        if(!i.administrator)Button(L"Reiniciar como administrador",x,550,284,38,ELEVATE);
        Label(L"Acciones rápidas",860,315,300,34,true);
        Button(L"Limpiar temporales",860,368,302,43,QUICK_CLEAN);
        Button(L"Programas y antivirus",860,421,302,43,QUICK_AV);
        Button(L"Actualizar LibreOffice",860,474,302,43,QUICK_LO);
        Button(L"Migración Windows",860,527,302,43,QUICK_MIG);
        Button(L"Generar informe",860,580,302,43,QUICK_REPORT);
        Label(L"Todos los datos y registros se guardan en la carpeta Datos junto al ejecutable.",x,656,525,40);
    }
    if(page==1){
        Label(L"Mantenimiento y limpieza",x,40,790,48,true);
        Label(L"Selecciona operaciones concretas. No hay optimización oculta ni cambios automáticos.",x,96,790,38);
        checkTemp=Check(L"Eliminar temporales del usuario con más de 7 días (sin seguir enlaces/junctions)",x,150,800,28,true);
        checkSysTemp=Check(L"Incluir también C:\\Windows\\Temp (necesita administrador)",x+22,185,755,26);
        checkCeip=Check(L"Reducir CEIP/SQM en Windows (con respaldo del registro)",x,227,790,28);
        checkDiag=Check(L"Deshabilitar servicios de diagnóstico opcionales: DiagTrack / dmwappushservice",x,264,790,28);
        checkServices=Check(L"Deshabilitar servicios opcionales: Fax y compartir Windows Media",x,301,790,28);
        checkTablet=Check(L"Deshabilitar servicio TabletInputService SOLO si no hay pantalla táctil",x,338,790,28);
        checkRemote=Check(L"Deshabilitar Registro remoto (puede afectar a administración remota)",x,375,790,28);
        Button(L"Vista previa de limpieza",x,440,250,39,PREVIEW);
        Button(L"Aplicar seleccionadas",x+270,440,235,39,EXECUTE);
        Button(L"Restaurar servicios",x,499,220,37,RESTORE);
        Button(L"Restaurar CEIP",x+238,499,185,37,RESTORE_CEIP);
        Label(L"Recomendación: empieza por temporales. Algunos cambios de servicios requieren reiniciar Windows.\nNo se desactivan Windows Update, el cortafuegos ni Microsoft Defender.",x,580,805,67);
    }
    if(page==2){
        Label(L"Programas y antivirus",x,40,790,48,true);
        Label(L"Se muestran TODOS los programas registrados, con posibles antivirus al principio. No se eliminan automáticamente.",x,96,810,46);
        programList=Element(L"LISTBOX",L"",WS_BORDER|LBS_NOTIFY|WS_VSCROLL|WS_HSCROLL|WS_TABSTOP,x,152,795,383,0,fontSmall);
        installed=aula::Programs();
        for(const auto& p:installed){
            std::wstring label=(p.antivirus?L"[POSIBLE ANTIVIRUS] ":L"")+p.name+
                (p.version.empty()?L"":L"  ("+p.version+L")");
            SendMessageW(programList,LB_ADDSTRING,0,(LPARAM)label.c_str());
        }
        Button(L"Actualizar listado",x,553,198,39,REFRESH);
        Button(L"Desinstalar seleccionado",x+217,553,254,39,REMOVE_APP);
        Button(L"Programas y características",x+490,553,295,39,OPEN_WIN);
        Label(L"Importante: la desinstalación del fabricante puede requerir confirmaciones o reinicio. Revisa después que el programa haya desaparecido.",x,612,800,52);
    }
    if(page==3){
        aula::Inspection i=aula::Inspect();
        Label(L"LibreOffice",x,40,790,48,true);
        Label(L"Instalado: "+i.libreoffice,x,105,795,28);
        Label(L"Utiliza un instalador MSI descargado de LibreOffice. Puedes llevarlo previamente en el mismo pendrive.",x,152,800,48);
        if(i.windows7)
            Label(L"Windows 7: solo se permite un MSI de la rama 7.4.x, que admitía Windows 7 SP1. Las versiones actuales oficialmente exigen Windows 10/11.",x,220,805,71);
        else Label(L"Comprueba la versión, firma y arquitectura del instalador oficial antes de instalar.",x,220,805,42);
        Button(L"Elegir archivo .MSI",x,312,240,38,MSI_PICK);
        msiLabel=Label(selectedMsi.empty()?L"Ningún MSI seleccionado.":selectedMsi,x,362,795,55);
        Button(L"Iniciar actualización",x,441,240,43,MSI_INSTALL);
        Button(L"Abrir web oficial",x+260,441,220,43,OPEN_LO);
        Label(L"El instalador se abre en modo visible (/passive) y puede pedir reinicio.\nLa operación se registrará como iniciada hasta verificar la versión instalada.",x,541,802,69);
    }
    if(page==4){
        aula::Inspection i=aula::Inspect();
        Label(L"Migración Windows 7 → Windows 10",x,40,820,48,true);
        Label(L"Sin Media Creation Tool en el PC antiguo: prepara una ISO oficial en otro PC y extrae su contenido en un USB.",x,97,815,45);
        Label(L"Sistema: "+i.windows+L" | "+i.architecture+L" | RAM "+std::to_wstring(i.ramMb)+L" MB | libre "+std::to_wstring(i.freeGb)+L" GB",x,157,807,57);
        Label(L"Debes conservar idioma, edición y arquitectura; pasar de 32 a 64 bits requiere instalación limpia.\nWindows 10 dejó de tener soporte general en 2025: evalúa ESU o sustitución.",x,221,815,68);
        Button(L"Elegir carpeta de ISO / USB",x,315,280,39,FOLDER_PICK);
        folderLabel=Label(selectedFolder.empty()?L"No seleccionada.":selectedFolder,x,367,815,31);
        Button(L"Comprobar requisitos",x,418,240,40,SCAN);
        scanLabel=Label(L"Esperando selección de medio de instalación.",x,468,805,57);
        checkBackup=Check(L"He hecho una copia de seguridad externa verificable de los datos del equipo.",x,552,810,30);
        checkLicense=Check(L"Tengo medio oficial, licencia válida y arquitectura/idioma comprobados.",x,589,810,30);
        Button(L"Iniciar instalador de Windows",x,636,350,38,MIGRATE);
    }
    if(page==5){
        Label(L"Registro e informes",x,40,790,48,true);
        Label(Identity(),x,100,805,34);
        logEdit=Element(L"EDIT",aula::ReadLog(),WS_BORDER|ES_MULTILINE|ES_AUTOVSCROLL|ES_READONLY|WS_VSCROLL,
                        x,154,795,399,0,fontSmall);
        Button(L"Exportar informe TXT",x,572,230,41,REPORT);
        Button(L"Abrir carpeta de informes",x+248,572,267,41,OPEN_REPORTS);
        Label(L"Los informes incluyen las actuaciones realmente registradas; no presuponen que una desinstalación haya finalizado.",x,634,802,45);
    }
}
void DoMaintenance(bool preview){
    if(preview){
        bool sys=Checked(checkSysTemp);
        aula::TaskResult r=aula::TempFiles(true,sys);
        Notice(L"Archivos temporales candidatos (>7 días): "+std::to_wstring(r.changed)+
          L"\nTamaño aproximado: "+std::to_wstring(r.bytes/1024/1024)+L" MiB.\nNo se ha borrado nada.");
        return;
    }
    if(!Checked(checkTemp)&&!Checked(checkCeip)&&!Checked(checkDiag)&&!Checked(checkServices)&&
       !Checked(checkTablet)&&!Checked(checkRemote)){
        Notice(L"Selecciona al menos una operación.");return;
    }
    bool elevated=Checked(checkCeip)||Checked(checkDiag)||Checked(checkServices)||
                  Checked(checkTablet)||Checked(checkRemote)||Checked(checkSysTemp);
    if(elevated && !aula::IsAdmin()){
        Notice(L"Para estos cambios hacen falta privilegios de administrador.\nPuedes pulsar «Reiniciar como administrador» en Resumen.",MB_ICONWARNING);
        return;
    }
    if((Checked(checkCeip)||Checked(checkDiag)||Checked(checkServices)||Checked(checkTablet)||Checked(checkRemote)) &&
       (aula::IniRead(L"Centro").empty()||aula::IniRead(L"Puesto").empty())){
        Notice(L"En Resumen debes indicar centro y puesto físico antes de hacer cambios reversibles.",MB_ICONWARNING);return;
    }
    if(!Confirm(L"¿Ejecutar únicamente las tareas marcadas?\nLa eliminación de temporales es permanente; los ajustes de servicio y CEIP se respaldan por puesto."))return;
    unsigned ok=0,failed=0;
    if(Checked(checkTemp)){
        auto r=aula::TempFiles(false,Checked(checkSysTemp));
        ok+=r.changed;failed+=r.errors;
    }
    auto apply=[&](const wchar_t* name){std::wstring msg;if(aula::ChangeService(name,true,msg))++ok;else{++failed;AppendLog(msg);}};
    if(Checked(checkCeip)){std::wstring msg;if(aula::ChangeCeip(false,msg))++ok;else{++failed;AppendLog(msg);}}
    if(Checked(checkDiag)){apply(L"DiagTrack");apply(L"dmwappushservice");}
    if(Checked(checkServices)){apply(L"Fax");apply(L"WMPNetworkSvc");}
    if(Checked(checkTablet))apply(L"TabletInputService");
    if(Checked(checkRemote))apply(L"RemoteRegistry");
    AppendLog(L"Mantenimiento terminado: "+std::to_wstring(ok)+L" cambios/archivos, "+std::to_wstring(failed)+L" incidencias.");
    Notice(L"Proceso finalizado.\nCambios/archivos: "+std::to_wstring(ok)+L"\nIncidencias: "+std::to_wstring(failed)+L"\nConsulta el registro.");
}
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
        if(msiLabel)SetWindowTextW(msiLabel,selectedMsi.empty()?L"Ningún MSI seleccionado.":selectedMsi.c_str());
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
        if(folderLabel)SetWindowTextW(folderLabel,selectedFolder.empty()?L"No seleccionada.":selectedFolder.c_str());
        break;
    case SCAN:{
        std::wstring msg;bool valid=aula::ValidInstallerFolder(selectedFolder,aula::Inspect(),msg);
        if(scanLabel)SetWindowTextW(scanLabel,msg.c_str());
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
LRESULT CALLBACK Proc(HWND hwnd,UINT msg,WPARAM wParam,LPARAM lParam){
    switch(msg){
    case WM_CREATE:{
        mainWindow=hwnd;
        background=CreateSolidBrush(RGB(244,249,253));
        whiteEdit=CreateSolidBrush(RGB(255,255,255));
        fontNormal=CreateFontW(-17,0,0,0,FW_NORMAL,0,0,0,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,
                              DEFAULT_PITCH,L"Segoe UI");
        fontSmall=CreateFontW(-15,0,0,0,FW_NORMAL,0,0,0,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,
                              DEFAULT_PITCH,L"Consolas");
        fontTitle=CreateFontW(-29,0,0,0,FW_SEMIBOLD,0,0,0,DEFAULT_CHARSET,0,0,CLEARTYPE_QUALITY,
                              DEFAULT_PITCH,L"Segoe UI");
        const wchar_t* nav[]={L"Resumen",L"Mantenimiento",L"Programas / antivirus",L"LibreOffice",L"Migración Windows",L"Informes"};
        for(int i=0;i<6;++i){
            HWND b=CreateWindowW(L"BUTTON",nav[i],WS_CHILD|WS_VISIBLE|BS_OWNERDRAW|WS_TABSTOP,
                                 16,170+i*65,210,50,hwnd,(HMENU)(INT_PTR)(NAV_BASE+i),GetModuleHandleW(nullptr),nullptr);
            Font(b,fontNormal);
        }
        Navigate(0);
        aula::Log(L"Aplicación portable iniciada (auditoría; ningún cambio automático).");
        return 0;
    }
    case WM_COMMAND:{
        int id=LOWORD(wParam), notification=HIWORD(wParam);
        HWND source=(HWND)lParam;
        if(notification==BN_CLICKED && source && GetPropW(source,L"AulaCheckbox")){
            if(GetPropW(source,L"AulaChecked"))RemovePropW(source,L"AulaChecked");
            else SetPropW(source,L"AulaChecked",(HANDLE)1);
            InvalidateRect(source,nullptr,TRUE);
            return 0;
        }
        if(id>=NAV_BASE && id<NAV_BASE+6 && notification==BN_CLICKED){Action(id);return 0;}
        if(id>=PREVIEW && id<=QUICK_REPORT && notification==BN_CLICKED){Action(id);return 0;}
        return 0;
    }
    case WM_DRAWITEM:{
        DRAWITEMSTRUCT* d=(DRAWITEMSTRUCT*)lParam;
        if(d && d->CtlType==ODT_BUTTON){
            skin::OwnerButton(d,currentPage,fontNormal);
            return TRUE;
        }
        return FALSE;
    }
    case WM_CTLCOLORSTATIC:
        SetBkMode((HDC)wParam,TRANSPARENT);
        SetTextColor((HDC)wParam,RGB(28,68,110));
        return (LRESULT)GetStockObject(HOLLOW_BRUSH);
    case WM_CTLCOLOREDIT:
    case WM_CTLCOLORLISTBOX:
        SetTextColor((HDC)wParam,RGB(22,62,104));
        SetBkColor((HDC)wParam,RGB(255,255,255));
        return (LRESULT)whiteEdit;
    case WM_CTLCOLORBTN:
        SetBkMode((HDC)wParam,TRANSPARENT);
        return (LRESULT)GetStockObject(HOLLOW_BRUSH);
    case WM_ERASEBKGND:{
        RECT r;GetClientRect(hwnd,&r);
        skin::Dashboard((HDC)wParam,r,currentPage);
        return 1;
    }
    case WM_GETMINMAXINFO:{
        MINMAXINFO* p=(MINMAXINFO*)lParam;
        p->ptMinTrackSize.x=1220;p->ptMinTrackSize.y=820;return 0;
    }
    case WM_DESTROY:
        if(fontNormal)DeleteObject(fontNormal);
        if(fontSmall)DeleteObject(fontSmall);
        if(fontTitle)DeleteObject(fontTitle);
        if(background)DeleteObject(background);
        if(whiteEdit)DeleteObject(whiteEdit);
        PostQuitMessage(0);return 0;
    default:return DefWindowProcW(hwnd,msg,wParam,lParam);
    }
}
}
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE,LPWSTR,int show){
    SetProcessDPIAware();
    Gdiplus::GdiplusStartupInput gdipInput;
    Gdiplus::GdiplusStartup(&gdipToken,&gdipInput,nullptr);
    INITCOMMONCONTROLSEX controls={sizeof(controls),ICC_STANDARD_CLASSES};
    InitCommonControlsEx(&controls);
    WNDCLASSEXW wc={sizeof(wc)};
    wc.hInstance=instance;wc.lpfnWndProc=Proc;wc.lpszClassName=L"AulaManagerPortableWindow";
    wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);
    wc.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(101));
    wc.hIconSm=wc.hIcon;
    wc.hbrBackground=(HBRUSH)(COLOR_WINDOW+1);
    if(!RegisterClassExW(&wc))return 1;
    HWND hwnd=CreateWindowExW(0,wc.lpszClassName,L"Aula Manager Portable — mantenimiento de aulas",
        WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,CW_USEDEFAULT,CW_USEDEFAULT,1240,850,
        nullptr,nullptr,instance,nullptr);
    if(!hwnd)return 2;
    ShowWindow(hwnd,show);UpdateWindow(hwnd);
    MSG msg;
    while(GetMessageW(&msg,nullptr,0,0)>0){
        if(!IsDialogMessageW(hwnd,&msg)){TranslateMessage(&msg);DispatchMessageW(&msg);}
    }
    Gdiplus::GdiplusShutdown(gdipToken);
    return (int)msg.wParam;
}
