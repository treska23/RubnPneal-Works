#pragma once
#include <windows.h>
#include <objidl.h>
#include <gdiplus.h>
#include <algorithm>
#include <string>
#pragma comment(lib, "gdiplus.lib")
namespace skin {
using namespace Gdiplus;
struct Rect { int x=0,y=0,w=0,h=0; };
inline int Clamp(int v,int lo,int hi){return (std::max)(lo,(std::min)(hi,v));}
inline Color Navy(){return Color(255,28,57,83);}
inline Color Muted(){return Color(255,100,122,141);}
inline Color Blue(){return Color(255,29,139,215);}
inline Color Bg(){return Color(255,244,249,252);}
inline Color Line(){return Color(255,220,234,243);}
inline Color White(){return Color(255,255,255,255);}
inline void Round(GraphicsPath& p,FLOAT x,FLOAT y,FLOAT w,FLOAT h,FLOAT r){
    r=(std::max)(1.f,(std::min)(r,(std::min)(w,h)/2));FLOAT d=r*2;
    p.AddArc(x,y,d,d,180,90);p.AddArc(x+w-d,y,d,d,270,90);
    p.AddArc(x+w-d,y+h-d,d,d,0,90);p.AddArc(x,y+h-d,d,d,90,90);p.CloseFigure();
}
inline void FillRound(Graphics& g,Rect r,Color fill,int radius=12){
    GraphicsPath p;Round(p,(FLOAT)r.x,(FLOAT)r.y,(FLOAT)r.w,(FLOAT)r.h,(FLOAT)radius);
    SolidBrush b(fill);g.FillPath(&b,&p);
}
inline void Card(Graphics& g,Rect r){
    FillRound(g,{r.x,r.y+2,r.w,r.h},Color(10,45,86,118));
    GraphicsPath p;Round(p,(FLOAT)r.x,(FLOAT)r.y,(FLOAT)r.w,(FLOAT)r.h,14);
    SolidBrush b(White());Pen pen(Line(),1);g.FillPath(&b,&p);g.DrawPath(&pen,&p);
}
// Vector icons do not depend on emoji or installed symbol fonts.
inline void Icon(Graphics& g,int kind,FLOAT x,FLOAT y,FLOAT size,Color color){
    GraphicsState state=g.Save();g.TranslateTransform(x,y);g.ScaleTransform(size/24,size/24);
    Pen p(color,1.8f);p.SetStartCap(LineCapRound);p.SetEndCap(LineCapRound);p.SetLineJoin(LineJoinRound);
    if(kind==0){g.DrawRectangle(&p,3,4,18,12);g.DrawLine(&p,12,16,12,21);g.DrawLine(&p,7,21,17,21);}
    else if(kind==1){g.DrawLine(&p,6,18,18,6);g.DrawEllipse(&p,2,16,6,6);g.DrawLine(&p,15,3,21,9);g.DrawLine(&p,14,4,20,10);}
    else if(kind==2){for(int a=0;a<2;++a)for(int b=0;b<2;++b)g.DrawRectangle(&p,3+a*11,3+b*11,7,7);}
    else if(kind==3||kind==5){g.DrawRectangle(&p,5,2,14,20);g.DrawLine(&p,8,7,16,7);g.DrawLine(&p,8,11,16,11);if(kind==5)g.DrawLine(&p,8,15,14,15);}
    else if(kind==4){g.DrawArc(&p,3,3,18,18,35,285);g.DrawLine(&p,20,2,20,8);g.DrawLine(&p,14,8,20,8);}
    else if(kind==6){g.DrawLine(&p,5,12,10,17);g.DrawLine(&p,10,17,20,6);}
    else if(kind==7){Point pts[]={{12,2},{21,6},{19,16},{12,22},{5,16},{3,6},{12,2}};g.DrawLines(&p,pts,7);}
    else {g.DrawLine(&p,4,12,20,12);g.DrawLine(&p,14,6,20,12);g.DrawLine(&p,14,18,20,12);}
    g.Restore(state);
}
inline void OwnerButton(DRAWITEMSTRUCT* d,int page,HFONT font,int dpi,bool compact){
    if(!d)return;const float scale=dpi/96.f;
    const int width=d->rcItem.right,height=d->rcItem.bottom,id=GetDlgCtrlID(d->hwndItem);
    const bool nav=id>=100&&id<106,quick=id>=217&&id<=221;
    const bool active=nav&&id-100==page,pressed=(d->itemState&ODS_SELECTED)!=0;
    const bool hover=GetPropW(d->hwndItem,L"AulaHover")!=nullptr,disabled=(d->itemState&ODS_DISABLED)!=0;
    const bool primary=id==215||id==201||id==207||id==211||id==212||id==222;
    Color bg=White(),ink=Navy(),edge=Line();
    if(nav){bg=active?Blue():(hover?Color(255,221,241,253):Color(255,235,247,254));ink=active?White():Navy();edge=bg;}
    else if(primary){bg=Blue();ink=White();edge=bg;}
    else if(quick){const Color colors[]={Color(255,232,245,255),Color(255,255,240,242),Color(255,232,249,240),Color(255,243,239,255),Color(255,233,245,252)};bg=colors[id-217];edge=bg;}
    else if(id==205){bg=Color(255,255,242,243);ink=Color(255,166,53,65);edge=Color(255,248,217,220);}
    if(pressed||(!nav&&hover))bg=primary?Color(255,22,113,180):Color(255,215,237,251);
    if(disabled){bg=Color(255,241,245,247);ink=Muted();}
    HDC dc=d->hDC;HBRUSH surface=CreateSolidBrush(nav?RGB(235,247,254):RGB(255,255,255));
    FillRect(dc,&d->rcItem,surface);DeleteObject(surface);
    Graphics g(dc);g.SetSmoothingMode(SmoothingModeAntiAlias);g.ScaleTransform(scale,scale);
    FLOAT w=width/scale,h=height/scale;GraphicsPath path;Round(path,1,1,w-2,h-2,9);
    SolidBrush brush(bg);Pen border(edge,1);g.FillPath(&brush,&path);g.DrawPath(&border,&path);
    int icon=-1;if(nav)icon=id-100;if(quick){const int icons[]={1,7,3,4,5};icon=icons[id-217];}
    if(icon>=0)Icon(g,icon,compact&&nav?(w-23)/2:16,(h-23)/2,23,active?White():(quick?Blue():Color(255,67,126,165)));
    if(!(nav&&compact)){
        g.Flush(Gdiplus::FlushIntentionSync);
        HDC textDc=g.GetHDC();int saved=SaveDC(textDc);
        wchar_t text[1600]={};GetWindowTextW(d->hwndItem,text,1600);
        RECT r={MulDiv(icon>=0?51:16,dpi,96),0,width-MulDiv(16,dpi,96),height};
        HGDIOBJ old=SelectObject(textDc,font);RECT calc=r;DrawTextW(textDc,text,-1,&calc,DT_CALCRECT|DT_WORDBREAK|DT_NOPREFIX);
        r.top=(std::max)(0,(height-(int)(calc.bottom-calc.top))/2);SetBkMode(textDc,TRANSPARENT);
        SetTextColor(textDc,RGB(ink.GetR(),ink.GetG(),ink.GetB()));
        DrawTextW(textDc,text,-1,&r,DT_WORDBREAK|DT_NOPREFIX|(icon>=0?DT_LEFT:DT_CENTER));SelectObject(textDc,old);
        RestoreDC(textDc,saved);g.ReleaseHDC(textDc);
    }
    if(d->itemState&ODS_FOCUS){Pen focus(active?White():Blue(),1);GraphicsPath f;Round(f,4,4,w-8,h-8,6);g.DrawPath(&focus,&f);}
}
}
