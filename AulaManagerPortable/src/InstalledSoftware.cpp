#include "Automation.h"
#include <msi.h>
#include <shellapi.h>
#include <vector>

namespace aula {
namespace {
std::wstring SystemMsi() {
    wchar_t directory[MAX_PATH]={};GetSystemDirectoryW(directory,MAX_PATH);
    return std::wstring(directory)+L"\\msiexec.exe";
}
bool InstallerHasMarker(const std::wstring& executable,const char* marker) {
    HANDLE file=CreateFileW(executable.c_str(),GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE|FILE_SHARE_DELETE,
                            nullptr,OPEN_EXISTING,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(file==INVALID_HANDLE_VALUE)return false;
    std::string bytes(8*1024*1024,'\0');DWORD read=0;
    bool ok=ReadFile(file,&bytes[0],(DWORD)bytes.size(),&read,nullptr)!=FALSE;CloseHandle(file);bytes.resize(read);
    std::string wide;for(const char* p=marker;*p;++p){wide+=*p;wide+='\0';}
    return ok&&(bytes.find(marker)!=std::string::npos||bytes.find(wide)!=std::string::npos);
}
bool SafeExecutable(const std::wstring& executable) {
    const auto name=Fold(executable);
    return name.find(L"cmd.exe")==std::wstring::npos && name.find(L"powershell.exe")==std::wstring::npos &&
           name.find(L"pwsh.exe")==std::wstring::npos && name.find(L"wscript.exe")==std::wstring::npos &&
           name.find(L"cscript.exe")==std::wstring::npos;
}
}
bool IsProgramStillInstalled(const Program& program) {
    HKEY root=program.registryRoot==L"HKCU"?HKEY_CURRENT_USER:HKEY_LOCAL_MACHINE,key=nullptr;
    const auto path=L"SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\"+program.keyName;
    LONG result=RegOpenKeyExW(root,path.c_str(),0,KEY_QUERY_VALUE|program.registryView,&key);
    if(result==ERROR_FILE_NOT_FOUND||result==ERROR_PATH_NOT_FOUND)return false;
    if(result!=ERROR_SUCCESS)return true;
    DWORD type=0,size=0;result=RegQueryValueExW(key,L"DisplayName",nullptr,&type,nullptr,&size);RegCloseKey(key);
    return result==ERROR_SUCCESS&&size>sizeof(wchar_t);
}
bool BuildAutomaticUninstall(const Program& program,std::wstring& executable,std::wstring& arguments,std::wstring& error) {
    executable.clear();arguments.clear();error.clear();
    const bool guid=program.keyName.size()==38&&program.keyName.front()==L'{'&&program.keyName.back()==L'}';
    if(guid&&(program.isMsi||MsiQueryProductStateW(program.keyName.c_str())==INSTALLSTATE_DEFAULT)) {
        executable=SystemMsi();arguments=L"/x "+program.keyName+L" /qn /norestart REBOOT=ReallySuppress";return true;
    }
    if(!program.quietUninstall.empty()) {
        if(!ParseUninstallCommand(program.quietUninstall,executable,arguments)||!SafeExecutable(executable)) {
            error=L"El desinstalador desatendido registrado no se puede ejecutar directamente";return false;
        }
        if(Fold(executable).find(L"msiexec.exe")!=std::wstring::npos)arguments+=L" /qn /norestart REBOOT=ReallySuppress";
        return true;
    }
    if(!ParseUninstallCommand(program.uninstall,executable,arguments)||!SafeExecutable(executable)) {
        error=L"No hay un desinstalador directo y válido registrado";return false;
    }
    const auto lower=Fold(executable);
    if(InstallerHasMarker(executable,"Inno Setup")) {
        arguments+=L" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART";return true;
    }
    if(InstallerHasMarker(executable,"Nullsoft")||InstallerHasMarker(executable,"NSIS")) {
        arguments+=L" /S";
        // NSIS otherwise spawns a detached copy. Keep its process waitable.
        auto folder=executable.substr(0,executable.find_last_of(L"\\/"));
        if(!folder.empty())arguments+=L" _?="+folder;
        return true;
    }
    if((Fold(program.publisher).find(L"google")!=std::wstring::npos||
        Fold(program.publisher).find(L"microsoft")!=std::wstring::npos)&&
       arguments.find(L"--uninstall")!=std::wstring::npos&&lower.find(L"setup.exe")!=std::wstring::npos) {
        arguments+=L" --force-uninstall";return true;
    }
    error=L"El fabricante no publica un modo desatendido reconocido. Se conserva como pendiente";
    return false;
}
}
