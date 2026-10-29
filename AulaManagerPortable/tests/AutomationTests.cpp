#include "../src/Automation.h"
#include <iostream>
#include <set>

using namespace aula;
namespace {
int failures=0,checks=0;
void Check(bool ok,const char* text){++checks;std::cout<<(ok?"PASS ":"FAIL ")<<text<<'\n';if(!ok)++failures;}
Program App(const wchar_t* name,const wchar_t* publisher=L"Vendor"){
    Program result;result.name=name;result.publisher=publisher;result.keyName=name;return result;
}
struct Fixture {
    std::vector<Program> installed;
    std::vector<std::wstring> called,removed;
    std::wstring officeVersion=L"7.4.7.2";
    bool missingPackage=false,brokenRemoval=false,brokenOffice=false,brokenStore=false,cancelled=false,reportOk=true;
    unsigned plans=0,reports=0;int cancelAfter=-1;
    Fixture(){
        auto office=App(L"LibreOffice 7.4.7.2",L"The Document Foundation");office.version=officeVersion;
        auto antivirus=App(L"Avast Free Antivirus");antivirus.antivirus=true;
        installed={office,App(L"Security Update for Windows 7",L"Microsoft Corporation"),
          App(L"Microsoft Visual C++ 2019 Redistributable",L"Microsoft Corporation"),
          App(L"Realtek High Definition Audio Driver",L"Realtek"),App(L"Google Chrome"),antivirus,
          App(L"Microsoft Office Professional Plus 2010",L"Microsoft Corporation"),App(L"Zoom")};
    }
    AutomationHooks Hooks(){
        AutomationHooks hooks;
        hooks.inspect=[this](AutomationContext& data){called.push_back(L"inspect");data.before=installed;
            data.system.osMajor=6;data.system.osMinor=1;data.system.windows7=true;data.system.servicePackMajor=1;
            data.system.architecture=L"32 bits";data.system.libreofficeVersion=officeVersion;
            return StepResult{L"Inventory",StepState::Done,L"Machine properties collected"};};
        hooks.prepareOffice=[this](AutomationContext& data){called.push_back(L"prepare");
            data.office.installNeeded=CompareVersion(officeVersion,data.office.version)<0;
            return StepResult{L"Prepare",missingPackage?StepState::Failed:StepState::Done,L"Package preparation"};};
        hooks.plan=[this](const AutomationContext&){called.push_back(L"confirm");++plans;};
        hooks.telemetry=[this](AutomationContext&){called.push_back(L"telemetry");return std::vector<StepResult>{
            {L"CEIP policies",StepState::Done,L"Verified"},{L"CEIP tasks",StepState::Done,L"Verified"},
            {L"Diagnostic services",StepState::NotNeeded,L"Absent on this Windows"}};};
        hooks.remove=[this](const Program& program){called.push_back(L"remove");removed.push_back(program.name);
            if(brokenRemoval&&program.name==L"Google Chrome")return StepResult{program.name,StepState::Attention,L"Still installed"};
            installed.erase(std::remove_if(installed.begin(),installed.end(),[&](const Program& p){return p.keyName==program.keyName;}),installed.end());
            if(cancelAfter>0&&(int)removed.size()>=cancelAfter)cancelled=true;
            return StepResult{program.name,StepState::Done,L"Uninstalled and verified"};};
        hooks.storeApps=[this](AutomationContext&){called.push_back(L"store");return StepResult{L"Store",brokenStore?StepState::Attention:StepState::Done,L"Verified"};};
        hooks.installOffice=[this](AutomationContext& data){called.push_back(L"office");
            if(!brokenOffice)officeVersion=data.office.version;
            return StepResult{L"Office",data.office.installNeeded?StepState::Done:StepState::NotNeeded,L"Installer exit"};};
        hooks.verify=[this](AutomationContext& data){called.push_back(L"verify");unsigned left=0;
            for(const auto& program:installed)if(ClassroomSoftwarePolicy(program,data.system,data.exceptions).action==SoftwareAction::Remove)++left;
            return StepResult{L"Verification",left||CompareVersion(officeVersion,data.office.version)<0?StepState::Failed:StepState::Done,L"Actual final state"};};
        hooks.report=[this](const AutomationContext&,const AutomationSummary&){called.push_back(L"report");++reports;return reportOk;};
        hooks.cancel=[this]{return cancelled;};return hooks;
    }
    AutomationSummary Run(AutomationContext& data){auto hooks=Hooks();return RunClassroomAutomation(data,hooks);}
};
}
int wmain(){
    Inspection win7;win7.osMajor=6;win7.osMinor=1;win7.windows7=true;
    Inspection win10;win10.osMajor=10;
    Check(ClassroomSoftwarePolicy(App(L"Google Chrome"),win7).action==SoftwareAction::Remove,"external browser is removed");
    Check(ClassroomSoftwarePolicy(App(L"Microsoft Office 2010",L"Microsoft Corporation"),win7).action==SoftwareAction::Remove,"Microsoft Office is external, not a Windows default");
    Check(ClassroomSoftwarePolicy(App(L"LibreOffice 25.2",L"The Document Foundation"),win7).action==SoftwareAction::KeepLibreOffice,"LibreOffice is retained");
    Check(ClassroomSoftwarePolicy(App(L"NVIDIA Graphics Driver",L"NVIDIA"),win7).action==SoftwareAction::KeepDriver,"hardware driver is retained");
    Check(ClassroomSoftwarePolicy(App(L"Microsoft Visual C++ Redistributable",L"Microsoft Corporation"),win7).action==SoftwareAction::KeepRuntime,"required runtime is retained");
    Check(ClassroomSoftwarePolicy(App(L"Microsoft Edge",L"Microsoft Corporation"),win7).action==SoftwareAction::Remove,"Edge is external on Windows 7");
    Check(ClassroomSoftwarePolicy(App(L"Microsoft Edge",L"Microsoft Corporation"),win10).action==SoftwareAction::KeepWindows,"default Windows 10 browser is retained");
    Check(ClassroomSoftwarePolicy(App(L"Zoom"),win7,{L"Zoom"}).action==SoftwareAction::KeepException,"saved exception is applied to every PC");
    Check(CompareVersion(L"25.2.10.1",L"25.2.7.2")>0,"versions are compared numerically");
    {
        Fixture machine;AutomationContext data;auto result=machine.Run(data);
        Check(result.Complete(),"whole one-button workflow completes");
        Check(machine.plans==1,"one button starts the whole plan without per-app prompts");
        Check(machine.removed.size()==4,"all external applications are queued, including antivirus and Office");
        Check(std::find(machine.removed.begin(),machine.removed.end(),L"Avast Free Antivirus")!=machine.removed.end(),"antivirus removal is part of the same run");
        Check(machine.called.front()==L"inspect"&&machine.called[1]==L"prepare"&&machine.called.back()==L"report","properties and prerequisites precede changes and report is last");
        Check(machine.officeVersion==L"25.2.7.2","LibreOffice is updated in the same run");
        Check(machine.reports==1,"final report is generated once");
        Check(std::find(machine.called.begin(),machine.called.end(),L"store")!=machine.called.end(),"Store package stage is included in the same workflow");
    }
    {
        Fixture machine;machine.missingPackage=true;AutomationContext data;auto result=machine.Run(data);
        Check(!result.Complete()&&machine.removed.empty(),"missing installer stops before any uninstall");
        Check(std::find(machine.called.begin(),machine.called.end(),L"telemetry")==machine.called.end(),"missing prerequisite also stops registry and service changes");
        Check(machine.reports==1,"prerequisite failure still produces report");
    }
    {
        Fixture machine;machine.brokenRemoval=true;AutomationContext data;auto result=machine.Run(data);
        Check(!result.Complete(),"failed uninstall cannot be marked fully complete");
        Check(machine.officeVersion==L"25.2.7.2","remaining steps still run after a vendor uninstall failure");
    }
    {
        Fixture machine;machine.brokenOffice=true;AutomationContext data;auto result=machine.Run(data);
        Check(!result.Complete(),"installer success without the expected actual version is rejected");
    }
    {
        Fixture machine;machine.brokenStore=true;AutomationContext data;auto result=machine.Run(data);
        Check(!result.Complete()&&machine.officeVersion==L"25.2.7.2","Store failure prevents a complete verdict while LibreOffice still runs");
    }
    {
        Fixture machine;machine.cancelAfter=1;AutomationContext data;auto result=machine.Run(data);
        Check(result.cancelled&&!result.Complete()&&machine.removed.size()==1,"cancellation stops before the next application");
        Check(machine.officeVersion==L"7.4.7.2"&&machine.reports==1,"cancelled run does not install software and saves partial report");
    }
    {
        Fixture machine;machine.reportOk=false;AutomationContext data;auto result=machine.Run(data);
        Check(!result.Complete(),"report write failure prevents a complete verdict");
    }
    {
        Fixture machine;AutomationContext data;data.exceptions={L"Zoom"};auto result=machine.Run(data);
        Check(result.Complete()&&machine.removed.size()==3,"an explicit exception is preserved by the full run");
    }
    std::cout<<"Checks: "<<checks<<"\nFailures: "<<failures<<'\n';return failures?1:0;
}
