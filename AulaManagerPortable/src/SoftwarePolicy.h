#pragma once
#include "Core.h"
#include <algorithm>
#include <cwctype>

namespace aula {
enum class SoftwareAction { KeepLibreOffice, KeepWindows, KeepDriver, KeepRuntime, KeepException, Remove };
struct SoftwareDecision { SoftwareAction action; std::wstring reason; };

inline std::wstring Fold(std::wstring value) {
    std::transform(value.begin(), value.end(), value.begin(), [](wchar_t c) { return (wchar_t)towlower(c); });
    return value;
}
inline bool ContainsAny(const std::wstring& value, std::initializer_list<const wchar_t*> choices) {
    for (auto word : choices) if (value.find(word) != std::wstring::npos) return true;
    return false;
}
inline bool IsLibreOffice(const Program& program) {
    return Fold(program.name).find(L"libreoffice") == 0;
}
inline SoftwareDecision ClassroomSoftwarePolicy(const Program& program, const Inspection& system,
                                                const std::vector<std::wstring>& exceptions = {}) {
    const auto name = Fold(program.name), publisher = Fold(program.publisher);
    if (IsLibreOffice(program)) return {SoftwareAction::KeepLibreOffice, L"LibreOffice: aplicación del aula"};
    for (const auto& exception : exceptions)
        if (name == Fold(exception)) return {SoftwareAction::KeepException, L"Excepción guardada para el aula"};
    if (program.systemComponent) return {SoftwareAction::KeepWindows, L"Componente del sistema identificado por Windows"};

    const bool microsoft = publisher.find(L"microsoft") != std::wstring::npos;
    if (microsoft && ContainsAny(name, {L"visual c++", L".net framework", L".net runtime", L"windows desktop runtime",
                                      L"directx", L"webview2 runtime", L"microsoft .net"}))
        return {SoftwareAction::KeepRuntime, L"Biblioteca compartida necesaria para Windows o LibreOffice"};
    if (microsoft && (ContainsAny(name, {L"security update for", L"actualización de seguridad para", L"update for windows",
                                        L"actualización para windows", L"windows defender", L"microsoft defender", L"security essentials",
                                        L"internet explorer", L"windows media player", L"windows service pack", L"microsoft edge update"}) ||
                      (system.osMajor >= 10 && (name == L"microsoft edge" || name == L"microsoft onedrive"))))
        return {SoftwareAction::KeepWindows, L"Componente o aplicación incluida en Windows"};

    // Driver packages remain part of the operating system. Removing them can
    // disable the network, keyboard, graphics, or storage used by this workflow.
    if (!program.antivirus &&
        (ContainsAny(name, {L"windows driver package", L"driver package", L"controlador de", L"device driver", L"graphics driver",
                            L"display driver", L"audio driver", L"network driver", L"printer driver", L"chipset driver",
                            L"chipset device software", L"management engine components", L"synaptics pointing device driver"}) ||
         ((publisher.find(L"realtek") != std::wstring::npos || publisher.find(L"intel") != std::wstring::npos ||
           publisher.find(L"nvidia") != std::wstring::npos || publisher.find(L"advanced micro devices") != std::wstring::npos) &&
          (ContainsAny(name, {L" driver", L"controlador", L"chipset", L"intel(r) wireless bluetooth"}) || name == L"amd software"))))
        return {SoftwareAction::KeepDriver, L"Controlador necesario para el hardware"};
    return {SoftwareAction::Remove, program.antivirus ? L"Antivirus externo" : L"Aplicación externa: no pertenece al perfil del aula"};
}

inline std::vector<unsigned> VersionNumbers(const std::wstring& value) {
    std::vector<unsigned> numbers; unsigned current=0; bool inNumber=false;
    for (wchar_t c : value) {
        if (c >= L'0' && c <= L'9') { current = (std::min)(1000000u, current*10+(unsigned)(c-L'0')); inNumber=true; }
        else if (inNumber) { numbers.push_back(current); current=0; inNumber=false; if (c != L'.') break; }
    }
    if (inNumber) numbers.push_back(current);
    return numbers;
}
inline int CompareVersion(const std::wstring& left, const std::wstring& right) {
    auto a=VersionNumbers(left), b=VersionNumbers(right); a.resize(4); b.resize(4);
    return a < b ? -1 : (b < a ? 1 : 0);
}
}
