#include "Automation.h"
#include <bcrypt.h>
#include <winhttp.h>
#include <msi.h>
#include <msiquery.h>
#include <sstream>
#pragma comment(lib,"bcrypt.lib")
#pragma comment(lib,"winhttp.lib")

namespace aula {
std::wstring PackageProperty(MSIHANDLE database,const wchar_t* property);
namespace {
struct Package {const wchar_t* filename;const wchar_t* url;const wchar_t* sha256;};
const Package x86={L"LibreOffice_25.2.7.2_Win_x86.msi",
 L"https://downloadarchive.documentfoundation.org/libreoffice/old/25.2.7.2/win/x86/LibreOffice_25.2.7.2_Win_x86.msi",
 L"80339487132640e665a43924dfad16591b3bb150c585cb00d774f6d757b3d04c"};
const Package x64={L"LibreOffice_25.2.7.2_Win_x86-64.msi",
 L"https://downloadarchive.documentfoundation.org/libreoffice/old/25.2.7.2/win/x86_64/LibreOffice_25.2.7.2_Win_x86-64.msi",
 L"9fdd22f8ea7a92a67de5beaa08588ef6da58c1930ac86fd57c46b0c6d7ca9d34"};
struct InternetHandle {HINTERNET handle=nullptr;~InternetHandle(){if(handle)WinHttpCloseHandle(handle);}};
bool Download(const Package& package,const std::wstring& destination,const std::atomic_bool* cancel,
              const std::function<void(const std::wstring&)>& progress,std::wstring& error) {
    URL_COMPONENTS url={sizeof(url)};url.dwHostNameLength=(DWORD)-1;url.dwUrlPathLength=(DWORD)-1;
    if(!WinHttpCrackUrl(package.url,0,0,&url))return false;
    std::wstring host(url.lpszHostName,url.dwHostNameLength),requestPath(url.lpszUrlPath,url.dwUrlPathLength);
    InternetHandle session{WinHttpOpen(L"AulaManager/0.5",WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0)};
    if(!session.handle){error=L"No se pudo iniciar la descarga";return false;}
    WinHttpSetTimeouts(session.handle,15000,15000,30000,30000);
    DWORD tls=WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2;
    WinHttpSetOption(session.handle,WINHTTP_OPTION_SECURE_PROTOCOLS,&tls,sizeof(tls));
    InternetHandle connection{WinHttpConnect(session.handle,host.c_str(),url.nPort,0)};
    if(!connection.handle){error=L"No se pudo conectar con el archivo oficial";return false;}
    InternetHandle request{WinHttpOpenRequest(connection.handle,L"GET",requestPath.c_str(),nullptr,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE)};
    if(!request.handle||!WinHttpSendRequest(request.handle,WINHTTP_NO_ADDITIONAL_HEADERS,0,WINHTTP_NO_REQUEST_DATA,0,0,0)||!WinHttpReceiveResponse(request.handle,nullptr)) {
        error=L"No se pudo descargar LibreOffice (error Windows "+std::to_wstring(GetLastError())+L"). Usa el paquete completo, con Instaladores incluida";return false;
    }
    DWORD status=0,size=sizeof(status);WinHttpQueryHeaders(request.handle,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,WINHTTP_HEADER_NAME_BY_INDEX,&status,&size,WINHTTP_NO_HEADER_INDEX);
    if(status!=200){error=L"La descarga oficial devolvió HTTP "+std::to_wstring(status);return false;}
    const auto partial=destination+L".part";
    HANDLE file=CreateFileW(partial.c_str(),GENERIC_WRITE,FILE_SHARE_READ,nullptr,CREATE_ALWAYS,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(file==INVALID_HANDLE_VALUE){error=L"No se puede escribir en la carpeta Instaladores";return false;}
    std::vector<BYTE> buffer(65536);ULONGLONG total=0,lastNotice=0;bool ok=true;
    for(;;){
        if(cancel&&cancel->load()){ok=false;error=L"Descarga cancelada";break;}
        DWORD read=0,written=0;
        if(!WinHttpReadData(request.handle,buffer.data(),(DWORD)buffer.size(),&read)){ok=false;error=L"La conexión se ha interrumpido";break;}
        if(!read)break;
        if(!WriteFile(file,buffer.data(),read,&written,nullptr)||written!=read){ok=false;error=L"No queda espacio o no se puede escribir el instalador";break;}
        total+=read;
        if(total-lastNotice>=8*1024*1024){lastNotice=total;if(progress)progress(L"Descargando LibreOffice: "+std::to_wstring(total/1024/1024)+L" MB");}
    }
    CloseHandle(file);
    if(!ok){DeleteFileW(partial.c_str());return false;}
    if(FileSha256(partial)!=package.sha256){DeleteFileW(partial.c_str());error=L"El instalador descargado no coincide con SHA256 oficial";return false;}
    if(!MoveFileExW(partial.c_str(),destination.c_str(),MOVEFILE_REPLACE_EXISTING)){error=L"No se pudo guardar el instalador verificado";return false;}
    return true;
}
}
std::wstring FileSha256(const std::wstring& path) {
    BCRYPT_ALG_HANDLE algorithm=nullptr;BCRYPT_HASH_HANDLE hash=nullptr;
    if(BCryptOpenAlgorithmProvider(&algorithm,BCRYPT_SHA256_ALGORITHM,nullptr,0)<0)return L"";
    DWORD objectSize=0,written=0;BCryptGetProperty(algorithm,BCRYPT_OBJECT_LENGTH,(PUCHAR)&objectSize,sizeof(objectSize),&written,0);
    std::vector<BYTE> object(objectSize),digest(32),buffer(65536);std::wstring result;
    HANDLE file=CreateFileW(path.c_str(),GENERIC_READ,FILE_SHARE_READ,nullptr,OPEN_EXISTING,FILE_ATTRIBUTE_NORMAL,nullptr);
    if(file!=INVALID_HANDLE_VALUE&&BCryptCreateHash(algorithm,&hash,object.data(),objectSize,nullptr,0,0)>=0){
        bool ok=true;for(;;){DWORD read=0;if(!ReadFile(file,buffer.data(),(DWORD)buffer.size(),&read,nullptr)){ok=false;break;}
            if(!read)break;if(BCryptHashData(hash,buffer.data(),read,0)<0){ok=false;break;}}
        if(ok&&BCryptFinishHash(hash,digest.data(),(ULONG)digest.size(),0)>=0){
            const wchar_t* hex=L"0123456789abcdef";for(BYTE byte:digest){result+=hex[byte>>4];result+=hex[byte&15];}
        }
    }
    if(file!=INVALID_HANDLE_VALUE)CloseHandle(file);if(hash)BCryptDestroyHash(hash);BCryptCloseAlgorithmProvider(algorithm,0);return result;
}
bool PrepareLibreOffice(const Inspection& system,OfficePreparation& output,const std::atomic_bool* cancel,
                       const std::function<void(const std::wstring&)>& progress,std::wstring& error,const std::wstring& packageFolder) {
    output.x64=system.libreofficeVersion.empty()?system.architecture==L"64 bits":system.libreofficeX64;
    output.version=L"25.2.7.2";
    if(!system.libreofficeVersion.empty()&&CompareVersion(system.libreofficeVersion,output.version)>=0){
        if(system.windows7&&CompareVersion(system.libreofficeVersion,L"25.8")>=0){error=L"La versión registrada de LibreOffice no es compatible con Windows 7";return false;}
        output.installNeeded=false;return true;
    }
    if(system.windows7&&system.servicePackMajor<1){error=L"LibreOffice requiere Windows 7 Service Pack 1";return false;}
    if(system.freeGb<2){error=L"No hay espacio suficiente para instalar LibreOffice";return false;}
    const auto& package=output.x64?x64:x86;
    auto folder=packageFolder.empty()?ExeFolder()+L"\\Instaladores":packageFolder;
    CreateDirectoryW(folder.c_str(),nullptr);output.path=folder+L"\\"+package.filename;
    if(progress)progress(L"Verificando el instalador de LibreOffice "+std::wstring(output.x64?L"de 64 bits":L"de 32 bits"));
    if(FileSha256(output.path)!=package.sha256){
        if(progress)progress(L"Obteniendo el instalador oficial de LibreOffice");
        if(!Download(package,output.path,cancel,progress,error))return false;
    }
    output.expectedHash=package.sha256;
    if(!ValidateLibreOfficePackage(output.path,system,error,output.expectedHash))return false;
    MSIHANDLE database=0;
    if(MsiOpenDatabaseW(output.path.c_str(),MSIDBOPEN_READONLY,&database)!=ERROR_SUCCESS){error=L"No se pudo leer el paquete MSI";return false;}
    output.productCode=PackageProperty(database,L"ProductCode");output.version=PackageProperty(database,L"ProductVersion");MsiCloseHandle(database);
    if(output.productCode.empty()){error=L"El MSI no incluye un identificador de producto válido";return false;}
    output.installNeeded=true;return true;
}
}
