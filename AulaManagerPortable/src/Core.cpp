#include "Core.h"
#include <shellapi.h>
#include <shlobj.h>
#include <commdlg.h>
#include <winreg.h>
#include <winsvc.h>
#include <algorithm>
#include <vector>
#include <sstream>
#include <cwctype>
#include <mutex>
#include <set>
#include <msi.h>
#include <msiquery.h>
#include <wintrust.h>
#include <softpub.h>
#pragma comment(lib,"msi.lib")
#pragma comment(lib,"wintrust.lib")

#pragma comment(lib, "advapi32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "comdlg32.lib")
#pragma comment(lib, "ole32.lib")

namespace aula {
namespace {
std::wstring sessionLog;
std::wstring logText;
std::mutex logMutex;
std::wstring Trim(const std::wstring& x) {
    size_t a=x.find_first_not_of(L" \t\r\n");
    if(a==std::wstring::npos) return L"";
    size_t b=x.find_last_not_of(L" \t\r\n");
    return x.substr(a,b-a+1);
}
std::wstring Lower(std::wstring v) {
    std::transform(v.begin(),v.end(),v.begin(),[](wchar_t c){return (wchar_t)towlower(c);});
    return v;
}
bool Exists(const std::wstring& p) {
    DWORD a=GetFileAttributesW(p.c_str());
    return a!=INVALID_FILE_ATTRIBUTES && !(a&FILE_ATTRIBUTE_DIRECTORY);
}
bool EnsureUnicodeIni(const std::wstring& path){
    HANDLE file=CreateFileW(path.c_str(),GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(file==INVALID_HANDLE_VALUE)return GetLastError()==ERROR_FILE_EXISTS||GetLastError()==ERROR_ALREADY_EXISTS;
    const BYTE bom[]={0xff,0xfe};DWORD written=0;
    bool ok=WriteFile(file,bom,sizeof(bom),&written,nullptr)&&written==sizeof(bom);
    CloseHandle(file);return ok;
}
std::wstring Join(const std::wstring& a,const std::wstring& b){return a+L"\\"+b;}
std::wstring ReadReg(HKEY root,const std::wstring& key,const wchar_t* field,REGSAM extra=0) {
    HKEY h=nullptr;
    if(RegOpenKeyExW(root,key.c_str(),0,KEY_READ|extra,&h)!=ERROR_SUCCESS) return L"";
    wchar_t b[1024]={0}; DWORD bytes=sizeof(b),type=0;
    LONG r=RegQueryValueExW(h,field,0,&type,(LPBYTE)b,&bytes);
    RegCloseKey(h);
    if(r!=ERROR_SUCCESS || (type!=REG_SZ && type!=REG_EXPAND_SZ)) return L"";
    b[1023]=0;
    return b;
}
DWORD ReadRegDword(HKEY root,const std::wstring& key,const wchar_t* field,DWORD fallback,REGSAM extra=0) {
    HKEY h=nullptr; DWORD val=0,size=sizeof(val),type=0;
    if(RegOpenKeyExW(root,key.c_str(),0,KEY_READ|extra,&h)!=ERROR_SUCCESS) return fallback;
    LONG r=RegQueryValueExW(h,field,0,&type,(LPBYTE)&val,&size); RegCloseKey(h);
    return r==ERROR_SUCCESS && type==REG_DWORD ? val : fallback;
}
std::wstring Hostname(){
    wchar_t b[256]={0}; DWORD n=255;
    return GetComputerNameW(b,&n)?std::wstring(b):L"PC";
}
std::wstring BackupIni(){
    std::wstring c=Trim(IniRead(L"Centro")),p=Trim(IniRead(L"Puesto"));
    if(c.empty()||p.empty())return L"";
    std::wstring d=Join(DataFolder(),L"Respaldos");
    CreateDirectoryW(d.c_str(),nullptr);
    return Join(d,Sanitize(c)+L"_"+Sanitize(p)+L".ini");
}
std::wstring ReadBackup(const wchar_t* section,const wchar_t* key) {
    std::wstring path=BackupIni(); if(path.empty())return L"";
    wchar_t b[256]={0};
    GetPrivateProfileStringW(section,key,L"",b,256,path.c_str());
    return b;
}
bool WriteBackup(const wchar_t* section,const wchar_t* key,const std::wstring& val){
    std::wstring path=BackupIni();
    return !path.empty() && EnsureUnicodeIni(path) && !!WritePrivateProfileStringW(section,key,val.c_str(),path.c_str());
}
std::wstring LocalDate(bool forFile) {
    SYSTEMTIME t={};GetLocalTime(&t);
    wchar_t b[64]={0};
    if(forFile)swprintf_s(b,64,L"%04u%02u%02u_%02u%02u%02u",t.wYear,t.wMonth,t.wDay,t.wHour,t.wMinute,t.wSecond);
    else swprintf_s(b,64,L"%02u/%02u/%04u %02u:%02u:%02u",t.wDay,t.wMonth,t.wYear,t.wHour,t.wMinute,t.wSecond);
    return b;
}
void AppendUtf8(const std::wstring& path,const std::wstring& text) {
    int sz=WideCharToMultiByte(CP_UTF8,0,text.c_str(),(int)text.size(),nullptr,0,nullptr,nullptr);
    if(sz<=0)return;
    std::string utf8(sz,'\0');
    WideCharToMultiByte(CP_UTF8,0,text.c_str(),(int)text.size(),&utf8[0],sz,nullptr,nullptr);
    HANDLE h=CreateFileW(path.c_str(),FILE_APPEND_DATA,FILE_SHARE_READ,nullptr,OPEN_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(h==INVALID_HANDLE_VALUE)return;
    LARGE_INTEGER fileSize={};GetFileSizeEx(h,&fileSize);
    DWORD done=0;
    if(fileSize.QuadPart==0){const BYTE bom[3]={0xef,0xbb,0xbf};WriteFile(h,bom,3,&done,nullptr);}
    WriteFile(h,utf8.data(),(DWORD)utf8.size(),&done,nullptr);
    CloseHandle(h);
}
bool HasAny(const std::wstring& text,const std::vector<std::wstring>& names) {
    for(const auto& n:names)if(text.find(n)!=std::wstring::npos)return true;
    return false;
}
void ListRegistry(HKEY root, REGSAM view, std::vector<Program>& output){
    const wchar_t* base=L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall";
    HKEY h=nullptr;
    if(RegOpenKeyExW(root,base,0,KEY_READ|view,&h)!=ERROR_SUCCESS)return;
    DWORD index=0; wchar_t sub[512];
    for(;;++index){
        DWORD len=511; FILETIME ft={};
        LONG r=RegEnumKeyExW(h,index,sub,&len,nullptr,nullptr,nullptr,&ft);
        if(r==ERROR_NO_MORE_ITEMS)break;
        if(r!=ERROR_SUCCESS)continue;
        std::wstring key=std::wstring(base)+L"\\"+sub;
        std::wstring name=Trim(ReadReg(root,key,L"DisplayName",view));
        if(name.empty())continue;
        DWORD hidden=ReadRegDword(root,key,L"SystemComponent",0,view);
        if(hidden==1)continue;
        Program p;
        p.name=name; p.version=ReadReg(root,key,L"DisplayVersion",view);
        p.publisher=ReadReg(root,key,L"Publisher",view);
        p.uninstall=ReadReg(root,key,L"UninstallString",view);
        p.keyName=sub;
        std::wstring lc=Lower(p.name);
        p.antivirus=HasAny(lc,{L"avast free antivirus",L"avast premium security",L"avg antivirus",
            L"avg internet security",L"avira security",L"norton",L"mcafee",L"kaspersky",
            L"eset",L"bitdefender",L"panda dome",L"sophos",L"trend micro",L"360 total security",
            L"webroot",L"f-secure",L"g data",L"malwarebytes",L"antivirus",L"internet security"});
        p.isMsi=ReadRegDword(root,key,L"WindowsInstaller",0,view)==1;
        output.push_back(p);
    }
    RegCloseKey(h);
}
struct ScanState{
    unsigned examined=0,changed=0,errors=0;
    ULONGLONG bytes=0;
    bool preview=false;
    ULONGLONG cutoff=0;
    const std::atomic_bool* cancel=nullptr;
};
void ScanDir(const std::wstring& path,ScanState& s,int depth){
    if(s.cancel&&s.cancel->load())return;
    if(depth>12 || path.size()>220)return;
    WIN32_FIND_DATAW f={};
    HANDLE h=FindFirstFileW((path+L"\\*").c_str(),&f);
    if(h==INVALID_HANDLE_VALUE)return;
    do {
        if(s.cancel&&s.cancel->load())break;
        if(wcscmp(f.cFileName,L".")==0||wcscmp(f.cFileName,L"..")==0)continue;
        if(f.dwFileAttributes&FILE_ATTRIBUTE_REPARSE_POINT)continue;
        std::wstring full=Join(path,f.cFileName);
        if(f.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY){
            ScanDir(full,s,depth+1);
            // No borrar carpetas: pueden pertenecer a aplicaciones activas.
        }else{
            ++s.examined;
            ULARGE_INTEGER stamp={f.ftLastWriteTime.dwLowDateTime,f.ftLastWriteTime.dwHighDateTime};
            if(stamp.QuadPart>=s.cutoff)continue;
            ++s.changed;
            s.bytes+=((ULONGLONG)f.nFileSizeHigh<<32)|f.nFileSizeLow;
            if(!s.preview && !DeleteFileW(full.c_str())){--s.changed;++s.errors;}
        }
    }while(FindNextFileW(h,&f));
    FindClose(h);
}
bool IsMsiGuid(const std::wstring& s){
    return s.size()==38 && s.front()==L'{' && s.back()==L'}' && s[9]==L'-' && s[14]==L'-';
}
std::wstring Expand(const std::wstring& input){
    DWORD n=ExpandEnvironmentStringsW(input.c_str(),nullptr,0);
    if(n==0||n>32767)return input;
    std::vector<wchar_t> b(n);
    ExpandEnvironmentStringsW(input.c_str(),b.data(),n);
    return b.data();
}
}
std::wstring ExeFolder(){
    wchar_t p[MAX_PATH]={0};
    GetModuleFileNameW(nullptr,p,MAX_PATH);
    std::wstring s(p);
    auto i=s.find_last_of(L"\\/");
    return i==std::wstring::npos?L".":s.substr(0,i);
}
std::wstring DataFolder(){
    std::wstring d=Join(ExeFolder(),L"Datos");
    CreateDirectoryW(d.c_str(),nullptr);
    return d;
}
std::wstring TimeStamp(){return LocalDate(false);}
std::wstring Sanitize(const std::wstring& input){
    std::wstring out;
    for(wchar_t c:input){
        if((c>=L'0'&&c<=L'9')||(c>=L'A'&&c<=L'Z')||(c>=L'a'&&c<=L'z')||
           c==L'-'||c==L'_'||c==L' '||c>=128)out+=c;
    }
    if(out.empty())out=L"Sin_dato";
    if(out.size()>50)out.resize(50);
    return out;
}
std::wstring IniRead(const wchar_t* key,const wchar_t* fallback){
    std::wstring file=Join(ExeFolder(),L"AulaManager.ini");
    wchar_t buffer[512]={0};
    GetPrivateProfileStringW(L"Aula",key,fallback,buffer,512,file.c_str());
    return buffer;
}
void IniWrite(const wchar_t* key,const std::wstring& value){
    std::wstring file=Join(ExeFolder(),L"AulaManager.ini");
    if(EnsureUnicodeIni(file))WritePrivateProfileStringW(L"Aula",key,value.c_str(),file.c_str());
}
bool IsAdmin(){
    BOOL admin=FALSE;PSID group=nullptr;
    SID_IDENTIFIER_AUTHORITY nt=SECURITY_NT_AUTHORITY;
    if(AllocateAndInitializeSid(&nt,2,SECURITY_BUILTIN_DOMAIN_RID,DOMAIN_ALIAS_RID_ADMINS,
                               0,0,0,0,0,0,&group)){
        CheckTokenMembership(nullptr,group,&admin);FreeSid(group);
    }
    return admin==TRUE;
}
std::vector<Program> Programs(){
    std::vector<Program> output;
    ListRegistry(HKEY_LOCAL_MACHINE,KEY_WOW64_32KEY,output);
    ListRegistry(HKEY_LOCAL_MACHINE,KEY_WOW64_64KEY,output);
    ListRegistry(HKEY_CURRENT_USER,0,output);
    std::set<std::wstring> seen;
    output.erase(std::remove_if(output.begin(),output.end(),[&](const Program& p){
        return !seen.insert(Lower(p.name)+L"\x1f"+p.keyName+L"\x1f"+p.uninstall).second;
    }),output.end());
    std::sort(output.begin(),output.end(),[](const Program& a,const Program& b){
        if(a.antivirus!=b.antivirus)return a.antivirus>b.antivirus;
        return Lower(a.name)<Lower(b.name);
    });
    return output;
}
Inspection Inspect(){
    Inspection v;
    v.machine=Hostname();v.administrator=IsAdmin();
    typedef LONG (WINAPI* GetVersionFn)(OSVERSIONINFOW*);
    HMODULE ntdll=GetModuleHandleW(L"ntdll.dll");
    GetVersionFn ver=ntdll?(GetVersionFn)GetProcAddress(ntdll,"RtlGetVersion"):nullptr;
    OSVERSIONINFOEXW os={};os.dwOSVersionInfoSize=sizeof(os);
    if(ver)ver((OSVERSIONINFOW*)&os);
    v.osMajor=os.dwMajorVersion;v.osMinor=os.dwMinorVersion;v.build=os.dwBuildNumber;
    v.windows7=(v.osMajor==6&&v.osMinor==1);
    v.windows=ReadReg(HKEY_LOCAL_MACHINE,L"SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",L"ProductName",KEY_WOW64_64KEY);
    if(v.windows.empty())v.windows=ReadReg(HKEY_LOCAL_MACHINE,L"SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion",L"ProductName");
    if(v.windows.empty())v.windows=L"Windows";
    // ProductName may still say Windows 10 on a Windows 11 installation.
    if(v.osMajor==10&&v.build>=22000){auto pos=v.windows.find(L"Windows 10");if(pos!=std::wstring::npos)v.windows.replace(pos,10,L"Windows 11");}
    v.windows+=L" (build "+std::to_wstring(v.build)+L")";
    if(v.windows7&&os.szCSDVersion[0])v.windows+=L" "+std::wstring(os.szCSDVersion);
    v.cpu=ReadReg(HKEY_LOCAL_MACHINE,L"HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",L"ProcessorNameString");
    SYSTEM_INFO si={};GetNativeSystemInfo(&si);
    v.architecture=si.wProcessorArchitecture==PROCESSOR_ARCHITECTURE_AMD64?L"64 bits":
       si.wProcessorArchitecture==PROCESSOR_ARCHITECTURE_INTEL?L"32 bits":L"Otra";
    MEMORYSTATUSEX ms={};ms.dwLength=sizeof(ms);
    if(GlobalMemoryStatusEx(&ms))v.ramMb=ms.ullTotalPhys/(1024*1024);
    wchar_t wd[MAX_PATH]={0};GetWindowsDirectoryW(wd,MAX_PATH);
    wchar_t drive[4]={wd[0],L':',L'\\',0};
    ULARGE_INTEGER free={};
    if(GetDiskFreeSpaceExW(drive,&free,nullptr,nullptr))v.freeGb=free.QuadPart/(1024ULL*1024*1024);
    v.libreoffice=L"No detectado";
    for(const auto& p:Programs()){
        if(Lower(p.name).find(L"libreoffice")==0){
            v.libreoffice=p.name+(p.version.empty()?L"":L" "+p.version);
            break;
        }
    }
    v.network=L"Diagnóstico local disponible; prueba conectividad antes de descargar.";
    return v;
}
void Log(const std::wstring& text){
    std::lock_guard<std::mutex> lock(logMutex);
    std::wstring line=L"["+LocalDate(false)+L"] "+text+L"\r\n";
    logText+=line;
    if(sessionLog.empty()){
        std::wstring folder=Join(DataFolder(),L"Registros");
        CreateDirectoryW(folder.c_str(),nullptr);
        sessionLog=Join(folder,Sanitize(IniRead(L"Centro"))+L"_"+Sanitize(IniRead(L"Puesto"))+
                          L"_"+Sanitize(Hostname())+L"_"+LocalDate(true)+L"_"+std::to_wstring(GetCurrentProcessId())+L".txt");
    }
    AppendUtf8(sessionLog,line);
}
std::wstring ReadLog(){std::lock_guard<std::mutex> lock(logMutex);return logText;}
bool SaveReport(const std::wstring& center,const std::wstring& station){
    std::wstring folder=Join(DataFolder(),L"Informes");
    CreateDirectoryW(folder.c_str(),nullptr);
    Inspection i=Inspect();
    std::wstring name=Join(folder,Sanitize(center)+L"_"+Sanitize(station)+L"_"+LocalDate(true)+L".txt");
    HANDLE h=CreateFileW(name.c_str(),GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(h==INVALID_HANDLE_VALUE)return false;
    CloseHandle(h);
    std::wstring report=L"INFORME DE INTERVENCION - AULA MANAGER\r\nCentro: "+center+L"\r\nPuesto físico: "+station+
       L"\r\nNombre Windows: "+i.machine+L"\r\nSO: "+i.windows+L"\r\nArquitectura: "+i.architecture+
       L"\r\nCPU: "+i.cpu+L"\r\nRAM MB: "+std::to_wstring(i.ramMb)+
       L"\r\nEspacio libre GB: "+std::to_wstring(i.freeGb)+
       L"\r\nLibreOffice: "+i.libreoffice+L"\r\n\r\nACTUACIONES Y RESULTADOS REALES\r\n"+ReadLog();
    AppendUtf8(name,report);
    return true;
}
TaskResult TempFiles(bool preview,bool includeWindowsTemp,const std::atomic_bool* cancel){
    FILETIME now={};GetSystemTimeAsFileTime(&now);
    ULARGE_INTEGER t={now.dwLowDateTime,now.dwHighDateTime};
    const ULONGLONG week=7ULL*24*60*60*10000000ULL;
    ScanState s;s.preview=preview;s.cancel=cancel;s.cutoff=t.QuadPart>week?t.QuadPart-week:0;
    wchar_t tmp[32768]={};DWORD n=GetEnvironmentVariableW(L"TEMP",tmp,32768);
    if(n>0&&n<32768)ScanDir(tmp,s,0);
    if(includeWindowsTemp){
        wchar_t win[MAX_PATH]={0};GetWindowsDirectoryW(win,MAX_PATH);
        ScanDir(Join(win,L"Temp"),s,0);
    }
    TaskResult r;r.examined=s.examined;r.changed=s.changed;r.errors=s.errors;r.bytes=s.bytes;r.cancelled=cancel&&cancel->load();
    Log(std::wstring(preview?L"Vista previa":L"Limpieza")+L" de temporales (>7 días): archivos examinados "+
        std::to_wstring(r.examined)+L"; "+(preview?L"candidatos ":L"eliminados ")+
        std::to_wstring(r.changed)+L"; errores "+std::to_wstring(r.errors)+L"; MiB "+
        std::to_wstring(r.bytes/1024/1024)+L".");
    return r;
}
bool ChangeService(const wchar_t* name,bool disable,std::wstring& message){
    std::wstring backup=BackupIni();
    if(backup.empty()){message=L"Indica Centro y Puesto físico antes de modificar servicios (respaldo individual).";return false;}
    if(!IsAdmin()){message=L"Se requieren permisos de administrador.";return false;}
    SC_HANDLE scm=OpenSCManagerW(nullptr,nullptr,SC_MANAGER_CONNECT);
    if(!scm){message=L"No se pudo acceder al gestor de servicios.";return false;}
    SC_HANDLE svc=OpenServiceW(scm,name,SERVICE_QUERY_CONFIG|SERVICE_CHANGE_CONFIG);
    if(!svc){CloseServiceHandle(scm);message=L"Servicio ausente o sin permisos: "+std::wstring(name);return false;}
    BYTE buffer[8192];DWORD bytes=0;
    QUERY_SERVICE_CONFIGW* config=(QUERY_SERVICE_CONFIGW*)buffer;
    bool ok=!!QueryServiceConfigW(svc,config,sizeof(buffer),&bytes);
    if(!ok){CloseServiceHandle(svc);CloseServiceHandle(scm);message=L"No se pudo consultar "+std::wstring(name);return false;}
    DWORD desired=SERVICE_NO_CHANGE;
    if(disable){
        desired=SERVICE_DISABLED;
        if(ReadBackup(L"Servicios",name).empty()){
            if(!WriteBackup(L"Servicios",name,std::to_wstring(config->dwStartType))){
                message=L"No se pudo guardar el estado original de "+std::wstring(name);
                CloseServiceHandle(svc);CloseServiceHandle(scm);return false;
            }
        }
    }else{
        std::wstring old=ReadBackup(L"Servicios",name);
        if(old.empty()){message=L"No existe respaldo anterior para "+std::wstring(name);CloseServiceHandle(svc);CloseServiceHandle(scm);return false;}
        desired=(DWORD)_wtoi(old.c_str());
    }
    ok=!!ChangeServiceConfigW(svc,SERVICE_NO_CHANGE,desired,SERVICE_NO_CHANGE,nullptr,nullptr,nullptr,
                             nullptr,nullptr,nullptr,nullptr);
    DWORD error=GetLastError();
    CloseServiceHandle(svc);CloseServiceHandle(scm);
    message=(ok?L"Configurado: ":L"Error al configurar: ")+std::wstring(name)+
          (ok?L" (se aplicará al siguiente arranque).":L" (Win32 "+std::to_wstring(error)+L").");
    Log(message);return ok;
}
bool RestoreServices(std::wstring& message){
    const wchar_t* names[]={L"DiagTrack",L"dmwappushservice",L"WMPNetworkSvc",L"Fax",L"TabletInputService",L"RemoteRegistry"};
    unsigned success=0,fail=0,absent=0;std::wstring out;
    for(const auto* name:names){
        if(ReadBackup(L"Servicios",name).empty()){++absent;continue;}
        std::wstring note;
        if(ChangeService(name,false,note))++success;else{++fail;out+=note+L"\n";}
    }
    message=L"Restauración: "+std::to_wstring(success)+L" servicios; "+std::to_wstring(fail)+
            L" errores; "+std::to_wstring(absent)+L" sin respaldo.\n"+out;
    Log(message);return fail==0&&success>0;
}
bool ChangeCeip(bool restore,std::wstring& message){
    if(BackupIni().empty()){message=L"Indica Centro y Puesto físico para conservar el respaldo.";return false;}
    if(!IsAdmin()){message=L"Se necesitan permisos de administrador.";return false;}
    const wchar_t* key=L"SOFTWARE\\Microsoft\\SQMClient\\Windows";
    HKEY h=nullptr;
    LONG error=RegCreateKeyExW(HKEY_LOCAL_MACHINE,key,0,nullptr,0,KEY_QUERY_VALUE|KEY_SET_VALUE,nullptr,&h,nullptr);
    if(error!=ERROR_SUCCESS){message=L"No se pudo abrir configuración CEIP.";return false;}
    DWORD value=0,size=sizeof(value),type=0;
    LONG existed=RegQueryValueExW(h,L"CEIPEnable",nullptr,&type,(LPBYTE)&value,&size);
    if(!restore){
        if(ReadBackup(L"Registro",L"CEIPPrev").empty()){
            std::wstring original=existed==ERROR_SUCCESS&&type==REG_DWORD?std::to_wstring(value):L"ABSENT";
            if(!WriteBackup(L"Registro",L"CEIPPrev",original)){RegCloseKey(h);message=L"No se pudo respaldar CEIP.";return false;}
        }
        value=0;error=RegSetValueExW(h,L"CEIPEnable",0,REG_DWORD,(BYTE*)&value,sizeof(value));
    }else{
        std::wstring original=ReadBackup(L"Registro",L"CEIPPrev");
        if(original.empty()){RegCloseKey(h);message=L"No consta valor original de CEIP.";return false;}
        if(original==L"ABSENT")error=RegDeleteValueW(h,L"CEIPEnable");
        else{value=(DWORD)_wtoi(original.c_str());error=RegSetValueExW(h,L"CEIPEnable",0,REG_DWORD,(BYTE*)&value,sizeof(value));}
    }
    RegCloseKey(h);
    message=(restore?L"Restauración":L"Ajuste")+std::wstring(L" CEIP: ")+(error==ERROR_SUCCESS?L"correcto.":L"error.")+
        L" No implica eliminar toda la telemetría del sistema.";
    Log(message);
    return error==ERROR_SUCCESS;
}
std::wstring ChooseFolder(HWND parent){
    BROWSEINFOW info={};info.hwndOwner=parent;info.lpszTitle=L"Elige la carpeta de un USB o de una ISO de Windows 10 extraída";
    info.ulFlags=BIF_RETURNONLYFSDIRS|BIF_NEWDIALOGSTYLE;
    LPITEMIDLIST id=SHBrowseForFolderW(&info);
    if(!id)return L"";
    wchar_t path[MAX_PATH]={0};
    BOOL ok=SHGetPathFromIDListW(id,path);
    CoTaskMemFree(id);
    return ok?std::wstring(path):L"";
}
std::wstring ChooseMsi(HWND parent){
    wchar_t path[MAX_PATH]={0};
    OPENFILENAMEW open={};open.lStructSize=sizeof(open);open.hwndOwner=parent;open.lpstrFile=path;
    open.nMaxFile=MAX_PATH;open.lpstrFilter=L"Instalador MSI de LibreOffice (*.msi)\0*.msi\0\0";
    open.Flags=OFN_FILEMUSTEXIST|OFN_PATHMUSTEXIST;
    return GetOpenFileNameW(&open)?std::wstring(path):L"";
}
bool ValidInstallerFolder(const std::wstring& folder,const Inspection& i,std::wstring& reason){
    if(folder.empty()){reason=L"Selecciona primero la carpeta del instalador.";return false;}
    if(!Exists(Join(folder,L"setup.exe"))){reason=L"Falta setup.exe en la raíz de la carpeta elegida.";return false;}
    if(!Exists(Join(folder,L"sources\\install.wim"))&&!Exists(Join(folder,L"sources\\install.esd"))){
        reason=L"Falta sources\\install.wim o sources\\install.esd: no parece un medio completo.";return false;
    }
    if(i.windows7&&i.windows.find(L"Service Pack 1")==std::wstring::npos &&
       i.windows.find(L"SP1")==std::wstring::npos){
        reason=L"Windows 7 sin Service Pack 1 confirmado. Comprueba primero el SP1.";return false;
    }
    if(i.freeGb<25){reason=L"Espacio libre insuficiente para una migración prudente: recomendamos al menos 25 GB.";return false;}
    if(i.ramMb<1900){reason=L"Menos de 2 GB RAM: no se recomienda continuar sin revisar recursos.";return false;}
    reason=L"Medio reconocido. Confirma que la ISO es oficial, de igual idioma, edición y arquitectura ("+
           i.architecture+L"), y que dispones de licencia válida. La comprobación del instalador será definitiva.";
    return true;
}
bool OpenInstaller(const std::wstring& folder,HWND parent){
    std::wstring path=Join(folder,L"setup.exe");
    HINSTANCE h=ShellExecuteW(parent,L"runas",path.c_str(),nullptr,folder.c_str(),SW_SHOWNORMAL);
    return (INT_PTR)h>32;
}
bool LaunchTracked(const std::wstring& exe,const std::wstring& args,HWND parent,HANDLE* process,std::wstring& error){
    SHELLEXECUTEINFOW info={sizeof(info)};info.fMask=SEE_MASK_NOCLOSEPROCESS|SEE_MASK_NOASYNC;
    info.hwnd=parent;info.lpVerb=IsAdmin()?L"open":L"runas";info.lpFile=exe.c_str();info.lpParameters=args.empty()?nullptr:args.c_str();info.nShow=SW_SHOWNORMAL;
    if(!ShellExecuteExW(&info)){error=L"No se pudo iniciar el proceso (error "+std::to_wstring(GetLastError())+L").";return false;}
    if(process)*process=info.hProcess;else if(info.hProcess)CloseHandle(info.hProcess);return true;
}
std::wstring PackageProperty(MSIHANDLE database,const wchar_t* property){
    std::wstring sql=L"SELECT `Value` FROM `Property` WHERE `Property`='"+std::wstring(property)+L"'";
    MSIHANDLE view=0,record=0;std::wstring value;
    if(MsiDatabaseOpenViewW(database,sql.c_str(),&view)==ERROR_SUCCESS){
        if(MsiViewExecute(view,0)==ERROR_SUCCESS&&MsiViewFetch(view,&record)==ERROR_SUCCESS){
            wchar_t buffer[512]={};DWORD length=511;
            if(MsiRecordGetStringW(record,1,buffer,&length)==ERROR_SUCCESS)value=buffer;
        }
        if(record)MsiCloseHandle(record);MsiViewClose(view);MsiCloseHandle(view);
    }
    return value;
}
bool ValidateLibreOfficePackage(const std::wstring& path,const Inspection& system,std::wstring& error){
    MSIHANDLE database=0;
    if(MsiOpenDatabaseW(path.c_str(),MSIDBOPEN_READONLY,&database)!=ERROR_SUCCESS){error=L"El archivo no es un paquete MSI válido.";return false;}
    auto product=PackageProperty(database,L"ProductName"),version=PackageProperty(database,L"ProductVersion"),maker=PackageProperty(database,L"Manufacturer");
    MSIHANDLE summary=0;wchar_t arch[256]={};DWORD length=255;UINT type=0;
    if(MsiGetSummaryInformationW(database,nullptr,0,&summary)==ERROR_SUCCESS){MsiSummaryInfoGetPropertyW(summary,7,&type,nullptr,nullptr,arch,&length);MsiCloseHandle(summary);}
    MsiCloseHandle(database);
    if(Lower(product).find(L"libreoffice")!=0||Lower(maker).find(L"document foundation")==std::wstring::npos){error=L"El paquete no se identifica como LibreOffice de The Document Foundation.";return false;}
    if(system.windows7&&version.find(L"7.4.")!=0){error=L"El MSI no contiene una versión 7.4.x de LibreOffice compatible con el perfil Windows 7.";return false;}
    if(system.architecture==L"32 bits"&&Lower(arch).find(L"x64")!=std::wstring::npos){error=L"El MSI es de 64 bits y este Windows es de 32 bits.";return false;}
    WINTRUST_FILE_INFO file={sizeof(file)};file.pcwszFilePath=path.c_str();
    WINTRUST_DATA trust={sizeof(trust)};trust.dwUIChoice=WTD_UI_NONE;trust.fdwRevocationChecks=WTD_REVOKE_NONE;
    trust.dwUnionChoice=WTD_CHOICE_FILE;trust.pFile=&file;trust.dwStateAction=WTD_STATEACTION_VERIFY;trust.dwProvFlags=WTD_CACHE_ONLY_URL_RETRIEVAL;
    GUID action=WINTRUST_ACTION_GENERIC_VERIFY_V2;LONG status=WinVerifyTrust(nullptr,&action,&trust);
    trust.dwStateAction=WTD_STATEACTION_CLOSE;WinVerifyTrust(nullptr,&action,&trust);
    if(status!=ERROR_SUCCESS){error=L"Windows no pudo validar la firma del MSI. Usa un instalador oficial y revisa certificados/fecha del equipo.";return false;}
    return true;
}
bool InstallLibreOffice(const std::wstring& msi,HWND parent,std::wstring& error,HANDLE* process,bool approved){
    Inspection i=Inspect();
    if(msi.size()<4||Lower(msi.substr(msi.size()-4))!=L".msi"||!Exists(msi)){
        error=L"Selecciona un archivo .MSI existente.";return false;
    }
    if(Lower(msi).find(L"libreoffice")==std::wstring::npos){
        error=L"El archivo elegido no parece ser un instalador de LibreOffice.";return false;
    }
    if(i.windows7 && Lower(msi).find(L"7.4.")==std::wstring::npos){
        error=L"En Windows 7 esta versión solo admite un MSI de LibreOffice 7.4.x elegido y verificado previamente. No se instalará una versión moderna incompatible.";return false;
    }
    if(!ValidateLibreOfficePackage(msi,i,error))return false;
    int r=approved?IDYES:MessageBoxW(parent,L"Instalar LibreOffice desde este archivo MSI local?\nComprueba que lo descargaste del sitio oficial y que su arquitectura coincide con Windows.\nCierra LibreOffice y guarda los documentos antes de seguir.",
       L"Confirmación de instalación",MB_YESNO|MB_ICONWARNING|MB_DEFBUTTON2);
    if(r!=IDYES){error=L"Cancelado por el usuario.";return false;}
    std::wstring args=L"/i \""+msi+L"\" /passive /norestart";
    if(!LaunchTracked(L"msiexec.exe",args,parent,process,error))return false;
    Log(L"Actualización de LibreOffice iniciada. PENDIENTE: verificar al terminar la versión instalada.");
    return true;
}
bool IsThirdPartyAntivirus(const Program& p){
    auto name=Lower(p.name),publisher=Lower(p.publisher);
    if(!p.antivirus||name.find(L"microsoft")!=std::wstring::npos||name.find(L"windows defender")!=std::wstring::npos||publisher.find(L"microsoft")!=std::wstring::npos)return false;
    // The inventory's broad vendor hints are not sufficient for automatic removal.
    return HasAny(name,{L"avast free antivirus",L"avast premium security",L"avg antivirus",L"avg internet security",L"avira security",
        L"norton 360",L"norton security",L"norton antivirus",L"norton internet security",L"mcafee livesafe",L"mcafee total protection",L"mcafee antivirus",
        L"kaspersky anti",L"kaspersky internet security",L"kaspersky total security",L"kaspersky standard",L"kaspersky plus",L"kaspersky premium",
        L"eset nod32",L"eset internet security",L"eset smart security",L"eset endpoint antivirus",L"eset endpoint security",
        L"bitdefender total security",L"bitdefender internet security",L"bitdefender antivirus",L"bitdefender endpoint security",
        L"panda dome",L"sophos endpoint",L"trend micro maximum security",L"trend micro internet security",L"trend micro antivirus",L"trend micro security agent",
        L"360 total security",L"webroot secureanywhere",L"f-secure safe",L"f-secure total",L"f-secure internet security",L"f-secure anti",L"f-secure client security",
        L"g data antivirus",L"malwarebytes anti",L"malwarebytes premium"})||name==L"malwarebytes";
}
bool UninstallProgram(const Program& p,HWND parent,std::wstring& error,HANDLE* process){
    if(p.uninstall.empty()&&!(IsMsiGuid(p.keyName)&&p.isMsi)){error=L"No hay desinstalador registrado. Abre Programas y características.";return false;}
    if(IsMsiGuid(p.keyName) && p.isMsi){
        std::wstring args=L"/x "+p.keyName+(process?L" /passive /norestart":L"");
        if(!LaunchTracked(L"msiexec.exe",args,parent,process,error))return false;
        Log(L"Desinstalador MSI abierto: "+p.name+L". Estado pendiente de verificación.");
        return true;
    }
    std::wstring exe,args;
    if(!ParseUninstallCommand(p.uninstall,exe,args)){error=L"Comando de desinstalación no interpretable.";return false;}
    std::wstring lc=Lower(exe);
    if(lc.find(L"cmd.exe")!=std::wstring::npos||lc.find(L"powershell.exe")!=std::wstring::npos){
        error=L"El desinstalador usa un intérprete; por seguridad debes iniciarlo desde Programas y características.";
        return false;
    }
    if(!LaunchTracked(exe,args,parent,process,error))return false;
    Log(L"Desinstalador iniciado: "+p.name+L". PENDIENTE: verificar si desaparece después de terminar.");
    return true;
}
bool ParseUninstallCommand(const std::wstring& command,std::wstring& exe,std::wstring& args){
    std::wstring cmd=Trim(Expand(command));exe.clear();args.clear();if(cmd.empty())return false;
    if(cmd.front()==L'"'){
        auto end=cmd.find(L'"',1);if(end==std::wstring::npos)return false;exe=cmd.substr(1,end-1);args=Trim(cmd.substr(end+1));
    }else{
        auto lower=Lower(cmd);size_t end=0;
        for(;;){end=lower.find(L".exe",end);if(end==std::wstring::npos)return false;end+=4;if(end==cmd.size()||iswspace(cmd[end]))break;}
        exe=cmd.substr(0,end);args=Trim(cmd.substr(end));
    }
    auto lower=Lower(exe);return !exe.empty()&&lower.size()>=4&&lower.substr(lower.size()-4)==L".exe";
}
bool Elevate(HWND parent,const wchar_t* arguments){
    wchar_t file[MAX_PATH]={0};GetModuleFileNameW(nullptr,file,MAX_PATH);
    HINSTANCE h=ShellExecuteW(parent,L"runas",file,arguments,ExeFolder().c_str(),SW_SHOWNORMAL);
    return (INT_PTR)h>32;
}
void LaunchUrl(const wchar_t* url){ShellExecuteW(nullptr,L"open",url,nullptr,nullptr,SW_SHOWNORMAL);}
} // namespace aula
