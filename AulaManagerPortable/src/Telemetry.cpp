#include "Automation.h"
#include <taskschd.h>
#include <oleauto.h>
#pragma comment(lib,"taskschd.lib")
#pragma comment(lib,"oleaut32.lib")

namespace aula {
namespace {
template<class T> struct Com {
    T* value=nullptr;~Com(){if(value)value->Release();}
    T** put(){return &value;}T* operator->()const{return value;}
};
struct Bstr {BSTR value;explicit Bstr(const wchar_t* text):value(SysAllocString(text)){}~Bstr(){SysFreeString(value);}operator BSTR()const{return value;}};
struct Policy {const wchar_t* id;const wchar_t* key;const wchar_t* value;DWORD disabledValue;};
const Policy policies[]={
 {L"SQM",L"SOFTWARE\\Microsoft\\SQMClient\\Windows",L"CEIPEnable",0},
 {L"SQMPolicy",L"SOFTWARE\\Policies\\Microsoft\\SQMClient\\Windows",L"CEIPEnable",0},
 {L"AppTelemetry",L"SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat",L"AITEnable",0},
 {L"DataCollection",L"SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection",L"AllowTelemetry",0},
 {L"ErrorReports",L"SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Error Reporting",L"Disabled",1}
};
const wchar_t* tasks[]={
 L"\\Microsoft\\Windows\\Customer Experience Improvement Program\\Consolidator",
 L"\\Microsoft\\Windows\\Customer Experience Improvement Program\\KernelCeipTask",
 L"\\Microsoft\\Windows\\Customer Experience Improvement Program\\UsbCeip",
 L"\\Microsoft\\Windows\\Application Experience\\AitAgent",
 L"\\Microsoft\\Windows\\Application Experience\\ProgramDataUpdater",
 L"\\Microsoft\\Windows\\Application Experience\\Microsoft Compatibility Appraiser",
 L"\\Microsoft\\Windows\\Autochk\\Proxy",
 L"\\Microsoft\\Windows\\DiskDiagnostic\\Microsoft-Windows-DiskDiagnosticDataCollector",
 L"\\Microsoft\\Windows\\Feedback\\Siuf\\DmClient",
 L"\\Microsoft\\Windows\\Feedback\\Siuf\\DmClientOnScenarioDownload"
};
StepResult SetPolicy(const Policy& policy,bool restore) {
    StepResult result{L"Telemetría: "+std::wstring(policy.value),StepState::Failed,L""};
    SYSTEM_INFO system={};GetNativeSystemInfo(&system);REGSAM view=system.wProcessorArchitecture==PROCESSOR_ARCHITECTURE_INTEL?0:KEY_WOW64_64KEY;
    const auto original=BackupRead(L"TelemetriaRegistro",policy.id);
    if(restore&&original.empty())return {result.step,StepState::NotNeeded,L"Sin cambios respaldados"};
    HKEY key=nullptr;LONG code=RegCreateKeyExW(HKEY_LOCAL_MACHINE,policy.key,0,nullptr,0,KEY_QUERY_VALUE|KEY_SET_VALUE|view,nullptr,&key,nullptr);
    if(code!=ERROR_SUCCESS){result.detail=L"No se pudo abrir la política (error "+std::to_wstring(code)+L")";return result;}
    DWORD before=0,type=0,size=sizeof(before);LONG existed=RegQueryValueExW(key,policy.value,nullptr,&type,(BYTE*)&before,&size);
    if(existed!=ERROR_SUCCESS&&existed!=ERROR_FILE_NOT_FOUND){RegCloseKey(key);result.detail=L"No se pudo consultar el valor original";return result;}
    if(existed==ERROR_SUCCESS&&(type!=REG_DWORD||size!=sizeof(DWORD))){RegCloseKey(key);result.detail=L"El valor existente tiene un tipo inesperado; no se ha cambiado";return result;}
    if(!restore&&original.empty()&&!BackupWrite(L"TelemetriaRegistro",policy.id,existed==ERROR_SUCCESS?std::to_wstring(before):L"ABSENT")){
        RegCloseKey(key);result.detail=L"No se pudo guardar el respaldo; la política no se ha cambiado";return result;
    }
    DWORD desired=restore?(DWORD)_wtoi(original.c_str()):policy.disabledValue;
    if(restore&&original==L"ABSENT"){
        code=RegDeleteValueW(key,policy.value);if(code==ERROR_FILE_NOT_FOUND)code=ERROR_SUCCESS;
        size=sizeof(before);LONG check=RegQueryValueExW(key,policy.value,nullptr,&type,(BYTE*)&before,&size);
        if(code==ERROR_SUCCESS&&check!=ERROR_FILE_NOT_FOUND)code=ERROR_INVALID_DATA;
    }else{
        code=RegSetValueExW(key,policy.value,0,REG_DWORD,(BYTE*)&desired,sizeof(desired));
        DWORD actual=~desired;size=sizeof(actual);
        if(code==ERROR_SUCCESS&&(RegQueryValueExW(key,policy.value,nullptr,&type,(BYTE*)&actual,&size)!=ERROR_SUCCESS||actual!=desired))code=ERROR_INVALID_DATA;
    }
    RegCloseKey(key);result.state=code==ERROR_SUCCESS?StepState::Done:StepState::Failed;
    result.detail=code==ERROR_SUCCESS?(restore?L"Valor original restaurado y comprobado":L"Política aplicada y comprobada en la vista nativa de Windows"):
        L"No se pudo aplicar/verificar la política (error "+std::to_wstring(code)+L")";return result;
}
StepResult SetDiagnosticService(const wchar_t* name,bool restore,const std::atomic_bool* cancel) {
    StepResult result{L"Servicio de telemetría: "+std::wstring(name),StepState::Failed,L""};
    SC_HANDLE manager=OpenSCManagerW(nullptr,nullptr,SC_MANAGER_CONNECT);
    if(!manager){result.detail=L"No se pudo abrir el gestor de servicios";return result;}
    SC_HANDLE service=OpenServiceW(manager,name,SERVICE_QUERY_STATUS|SERVICE_STOP|SERVICE_START);
    if(!service){DWORD error=GetLastError();CloseServiceHandle(manager);return {result.step,error==ERROR_SERVICE_DOES_NOT_EXIST?StepState::NotNeeded:StepState::Failed,
        error==ERROR_SERVICE_DOES_NOT_EXIST?L"Este servicio no existe en este Windows":L"No se pudo abrir el servicio"};}
    SERVICE_STATUS_PROCESS status={};DWORD bytes=0;
    if(!QueryServiceStatusEx(service,SC_STATUS_PROCESS_INFO,(BYTE*)&status,sizeof(status),&bytes)){
        CloseServiceHandle(service);CloseServiceHandle(manager);result.detail=L"No se pudo consultar el servicio";return result;}
    if(!restore&&BackupRead(L"TelemetriaServiciosActivos",name).empty()&&
       !BackupWrite(L"TelemetriaServiciosActivos",name,status.dwCurrentState==SERVICE_STOPPED?L"0":L"1")){
        CloseServiceHandle(service);CloseServiceHandle(manager);result.detail=L"No se pudo respaldar el estado del servicio";return result;}
    std::wstring note;
    if(restore&&BackupRead(L"Servicios",name).empty())result={result.step,StepState::NotNeeded,L"Sin cambios respaldados"};
    else if(!ChangeService(name,!restore,note))result.detail=note;
    else{
        const bool start=restore&&BackupRead(L"TelemetriaServiciosActivos",name)==L"1";
        DWORD desired=start?SERVICE_RUNNING:SERVICE_STOPPED;
        if(status.dwCurrentState!=desired){
            if(start)StartServiceW(service,0,nullptr);
            else{SERVICE_STATUS basic={};ControlService(service,SERVICE_CONTROL_STOP,&basic);}
        }
        DWORD began=GetTickCount();
        while(status.dwCurrentState!=desired&&GetTickCount()-began<15000&&!(cancel&&cancel->load())){
            Sleep(100);if(!QueryServiceStatusEx(service,SC_STATUS_PROCESS_INFO,(BYTE*)&status,sizeof(status),&bytes))break;
        }
        result.state=status.dwCurrentState==desired?StepState::Done:StepState::Reboot;
        result.detail=result.state==StepState::Done?(restore?L"Estado original restaurado":L"Servicio detenido y arranque deshabilitado"):
            L"Tipo de arranque actualizado; el servicio no ha cambiado de estado y puede requerir reinicio";
    }
    CloseServiceHandle(service);CloseServiceHandle(manager);return result;
}
}
std::vector<StepResult> ConfigureTelemetry(bool restore,const std::atomic_bool* cancel) {
    std::vector<StepResult> results;
    if(!IsAdmin()||IniRead(L"Centro").empty()||IniRead(L"Puesto").empty())
        return {{L"Telemetría",StepState::Failed,L"Se necesitan administrador y la identificación del puesto para guardar respaldos"}};
    for(const auto& policy:policies){if(cancel&&cancel->load())return results;results.push_back(SetPolicy(policy,restore));}
    Com<ITaskService> service;HRESULT code=CoCreateInstance(CLSID_TaskScheduler,nullptr,CLSCTX_INPROC_SERVER,IID_ITaskService,(void**)service.put());
    VARIANT empty;VariantInit(&empty);Com<ITaskFolder> root;
    if(SUCCEEDED(code))code=service->Connect(empty,empty,empty,empty);
    if(SUCCEEDED(code))code=service->GetFolder(Bstr(L"\\"),root.put());
    if(FAILED(code))results.push_back({L"Tareas de telemetría",StepState::Failed,L"No se pudo acceder al Programador de tareas"});
    else for(const auto* name:tasks){
        if(cancel&&cancel->load())return results;
        const auto old=BackupRead(L"TelemetriaTareas",name);
        if(restore&&old.empty())continue;
        Com<IRegisteredTask> task;code=root->GetTask(Bstr(name),task.put());
        if(FAILED(code)){
            bool absent=code==HRESULT_FROM_WIN32(ERROR_FILE_NOT_FOUND)||code==HRESULT_FROM_WIN32(ERROR_PATH_NOT_FOUND);
            results.push_back({name,absent?StepState::NotNeeded:StepState::Failed,absent?L"Esta tarea no existe en este Windows":L"No se pudo consultar la tarea"});continue;
        }
        VARIANT_BOOL enabled=VARIANT_FALSE;code=task->get_Enabled(&enabled);
        if(FAILED(code)||(!restore&&old.empty()&&!BackupWrite(L"TelemetriaTareas",name,enabled==VARIANT_TRUE?L"1":L"0"))){
            results.push_back({name,StepState::Failed,L"No se pudo respaldar la tarea; no se ha cambiado"});continue;
        }
        VARIANT_BOOL desired=restore&&old==L"1"?VARIANT_TRUE:VARIANT_FALSE;
        code=task->put_Enabled(desired);
        if(SUCCEEDED(code)&&desired==VARIANT_FALSE)task->Stop(0);
        VARIANT_BOOL actual=~desired;if(SUCCEEDED(code))code=task->get_Enabled(&actual);
        results.push_back({name,SUCCEEDED(code)&&actual==desired?StepState::Done:StepState::Failed,
            SUCCEEDED(code)&&actual==desired?(restore?L"Estado original restaurado":L"Tarea deshabilitada y comprobada"):L"No se pudo cambiar o comprobar el estado"});
    }
    for(auto name:{L"DiagTrack",L"dmwappushservice",L"WerSvc"}){
        if(cancel&&cancel->load())return results;results.push_back(SetDiagnosticService(name,restore,cancel));
    }
    return results;
}
}
