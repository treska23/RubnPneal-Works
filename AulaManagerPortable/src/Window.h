#pragma once
#include <fstream>
namespace {
void SaveReviewImage(int width,int height,int page){
 // Export the application's own client renderer with deterministic test data.
 RECT r={};GetClientRect(mainWindow,&r);int w=r.right,h=r.bottom;
 HDC screen=GetDC(mainWindow),dc=CreateCompatibleDC(screen);HBITMAP bitmap=CreateCompatibleBitmap(screen,w,h);
 HGDIOBJ old=SelectObject(dc,bitmap);PaintSurface(mainWindow,dc);
 auto renderControl=[&](HWND control,int originX,int originY,HWND parent){
  RECT bounds={};GetWindowRect(control,&bounds);MapWindowPoints(nullptr,parent,(POINT*)&bounds,2);
  int saved=SaveDC(dc);SetViewportOrgEx(dc,originX+bounds.left,originY+bounds.top,nullptr);
  IntersectClipRect(dc,0,0,bounds.right-bounds.left,bounds.bottom-bounds.top);
  SendMessageW(control,WM_PRINTCLIENT,(WPARAM)dc,PRF_CLIENT|PRF_ERASEBKGND);RestoreDC(dc,saved);
 };
 for(HWND nav:navButtons)renderControl(nav,0,0,mainWindow);
 RECT view={};GetWindowRect(viewWindow,&view);MapWindowPoints(nullptr,mainWindow,(POINT*)&view,2);
 RECT client={};GetClientRect(viewWindow,&client);
 int saved=SaveDC(dc);SetViewportOrgEx(dc,view.left,view.top,nullptr);IntersectClipRect(dc,0,0,client.right,client.bottom);
 PaintSurface(viewWindow,dc);RestoreDC(dc,saved);
 for(HWND child:children){
  if(!(GetWindowLongW(child,GWL_STYLE)&WS_VISIBLE))continue;
  saved=SaveDC(dc);IntersectClipRect(dc,view.left,view.top,view.left+client.right,view.top+client.bottom);
  renderControl(child,view.left,view.top,viewWindow);RestoreDC(dc,saved);
 }
 {
  Gdiplus::Bitmap image(bitmap,nullptr);CLSID png={0x557cf406,0x1a04,0x11d3,{0x9a,0x73,0x00,0x00,0xf8,0x1e,0xf3,0x2e}};
  std::wstring name=aula::ExeFolder()+L"\\review-"+std::to_wstring(width)+L"x"+std::to_wstring(height)+L"-page"+std::to_wstring(page)+L".png";
  image.Save(name.c_str(),&png,nullptr);
 }
 SelectObject(dc,old);DeleteObject(bitmap);DeleteDC(dc);ReleaseDC(mainWindow,screen);
}
// Exercises the production layout and real GDI text measurements, with long
// inventory/path fixtures. No maintenance, installer, or service action is run.
int VerifyLayout(){
 std::ofstream out(aula::ExeFolder()+L"\\layout-tests.txt");int failures=0,cases=0;
 const int scales[]={96,120,144,192};
 const int sizes[][2]={{640,480},{800,600},{1024,768},{1280,800},{1366,768},{1600,900},{1920,1080}};
 for(int scale:scales){dpi=scale;MakeFonts();
  for(auto& size:sizes){
   SetWindowPos(mainWindow,nullptr,0,0,size[0],size[1],SWP_NOZORDER|SWP_NOACTIVATE);
   for(int page=0;page<7;++page){
    Navigate(page);
    if(page==0){labels[L"value1"].text=L"Microsoft Windows 7 Professional Service Pack 1 — una descripción larga del sistema operativo";
     labels[L"value3"].text=L"Intel(R) Core(TM) i5-123456 CPU con un nombre especialmente largo para verificar el ajuste";}
    if(page==3)labels[L"filename"].text=std::wstring(220,L'A')+L"\\Carpeta con tildes\\LibreOffice_7.4.7_Win_x86.msi";
    if(page==4)labels[L"folder"].text=std::wstring(220,L'B')+L"\\Windows 10 22H2\\sources";
    AlignPage();++cases;RECT view={};GetClientRect(viewWindow,&view);int width=Dip(view.right);
    auto fail=[&](const std::string& why){++failures;out<<"FAIL "<<size[0]<<'x'<<size[1]<<" dpi="<<scale<<" page="<<page<<' '<<why<<'\n';};
    RECT windowBounds={};GetClientRect(mainWindow,&windowBounds);
    for(HWND nav:navButtons){RECT nr={};GetWindowRect(nav,&nr);MapWindowPoints(nullptr,mainWindow,(POINT*)&nr,2);
     if(nr.top<0||nr.bottom>windowBounds.bottom||nr.right>Px(sidebar))fail("navigation out of bounds");
     if(!compactNav&&TextHeight(TextOf(nav),Dip(nr.right-nr.left)-67,fontNormal)>Dip(nr.bottom-nr.top))fail("clipped navigation");}
    if(positions.size()<4)fail("missing content");
    for(const auto& entry:positions){const auto& r=entry.second;
     if(r.w<=0||r.h<=0||r.x<0||r.y<0||r.x+r.w>width+1||r.y+r.h>contentHeight)fail("out of bounds");
     auto l=labels.find(entry.first);
     if(l!=labels.end()&&TextHeight(l->second.text,r.w,l->second.font)>r.h)fail("clipped text");
     HWND control=Find(entry.first.c_str());wchar_t cls[32]={};GetClassNameW(control,cls,32);
     if(wcscmp(cls,L"BUTTON")==0){int pad=GetDlgCtrlID(control)>=217?67:32;
      if(TextHeight(TextOf(control),r.w-pad,fontNormal)>r.h)fail("clipped button");}
    }
    for(auto a=positions.begin();a!=positions.end();++a){auto b=a;++b;
     for(;b!=positions.end();++b){auto r=a->second,s=b->second;
      if(r.x<s.x+s.w&&r.x+r.w>s.x&&r.y<s.y+s.h&&r.y+r.h>s.y)fail("overlapping elements");}
    }
    if(scale==96&&(size[0]==1280||(page==0&&(size[0]==640||size[0]==1024||size[0]==1920)))){
     // The long fixtures above are deliberately included in the review images.
     SaveReviewImage(size[0],size[1],page);
    }
    // At the end of the scrollbar, the final content remains reachable.
    scrollY=(std::max)(0,contentHeight-viewportHeight);AlignPage();
    if(contentHeight-scrollY>viewportHeight+1&&contentHeight>viewportHeight)fail("unreachable bottom");
   }
  }
 }
 // Exercise the real background-job controller against an empty, isolated TEMP.
 // No file removal, registry change, or installer is called by these checks.
 wchar_t previousTemp[32768]={};DWORD previousLength=GetEnvironmentVariableW(L"TEMP",previousTemp,32768);
 std::wstring fixture=aula::ExeFolder()+L"\\PreviewFixture-"+std::to_wstring(GetCurrentProcessId());
 bool fixtureReady=CreateDirectoryW(fixture.c_str(),nullptr)!=FALSE;
 if(!fixtureReady){++failures;out<<"FAIL could not create async preview fixture\n";}
 else{
  SetEnvironmentVariableW(L"TEMP",fixture.c_str());dpi=96;MakeFonts();
  for(bool cancelled:{false,true}){
   Navigate(1);DWORD started=GetTickCount();StartPreview();
   if(GetTickCount()-started>1000){++failures;out<<"FAIL preview blocks the UI on startup\n";}
   if(cancelled)CancelJob();
   while(jobRunning&&GetTickCount()-started<5000){
    MsgWaitForMultipleObjects(0,nullptr,FALSE,25,QS_ALLINPUT);MSG message;
    while(PeekMessageW(&message,nullptr,0,0,PM_REMOVE)){TranslateMessage(&message);DispatchMessageW(&message);}
   }
   if(jobRunning){++failures;CancelJob();JoinJob();jobRunning=false;out<<"FAIL background preview did not finish\n";}
   else if(JobText().find(L"No se ha borrado ningún archivo") == std::wstring::npos){++failures;out<<"FAIL missing preview result\n";}
   else if(cancelled&&JobStatus().find(L"Proceso cancelado")!=0){++failures;out<<"FAIL cancellation result is stale\n";}
   else out<<(cancelled?"PASS asynchronous preview cancellation\n":"PASS asynchronous preview completion\n");
  }
  SetEnvironmentVariableW(L"TEMP",previousLength?previousTemp:nullptr);RemoveDirectoryW(fixture.c_str());
 }
 out<<"Cases: "<<cases<<"\nFailures: "<<failures<<"\n";return failures?1:0;
}
LRESULT CALLBACK Proc(HWND hwnd,UINT msg,WPARAM wp,LPARAM lp){
 switch(msg){
 case WM_CREATE:{
  mainWindow=hwnd;HDC dc=GetDC(hwnd);dpi=GetDeviceCaps(dc,LOGPIXELSY);ReleaseDC(hwnd,dc);
  selectedMsi=aula::IniRead(L"LibreOfficeMSI");
  using DpiFn=UINT(WINAPI*)(HWND);auto getDpi=(DpiFn)GetProcAddress(GetModuleHandleW(L"user32.dll"),"GetDpiForWindow");if(getDpi)dpi=(int)getDpi(hwnd);
  whiteEdit=CreateSolidBrush(RGB(255,255,255));heroBrush=CreateSolidBrush(RGB(226,243,254));fieldBrush=CreateSolidBrush(RGB(248,252,255));MakeFonts();
  viewWindow=CreateWindowExW(WS_EX_CONTROLPARENT,L"AulaManagerViewport",L"Contenido",WS_CHILD|WS_VISIBLE|WS_VSCROLL|WS_CLIPCHILDREN,0,0,100,100,hwnd,nullptr,GetModuleHandleW(nullptr),nullptr);
  tooltips=CreateWindowExW(WS_EX_TOPMOST,TOOLTIPS_CLASSW,nullptr,WS_POPUP|TTS_ALWAYSTIP,CW_USEDEFAULT,CW_USEDEFAULT,CW_USEDEFAULT,CW_USEDEFAULT,hwnd,nullptr,GetModuleHandleW(nullptr),nullptr);
  const wchar_t* nav[]={L"Resumen",L"Mantenimiento",L"Programas y antivirus",L"LibreOffice",L"Migración Windows",L"Informes"};
  for(int i=0;i<6;++i){navButtons[i]=CreateWindowW(L"BUTTON",nav[i],WS_CHILD|WS_VISIBLE|BS_OWNERDRAW|WS_TABSTOP,0,0,1,1,hwnd,(HMENU)(INT_PTR)(NAV_BASE+i),GetModuleHandleW(nullptr),nullptr);
   Font(navButtons[i],fontNormal);SetWindowSubclass(navButtons[i],ControlProc,1,0);
   TOOLINFOW info={sizeof(info)};info.uFlags=TTF_IDISHWND|TTF_SUBCLASS;info.hwnd=hwnd;info.uId=(UINT_PTR)navButtons[i];info.lpszText=const_cast<wchar_t*>(nav[i]);SendMessageW(tooltips,TTM_ADDTOOLW,0,(LPARAM)&info);
  }
  layoutReady=true;Navigate(0);
  if(!layoutTesting)aula::Log(L"Aula Manager v0.4: interfaz con ajuste de texto, desplazamiento y escalado DPI iniciada.");return 0;
 }
 case WM_COMMAND:{
  int id=LOWORD(wp),notification=HIWORD(wp);
  if(notification==BN_CLICKED){
   if((HWND)lp==checkTemp){if(!Checked(checkTemp))SendMessageW(checkSysTemp,BM_SETCHECK,BST_UNCHECKED,0);EnableWindow(checkSysTemp,Checked(checkTemp));return 0;}
   if(id>=NAV_BASE&&id<NAV_BASE+6){Action(id);return 0;}
   if(id>=PREVIEW&&id<=CANCEL_JOB){Action(id);return 0;}
  }return 0;
 }
 case WM_SIZE:if(layoutReady&&wp!=SIZE_MINIMIZED)AlignPage();return 0;
 case WM_TIMER:if(wp==1)RefreshJob();return 0;
 case JOB_FINISHED:FinishJob();return 0;
 case AUTO_FULL_RUN:StartFullMaintenance();return 0;
 case WM_CLOSE:
  if(jobRunning){if(Confirm(L"¿Cancelar el trabajo y cerrar cuando termine la operación actual? Los cambios ya aplicados se conservarán y se intentará guardar el informe.")){closeWhenDone=true;CancelJob();}return 0;}
  DestroyWindow(hwnd);return 0;
 case WM_DPICHANGED:{
  dpi=HIWORD(wp);MakeFonts();const RECT* r=(RECT*)lp;SetWindowPos(hwnd,nullptr,r->left,r->top,r->right-r->left,r->bottom-r->top,SWP_NOZORDER|SWP_NOACTIVATE);AlignPage();return 0;
 }
 case WM_MOUSEWHEEL:return SendMessageW(viewWindow,msg,wp,lp);
 case WM_DRAWITEM:skin::OwnerButton((DRAWITEMSTRUCT*)lp,currentPage,fontNormal,dpi,compactNav);return TRUE;
 case WM_CTLCOLORSTATIC:case WM_CTLCOLOREDIT:case WM_CTLCOLORLISTBOX:case WM_CTLCOLORBTN:return CommonColor(msg,wp,lp);
 case WM_ERASEBKGND:return 1;
 case WM_PRINTCLIENT:PaintSurface(hwnd,(HDC)wp);return 0;
 case WM_PAINT:{PAINTSTRUCT ps;HDC dc=BeginPaint(hwnd,&ps);PaintSurface(hwnd,dc);EndPaint(hwnd,&ps);return 0;}
 case WM_GETMINMAXINFO:{
  auto p=(MINMAXINFO*)lp;MONITORINFO monitor={sizeof(monitor)};GetMonitorInfoW(MonitorFromWindow(hwnd,MONITOR_DEFAULTTONEAREST),&monitor);
  p->ptMinTrackSize.x=(std::min)(Px(580),(int)(monitor.rcWork.right-monitor.rcWork.left));
  p->ptMinTrackSize.y=(std::min)(Px(460),(int)(monitor.rcWork.bottom-monitor.rcWork.top));return 0;
 }
 case WM_DESTROY:
  JoinJob();
  for(HFONT f:{fontNormal,fontTitle,fontSmall,fontMeta,fontBrand,fontSection})if(f)DeleteObject(f);
  if(whiteEdit)DeleteObject(whiteEdit);if(heroBrush)DeleteObject(heroBrush);if(fieldBrush)DeleteObject(fieldBrush);PostQuitMessage(0);return 0;
 }
 return DefWindowProcW(hwnd,msg,wp,lp);
}
}
int WINAPI wWinMain(HINSTANCE instance,HINSTANCE,LPWSTR command,int show){
 layoutTesting=wcsstr(command,L"--self-test")!=nullptr;
 HMODULE user=GetModuleHandleW(L"user32.dll");using DpiContext=BOOL(WINAPI*)(HANDLE);
 auto setDpi=(DpiContext)GetProcAddress(user,"SetProcessDpiAwarenessContext");
 if(!setDpi||!setDpi((HANDLE)-4))SetProcessDPIAware();
 Gdiplus::GdiplusStartupInput input;Gdiplus::GdiplusStartup(&gdipToken,&input,nullptr);
 INITCOMMONCONTROLSEX controls={sizeof(controls),ICC_STANDARD_CLASSES|ICC_WIN95_CLASSES};InitCommonControlsEx(&controls);
 WNDCLASSEXW wc={sizeof(wc)};wc.hInstance=instance;wc.lpfnWndProc=ViewProc;wc.lpszClassName=L"AulaManagerViewport";wc.hCursor=LoadCursorW(nullptr,IDC_ARROW);RegisterClassExW(&wc);
 wc.lpfnWndProc=Proc;wc.lpszClassName=L"AulaManagerPortableWindow";wc.hIcon=LoadIconW(instance,MAKEINTRESOURCEW(101));wc.hIconSm=wc.hIcon;RegisterClassExW(&wc);
 RECT work={};SystemParametersInfoW(SPI_GETWORKAREA,0,&work,0);
 HDC dc=GetDC(nullptr);dpi=GetDeviceCaps(dc,LOGPIXELSY);ReleaseDC(nullptr,dc);
 int w=(std::min)(Px(1320),(int)(work.right-work.left)),h=(std::min)(Px(880),(int)(work.bottom-work.top));
 HWND hwnd=CreateWindowExW(WS_EX_CONTROLPARENT,wc.lpszClassName,L"Aula Manager Portable · Mantenimiento de aulas",WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,
 work.left+(work.right-work.left-w)/2,work.top+(work.bottom-work.top-h)/2,w,h,nullptr,nullptr,instance,nullptr);
 if(!hwnd)return 2;
 if(layoutTesting){int result=VerifyLayout();DestroyWindow(hwnd);Gdiplus::GdiplusShutdown(gdipToken);return result;}
 ShowWindow(hwnd,show);UpdateWindow(hwnd);
 if(wcsstr(command,L"--full-maintenance"))PostMessageW(hwnd,AUTO_FULL_RUN,0,0);
 MSG msg;
 while(GetMessageW(&msg,nullptr,0,0)>0){if(!IsDialogMessageW(hwnd,&msg)){TranslateMessage(&msg);DispatchMessageW(&msg);}}
 Gdiplus::GdiplusShutdown(gdipToken);return (int)msg.wParam;
}
