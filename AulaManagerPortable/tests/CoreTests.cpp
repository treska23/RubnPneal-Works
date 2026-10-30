#include "../src/Automation.h"
#include "../src/WindowsMedia.h"
#include <fstream>
#include <iterator>
#include <iostream>

int wmain(int argc,wchar_t** argv){
    int failures=0;
    auto check=[&](bool ok,const char* description){std::cout<<(ok?"PASS ":"FAIL ")<<description<<'\n';if(!ok)++failures;};
    if(argc==4&&std::wstring(argv[1])==L"--prepare-iso"){
        aula::Inspection pc;pc.windows7=true;pc.servicePackMajor=1;pc.osMajor=6;pc.osMinor=1;pc.ramMb=4096;pc.freeGb=100;
        pc.architecture=std::wstring(argv[2]).find(L"x64")!=std::wstring::npos?L"64 bits":L"32 bits";
        std::wstring folder,error;
        bool ok=aula::PrepareWindowsIso(argv[2],pc,folder,nullptr,[](const std::wstring& line){std::wcout<<line<<std::endl;},error,argv[3]);
        if(!ok)std::wcerr<<error<<std::endl;
        check(ok,"real official ISO is verified, extracted and checked through the production Windows 7 path; setup is never run");
        return failures?1:0;
    }
    if(argc==2&&std::wstring(argv[1])==L"--online-catalog"){
        aula::Inspection pc;pc.osMajor=10;pc.build=19045;pc.architecture=L"64 bits";pc.libreofficeVersion=L"999.0.0.0";
        aula::OfficePreparation office;std::wstring error;
        bool ok=aula::PrepareLibreOffice(pc,office,nullptr,{},error);
        if(!ok)std::wcerr<<error<<std::endl;
        check(ok&&!office.installNeeded&&!office.version.empty(),"live official stable catalog and SHA256 are read without downloading or running an installer");
        std::wcout<<L"Latest stable: "<<office.version<<std::endl;return failures?1:0;
    }
    if(argc==3&&std::wstring(argv[1])==L"--prepare-office"){
        aula::Inspection pc;pc.osMajor=10;pc.build=19045;pc.architecture=L"64 bits";pc.libreofficeVersion=L"7.4.7.2";pc.freeGb=100;
        aula::OfficePreparation office;std::wstring error;
        bool ok=aula::PrepareLibreOffice(pc,office,nullptr,[](const std::wstring& line){std::wcout<<line<<std::endl;},error,argv[2]);
        if(!ok)std::wcerr<<error<<std::endl;
        check(ok&&office.installNeeded&&aula::CompareVersion(office.version,L"25.2.7.2")>0,"latest LibreOffice is downloaded from the official site and verified by SHA256 and MSI metadata; it is never installed by this test");
        std::wcout<<L"Verified MSI version: "<<office.version<<std::endl;return failures?1:0;
    }
    check(aula::LatestStableOffice("<a href=\"26.8.2/\"><a href=\"26.2.10/\"><a href=\"26.8.1/\">")==L"26.8.2","official stable catalog selects the newest numeric release");
    check(aula::LatestStableOffice("<a href=\"26.9.0-beta/\"><a href=\"https://evil.test/99.0.0/\">").empty(),"prerelease and external catalog links are rejected");
    aula::Inspection resources;resources.windows7=true;resources.servicePackMajor=1;resources.architecture=L"32 bits";resources.ramMb=4096;resources.freeGb=35;std::wstring requirement;
    check(aula::WindowsMediaRequirements(resources,requirement),"Windows 7 SP1 with sufficient space can prepare the bundled ISO");
    resources.freeGb=34;check(!aula::WindowsMediaRequirements(resources,requirement),"ISO preparation refuses insufficient space before extracting");
    const std::wstring center=L"Centro — revisión 東京",station=L"PC-01";
    aula::IniWrite(L"Centro",center);aula::IniWrite(L"Puesto",station);
    check(aula::IniRead(L"Centro")==center&&aula::IniRead(L"Puesto")==station,"Unicode identity round trip");

    std::wstring folder=aula::ExeFolder()+L"\\TempFixture-"+std::to_wstring(GetCurrentProcessId());
    check(CreateDirectoryW(folder.c_str(),nullptr)!=FALSE,"create isolated temporary fixture");
    auto makeFile=[&](const wchar_t* name,bool old){
        auto path=folder+L"\\"+name;
        HANDLE file=CreateFileW(path.c_str(),GENERIC_WRITE,0,nullptr,CREATE_NEW,FILE_ATTRIBUTE_NORMAL,nullptr);
        if(file==INVALID_HANDLE_VALUE)return false;
        DWORD written=0;WriteFile(file,"abc",3,&written,nullptr);
        if(old){FILETIME now={};GetSystemTimeAsFileTime(&now);ULARGE_INTEGER stamp={now.dwLowDateTime,now.dwHighDateTime};
            stamp.QuadPart-=14ULL*24*60*60*10000000ULL;FILETIME expired={stamp.LowPart,stamp.HighPart};SetFileTime(file,nullptr,nullptr,&expired);}
        CloseHandle(file);return written==3;
    };
    check(makeFile(L"old.txt",true)&&makeFile(L"recent.txt",false),"create old and recent files");
    check(aula::FileSha256(folder+L"\\old.txt")==L"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
          "native SHA256 matches the known abc vector");
    SetEnvironmentVariableW(L"TEMP",folder.c_str());
    auto preview=aula::TempFiles(true,false);
    check(preview.examined==2&&preview.changed==1&&preview.bytes==3,"preview selects only files older than seven days");
    std::atomic_bool cancel(true);auto stopped=aula::TempFiles(true,false,&cancel);
    check(stopped.cancelled&&stopped.examined==0,"scan respects cancellation before touching files");
    aula::Program av;av.antivirus=true;av.name=L"Microsoft Defender Antivirus";av.publisher=L"Microsoft Corporation";
    check(!aula::IsThirdPartyAntivirus(av),"Microsoft protection excluded from automatic uninstall");
    av.name=L"Norton Utilities";av.publisher=L"Gen Digital";
    check(!aula::IsThirdPartyAntivirus(av),"vendor utility is not treated as antivirus");
    av.name=L"Avast Free Antivirus";
    check(aula::IsThirdPartyAntivirus(av),"recognized third-party antivirus included in batch");
    av.name=L"Bitdefender VPN";check(!aula::IsThirdPartyAntivirus(av),"VPN utility excluded from automatic antivirus removal");
    std::wstring executable,arguments;
    check(aula::ParseUninstallCommand(L"C:\\Program Files\\Vendor\\uninstall.exe /uninstall /quiet",executable,arguments)&&executable==L"C:\\Program Files\\Vendor\\uninstall.exe"&&arguments==L"/uninstall /quiet","unquoted uninstall path with spaces parsed correctly");
    check(aula::ParseUninstallCommand(L"\"C:\\Program Files\\Vendor\\uninstall.exe\" /remove \"a b\"",executable,arguments)&&arguments==L"/remove \"a b\"","quoted uninstall arguments preserved");
    check(!aula::ParseUninstallCommand(L"\"unclosed.exe /x",executable,arguments),"malformed uninstall command rejected");
    aula::Program msi;msi.keyName=L"{11111111-2222-3333-4444-555555555555}";msi.isMsi=true;std::wstring error;
    check(aula::BuildAutomaticUninstall(msi,executable,arguments,error)&&arguments.find(L"/qn")!=std::wstring::npos&&arguments.find(L"ReallySuppress")!=std::wstring::npos,
          "MSI removal is silent and suppresses automatic reboot");
    aula::Program quiet;quiet.quietUninstall=L"\"C:\\Vendor\\remove.exe\" /quiet /norestart";
    check(aula::BuildAutomaticUninstall(quiet,executable,arguments,error)&&arguments==L"/quiet /norestart","vendor quiet uninstall is used without interactive selection");
    quiet.quietUninstall=L"cmd.exe /c something";
    check(!aula::BuildAutomaticUninstall(quiet,executable,arguments,error),"indirect shell uninstall commands are not guessed");
    aula::Inspection system;system.windows7=true;system.servicePackMajor=1;system.architecture=L"64 bits";system.freeGb=10;
    aula::OfficePreparation office;
    system.libreofficeVersion=L"25.2.8.1";
    check(aula::PrepareLibreOffice(system,office,nullptr,{},error)&&!office.installNeeded,"newer installed LibreOffice is preserved without downloading or downgrading");
    system.libreofficeVersion.clear();system.servicePackMajor=0;
    check(!aula::PrepareLibreOffice(system,office,nullptr,{},error),"Windows 7 without SP1 stops before installer download or system changes");
    if(argc==3&&std::wstring(argv[1])==L"--packages"){
        system.servicePackMajor=1;
        for(bool x64:{false,true}){
            system.architecture=x64?L"64 bits":L"32 bits";office={};
            check(aula::PrepareLibreOffice(system,office,nullptr,{},error,argv[2])&&office.x64==x64&&office.version==L"25.2.7.2"&&!office.productCode.empty(),
                  x64?"real x64 offline MSI passes SHA256, identity, version and architecture checks":"real x86 offline MSI passes SHA256, identity, version and architecture checks");
        }
        system.architecture=L"64 bits";system.libreofficeVersion=L"7.4.7.2";system.libreofficeX64=false;office={};
        check(aula::PrepareLibreOffice(system,office,nullptr,{},error,argv[2])&&!office.x64,"32-bit LibreOffice on 64-bit Windows keeps its installed architecture when updating");
    }
    check(GetFileAttributesW((folder+L"\\old.txt").c_str())!=INVALID_FILE_ATTRIBUTES&&
        GetFileAttributesW((folder+L"\\recent.txt").c_str())!=INVALID_FILE_ATTRIBUTES,"preview leaves both files untouched");
    aula::Log(L"Prueba de exportación: tildes, ñ y 東京.");
    check(aula::SaveReport(center,station),"export report");
    WIN32_FIND_DATAW data={};HANDLE find=FindFirstFileW((aula::DataFolder()+L"\\Informes\\*.txt").c_str(),&data);
    bool valid=false;
    if(find!=INVALID_HANDLE_VALUE){
        std::ifstream input(aula::DataFolder()+L"\\Informes\\"+data.cFileName,std::ios::binary);
        std::string text((std::istreambuf_iterator<char>(input)),std::istreambuf_iterator<char>());
        valid=text.size()>3&&(unsigned char)text[0]==0xef&&(unsigned char)text[1]==0xbb&&(unsigned char)text[2]==0xbf&&
            text.find(u8"Puesto físico: ")!=std::string::npos&&
            text.find(u8"Centro — revisión 東京")!=std::string::npos&&text.find(u8"Prueba de exportación")!=std::string::npos;
        FindClose(find);
    }
    check(valid,"UTF-8 report has BOM, identity, accents, and activity log");
    // Only files created above are removed. Maintenance deletion is never run.
    DeleteFileW((folder+L"\\old.txt").c_str());DeleteFileW((folder+L"\\recent.txt").c_str());RemoveDirectoryW(folder.c_str());
    std::cout<<"Failures: "<<failures<<'\n';return failures?1:0;
}
