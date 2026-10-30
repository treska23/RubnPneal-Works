#include "WindowsMedia.h"
#include "Automation.h"
#include <shlobj.h>
#include <commdlg.h>
#include <fstream>
#include <vector>
namespace aula {
namespace {
const wchar_t* IsoName(bool x64){return x64?L"Win10_22H2_Spanish_x64v1.iso":L"Win10_22H2_Spanish_x32v1.iso";}
const wchar_t* IsoHash(bool x64){return x64?L"0d48c6f236ca9f966eccd84d9be01b038516567aabf1c46dcbee785556b19813":
    L"db414636d7ec65b1aefcc1242d323e839823db21fd25a2a9c5dcecc3c16c3309";}
bool FileExists(const std::wstring& path){auto a=GetFileAttributesW(path.c_str());return a!=INVALID_FILE_ATTRIBUTES&&!(a&FILE_ATTRIBUTE_DIRECTORY);}
}
std::wstring BundledWindowsIso(const Inspection& system){
    auto file=ExeFolder()+L"\\Windows10\\"+IsoName(system.architecture==L"64 bits");return FileExists(file)?file:L"";
}
std::wstring ChooseWindowsIso(HWND parent){
    wchar_t path[32768]={};OPENFILENAMEW dialog={sizeof(dialog)};dialog.hwndOwner=parent;dialog.lpstrFile=path;dialog.nMaxFile=32768;
    dialog.lpstrFilter=L"ISO oficial de Windows 10 (*.iso)\0*.iso\0\0";dialog.Flags=OFN_FILEMUSTEXIST|OFN_PATHMUSTEXIST;
    return GetOpenFileNameW(&dialog)?path:L"";
}
bool WindowsMediaRequirements(const Inspection& system,std::wstring& error){
    if(system.windows7&&system.servicePackMajor<1){error=L"Se requiere Windows 7 Service Pack 1";return false;}
    if(system.architecture!=L"32 bits"&&system.architecture!=L"64 bits"){error=L"Se necesita un Windows x86 o x64";return false;}
    if(system.freeGb<35){error=L"Se necesitan al menos 35 GB libres en el disco de Windows para extraer la ISO y preparar la actualizacion";return false;}
    if(system.ramMb<1900){error=L"Se necesitan al menos 2 GB de RAM para este proceso";return false;}
    return true;
}
bool WindowsSetupArchitecture(const std::wstring& setup,const Inspection& system,std::wstring& error){
    std::ifstream input(setup,std::ios::binary);IMAGE_DOS_HEADER dos={};IMAGE_FILE_HEADER coff={};DWORD signature=0;
    input.read((char*)&dos,sizeof(dos));
    if(!input||dos.e_magic!=IMAGE_DOS_SIGNATURE||dos.e_lfanew<64||dos.e_lfanew>16*1024*1024){error=L"setup.exe no tiene una cabecera valida";return false;}
    input.seekg(dos.e_lfanew);input.read((char*)&signature,sizeof(signature));input.read((char*)&coff,sizeof(coff));
    WORD expected=system.architecture==L"64 bits"?IMAGE_FILE_MACHINE_AMD64:IMAGE_FILE_MACHINE_I386;
    if(!input||signature!=IMAGE_NT_SIGNATURE||coff.Machine!=expected){error=L"La arquitectura del instalador no coincide con Windows. Una actualizacion desde Windows debe mantenerla";return false;}
    return true;
}
bool PrepareWindowsIso(const std::wstring& source,const Inspection& system,std::wstring& folder,
                       const std::atomic_bool* cancel,const std::function<void(const std::wstring&)>& progress,
                       std::wstring& error,const std::wstring& cacheRoot){
    if(!WindowsMediaRequirements(system,error))return false;
    const bool x64=system.architecture==L"64 bits";
    if(!FileExists(source)){error=L"No se encuentra la ISO incluida. Extrae todo el ZIP y conserva la carpeta Windows10";return false;}
    if(progress)progress(L"Verificando SHA256 de la ISO oficial de Windows 10");
    const auto hash=std::wstring(IsoHash(x64));
    if(FileSha256(source)!=hash){error=L"La ISO no coincide con la imagen oficial espanola de Windows 10 22H2 para la arquitectura actual";return false;}
    if(cancel&&cancel->load()){error=L"Preparacion cancelada";return false;}
    std::wstring base=cacheRoot;
    if(base.empty()){wchar_t local[MAX_PATH]={};if(FAILED(SHGetFolderPathW(nullptr,CSIDL_LOCAL_APPDATA,nullptr,SHGFP_TYPE_CURRENT,local))){error=L"No se pudo localizar la carpeta temporal local";return false;}
        base=std::wstring(local)+L"\\AulaManager\\Windows10";}
    folder=base+L"\\"+hash.substr(0,16);
    int made=SHCreateDirectoryExW(nullptr,folder.c_str(),nullptr);
    if(made!=ERROR_SUCCESS&&made!=ERROR_ALREADY_EXISTS&&made!=ERROR_FILE_EXISTS){error=L"No se puede crear la carpeta local para extraer Windows 10";return false;}
    const auto marker=folder+L"\\AulaMedia.ini",setup=folder+L"\\setup.exe";
    wchar_t saved[80]={};GetPrivateProfileStringW(L"ISO",L"SetupSHA256",L"",saved,80,marker.c_str());
    std::wstring check;
    if(saved[0]&&FileSha256(setup)==saved&&ValidInstallerFolder(folder,system,check)&&WindowsSetupArchitecture(setup,system,check))return true;
    const auto tools=ExeFolder()+L"\\Herramientas\\7zip\\",extractor=tools+L"7z.exe";
    if(FileSha256(extractor)!=L"c3598543c41918b5c94dafb9dd724c16c9a217d36b5ee530e3bc10c9f12aca6c"||
       FileSha256(tools+L"7z.dll")!=L"1c57100cc237db626259f68fe91c5a632a5128e0e01bab1452baa1104ff84311"){
        error=L"Faltan las herramientas verificadas de extraccion. Conserva Herramientas junto al EXE";return false;}
    if(progress)progress(L"Extrayendo Windows 10 en el disco local; no es necesario montar la ISO en Windows 7");
    std::wstring command=L"\""+extractor+L"\" x -y -aoa -bso0 -bsp0 \"-o"+folder+L"\" -- \""+source+L"\"";
    STARTUPINFOW startup={sizeof(startup)};PROCESS_INFORMATION process={};
    if(!CreateProcessW(extractor.c_str(),&command[0],nullptr,nullptr,FALSE,CREATE_NO_WINDOW,nullptr,nullptr,&startup,&process)){
        error=L"No se pudo iniciar la extraccion de la ISO";return false;}
    CloseHandle(process.hThread);DWORD result=STILL_ACTIVE;
    for(;;){DWORD waited=WaitForSingleObject(process.hProcess,200);
        if(waited==WAIT_OBJECT_0){GetExitCodeProcess(process.hProcess,&result);break;}
        if(waited==WAIT_FAILED){error=L"No se pudo esperar al extractor";CloseHandle(process.hProcess);return false;}
        if(cancel&&cancel->load()){TerminateProcess(process.hProcess,ERROR_CANCELLED);WaitForSingleObject(process.hProcess,5000);CloseHandle(process.hProcess);
            error=L"Extraccion cancelada. No se ha abierto el instalador de Windows";return false;}
    }
    CloseHandle(process.hProcess);
    if(result!=0){error=L"Error de extraccion "+std::to_wstring(result)+L". Comprueba espacio y permisos del disco local";return false;}
    if(!ValidInstallerFolder(folder,system,error)||!WindowsSetupArchitecture(setup,system,error))return false;
    if(!WritePrivateProfileStringW(L"ISO",L"SetupSHA256",FileSha256(setup).c_str(),marker.c_str())){error=L"No se pudo registrar el medio preparado";return false;}
    if(progress)progress(L"ISO verificada y extraida; instalador de la misma arquitectura que Windows");return true;
}
}
