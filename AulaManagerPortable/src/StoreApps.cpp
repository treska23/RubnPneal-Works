#include "Automation.h"
#include <fstream>
#include <iterator>

namespace aula {
StepResult RemoveExternalStoreApps(const Inspection& system,const std::atomic_bool* cancel,
                                  const std::function<void(const std::wstring&)>& output) {
    const std::wstring title=L"Aplicaciones externas de Microsoft Store";
    if(system.windows7)return {title,StepState::NotNeeded,L"Windows 7 no utiliza paquetes de Microsoft Store"};
    if(system.osMajor!=10||system.build>=22000)return {title,StepState::Failed,L"El proceso está previsto para Windows 7 y Windows 10"};
    HRSRC resource=FindResourceW(nullptr,MAKEINTRESOURCEW(201),RT_RCDATA);
    const char* bytes=resource?(const char*)LockResource(LoadResource(nullptr,resource)):nullptr;
    DWORD size=resource?SizeofResource(nullptr,resource):0;
    if(!bytes||!size)return {title,StepState::Failed,L"No se ha encontrado el módulo de aplicaciones Store"};
    const auto stem=DataFolder()+L"\\Store-"+std::to_wstring(GetCurrentProcessId())+L"-"+std::to_wstring(GetTickCount());
    const auto script=stem+L".ps1",log=stem+L".txt",stop=stem+L".cancel";
    {std::ofstream file(script,std::ios::binary);file.write(bytes,size);if(!file)return {title,StepState::Failed,L"No se pudo preparar el módulo de Store"};}
    wchar_t windows[MAX_PATH]={};GetWindowsDirectoryW(windows,MAX_PATH);
    SYSTEM_INFO hardware={};GetNativeSystemInfo(&hardware);
    const auto shell=std::wstring(windows)+(hardware.wProcessorArchitecture==PROCESSOR_ARCHITECTURE_AMD64?
       L"\\Sysnative\\WindowsPowerShell\\v1.0\\powershell.exe":L"\\System32\\WindowsPowerShell\\v1.0\\powershell.exe");
    std::wstring command=L"\""+shell+L"\" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File \""+script+
      L"\" -ProfilePath \""+ExeFolder()+L"\\PerfilAula.ini\" -CancelPath \""+stop+L"\"";
    SECURITY_ATTRIBUTES security={sizeof(security),nullptr,TRUE};
    HANDLE file=CreateFileW(log.c_str(),GENERIC_WRITE,FILE_SHARE_READ,&security,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);
    HANDLE input=CreateFileW(L"NUL",GENERIC_READ,FILE_SHARE_READ|FILE_SHARE_WRITE,&security,OPEN_EXISTING,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(file==INVALID_HANDLE_VALUE||input==INVALID_HANDLE_VALUE){
        if(file!=INVALID_HANDLE_VALUE)CloseHandle(file);if(input!=INVALID_HANDLE_VALUE)CloseHandle(input);
        DeleteFileW(script.c_str());return {title,StepState::Failed,L"No se pudo abrir el registro de Store"};
    }
    STARTUPINFOW startup={sizeof(startup)};startup.dwFlags=STARTF_USESTDHANDLES;startup.hStdOutput=file;startup.hStdError=file;startup.hStdInput=input;
    PROCESS_INFORMATION process={};bool launched=CreateProcessW(shell.c_str(),&command[0],nullptr,nullptr,TRUE,CREATE_NO_WINDOW,nullptr,nullptr,&startup,&process)!=FALSE;
    CloseHandle(file);CloseHandle(input);
    if(!launched){DeleteFileW(script.c_str());DeleteFileW(log.c_str());return {title,StepState::Failed,L"No se pudo iniciar el módulo de Store"};}
    CloseHandle(process.hThread);DWORD began=GetTickCount(),code=STILL_ACTIVE;bool ended=false,requested=false;
    while(GetTickCount()-began<15*60*1000){
        if(cancel&&cancel->load()&&!requested){
            HANDLE marker=CreateFileW(stop.c_str(),GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);
            if(marker!=INVALID_HANDLE_VALUE)CloseHandle(marker);requested=true;
        }
        if(WaitForSingleObject(process.hProcess,200)==WAIT_OBJECT_0){GetExitCodeProcess(process.hProcess,&code);ended=true;break;}
    }
    CloseHandle(process.hProcess);
    std::ifstream result(log,std::ios::binary);std::string utf8((std::istreambuf_iterator<char>(result)),{});result.close();
    if(!utf8.empty()&&output){int count=MultiByteToWideChar(CP_UTF8,0,utf8.data(),(int)utf8.size(),nullptr,0);
        std::wstring text(count,L'\0');MultiByteToWideChar(CP_UTF8,0,utf8.data(),(int)utf8.size(),&text[0],count);output(text);}
    if(ended){DeleteFileW(script.c_str());DeleteFileW(log.c_str());DeleteFileW(stop.c_str());}
    if(!ended)return {title,StepState::Attention,L"El módulo no ha terminado. Revisa su registro en Datos; no se ha forzado su cierre"};
    if(requested||code==3)return {title,StepState::Cancelled,L"Cancelado antes de la siguiente aplicación"};
    return {title,code==0?StepState::Done:StepState::Attention,
        code==0?L"Inventario de Store y paquetes para nuevos usuarios comprobados":L"Quedan paquetes o errores de Store; consulta el registro"};
}
}
