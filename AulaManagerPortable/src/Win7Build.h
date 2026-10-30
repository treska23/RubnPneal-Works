#pragma once
#if defined(_MSC_VER) && _MSC_VER >= 1950
#error La entrega Windows 7 requiere MSVC 2022/v143. MSVC 2026/v145 introduce dependencias que Windows 7 no tiene.
#endif
#if defined(_WIN64) || defined(_M_CEE)
#error La entrega portable debe ser nativa x86, sin CLR ni .NET.
#endif
