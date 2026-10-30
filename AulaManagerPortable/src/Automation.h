#pragma once
#include "SoftwarePolicy.h"
#include <functional>

namespace aula {
enum class StepState { Running, Done, NotNeeded, Failed, Attention, Reboot, Cancelled };
struct StepResult {
    std::wstring step;
    StepState state=StepState::Done;
    std::wstring detail;
};
struct OfficePreparation {
    std::wstring path, version=L"25.2.7.2", productCode, expectedHash;
    bool x64=false, installNeeded=true;
};
struct AutomationContext {
    Inspection system;
    std::vector<Program> before, remove;
    std::vector<std::wstring> exceptions;
    OfficePreparation office;
};
struct AutomationSummary {
    std::vector<StepResult> steps;
    bool cancelled=false, reportSaved=false;
    bool Complete() const {
        if (cancelled || !reportSaved) return false;
        for (const auto& result : steps)
            if (result.state!=StepState::Done && result.state!=StepState::NotNeeded) return false;
        return true;
    }
};
struct AutomationHooks {
    std::function<StepResult(AutomationContext&)> inspect, prepareOffice, installOffice, storeApps, verify;
    std::function<void(const AutomationContext&)> plan;
    std::function<std::vector<StepResult>(AutomationContext&)> telemetry;
    std::function<StepResult(const Program&)> remove;
    std::function<bool(const AutomationContext&, const AutomationSummary&)> report;
    std::function<void(const StepResult&)> notify;
    std::function<bool()> cancel;
};
inline bool StagePassed(const StepResult& result) {
    return result.state==StepState::Done || result.state==StepState::NotNeeded;
}
// The same runner is used by the real button and the injected acceptance tests.
// Preparing LibreOffice must finish before any system/software change starts.
inline AutomationSummary RunClassroomAutomation(AutomationContext& context, AutomationHooks& hooks) {
    AutomationSummary summary;
    auto add=[&](StepResult result) { summary.steps.push_back(result); if(hooks.notify)hooks.notify(result); };
    auto cancelled=[&] { return hooks.cancel && hooks.cancel(); };
    auto running=[&](const std::wstring& step) { if(hooks.notify)hooks.notify({step,StepState::Running,L""}); };
    auto run=[&] {
        running(L"Recoger propiedades del ordenador");
        auto inventory=hooks.inspect(context);add(inventory);if(!StagePassed(inventory))return;
        context.remove.clear();
        for(const auto& program:context.before)
            if(ClassroomSoftwarePolicy(program,context.system,context.exceptions).action==SoftwareAction::Remove)
                context.remove.push_back(program);
        if(cancelled())return;
        running(L"Preparar LibreOffice compatible");
        auto office=hooks.prepareOffice(context);add(office);if(!StagePassed(office))return;
        if(cancelled())return;
        if(hooks.plan)hooks.plan(context);
        if(cancelled())return;
        running(L"Quitar telemetría");
        for(auto result:hooks.telemetry(context))add(result);
        if(cancelled())return;
        if(context.remove.empty())add({L"Retirar aplicaciones externas",StepState::NotNeeded,L"No hay aplicaciones externas que retirar"});
        for(const auto& program:context.remove){
            if(cancelled())return;
            running(L"Desinstalar: "+program.name);add(hooks.remove(program));
        }
        if(cancelled())return;
        if(hooks.storeApps){running(L"Revisar aplicaciones externas de Microsoft Store");add(hooks.storeApps(context));}
        if(cancelled())return;
        running(L"Instalar o actualizar LibreOffice");add(hooks.installOffice(context));
        if(cancelled())return;
        running(L"Verificar el estado final");add(hooks.verify(context));
    };
    try { run(); }
    catch(...) { add({L"Proceso automático",StepState::Failed,L"Error inesperado. Se conserva el resultado de las operaciones anteriores"}); }
    summary.cancelled=summary.cancelled||cancelled();
    if(summary.cancelled)add({L"Proceso automático",StepState::Cancelled,L"Cancelado: no se iniciarán más operaciones"});
    running(L"Guardar informe final");
    try { summary.reportSaved=hooks.report(context,summary); }
    catch(...) { summary.reportSaved=false; }
    add({L"Informe final",summary.reportSaved?StepState::Done:StepState::Failed,
         summary.reportSaved?L"Informe guardado":L"No se pudo guardar el informe"});
    return summary;
}
bool PrepareLibreOffice(const Inspection& system, OfficePreparation& output,
                       const std::atomic_bool* cancel, const std::function<void(const std::wstring&)>& progress,
                       std::wstring& error,const std::wstring& packageFolder=L"");
std::wstring LatestStableOffice(const std::string& catalog);
std::wstring FileSha256(const std::wstring& path);
bool ValidateLibreOfficePackage(const std::wstring& path,const Inspection& system,std::wstring& error,
                               const std::wstring& expectedHash=L"");
std::vector<StepResult> ConfigureTelemetry(bool restore,const std::atomic_bool* cancel=nullptr);
bool IsProgramStillInstalled(const Program& program);
bool BuildAutomaticUninstall(const Program& program,std::wstring& executable,std::wstring& arguments,std::wstring& error);
bool LaunchTracked(const std::wstring& executable,const std::wstring& arguments,HWND parent,HANDLE* process,std::wstring& error);
StepResult RemoveExternalStoreApps(const Inspection& system,const std::atomic_bool* cancel,
                                 const std::function<void(const std::wstring&)>& output);
}
