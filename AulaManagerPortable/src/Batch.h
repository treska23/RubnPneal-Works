#pragma once
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
// Waits without blocking the window. Cancel leaves a manufacturer's installer
// running; terminating it could leave the installed software inconsistent.
bool WaitForInstaller(HANDLE process,const std::wstring& name){
 if(!process){Issue(name+L": proceso iniciado, sin identificador para esperar su resultado.");return false;}
 DWORD started=GetTickCount();bool ended=false;
 while(!cancelRequested&&GetTickCount()-started<15*60*1000){DWORD wait=WaitForSingleObject(process,200);if(wait==WAIT_OBJECT_0){ended=true;break;}if(wait==WAIT_FAILED)break;}
 DWORD code=STILL_ACTIVE;if(ended)GetExitCodeProcess(process,&code);CloseHandle(process);
 if(!ended){Issue(name+L": el asistente sigue abierto o no terminó. Revísalo en Windows; no se ha forzado su cierre.");return false;}
 if(code==3010||code==1641){Issue(name+L": el instalador solicita reiniciar Windows.");return true;}
 if(code!=0){Issue(name+L": el proceso terminó con código "+std::to_wstring(code)+L".");return false;}return true;
}
std::wstring FindLocalLibreOffice(){
 if(!selectedMsi.empty())return selectedMsi;
 WIN32_FIND_DATAW data={};auto base=aula::ExeFolder()+L"\\Instaladores\\";
 HANDLE find=FindFirstFileW((base+L"LibreOffice*.msi").c_str(),&data);if(find==INVALID_HANDLE_VALUE)return L"";
 std::wstring result;int found=0;
 do{if(!(data.dwFileAttributes&FILE_ATTRIBUTE_DIRECTORY)){result=base+data.cFileName;++found;}}while(FindNextFileW(find,&data));FindClose(find);
 return found==1?result:L"";
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
void StartFullMaintenance(){
 if(jobRunning){Navigate(6);return;}SaveIdentity();
 if(aula::IniRead(L"Centro").empty()||aula::IniRead(L"Puesto").empty()){
  Notice(L"Indica el centro y el puesto físico en Resumen. Después pulsa Puesta a punto completa.");Navigate(0);SetFocus(centerEdit);return;
 }
 if(!aula::IsAdmin()){
  if(aula::Elevate(mainWindow,L"--full-maintenance"))DestroyWindow(mainWindow);
  else Notice(L"La puesta a punto necesita permisos de administrador. No se ha iniciado ningún cambio.",MB_ICONWARNING);return;
 }
 auto programs=aula::Programs();std::vector<aula::Program> antivirus;
 for(const auto& p:programs)if(aula::IsThirdPartyAntivirus(p))antivirus.push_back(p);
 std::wstring msi=FindLocalLibreOffice();
 std::wstring plan=L"Se encadenarán estas tareas en este puesto:\n\n1. Inventario del equipo.\n2. Borrado permanente de temporales con más de 7 días.\n3. Respaldo y ajuste de CEIP y servicios opcionales (diagnóstico, Fax y Windows Media).\n4. Desinstalación de antivirus de terceros.\n5. LibreOffice desde el MSI local, si está disponible.\n6. Informe final.\n\nAntivirus detectados:";
 for(const auto& p:antivirus)plan+=L"\n• "+p.name;
 if(antivirus.empty())plan+=L" ninguno reconocido.";
 plan+=msi.empty()?L"\n\nLibreOffice: copia un único MSI oficial compatible en la carpeta Instaladores junto al EXE. Ahora quedará pendiente.":L"\n\nLibreOffice: "+msi;
 plan+=L"\n\nGuarda tus documentos y cierra LibreOffice. Los asistentes de antivirus pueden pedir contraseña o reinicio. La migración de Windows se inicia desde su apartado.\n\n¿Iniciar la puesta a punto completa?";
 if(!Confirm(plan))return;
 StartJob([antivirus,msi]{
  Phase(L"1 de 6 · Comprobando el equipo");auto before=aula::Inspect();
  RecordJob(L"[HECHO] "+before.machine+L" · "+before.windows+L" · "+before.architecture+L" · "+std::to_wstring(before.ramMb)+L" MB de RAM.");
  if(!cancelRequested){Phase(L"2 de 6 · Limpiando temporales antiguos");auto r=aula::TempFiles(false,true,&cancelRequested);
   RecordJob(L"[HECHO] "+std::to_wstring(r.changed)+L" archivos eliminados · "+std::to_wstring(r.bytes/1024/1024)+L" MiB examinados como candidatos.");
   if(r.errors)Issue(std::to_wstring(r.errors)+L" archivos no se pudieron borrar (en uso o protegidos).");}
  if(!cancelRequested){Phase(L"3 de 6 · Aplicando ajustes con respaldo");std::wstring message;
   if(aula::ChangeCeip(false,message))RecordJob(L"[HECHO] CEIP/SQM: "+message);else Issue(L"CEIP/SQM: "+message);
   for(auto service:{L"DiagTrack",L"dmwappushservice",L"Fax",L"WMPNetworkSvc"})RunService(service);}
  if(!cancelRequested){Phase(L"4 de 6 · Desinstalando antivirus de terceros");
   if(antivirus.empty())RecordJob(L"[HECHO] No se reconocen antivirus de terceros para desinstalar.");
   for(const auto& p:antivirus){if(cancelRequested)break;std::wstring error;HANDLE process=nullptr;
    RecordJob(L"[EN CURSO] Desinstalando "+p.name+L". Atiende al asistente del fabricante si aparece.");
    if(!aula::UninstallProgram(p,mainWindow,error,&process)){Issue(p.name+L": "+error);continue;}
    bool ended=WaitForInstaller(process,p.name);bool remains=false;
    for(const auto& now:aula::Programs())if(now.name==p.name&&now.keyName==p.keyName)remains=true;
    if(!remains)RecordJob(L"[HECHO] "+p.name+L" ya no figura en el inventario.");
    else if(ended)Issue(p.name+L" sigue instalado. Puede requerir contraseña o reinicio.");
   }
  }
  if(!cancelRequested){Phase(L"5 de 6 · Revisando LibreOffice");
   if(msi.empty())Issue(L"LibreOffice: no hay un único MSI local en Instaladores. No se ha actualizado.");
   else {std::wstring error;HANDLE process=nullptr;
    if(!aula::InstallLibreOffice(msi,mainWindow,error,&process,true))Issue(L"LibreOffice: "+error);
    else if(WaitForInstaller(process,L"LibreOffice")){auto after=aula::Inspect();
     if(after.libreoffice==L"No detectado")Issue(L"LibreOffice: el instalador terminó, pero el programa no aparece en el inventario.");
     else RecordJob(L"[VERIFICADO] LibreOffice detectado tras el instalador: "+after.libreoffice);}
   }
  }
  ExportJobReport();
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
