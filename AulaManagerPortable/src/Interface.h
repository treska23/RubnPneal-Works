#pragma once
#include "Core.h"
#include "Theme.h"
#include <shellapi.h>
#include <commctrl.h>
#include <map>
#include <vector>
#include <string>
#include <functional>
#pragma comment(lib,"comctl32.lib")
#pragma comment(lib,"user32.lib")
#pragma comment(lib,"gdi32.lib")

namespace {
constexpr int NAV_BASE=100;
constexpr int PREVIEW=200,EXECUTE=201,RESTORE=202,ELEVATE=203,REFRESH=204,
 REMOVE_APP=205,MSI_PICK=206,MSI_INSTALL=207,OPEN_LO=208,FOLDER_PICK=209,SCAN=210,
 MIGRATE=211,REPORT=212,OPEN_REPORTS=213,RESTORE_CEIP=214,SAVE_ID=215,OPEN_WIN=216,
 QUICK_CLEAN=217,QUICK_AV=218,QUICK_LO=219,QUICK_MIG=220,QUICK_REPORT=221,FULL_RUN=222,CANCEL_JOB=223;
HWND mainWindow=nullptr,viewWindow=nullptr,tooltips=nullptr,centerEdit=nullptr,stationEdit=nullptr,logEdit=nullptr;
HWND programList=nullptr,checkTemp=nullptr,checkSysTemp=nullptr,checkCeip=nullptr,checkDiag=nullptr,
 checkServices=nullptr,checkTablet=nullptr,checkRemote=nullptr,checkBackup=nullptr,checkLicense=nullptr;
HWND navButtons[6]={};
HFONT fontNormal=nullptr,fontTitle=nullptr,fontSmall=nullptr,fontMeta=nullptr,fontBrand=nullptr,fontSection=nullptr;
HBRUSH whiteEdit=nullptr,heroBrush=nullptr,fieldBrush=nullptr;
ULONG_PTR gdipToken=0;
int currentPage=0,dpi=96,scrollY=0,contentHeight=0,viewportHeight=0,sidebar=218;
bool layoutReady=false,compactNav=false,layoutTesting=false;
bool jobRunning=false,closeWhenDone=false;
std::wstring selectedMsi,selectedFolder;
std::vector<aula::Program> installed;
std::vector<HWND> children;
std::map<std::wstring,HWND> ui;
std::map<std::wstring,skin::Rect> positions;
struct UiLabel {std::wstring text;HFONT font=nullptr;COLORREF color=RGB(28,57,83);int role=0;};
std::map<std::wstring,UiLabel> labels;
std::vector<skin::Rect> panels;
skin::Rect hero;
void AlignPage();void Navigate(int page);void Action(int id);
void StartPreview();void StartSelectedMaintenance();void StartFullMaintenance();void CancelJob();void RefreshJob();void FinishJob();void JoinJob();
std::wstring JobText();std::wstring JobStatus();
// Deterministic fixtures are used only by --self-test and its review images.
aula::Inspection UiInspection(){
 if(!layoutTesting)return aula::Inspect();aula::Inspection i;i.machine=L"AULA-PC10";
 i.windows=L"Windows 7 Professional · Service Pack 1";i.cpu=L"Intel Core i5 · 3,20 GHz";i.architecture=L"32 bits";
 i.libreoffice=L"LibreOffice 7.4.7";i.ramMb=4096;i.freeGb=86;i.windows7=true;return i;
}
std::vector<aula::Program> UiPrograms(){
 if(!layoutTesting)return aula::Programs();aula::Program a,b;a.name=L"LibreOffice";a.version=L"7.4.7";b.name=L"7-Zip";b.version=L"24.09";return {a,b};
}
int Px(int n){return MulDiv(n,dpi,96);}
int Dip(int n){return MulDiv(n,96,dpi);}
std::wstring TextOf(HWND h){
 if(!h)return L"";int n=GetWindowTextLengthW(h);std::vector<wchar_t> b(n+1);GetWindowTextW(h,b.data(),n+1);return b.data();
}
void Font(HWND h,HFONT f){if(h)SendMessageW(h,WM_SETFONT,(WPARAM)f,TRUE);}
void MakeFonts(){
 HFONT* fonts[]={&fontNormal,&fontTitle,&fontSmall,&fontMeta,&fontBrand,&fontSection};
 const int sizes[]={16,29,14,13,18,19},weights[]={FW_NORMAL,FW_SEMIBOLD,FW_NORMAL,FW_NORMAL,FW_BOLD,FW_SEMIBOLD};
 for(int i=0;i<6;++i){if(*fonts[i])DeleteObject(*fonts[i]);*fonts[i]=CreateFontW(-Px(sizes[i]),0,0,0,weights[i],FALSE,FALSE,FALSE,DEFAULT_CHARSET,
 OUT_DEFAULT_PRECIS,CLIP_DEFAULT_PRECIS,CLEARTYPE_QUALITY,DEFAULT_PITCH|FF_SWISS,i==2?L"Consolas":L"Segoe UI");}
 for(auto h:navButtons)Font(h,fontNormal);
 for(auto h:children)Font(h,h==logEdit?fontSmall:fontNormal);
 for(auto& entry:labels){auto& l=entry.second;l.font=*fonts[l.role];Font(ui[entry.first],l.font);}
}
// Use the same wrapping for measurement and the native STATIC control, including
// paths and identifiers without spaces. Never shrink fonts to make content fit.
std::wstring Wrap(const std::wstring& value,int width,HFONT font){
 if(width<=0)return value;HDC dc=GetDC(mainWindow);HGDIOBJ old=SelectObject(dc,font);
 std::wstring out;size_t start=0;
 while(start<value.size()){
  size_t end=value.find(L'\n',start);if(end==std::wstring::npos)end=value.size();
  size_t cleanEnd=end;if(cleanEnd>start&&value[cleanEnd-1]==L'\r')--cleanEnd;
  while(start<cleanEnd){
   int fit=0;SIZE extent={};int count=(int)(cleanEnd-start);
   GetTextExtentExPointW(dc,value.c_str()+start,count,(std::max)(1,Px(width)-2),&fit,nullptr,&extent);
   fit=(std::max)(1,fit);size_t stop=(std::min)(cleanEnd,start+(size_t)fit);
   if(stop<cleanEnd){size_t space=value.find_last_of(L" \t",stop);if(space!=std::wstring::npos&&space>start)stop=space;}
   if(!out.empty())out+=L"\r\n";out+=value.substr(start,stop-start);start=stop;
   while(start<cleanEnd&&(value[start]==L' '||value[start]==L'\t'))++start;
  }
  start=end<value.size()?end+1:end;
 }
 SelectObject(dc,old);ReleaseDC(mainWindow,dc);return out;
}
int TextHeight(const std::wstring& text,int width,HFONT font){
 HDC dc=GetDC(mainWindow);HGDIOBJ old=SelectObject(dc,font);
 auto wrapped=Wrap(text,width,font);RECT r={0,0,Px(width),0};
 DrawTextW(dc,wrapped.c_str(),-1,&r,DT_CALCRECT|DT_WORDBREAK|DT_NOPREFIX);
 SelectObject(dc,old);ReleaseDC(mainWindow,dc);return (std::max)(18,((int)r.bottom*96+dpi-1)/dpi+3);
}
LRESULT CALLBACK ControlProc(HWND h,UINT msg,WPARAM wp,LPARAM lp,UINT_PTR,DWORD_PTR){
 if(msg==WM_MOUSEMOVE&&!GetPropW(h,L"AulaHover")){SetPropW(h,L"AulaHover",(HANDLE)1);TRACKMOUSEEVENT t={sizeof(t),TME_LEAVE,h,0};TrackMouseEvent(&t);InvalidateRect(h,nullptr,FALSE);}
 if(msg==WM_MOUSELEAVE){RemovePropW(h,L"AulaHover");InvalidateRect(h,nullptr,FALSE);}
 if(msg==WM_SETFOCUS&&GetParent(h)==viewWindow){
  RECT r={};GetWindowRect(h,&r);MapWindowPoints(nullptr,viewWindow,(POINT*)&r,2);
  int top=Dip(r.top),bottom=Dip(r.bottom),next=scrollY;
  if(top<0)next+=top-12;else if(bottom>viewportHeight)next+=bottom-viewportHeight+12;
  if(next!=scrollY){scrollY=skin::Clamp(next,0,(std::max)(0,contentHeight-viewportHeight));AlignPage();}
 }
 if(msg==WM_MOUSEWHEEL&&GetParent(h)==viewWindow){SendMessageW(viewWindow,msg,wp,lp);return 0;}
 if(msg==WM_NCDESTROY)RemoveWindowSubclass(h,ControlProc,1);
 return DefSubclassProc(h,msg,wp,lp);
}
HWND Element(const wchar_t* cls,const std::wstring& text,DWORD style,int x,int y,int w,int h,int id=0,HFONT font=nullptr){
 HWND result=CreateWindowExW(wcscmp(cls,L"EDIT")==0||wcscmp(cls,L"LISTBOX")==0?WS_EX_CLIENTEDGE:0,cls,text.c_str(),WS_CHILD|WS_VISIBLE|style,
 Px(x),Px(y),Px(w),Px(h),viewWindow,(HMENU)(INT_PTR)id,GetModuleHandleW(nullptr),nullptr);
 Font(result,font?font:fontNormal);children.push_back(result);SetWindowSubclass(result,ControlProc,1,0);return result;
}
void Put(const wchar_t* key,HWND h){if(h)ui[key]=h;}
HWND Find(const wchar_t* key){auto it=ui.find(key);return it==ui.end()?nullptr:it->second;}
void At(const wchar_t* key,int x,int y,int w,int h){
 positions[key]={x,y,w,h};HWND control=Find(key);if(!control)return;
 auto label=labels.find(key);if(label!=labels.end()){
  auto wrapped=Wrap(label->second.text,w,label->second.font);
  if(TextOf(control)!=wrapped)SetWindowTextW(control,wrapped.c_str());
 }
 MoveWindow(control,Px(x),Px(y-scrollY),(std::max)(1,Px(w)),(std::max)(1,Px(h)),FALSE);
}
int PlaceText(const wchar_t* key,int x,int y,int w,int gap=12){
 auto it=labels.find(key);if(it==labels.end())return y;
 int h=TextHeight(it->second.text,w,it->second.font);At(key,x,y,w,h);return y+h+gap;
}
void Text(const wchar_t* key,const std::wstring& value,bool title=false,bool muted=false){
 UiLabel l;l.text=value;l.role=title?(wcscmp(key,L"heading")==0?1:5):(muted?3:0);
 l.font=title?(wcscmp(key,L"heading")==0?fontTitle:fontSection):(muted?fontMeta:fontNormal);
 l.color=muted?RGB(100,122,141):RGB(28,57,83);labels[key]=l;
 HWND h=Element(L"STATIC",value,SS_LEFT|SS_NOPREFIX,0,0,1,1,0,l.font);Put(key,h);
}
void Strong(const wchar_t* key,const std::wstring& value){Text(key,value,true);}
void SetLabel(const wchar_t* key,const std::wstring& value){auto it=labels.find(key);if(it!=labels.end()){it->second.text=value;AlignPage();}}
void Btn(const wchar_t* key,const wchar_t* text,int id){Put(key,Element(L"BUTTON",text,BS_OWNERDRAW|WS_TABSTOP,0,0,200,46,id));}
void Edit(const wchar_t* key,const std::wstring& value,HWND& output,DWORD style=ES_AUTOHSCROLL){
 output=Element(L"EDIT",value,WS_TABSTOP|style,0,0,200,38);Put(key,output);
 SendMessageW(output,EM_SETMARGINS,EC_LEFTMARGIN|EC_RIGHTMARGIN,MAKELPARAM(Px(10),Px(10)));
 SendMessageW(output,EM_LIMITTEXT,120,0);
}
void Box(const wchar_t* key,const wchar_t* text,HWND& output,bool checked=false){
 output=Element(L"BUTTON",text,BS_AUTOCHECKBOX|BS_MULTILINE|WS_TABSTOP,0,0,300,44);
 SendMessageW(output,BM_SETCHECK,checked?BST_CHECKED:BST_UNCHECKED,0);Put(key,output);
}
bool Checked(HWND h){return h&&SendMessageW(h,BM_GETCHECK,0,0)==BST_CHECKED;}
void Clear(){
 for(HWND h:children)if(IsWindow(h))DestroyWindow(h);children.clear();ui.clear();labels.clear();positions.clear();panels.clear();scrollY=0;
 centerEdit=stationEdit=logEdit=programList=nullptr;
 checkTemp=checkSysTemp=checkCeip=checkDiag=checkServices=checkTablet=checkRemote=checkBackup=checkLicense=nullptr;
}
void Notice(const std::wstring& message,UINT icon=MB_ICONINFORMATION){MessageBoxW(mainWindow,message.c_str(),L"Aula Manager Portable",MB_OK|icon);}
void SaveIdentity(){
 if(layoutTesting||jobRunning)return;
 auto trim=[](const std::wstring& value){auto a=value.find_first_not_of(L" \t\r\n"),b=value.find_last_not_of(L" \t\r\n");return a==std::wstring::npos?std::wstring():value.substr(a,b-a+1);};
 if(centerEdit)aula::IniWrite(L"Centro",trim(TextOf(centerEdit)));if(stationEdit)aula::IniWrite(L"Puesto",trim(TextOf(stationEdit)));
}
void RefreshLog(){if(logEdit){SetWindowTextW(logEdit,aula::ReadLog().c_str());SendMessageW(logEdit,EM_SETSEL,(WPARAM)-1,(LPARAM)-1);SendMessageW(logEdit,EM_SCROLLCARET,0,0);}}
void AppendLog(const std::wstring& s){aula::Log(s);RefreshLog();}
std::wstring Identity(){std::wstring c=layoutTesting?L"Centro municipal de ejemplo":aula::IniRead(L"Centro"),p=layoutTesting?L"PC10":aula::IniRead(L"Puesto");return L"Centro: "+(c.empty()?L"Sin identificar":c)+L"   ·   Puesto físico: "+(p.empty()?L"Sin identificar":p);}
bool Confirm(const std::wstring& q){return MessageBoxW(mainWindow,q.c_str(),L"Confirmar operación",MB_YESNO|MB_ICONWARNING|MB_DEFBUTTON2)==IDYES;}
int ButtonHeight(const wchar_t* key,int w){int pad=GetDlgCtrlID(Find(key))>=217?67:32;return (std::max)(46,TextHeight(TextOf(Find(key)),w-pad,fontNormal)+22);}
int ButtonRow(const std::vector<std::wstring>& keys,int x,int y,int w,int columns=2){
 columns=(std::min)(columns,(int)keys.size());if(w<570)columns=1;
 int bw=(w-(columns-1)*12)/columns;
 for(size_t i=0;i<keys.size();){
  int count=(std::min)(columns,(int)(keys.size()-i)),h=46;
  for(int k=0;k<count;++k)h=(std::max)(h,ButtonHeight(keys[i+k].c_str(),bw));
  for(int k=0;k<count;++k)At(keys[i+k].c_str(),x+k*(bw+12),y,bw,h);
  i+=count;y+=h+12;
 }return y;
}
int CheckRow(const wchar_t* key,int x,int y,int w){int h=TextHeight(TextOf(Find(key)),w-32,fontNormal)+20;At(key,x,y,w,(std::max)(44,h));return y+(std::max)(44,h)+4;}
void LayoutContent(int width,int height){
 positions.clear();panels.clear();int margin=width<600?18:28,gap=18,x=margin,w=width-2*margin,y=24;
 int titleWidth=w-48-(w>=680?82:0);
 int a=TextHeight(labels[L"heading"].text,titleWidth,fontTitle),b=TextHeight(labels[L"subtitle"].text,titleWidth,fontMeta);
 hero={x,y,w,a+b+52};At(L"heading",x+24,y+22,titleWidth,a);At(L"subtitle",x+24,y+30+a,titleWidth,b);y+=hero.h+gap;
 if(currentPage==0){
  int start=y,cx=x+22,cw=w-44;
  if(cw>=380){
   int fw=(cw-18)/2,sw=cw-fw-18;
   int h=(std::max)(TextHeight(labels[L"centerCaption"].text,fw,fontNormal),TextHeight(labels[L"stationCaption"].text,sw,fontNormal));
   At(L"centerCaption",cx,y+20,fw,h);At(L"stationCaption",cx+fw+18,y+20,sw,h);
   At(L"centerEdit",cx,y+28+h,fw,38);At(L"stationEdit",cx+fw+18,y+28+h,sw,38);y+=h+86;
  }else{
   y+=20;y=PlaceText(L"centerCaption",cx,y,cw,7);At(L"centerEdit",cx,y,cw,38);y+=54;
   y=PlaceText(L"stationCaption",cx,y,cw,7);At(L"stationEdit",cx,y,cw,38);y+=58;
  }
  int tx=x+22,tw=w-44;
  if(tw>=700){int bw=296,textW=tw-bw-24;
   ShowWindow(Find(L"fullTitle"),SW_SHOW);ShowWindow(Find(L"fullDescription"),SW_SHOW);
   int bottom=PlaceText(L"fullTitle",tx,y,textW,8);bottom=PlaceText(L"fullDescription",tx,bottom,textW,0);
   int bh=(std::max)(58,ButtonHeight(L"fullRun",bw));At(L"fullRun",tx+tw-bw,y,bw,bh);y=(std::max)(bottom,y+bh)+22;
  }else{ShowWindow(Find(L"fullTitle"),SW_SHOW);ShowWindow(Find(L"fullDescription"),SW_SHOW);
   y=PlaceText(L"fullTitle",tx,y,tw,8);y=PlaceText(L"fullDescription",tx,y,tw,16);
   int bh=(std::max)(54,ButtonHeight(L"fullRun",tw));At(L"fullRun",tx,y,tw,bh);y+=bh+22;}
  panels.push_back({x,start,w,y-start});y+=gap;
  bool split=w>=850;int lw=split?(w-gap)*3/5:w,rw=split?w-lw-gap:w;
  int top=y,ly=y+22;
  ly=PlaceText(L"detailsTitle",x+22,ly,lw-44,20);
  for(int i=0;i<8;++i){
   auto k=L"key"+std::to_wstring(i),v=L"value"+std::to_wstring(i);
   int ix=x+22,iw=lw-44;
   if(iw>=410){int kw=144,vw=iw-kw-14;
    int rh=(std::max)(TextHeight(labels[k].text,kw,fontNormal),TextHeight(labels[v].text,vw,fontNormal));
    At(k.c_str(),ix,ly,kw,rh);At(v.c_str(),ix+kw+14,ly,vw,rh);ly+=rh+13;
   }else {ly=PlaceText(k.c_str(),ix,ly,iw,3);ly=PlaceText(v.c_str(),ix,ly,iw,15);}
  }
  if(Find(L"admin")){int bh=ButtonHeight(L"admin",lw-44);At(L"admin",x+22,ly+6,lw-44,bh);ly+=bh+14;}
  ly+=16;
  int rx=split?x+lw+gap:x,ry=split?top:ly+gap,rBottom=ry+22;
  rBottom=PlaceText(L"actionsTitle",rx+22,rBottom,rw-44,18);
  for(int i=0;i<5;++i){auto key=L"action"+std::to_wstring(i);int bh=ButtonHeight(key.c_str(),rw-44);At(key.c_str(),rx+22,rBottom,rw-44,bh);rBottom+=bh+10;}
  rBottom+=12;
  if(split){int h=(std::max)(ly,rBottom)-top;panels.push_back({x,top,lw,h});panels.push_back({rx,top,rw,h});y=top+h+gap;}
  else {panels.push_back({x,top,lw,ly-top});panels.push_back({rx,ry,rw,rBottom-ry});y=rBottom+gap;}
  int cols=w>=950?3:(w>=630?2:1),colw=(w-(cols-1)*gap)/cols;
  for(int i=0;i<3;){int count=(std::min)(cols,3-i),bottom=y;
   for(int j=0;j<count;++j){int xx=x+j*(colw+gap),yy=y+20;
    auto title=L"lowTitle"+std::to_wstring(i+j);yy=PlaceText(title.c_str(),xx+20,yy,colw-40,16);
    for(wchar_t c=L'a';c<=L'c';++c){auto k=L"lowLine"+std::to_wstring(i+j)+c;yy=PlaceText(k.c_str(),xx+20,yy,colw-40,9);}
    bottom=(std::max)(bottom,yy+12);
   }
   for(int j=0;j<count;++j)panels.push_back({x+j*(colw+gap),y,colw,bottom-y});i+=count;y=bottom+gap;
  }
  if(Find(L"hint"))ShowWindow(Find(L"hint"),SW_HIDE);
 }else{
  int start=y,ix=x+24,iw=w-48;y+=24;
  switch(currentPage){
   case 1:
    y=PlaceText(L"explain",ix,y,iw,18);
    for(int i=0;i<7;++i)y=CheckRow((L"check"+std::to_wstring(i)).c_str(),ix,y,iw);
    y+=18;y=ButtonRow({L"preview",L"execute",L"restore",L"ceip"},ix,y,iw);
    y=PlaceText(L"note",ix,y+8,iw,0);break;
   case 2:{
    y=PlaceText(L"explain",ix,y,iw,18);int listH=(std::max)(280,height-y-210);
    At(L"programs",ix,y,iw,listH);y+=listH+18;
    y=ButtonRow({L"refresh",L"remove",L"windowsApps"},ix,y,iw,3);y=PlaceText(L"note",ix,y,iw,0);break;
   }
   case 3:
    y=PlaceText(L"installed",ix,y,iw,22);y=PlaceText(L"explain",ix,y,iw,20);
    y=PlaceText(L"compat",ix,y,iw,24);y=ButtonRow({L"pick"},ix,y,iw);
    y=PlaceText(L"filename",ix,y+2,iw,24);y=ButtonRow({L"update",L"official"},ix,y,iw);
    y=PlaceText(L"note",ix,y+6,iw,0);break;
   case 4:
    y=PlaceText(L"explain",ix,y,iw,20);y=PlaceText(L"system",ix,y,iw,20);
    y=PlaceText(L"compat",ix,y,iw,24);y=ButtonRow({L"pick"},ix,y,iw);
    y=PlaceText(L"folder",ix,y+2,iw,22);y=ButtonRow({L"scan"},ix,y,iw);
    y=PlaceText(L"scanText",ix,y+2,iw,18);y=CheckRow(L"backup",ix,y,iw);y=CheckRow(L"license",ix,y,iw);
    y=ButtonRow({L"migrate"},ix,y+18,iw)-12;break;
   case 5:{
    y=PlaceText(L"identity",ix,y,iw,18);int logH=(std::max)(260,height-y-180);
    At(L"log",ix,y,iw,logH);y+=logH+18;y=ButtonRow({L"report",L"openReports"},ix,y,iw);
    y=PlaceText(L"note",ix,y,iw,0);break;
   }
   case 6:{
    y=PlaceText(L"jobStatus",ix,y,iw,18);
    int reserve=190;
    At(L"jobLog",ix,y,iw,(std::max)(200,height-y-reserve));y+=(std::max)(200,height-y-reserve)+18;
    y=ButtonRow({L"cancelJob",L"jobReports"},ix,y,iw);y=PlaceText(L"note",ix,y,iw,0);break;
   }
  }
  y+=24;panels.push_back({x,start,w,y-start});y+=gap;
 }
 contentHeight=y+6;
}
void AlignPage(){
 if(!layoutReady||!mainWindow)return;RECT r={};GetClientRect(mainWindow,&r);int width=Dip(r.right),height=Dip(r.bottom);
 compactNav=width<1000||height<620;sidebar=compactNav?76:228;
 int navY=height<380?16:(compactNav?104:144);
 int step=(std::min)(height<560?48:54,(std::max)(20,(height-navY-12)/6));
 for(int i=0;i<6;++i){MoveWindow(navButtons[i],Px(12),Px(navY+i*step),Px(sidebar-24),Px(step-6),TRUE);InvalidateRect(navButtons[i],nullptr,FALSE);}
 MoveWindow(viewWindow,Px(sidebar),0,r.right-Px(sidebar),r.bottom-Px(36),TRUE);
 GetClientRect(viewWindow,&r);viewportHeight=Dip(r.bottom);
 LayoutContent(Dip(r.right),viewportHeight);
 if(programList){
  HDC dc=GetDC(programList);HGDIOBJ old=SelectObject(dc,fontNormal);int extent=0;
  int count=(int)SendMessageW(programList,LB_GETCOUNT,0,0);
  for(int i=0;i<count;++i){int len=(int)SendMessageW(programList,LB_GETTEXTLEN,i,0);std::vector<wchar_t> text(len+1);
   SendMessageW(programList,LB_GETTEXT,i,(LPARAM)text.data());SIZE size={};GetTextExtentPoint32W(dc,text.data(),len,&size);extent=(std::max)(extent,(int)size.cx+Px(24));}
  SendMessageW(programList,LB_SETHORIZONTALEXTENT,extent,0);SelectObject(dc,old);ReleaseDC(programList,dc);
 }
 int next=skin::Clamp(scrollY,0,(std::max)(0,contentHeight-viewportHeight));
 if(next!=scrollY){scrollY=next;LayoutContent(Dip(r.right),viewportHeight);}
 SCROLLINFO info={sizeof(info),SIF_RANGE|SIF_PAGE|SIF_POS|SIF_DISABLENOSCROLL,0,(std::max)(0,contentHeight-1),(UINT)viewportHeight,scrollY,0};
 SetScrollInfo(viewWindow,SB_VERT,&info,TRUE);
 RedrawWindow(viewWindow,nullptr,nullptr,RDW_INVALIDATE|RDW_ERASE|RDW_ALLCHILDREN|RDW_FRAME);InvalidateRect(mainWindow,nullptr,FALSE);
}
void DrawTextAt(HDC dc,const std::wstring& value,skin::Rect r,HFONT font,COLORREF color){
 RECT p={Px(r.x),Px(r.y),Px(r.x+r.w),Px(r.y+r.h)};HGDIOBJ old=SelectObject(dc,font);SetBkMode(dc,TRANSPARENT);SetTextColor(dc,color);
 DrawTextW(dc,value.c_str(),-1,&p,DT_LEFT|DT_WORDBREAK|DT_NOPREFIX);SelectObject(dc,old);
}
void PaintSurface(HWND hwnd,HDC dc){
 RECT r={};GetClientRect(hwnd,&r);int w=Dip(r.right),h=Dip(r.bottom);
 {
  Gdiplus::Graphics g(dc);g.SetSmoothingMode(Gdiplus::SmoothingModeAntiAlias);g.Clear(skin::Bg());g.ScaleTransform(dpi/96.f,dpi/96.f);
  if(hwnd==viewWindow){
   g.TranslateTransform(0,(Gdiplus::REAL)-scrollY);
   skin::FillRound(g,hero,Gdiplus::Color(255,226,243,254),16);
   if(hero.w>=680)skin::Icon(g,0,(Gdiplus::REAL)(hero.x+hero.w-80),(Gdiplus::REAL)(hero.y+(hero.h-44)/2),44,skin::Blue());
   for(auto p:panels)skin::Card(g,p);
   for(const auto& entry:positions){HWND control=Find(entry.first.c_str());wchar_t cls[24]={};GetClassNameW(control,cls,24);
    if(wcscmp(cls,L"EDIT")==0&&control!=logEdit){auto p=entry.second;
     skin::FillRound(g,{p.x-1,p.y-1,p.w+2,p.h+2},Gdiplus::Color(255,187,214,233),5);}
   }
  }else{
   Gdiplus::SolidBrush side(Gdiplus::Color(255,235,247,254)),white(skin::White());Gdiplus::Pen line(skin::Line());
   g.FillRectangle(&side,0,0,sidebar,h);g.DrawLine(&line,sidebar,0,sidebar,h);
   if(h>=380){skin::FillRound(g,{compactNav?17:22,24,42,42},skin::Blue(),11);skin::Icon(g,0,compactNav?26.f:31.f,33,24,skin::White());}
   g.FillRectangle(&white,sidebar,h-36,w-sidebar,36);g.DrawLine(&line,sidebar,h-36,w,h-36);
   Gdiplus::SolidBrush green(Gdiplus::Color(255,28,160,130));g.FillEllipse(&green,sidebar+22,h-22,7,7);
  }
 }
 if(hwnd==mainWindow){
  if(!compactNav){DrawTextAt(dc,L"AULA MANAGER",{22,79,195,28},fontBrand,RGB(28,68,102));DrawTextAt(dc,L"Mantenimiento de aulas",{22,108,194,22},fontMeta,RGB(100,122,141));
   if(h>620){DrawTextAt(dc,L"PORTABLE  ·  v0.5",{22,h-100,190,22},fontMeta,RGB(41,126,178));DrawTextAt(dc,L"Tus registros viajan contigo",{22,h-72,184,40},fontMeta,RGB(100,122,141));}
  }
  DrawTextAt(dc,jobRunning?L"En curso  ·  Puedes seguir el avance y cancelar":
   (w-sidebar>660?L"Listo  ·  Datos junto al ejecutable  ·  Preparación automática":L"Listo  ·  Modo portable"),{sidebar+38,h-28,w-sidebar-52,24},fontMeta,RGB(100,122,141));
 }
}
LRESULT CommonColor(UINT msg,WPARAM wp,LPARAM lp){
 HDC dc=(HDC)wp;SetBkMode(dc,TRANSPARENT);SetTextColor(dc,RGB(28,57,83));
 if(msg==WM_CTLCOLOREDIT){SetBkColor(dc,RGB(248,252,255));return (LRESULT)fieldBrush;}
 if(msg==WM_CTLCOLORLISTBOX||(HWND)lp==logEdit){SetBkColor(dc,RGB(255,255,255));return (LRESULT)whiteEdit;}
 for(const auto& l:labels)if(Find(l.first.c_str())==(HWND)lp){
  SetTextColor(dc,l.second.color);
  if(l.first==L"heading"||l.first==L"subtitle"){SetBkColor(dc,RGB(226,243,254));return (LRESULT)heroBrush;}
  break;
 }
 SetBkColor(dc,RGB(255,255,255));return (LRESULT)whiteEdit;
}
LRESULT CALLBACK ViewProc(HWND hwnd,UINT msg,WPARAM wp,LPARAM lp){
 switch(msg){
 case WM_COMMAND:return SendMessageW(mainWindow,msg,wp,lp);
 case WM_DRAWITEM:skin::OwnerButton((DRAWITEMSTRUCT*)lp,currentPage,fontNormal,dpi,false);return TRUE;
 case WM_CTLCOLORSTATIC:case WM_CTLCOLOREDIT:case WM_CTLCOLORLISTBOX:case WM_CTLCOLORBTN:return CommonColor(msg,wp,lp);
 case WM_ERASEBKGND:return 1;
 case WM_PRINTCLIENT:PaintSurface(hwnd,(HDC)wp);return 0;
 case WM_PAINT:{PAINTSTRUCT ps;HDC dc=BeginPaint(hwnd,&ps);PaintSurface(hwnd,dc);EndPaint(hwnd,&ps);return 0;}
 case WM_MOUSEWHEEL:{
  static int remainder=0;remainder+=GET_WHEEL_DELTA_WPARAM(wp);int ticks=remainder/WHEEL_DELTA;remainder%=WHEEL_DELTA;
  UINT lines=3;SystemParametersInfoW(SPI_GETWHEELSCROLLLINES,0,&lines,0);
  int amount=lines==WHEEL_PAGESCROLL?viewportHeight:(int)lines*22;
  scrollY=skin::Clamp(scrollY-ticks*amount,0,(std::max)(0,contentHeight-viewportHeight));AlignPage();return 0;
 }
 case WM_VSCROLL:{SCROLLINFO si={sizeof(si),SIF_TRACKPOS};GetScrollInfo(hwnd,SB_VERT,&si);int next=scrollY;
  switch(LOWORD(wp)){case SB_LINEUP:next-=24;break;case SB_LINEDOWN:next+=24;break;case SB_PAGEUP:next-=viewportHeight-24;break;case SB_PAGEDOWN:next+=viewportHeight-24;break;case SB_THUMBTRACK:case SB_THUMBPOSITION:next=si.nTrackPos;break;case SB_TOP:next=0;break;case SB_BOTTOM:next=contentHeight;break;}
  scrollY=skin::Clamp(next,0,(std::max)(0,contentHeight-viewportHeight));AlignPage();return 0;
 }
 }
 return DefWindowProcW(hwnd,msg,wp,lp);
}
}
