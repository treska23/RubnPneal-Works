#include "../src/Core.h"
#include <fstream>
#include <iterator>
#include <iostream>

int wmain(){
    int failures=0;
    auto check=[&](bool ok,const char* description){std::cout<<(ok?"PASS ":"FAIL ")<<description<<'\n';if(!ok)++failures;};
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
            text.find(u8"Centro — revisión 東京")!=std::string::npos&&text.find(u8"Prueba de exportación")!=std::string::npos;
        FindClose(find);
    }
    check(valid,"UTF-8 report has BOM, identity, accents, and activity log");
    // Only files created above are removed. Maintenance deletion is never run.
    DeleteFileW((folder+L"\\old.txt").c_str());DeleteFileW((folder+L"\\recent.txt").c_str());RemoveDirectoryW(folder.c_str());
    std::cout<<"Failures: "<<failures<<'\n';return failures?1:0;
}
