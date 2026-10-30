#include "Automation.h"
#include <bcrypt.h>
#include <winhttp.h>
#include <msi.h>
#include <msiquery.h>
#include <sstream>
#include <regex>
#include <iterator>
#include <shlobj.h>
#pragma comment(lib,"bcrypt.lib")
#pragma comment(lib,"winhttp.lib")

namespace aula {
std::wstring PackageProperty(MSIHANDLE database,const wchar_t* property);
namespace {
struct Package {std::wstring filename,url,sha256;};
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
    if(!WinHttpCrackUrl(package.url.c_str(),0,0,&url))return false;
    std::wstring host(url.lpszHostName,url.dwHostNameLength),requestPath(url.lpszUrlPath,url.dwUrlPathLength);
    InternetHandle session{WinHttpOpen(L"AulaManager/0.6",WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0)};
    if(!session.handle){error=L"No se pudo iniciar la descarga";return false;}
    WinHttpSetTimeouts(session.handle,15000,15000,30000,30000);
    DWORD tls=WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2;
    WinHttpSetOption(session.handle,WINHTTP_OPTION_SECURE_PROTOCOLS,&tls,sizeof(tls));
    InternetHandle connection{WinHttpConnect(session.handle,host.c_str(),url.nPort,0)};
    if(!connection.handle){error=L"No se pudo conectar con el archivo oficial";return false;}
    InternetHandle request{WinHttpOpenRequest(connection.handle,L"GET",requestPath.c_str(),nullptr,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE)};
    if(!request.handle||!WinHttpSendRequest(request.handle,WINHTTP_NO_ADDITIONAL_HEADERS,0,WINHTTP_NO_REQUEST_DATA,0,0,0)||!WinHttpReceiveResponse(request.handle,nullptr)) {
        error=L"No se pudo descargar LibreOffice de su web oficial (error Windows "+std::to_wstring(GetLastError())+L"). Comprueba conexion, fecha y certificados de Windows";return false;
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
bool ReadOfficialText(const std::wstring& address,std::string& text,std::wstring& error) {
    URL_COMPONENTS url={sizeof(url)};url.dwHostNameLength=(DWORD)-1;url.dwUrlPathLength=(DWORD)-1;
    if(!WinHttpCrackUrl(address.c_str(),0,0,&url))return false;
    std::wstring host(url.lpszHostName,url.dwHostNameLength),path(url.lpszUrlPath,url.dwUrlPathLength);
    InternetHandle session{WinHttpOpen(L"AulaManager/0.6",WINHTTP_ACCESS_TYPE_DEFAULT_PROXY,WINHTTP_NO_PROXY_NAME,WINHTTP_NO_PROXY_BYPASS,0)};
    if(!session.handle){error=L"No se pudo conectar con la web oficial";return false;}
    WinHttpSetTimeouts(session.handle,15000,15000,30000,30000);DWORD tls=WINHTTP_FLAG_SECURE_PROTOCOL_TLS1_2;
    WinHttpSetOption(session.handle,WINHTTP_OPTION_SECURE_PROTOCOLS,&tls,sizeof(tls));
    InternetHandle connection{WinHttpConnect(session.handle,host.c_str(),url.nPort,0)};
    InternetHandle request{connection.handle?WinHttpOpenRequest(connection.handle,L"GET",path.c_str(),nullptr,WINHTTP_NO_REFERER,WINHTTP_DEFAULT_ACCEPT_TYPES,WINHTTP_FLAG_SECURE):nullptr};
    if(!request.handle||!WinHttpSendRequest(request.handle,WINHTTP_NO_ADDITIONAL_HEADERS,0,WINHTTP_NO_REQUEST_DATA,0,0,0)||!WinHttpReceiveResponse(request.handle,nullptr)){
        error=L"No se pudo consultar LibreOffice en su web oficial (error "+std::to_wstring(GetLastError())+L")";return false;
    }
    DWORD status=0,size=sizeof(status);WinHttpQueryHeaders(request.handle,WINHTTP_QUERY_STATUS_CODE|WINHTTP_QUERY_FLAG_NUMBER,nullptr,&status,&size,nullptr);
    if(status!=200){error=L"La web oficial devolvio HTTP "+std::to_wstring(status);return false;}
    char buffer[16384];text.clear();
    for(;;){DWORD read=0;if(!WinHttpReadData(request.handle,buffer,sizeof(buffer),&read)){error=L"Se interrumpio la consulta de versiones";return false;}
        if(!read)break;text.append(buffer,read);if(text.size()>4*1024*1024){error=L"El catalogo oficial tiene un formato inesperado";return false;}}
    return true;
}
std::wstring LatestStableOffice(const std::string& catalog) {
    std::wstring latest;
    const std::regex link(R"CATALOG(href="([0-9]+\.[0-9]+\.[0-9]+)/")CATALOG");
    for(auto it=std::sregex_iterator(catalog.begin(),catalog.end(),link);it!=std::sregex_iterator();++it){
        std::string value=(*it)[1];std::wstring candidate(value.begin(),value.end());
        if(latest.empty()||CompareVersion(candidate,latest)>0)latest=candidate;
    }
    return latest;
}
bool PrepareLibreOffice(const Inspection& system,OfficePreparation& output,const std::atomic_bool* cancel,
                       const std::function<void(const std::wstring&)>& progress,std::wstring& error,const std::wstring& packageFolder) {
    output.x64=system.libreofficeVersion.empty()?system.architecture==L"64 bits":system.libreofficeX64;
    Package package=output.x64?x64:x86;output.version=L"25.2.7.2";
    if(system.windows7&&system.servicePackMajor<1){error=L"LibreOffice requiere Windows 7 Service Pack 1";return false;}
    if(progress)progress(L"Consultando la version compatible en la web oficial de LibreOffice");
    if(!system.windows7){
        std::string catalog;if(!ReadOfficialText(L"https://download.documentfoundation.org/libreoffice/stable/",catalog,error))return false;
        output.version=LatestStableOffice(catalog);
        if(output.version.empty()){error=L"No se pudo identificar la version estable oficial; no se instala una version antigua a ciegas";return false;}
        package.filename=L"LibreOffice_"+output.version+(output.x64?L"_Win_x86-64.msi":L"_Win_x86.msi");
        package.url=L"https://download.documentfoundation.org/libreoffice/stable/"+output.version+L"/win/"+(output.x64?L"x86_64/":L"x86/")+package.filename;
        std::string checksum;if(!ReadOfficialText(package.url+L".sha256",checksum,error))return false;
        std::smatch match;if(!std::regex_search(checksum,match,std::regex("^[a-fA-F0-9]{64}"))){error=L"La web oficial no devuelve un SHA256 valido";return false;}
        std::string hash=match[0];package.sha256=Fold(std::wstring(hash.begin(),hash.end()));
    }
    if(!system.libreofficeVersion.empty()&&CompareVersion(system.libreofficeVersion,output.version)>=0){
        if(system.windows7&&CompareVersion(system.libreofficeVersion,L"25.8")>=0){error=L"La version registrada de LibreOffice no es compatible con Windows 7";return false;}
        output.installNeeded=false;return true;
    }
    if(cancel&&cancel->load()){error=L"Consulta cancelada";return false;}
    if(system.freeGb<2){error=L"No hay espacio suficiente para instalar LibreOffice";return false;}
    auto folder=packageFolder;
    if(folder.empty()){
        wchar_t local[MAX_PATH]={};if(FAILED(SHGetFolderPathW(nullptr,CSIDL_LOCAL_APPDATA,nullptr,SHGFP_TYPE_CURRENT,local))){error=L"No se pudo localizar la carpeta de descargas local";return false;}
        folder=std::wstring(local)+L"\\AulaManager\\Descargas";
    }
    int made=SHCreateDirectoryExW(nullptr,folder.c_str(),nullptr);
    if(made!=ERROR_SUCCESS&&made!=ERROR_ALREADY_EXISTS&&made!=ERROR_FILE_EXISTS){error=L"No se puede crear la carpeta de descargas local";return false;}
    output.path=folder+L"\\"+package.filename;
    if(progress)progress(L"Descargando LibreOffice "+output.version+L" desde su web oficial");
    if(FileSha256(output.path)!=package.sha256&&!Download(package,output.path,cancel,progress,error))return false;
    output.expectedHash=package.sha256;
    if(!ValidateLibreOfficePackage(output.path,system,error,output.expectedHash))return false;
    MSIHANDLE database=0;
    if(MsiOpenDatabaseW(output.path.c_str(),MSIDBOPEN_READONLY,&database)!=ERROR_SUCCESS){error=L"No se pudo leer el paquete MSI";return false;}
    output.productCode=PackageProperty(database,L"ProductCode");output.version=PackageProperty(database,L"ProductVersion");MsiCloseHandle(database);
    if(output.productCode.empty()){error=L"El MSI no incluye un identificador de producto valido";return false;}
    output.installNeeded=true;return true;
}
}
