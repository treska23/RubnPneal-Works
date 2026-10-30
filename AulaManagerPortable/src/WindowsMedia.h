#pragma once
#include "Core.h"
#include <functional>
namespace aula {
std::wstring BundledWindowsIso(const Inspection& system);
std::wstring ChooseWindowsIso(HWND parent);
bool WindowsMediaRequirements(const Inspection& system,std::wstring& error);
bool PrepareWindowsIso(const std::wstring& source,const Inspection& system,std::wstring& folder,
                       const std::atomic_bool* cancel,const std::function<void(const std::wstring&)>& progress,
                       std::wstring& error,const std::wstring& cacheRoot=L"");
bool WindowsSetupArchitecture(const std::wstring& setup,const Inspection& system,std::wstring& error);
}
