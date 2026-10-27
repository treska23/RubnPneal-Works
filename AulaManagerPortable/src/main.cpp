#define UNICODE
#define _UNICODE
#include "Core.h"
#include "Skin.h"
#include <windows.h>
#include <shellapi.h>
#include <commctrl.h>
#include <algorithm>
#include <vector>
#include <map>
#include <string>
#include <cmath>

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
HFONT fontNormal=nullptr,fontTitle=nullptr,fontSmall=nullptr,fontMeta=nullptr,fontBrand=nullptr;
HWND navButtons[6]={},brandTitle=nullptr,brandSubtitle=nullptr,sideStatus=nullptr;
std::map<std::wstring,HWND> ui;
bool layoutReady=false;
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
    ui.clear();
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

void Put(const wchar_t* key,HWND control){if(control)ui[key]=control;}
HWND Find(const wchar_t* key){auto it=ui.find(key);return it==ui.end()?nullptr:it->second;}
void At(const wchar_t* key,int x,int y,int w,int h){
    HWND control=Find(key);
    if(control)MoveWindow(control,x,y,(std::max)(0,w),(std::max)(0,h),TRUE);
}
void Text(const wchar_t* key,const std::wstring& text,bool isTitle=false,bool muted=false){
    HWND c=Element(L"STATIC",text,SS_LEFT|SS_NOPREFIX,0,0,100,30,0,
                   isTitle?fontTitle:(muted?fontMeta:fontNormal));
    Put(key,c);
}
void Edit(const wchar_t* key,const std::wstring& value,HWND& output,DWORD style=ES_AUTOHSCROLL){
    output=Element(L"EDIT",value,WS_BORDER|WS_TABSTOP|style,0,0,200,36);
    Put(key,output);
}
void Btn(const wchar_t* key,const wchar_t* text,int id){
    Put(key,Button(text,0,0,200,44,id));
}
void Box(const wchar_t* key,const wchar_t* text,HWND& output,bool checked=false){
    output=Check(text,0,0,350,45,checked);Put(key,output);
}
void AlignPage(){
    if(!mainWindow||!layoutReady)return;
    RECT rc={};GetClientRect(mainWindow,&rc);
    int W=rc.right,H=rc.bottom;
    if(W<=0||H<=0)return;
    auto m=skin::Measure(W,H,currentPage);
    int sidebar=m.side;
    if(brandTitle)MoveWindow(brandTitle,84,27,sidebar-90,31,TRUE);
    if(brandSubtitle)MoveWindow(brandSubtitle,84,58,sidebar-90,48,TRUE);
    const int navStart=170;
    const int navStep=(std::min)(65,(std::max)(49,(H-365)/6));
    for(int i=0;i<6;i++)if(navButtons[i])
        MoveWindow(navButtons[i],16,navStart+i*navStep,sidebar-32,navStep-10,TRUE);
    if(sideStatus)MoveWindow(sideStatus,25,H-120,sidebar-45,68,TRUE);
    auto hero=m.hero,card=m.body,left=m.left,right=m.right;
    At(L"heading",hero.x+27,hero.y+16,hero.w-165,43);
    At(L"subtitle",hero.x+29,hero.y+67,hero.w-165,hero.h-77);
    auto id=m.id;
    if(currentPage==0){
        int ux=id.x+25, uy=id.y+13, iw=id.w-50;
        int saveW=(std::min)(225,(std::max)(176,iw/5));
        int p1=(int)((iw-saveW-35)*.55);
        int p2=iw-saveW-35-p1;
        At(L"centerCaption",ux,uy,p1,26);
        At(L"stationCaption",ux+p1+18,uy,p2,26);
        At(L"centerEdit",ux,uy+36,p1,38);
        At(L"stationEdit",ux+p1+18,uy+36,p2,38);
        At(L"save",ux+p1+18+p2+17,uy+36,saveW,40);
        At(L"detailsTitle",left.x+26,left.y+21,left.w-50,39);
        int headerBottom=left.y+73;
        int available=(std::max)(1,left.h-116);
        int row=(std::max)(29,available/8);
        int labelW=skin::Clamp(left.w/3,155,215);
        for(int i=0;i<8;++i){
            std::wstring a=L"key"+std::to_wstring(i),b=L"value"+std::to_wstring(i);
            int yy=headerBottom+i*row;
            At(a.c_str(),left.x+26,yy,labelW,row+8);
            At(b.c_str(),left.x+labelW+33,yy,left.w-labelW-65,row+11);
        }
        At(L"admin",left.x+24,left.y+left.h-55,(std::min)(270,left.w-48),42);
        At(L"actionsTitle",right.x+24,right.y+19,right.w-48,36);
        int btnTop=right.y+74;
        int space=(std::max)(33,(right.h-99)/5);
        int btnH=(std::min)(56,(std::max)(36,space-9));
        for(int i=0;i<5;++i){
            std::wstring name=L"action"+std::to_wstring(i);
            At(name.c_str(),right.x+24,btnTop+i*space,right.w-48,btnH);
        }
        At(L"hint",left.x+27,left.y+left.h-18,left.w-45,24);
        return;
    }
    const int innerX=card.x+28, innerW=card.w-56, innerY=card.y+20,innerH=card.h-45;
    switch(currentPage){
    case 1:{
        At(L"explain",innerX,innerY,innerW,58);
        int top=innerY+65;
        int row=(std::min)(56,(std::max)(34,(innerH-225)/7)));
        for(int i=0;i<7;i++){
            std::wstring name=L"check"+std::to_wstring(i);
            At(name.c_str(),innerX+8,top+i*row,innerW-16,row-3);
        }
        int by=top+7*row+18;
        int half=(std::min)(255,(innerW-18)/2);
        At(L"preview",innerX,by,half,46);
        At(L"execute",innerX+half+20,by,half,46);
        At(L"restore",innerX,by+58,half,43);
        At(L"ceip",innerX+half+20,by+58,half,43);
        At(L"note",innerX,by+114,innerW,70);
        break;
    }
    case 2:{
        At(L"explain",innerX,innerY,innerW,52);
        At(L"programs",innerX,innerY+64,innerW,(std::max)(80,innerH-180));
        int buttonY=innerY+innerH-102;
        int buttonW=(innerW-36)/3;
        At(L"refresh",innerX,buttonY,buttonW,45);
        At(L"remove",innerX+buttonW+18,buttonY,buttonW,45);
        At(L"windowsApps",innerX+(buttonW+18)*2,buttonY,buttonW,45);
        At(L"note",innerX,buttonY+57,innerW,48);
        break;
    }
    case 3:{
        At(L"installed",innerX,innerY+10,innerW,35);
        At(L"explain",innerX,innerY+62,innerW,70);
        At(L"compat",innerX,innerY+154,innerW,90);
        At(L"pick",innerX,innerY+262,(std::min)(270,innerW/3),48);
        At(L"filename",innerX,innerY+330,innerW,60);
        At(L"update",innerX,innerY+415,(std::min)(285,innerW/3),47);
        At(L"official",innerX+(std::min)(285,innerW/3)+20,innerY+415,(std::min)(250,innerW/3),47);
        At(L"note",innerX,innerY+488,innerW,75);
        break;
    }
    case 4:{
        At(L"explain",innerX,innerY,innerW,64);
        At(L"system",innerX,innerY+68,innerW,53);
        At(L"compat",innerX,innerY+132,innerW,81);
        At(L"pick",innerX,innerY+228,(std::min)(310,innerW/3),47);
        At(L"folder",innerX,innerY+287,innerW,41);
        At(L"scan",innerX,innerY+338,(std::min)(260,innerW/3),47);
        At(L"scanText",innerX,innerY+399,innerW,52);
        At(L"backup",innerX,innerY+462,innerW,34);
        At(L"license",innerX,innerY+504,innerW,34);
        At(L"migrate",innerX,innerY+552,(std::min)(350,innerW/2),47);
        break;
    }
    case 5:{
        At(L"identity",innerX,innerY,innerW,35);
        At(L"log",innerX,innerY+51,innerW,(std::max)(80,innerH-174));
        At(L"report",innerX,innerY+innerH-111,(std::min)(275,innerW/3),47);
        At(L"openReports",innerX+(std::min)(275,innerW/3)+20,innerY+innerH-111,(std::min)(290,innerW/3),47);
        At(L"note",innerX,innerY+innerH-52,innerW,44);
        break;
    }
    }
}
void Navigate(int page){
    SaveIdentity();
    currentPage=page;
    Clear();
    const wchar_t* pages[]={L"Resumen del equipo",L"Mantenimiento y limpieza",L"Programas y antivirus",
                            L"LibreOffice",L"Migración de Windows 7 a Windows 10",L"Registro e informes"};
    const wchar_t* subtitles[]={
        L"Información del sistema y acceso rápido a las principales tareas de mantenimiento.",
        L"Selecciona las operaciones. Ninguna tarea se ejecuta automáticamente.",
        L"Inventario de programas instalados y desinstalación controlada.",
        L"Actualización mediante instaladores oficiales compatibles con este equipo.",
        L"Comprueba requisitos antes de abrir el instalador original de Microsoft.",
        L"Registro de intervenciones por centro y por puesto físico."
    };
    Text(L"heading",pages[page],true);
    Text(L"subtitle",subtitles[page],false,true);
    if(page==0){
        aula::Inspection i=aula::Inspect();
        Text(L"centerCaption",L"Centro municipal");
        Text(L"stationCaption",L"Puesto físico (p. ej., PC10)");
        Edit(L"centerEdit",aula::IniRead(L"Centro"),centerEdit);
        Edit(L"stationEdit",aula::IniRead(L"Puesto"),stationEdit);
        Btn(L"save",L"Guardar identificación",SAVE_ID);
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
        Text(L"actionsTitle",L"Acciones rápidas",true);
        const wchar_t* names[]={L"Limpiar archivos temporales",L"Programas y antivirus",L"Actualizar LibreOffice",
                                L"Migración de Windows",L"Generar informe"};
        const int actionIds[]={QUICK_CLEAN,QUICK_AV,QUICK_LO,QUICK_MIG,QUICK_REPORT};
        for(int n=0;n<5;n++)Btn((L"action"+std::to_wstring(n)).c_str(),names[n],actionIds[n]);
        Text(L"hint",L"Los registros se guardan junto al ejecutable.",false,true);
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
        programList=Element(L"LISTBOX",L"",WS_BORDER|LBS_NOTIFY|WS_VSCROLL|WS_HSCROLL|WS_TABSTOP,0,0,200,300,0,fontNormal);
        Put(L"programs",programList);
        installed=aula::Programs();
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
        aula::Inspection i=aula::Inspect();
        Text(L"installed",L"Versión detectada: "+i.libreoffice,true);
        Text(L"explain",L"Selecciona un MSI oficial de LibreOffice guardado en el pendrive. No se realizan descargas ocultas.");
        Text(L"compat",i.windows7?
             L"Windows 7 SP1: utiliza una versión compatible de LibreOffice 7.4.x. Las versiones actuales no son compatibles.":
             L"Revisa firma digital, versión e idioma del instalador antes de ejecutarlo.");
        Btn(L"pick",L"Seleccionar archivo MSI",MSI_PICK);
        msiLabel=Element(L"STATIC",selectedMsi.empty()?L"No se ha elegido ningún instalador.":selectedMsi,SS_LEFT,
                         0,0,200,50,0,fontMeta);Put(L"filename",msiLabel);
        Btn(L"update",L"Iniciar actualización",MSI_INSTALL);
        Btn(L"official",L"Web oficial de LibreOffice",OPEN_LO);
        Text(L"note",L"Se abrirá el instalador visible. Después comprueba que la versión nueva figura instalada.",false,true);
    }else if(page==4){
        aula::Inspection i=aula::Inspect();
        Text(L"explain",L"Prepara una ISO oficial en un equipo moderno y copia su contenido a un USB. No uses Media Creation Tool en Windows 7.");
        Text(L"system",L"Sistema: "+i.windows+L"   ·   "+i.architecture+
             L"   ·   RAM: "+std::to_wstring(i.ramMb)+L" MB   ·   Libre: "+std::to_wstring(i.freeGb)+L" GB");
        Text(L"compat",L"La actualización que conserve programas debe iniciarse desde Windows, con arquitectura, idioma y edición compatibles. Windows 10 ya está fuera de soporte general.");
        Btn(L"pick",L"Seleccionar carpeta ISO / USB",FOLDER_PICK);
        folderLabel=Element(L"STATIC",selectedFolder.empty()?L"No se ha seleccionado ningún medio.":selectedFolder,
                            SS_LEFT,0,0,200,40,0,fontMeta);Put(L"folder",folderLabel);
        Btn(L"scan",L"Comprobar requisitos",SCAN);
        scanLabel=Element(L"STATIC",L"Esperando selección del instalador.",SS_LEFT,
                          0,0,200,50,0,fontNormal);Put(L"scanText",scanLabel);
        Box(L"backup",L"He realizado y verificado una copia de seguridad externa.",checkBackup);
        Box(L"license",L"Dispongo de medio oficial, licencia válida y arquitectura/idioma adecuados.",checkLicense);
        Btn(L"migrate",L"Abrir instalador Windows",MIGRATE);
    }else if(page==5){
        Text(L"identity",Identity());
        logEdit=Element(L"EDIT",aula::ReadLog(),WS_BORDER|ES_MULTILINE|ES_AUTOVSCROLL|ES_READONLY|WS_VSCROLL,
                        0,0,200,280,0,fontSmall);
        Put(L"log",logEdit);
        Btn(L"report",L"Exportar informe TXT",REPORT);
        Btn(L"openReports",L"Abrir carpeta de informes",OPEN_REPORTS);
        Text(L"note",L"Los informes distinguen tareas iniciadas de intervenciones finalizadas.",false,true);
    }
    AlignPage();
    InvalidateRect(mainWindow,nullptr,FALSE);
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
