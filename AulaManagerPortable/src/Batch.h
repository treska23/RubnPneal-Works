#pragma once
#include "Automation.h"
#include <msi.h>
#include <thread>
#include <mutex>
#include <atomic>
namespace {
constexpr UINT JOB_FINISHED=WM_APP+10,AUTO_FULL_RUN=WM_APP+11;
std::thread jobThread;
std::atomic_bool cancelRequested(false);
std::mutex jobMutex;
std::wstring jobText,jobStatus=L"Preparado para la puesta a punto";
bool jobIssues=false;
std::wstring JobText(){std::lock_guard<std::mutex> guard(jobMutex);return jobText;}
std::wstring JobStatus(){std::lock_guard<std::mutex> guard(jobMutex);return jobStatus;}
void RecordJob(const std::wstring& text){
 {std::lock_guard<std::mutex> guard(jobMutex);jobText+=text+L"\r\n\r\n";}
 aula::Log(text);
}
void Phase(const std::wstring& text){
 {std::lock_guard<std::mutex> guard(jobMutex);jobStatus=text;}
 RecordJob(L"[EN CURSO] "+text);
}
void Issue(const std::wstring& text){jobIssues=true;RecordJob(L"[PENDIENTE] "+text);}
void RefreshJob(){
 if(currentPage!=6)return;
 auto log=Find(L"jobLog");if(log){auto text=JobText();if(TextOf(log)!=text){SetWindowTextW(log,text.c_str());SendMessageW(log,EM_SETSEL,(WPARAM)-1,(LPARAM)-1);SendMessageW(log,EM_SCROLLCARET,0,0);}}
 auto status=JobStatus();if(labels[L"jobStatus"].text!=status)SetLabel(L"jobStatus",status);
}
void JoinJob(){cancelRequested=true;if(jobThread.joinable())jobThread.join();}
void CancelJob(){
 if(!jobRunning)return;cancelRequested=true;
 {std::lock_guard<std::mutex> guard(jobMutex);jobStatus=L"Cancelando al terminar la operación actual…";}
 EnableWindow(Find(L"cancelJob"),FALSE);RefreshJob();
}
void FinishJob(){
 if(jobThread.joinable())jobThread.join();jobRunning=false;KillTimer(mainWindow,1);
 {std::lock_guard<std::mutex> guard(jobMutex);jobStatus=cancelRequested?L"Proceso cancelado · revisa el informe":
   (jobIssues?L"Proceso finalizado · hay tareas pendientes":L"Proceso finalizado correctamente");}
 if(closeWhenDone){DestroyWindow(mainWindow);return;}
 Navigate(6);RefreshJob();
}
void StartJob(const std::function<void()>& work){
 if(jobRunning){Navigate(6);return;}
 if(jobThread.joinable())jobThread.join();cancelRequested=false;jobIssues=false;jobRunning=true;
 {std::lock_guard<std::mutex> guard(jobMutex);jobText.clear();jobStatus=L"Iniciando el proceso…";}
 Navigate(6);SetTimer(mainWindow,1,250,nullptr);
 jobThread=std::thread([work]{
  HRESULT com=CoInitializeEx(nullptr,COINIT_APARTMENTTHREADED);
  try{work();}catch(...){Issue(L"La operación encontró un error inesperado. Revisa el registro.");}
  {std::lock_guard<std::mutex> guard(jobMutex);jobStatus=cancelRequested?L"Proceso cancelado · revisa el informe":
     (jobIssues?L"Proceso finalizado · hay tareas pendientes":L"Proceso finalizado correctamente");}
  if(SUCCEEDED(com))CoUninitialize();PostMessageW(mainWindow,JOB_FINISHED,0,0);
 });
}
void StartPreview(){
 if(jobRunning){Navigate(6);return;}
 if(!Checked(checkTemp)){Notice(L"Marca la limpieza de temporales para previsualizarla.");return;}
 bool includeSystem=Checked(checkSysTemp);
 StartJob([includeSystem]{Phase(L"Analizando archivos temporales");auto r=aula::TempFiles(true,includeSystem,&cancelRequested);
  RecordJob(L"[VISTA PREVIA] "+std::to_wstring(r.changed)+L" archivos con más de 7 días · "+std::to_wstring(r.bytes/1024/1024)+L" MiB. No se ha borrado ningún archivo.");});
}
void RunService(const wchar_t* name){
 if(cancelRequested)return;std::wstring message;
 if(aula::ChangeService(name,true,message))RecordJob(L"[HECHO] Servicio "+std::wstring(name)+L": "+message);
 else Issue(L"Servicio "+std::wstring(name)+L": "+message);
}
void ExportJobReport(){
 Phase(L"Generando el informe final");
 RecordJob(cancelRequested?L"[CANCELADO] No se iniciarán más operaciones. Los cambios aplicados figuran en este registro.":L"[RESULTADO] Secuencia terminada. Las incidencias y tareas pendientes figuran en este registro.");
 if(aula::SaveReport(aula::IniRead(L"Centro"),aula::IniRead(L"Puesto")))RecordJob(L"[HECHO] Informe guardado en Datos\\Informes, junto al programa.");
 else Issue(L"No se pudo guardar el informe. Comprueba permisos y espacio en el pendrive.");
}
void RecordAutomaticStep(const aula::StepResult& result){
 using aula::StepState;
 if(result.state==StepState::Running){Phase(result.step);return;}
 const wchar_t* label=L"[COMPROBADO] ";
 if(result.state==StepState::NotNeeded)label=L"[NO NECESARIO] ";
 if(result.state==StepState::Failed)label=L"[ERROR] ";
 if(result.state==StepState::Attention)label=L"[PENDIENTE] ";
 if(result.state==StepState::Reboot)label=L"[REINICIO PENDIENTE] ";
 if(result.state==StepState::Cancelled)label=L"[CANCELADO] ";
 if(!aula::StagePassed(result))jobIssues=true;
 RecordJob(std::wstring(label)+result.step+L": "+result.detail);
}
struct InstallerEnd {bool ended=false;DWORD code=STILL_ACTIVE;};
InstallerEnd AwaitAutomaticInstaller(HANDLE process){
 InstallerEnd result;if(!process)return result;
 DWORD started=GetTickCount();
 while(!cancelRequested&&GetTickCount()-started<15*60*1000){
  DWORD state=WaitForSingleObject(process,200);
  if(state==WAIT_OBJECT_0){result.ended=true;GetExitCodeProcess(process,&result.code);break;}
  if(state==WAIT_FAILED)break;
 }
 CloseHandle(process);return result;
}
void StartFullMaintenance(){
 if(jobRunning){Navigate(6);return;}SaveIdentity();
 if(aula::IniRead(L"Centro").empty()||aula::IniRead(L"Puesto").empty()){
  Notice(L"Escribe el centro y el puesto físico. Después pulsa Preparar el equipo.");Navigate(0);SetFocus(centerEdit);return;
 }
 if(!aula::IsAdmin()){
  if(aula::Elevate(mainWindow,L"--full-maintenance"))DestroyWindow(mainWindow);
  else Notice(L"No se ha concedido acceso de administrador. No se ha iniciado ningún cambio.",MB_ICONWARNING);return;
 }
 StartJob([]{
  using namespace aula;
  AutomationContext context;AutomationHooks hooks;
  hooks.cancel=[]{return cancelRequested.load();};hooks.notify=RecordAutomaticStep;
  hooks.inspect=[](AutomationContext& data){
   data.system=Inspect();
   if(!data.system.windows7 && !(data.system.osMajor==10 && data.system.build>=10240 && data.system.build<22000))
    return StepResult{L"Sistema operativo",StepState::Failed,L"Esta aplicación está preparada para Windows 7 y Windows 10"};
   if(data.system.architecture!=L"32 bits"&&data.system.architecture!=L"64 bits")
    return StepResult{L"Arquitectura",StepState::Failed,L"Se requiere un equipo x86 o x64"};
   data.before=Programs();
   wchar_t buffer[32768]={};auto profile=ExeFolder()+L"\\PerfilAula.ini";
   GetPrivateProfileSectionW(L"Conservar",buffer,32768,profile.c_str());
   for(const wchar_t* row=buffer;*row;row+=wcslen(row)+1){std::wstring item=row;auto equal=item.find(L'=');
    if(equal!=std::wstring::npos&&item.substr(equal+1)==L"1")data.exceptions.push_back(item.substr(0,equal));}
   auto& system=data.system;
   RecordJob(L"[PROPIEDADES] "+system.machine+L" · "+system.windows+L" · "+system.architecture+
    L" · CPU: "+system.cpu+L" · RAM: "+std::to_wstring(system.ramMb)+L" MB · Disco libre: "+std::to_wstring(system.freeGb)+L" GB");
   for(const auto& program:data.before){auto decision=ClassroomSoftwarePolicy(program,system,data.exceptions);
    if(decision.action!=SoftwareAction::Remove)RecordJob(L"[CONSERVAR] "+program.name+L": "+decision.reason);}
   return StepResult{L"Propiedades e inventario",StepState::Done,std::to_wstring(data.before.size())+L" aplicaciones registradas revisadas"};
  };
  hooks.prepareOffice=[](AutomationContext& data){
   std::wstring error;bool ok=PrepareLibreOffice(data.system,data.office,&cancelRequested,[](const std::wstring& text){
    {std::lock_guard<std::mutex> guard(jobMutex);jobStatus=text;}
   },error);
   return StepResult{L"Preparar LibreOffice",ok?(data.office.installNeeded?StepState::Done:StepState::NotNeeded):StepState::Failed,
    ok?(data.office.installNeeded?L"MSI compatible, arquitectura e integridad oficial comprobadas":L"LibreOffice ya está en la versión prevista o una posterior"):error};
  };
  hooks.plan=[](const AutomationContext& data){
   RecordJob(L"[PLAN] Se conservarán LibreOffice, componentes de Windows, controladores y bibliotecas necesarias. Se retirarán las demás aplicaciones:");
   for(const auto& program:data.remove)RecordJob(L"   - "+program.name+(program.version.empty()?L"":L" · "+program.version));
   if(data.remove.empty())RecordJob(L"   No hay aplicaciones externas para retirar.");
   RecordJob(data.office.installNeeded?L"LibreOffice se instalará/actualizará automáticamente a "+data.office.version+L".":L"LibreOffice no requiere actualización.");
   RecordJob(L"El botón principal ha puesto en marcha la secuencia completa. Puedes cancelar las operaciones que aún no han comenzado.");
  };
  hooks.telemetry=[](AutomationContext&){return ConfigureTelemetry(false,&cancelRequested);};
  hooks.storeApps=[](AutomationContext& data){return RemoveExternalStoreApps(data.system,&cancelRequested,RecordJob);};
  hooks.remove=[](const Program& program){
   if(!IsProgramStillInstalled(program))return StepResult{program.name,StepState::NotNeeded,L"Ya no está instalado"};
   std::wstring executable,args,error;
   if(!BuildAutomaticUninstall(program,executable,args,error))return StepResult{program.name,StepState::Attention,error};
   HANDLE process=nullptr;
   if(!LaunchTracked(executable,args,mainWindow,&process,error))return StepResult{program.name,StepState::Failed,error};
   auto exit=AwaitAutomaticInstaller(process);
   if(!exit.ended)return StepResult{program.name,StepState::Attention,L"El proceso no ha terminado; no se ha forzado su cierre"};
   if(exit.code==3010||exit.code==1641)return StepResult{program.name,StepState::Reboot,L"El desinstalador solicita reiniciar"};
   if(exit.code!=0)return StepResult{program.name,StepState::Attention,L"El desinstalador terminó con código "+std::to_wstring(exit.code)};
   DWORD start=GetTickCount();while(IsProgramStillInstalled(program)&&!cancelRequested&&GetTickCount()-start<5000)Sleep(200);
   if(IsProgramStillInstalled(program))return StepResult{program.name,StepState::Attention,L"Sigue registrado como instalado; no se da por eliminado"};
   return StepResult{program.name,StepState::Done,L"Desinstalador finalizado e inventario comprobado"};
  };
  hooks.installOffice=[](AutomationContext& data){
   if(!data.office.installNeeded)return StepResult{L"LibreOffice",StepState::NotNeeded,L"Ya está actualizado para el perfil"};
   HANDLE process=nullptr;std::wstring error;
   if(!InstallLibreOffice(data.office.path,mainWindow,error,&process,true,data.office.expectedHash))return StepResult{L"LibreOffice",StepState::Failed,error};
   auto exit=AwaitAutomaticInstaller(process);
   if(!exit.ended)return StepResult{L"LibreOffice",StepState::Attention,L"El instalador todavía no ha terminado"};
   if(exit.code==3010||exit.code==1641)return StepResult{L"LibreOffice",StepState::Reboot,L"El instalador solicita reinicio"};
   if(exit.code!=0)return StepResult{L"LibreOffice",StepState::Failed,L"Windows Installer devolvió "+std::to_wstring(exit.code)};
   auto after=Inspect();
   if(after.libreofficeVersion.empty()||CompareVersion(after.libreofficeVersion,data.office.version)<0)
    return StepResult{L"LibreOffice",StepState::Failed,L"El inventario no confirma la versión que se debía instalar"};
   return StepResult{L"LibreOffice",StepState::Done,L"Versión instalada comprobada: "+after.libreofficeVersion};
  };
  hooks.verify=[](AutomationContext& data){
   auto system=Inspect();auto actualPrograms=Programs();unsigned remaining=0;
   for(const auto& program:actualPrograms)if(ClassroomSoftwarePolicy(program,system,data.exceptions).action==SoftwareAction::Remove){
    ++remaining;RecordJob(L"[SIGUE INSTALADO] "+program.name);}
   if(system.libreofficeVersion.empty()||CompareVersion(system.libreofficeVersion,data.office.version)<0)
    return StepResult{L"Verificación final",StepState::Failed,L"LibreOffice no está instalado en la versión prevista"};
   if(remaining)return StepResult{L"Verificación final",StepState::Attention,std::to_wstring(remaining)+L" aplicaciones externas siguen instaladas"};
   return StepResult{L"Verificación final",StepState::Done,L"LibreOffice verificado; solo quedan aplicaciones del perfil y componentes necesarios"};
  };
  hooks.report=[](const AutomationContext&,const AutomationSummary& summary){
   bool good=!summary.cancelled;for(const auto& step:summary.steps)if(!StagePassed(step))good=false;
   RecordJob(good?L"[RESULTADO] Todas las operaciones requeridas han sido comprobadas.":L"[RESULTADO INCOMPLETO] Revisa errores, tareas pendientes o reinicios. El equipo no se da por preparado.");
   return SaveReport(IniRead(L"Centro"),IniRead(L"Puesto"));
  };
  auto summary=RunClassroomAutomation(context,hooks);jobIssues=!summary.Complete();
  if(summary.cancelled)cancelRequested=true;
 });
}
void StartSelectedMaintenance(){
 bool flags[]={Checked(checkTemp),Checked(checkSysTemp),Checked(checkCeip),Checked(checkDiag),Checked(checkServices),Checked(checkTablet),Checked(checkRemote)};
 bool any=flags[0]||flags[2]||flags[3]||flags[4]||flags[5]||flags[6];
 if(!any){Notice(L"Selecciona al menos una operación.");return;}
 if((flags[1]||flags[2]||flags[3]||flags[4]||flags[5]||flags[6])&&!aula::IsAdmin()){Notice(L"Estos ajustes requieren administrador. Puedes usar Puesta a punto completa desde Resumen para encadenarlos.");return;}
 if((flags[2]||flags[3]||flags[4]||flags[5]||flags[6])&&(aula::IniRead(L"Centro").empty()||aula::IniRead(L"Puesto").empty())){Notice(L"Indica centro y puesto en Resumen para guardar los respaldos.");return;}
 if(!Confirm(L"¿Aplicar las operaciones seleccionadas? El borrado de temporales es permanente; los ajustes de servicios y CEIP guardan respaldo."))return;
 std::vector<bool> selected(flags,flags+7);
 StartJob([selected]{
  if(selected[0]){Phase(L"Limpiando temporales antiguos");auto r=aula::TempFiles(false,selected[1],&cancelRequested);RecordJob(L"[HECHO] Archivos eliminados: "+std::to_wstring(r.changed)+L"; incidencias: "+std::to_wstring(r.errors));if(r.errors)jobIssues=true;}
  if(selected[2]&&!cancelRequested){std::wstring message;if(aula::ChangeCeip(false,message))RecordJob(L"[HECHO] "+message);else Issue(message);}
  if(selected[3]){RunService(L"DiagTrack");RunService(L"dmwappushservice");}
  if(selected[4]){RunService(L"Fax");RunService(L"WMPNetworkSvc");}
  if(selected[5])RunService(L"TabletInputService");if(selected[6])RunService(L"RemoteRegistry");ExportJobReport();
 });
}
}
