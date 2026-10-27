#pragma once
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <string>
#include <vector>
#include <atomic>

namespace aula {
struct Program {
    std::wstring name, version, publisher, uninstall, keyName;
    bool isMsi=false, antivirus=false;
};
struct Inspection {
    std::wstring machine, windows, cpu, architecture, libreoffice, network;
    DWORD osMajor=0, osMinor=0, build=0;
    ULONGLONG ramMb=0, freeGb=0;
    bool windows7=false, administrator=false;
};
struct TaskResult {
    unsigned examined=0, changed=0, errors=0;
    ULONGLONG bytes=0;
    bool cancelled=false;
};
std::wstring ExeFolder();
std::wstring DataFolder();
std::wstring TimeStamp();
std::wstring Sanitize(const std::wstring&);
std::wstring IniRead(const wchar_t* key, const wchar_t* fallback=L"");
void IniWrite(const wchar_t* key, const std::wstring& value);
Inspection Inspect();
std::vector<Program> Programs();
bool IsAdmin();
void Log(const std::wstring& text);
std::wstring ReadLog();
bool SaveReport(const std::wstring& center, const std::wstring& station);
TaskResult TempFiles(bool preview, bool includeWindowsTemp,const std::atomic_bool* cancel=nullptr);
bool ChangeService(const wchar_t* name, bool disable, std::wstring& message);
bool ChangeCeip(bool restore, std::wstring& message);
bool RestoreServices(std::wstring& message);
bool ValidInstallerFolder(const std::wstring& folder, const Inspection& inspection, std::wstring& reason);
std::wstring ChooseFolder(HWND parent);
std::wstring ChooseMsi(HWND parent);
bool OpenInstaller(const std::wstring& folder, HWND parent);
bool InstallLibreOffice(const std::wstring& msi, HWND parent, std::wstring& error,HANDLE* process=nullptr,bool approved=false);
bool UninstallProgram(const Program& program, HWND parent, std::wstring& error,HANDLE* process=nullptr);
bool IsThirdPartyAntivirus(const Program& program);
bool ParseUninstallCommand(const std::wstring& command,std::wstring& executable,std::wstring& arguments);
bool Elevate(HWND parent,const wchar_t* arguments=nullptr);
void LaunchUrl(const wchar_t* url);
}
