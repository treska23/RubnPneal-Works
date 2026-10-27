#pragma once
#include <windows.h>
#include <objidl.h>
#include <gdiplus.h>
#include <string>
#include <algorithm>
#pragma comment(lib, "gdiplus.lib")

namespace skin {
using namespace Gdiplus;

inline Color Navy(){return Color(255,17,55,96);}
inline Color Muted(){return Color(255,91,121,148);}
inline Color Blue(){return Color(255,27,135,229);}
inline Color Sky(){return Color(255,70,180,245);}
inline Color Bg(){return Color(255,244,249,253);}
inline Color Line(){return Color(255,214,232,245);}
inline Color White(){return Color(255,255,255,255);}
inline Color Tint(){return Color(255,228,245,255);}

inline void Round(GraphicsPath& path,FLOAT x,FLOAT y,FLOAT w,FLOAT h,FLOAT r) {
    r=(std::min)(r,(std::min)(w,h)/2);
    const FLOAT d=r*2;
    path.AddArc(x,y,d,d,180,90);path.AddArc(x+w-d,y,d,d,270,90);
    path.AddArc(x+w-d,y+h-d,d,d,0,90);path.AddArc(x,y+h-d,d,d,90,90);
    path.CloseFigure();
}
inline void Panel(Graphics& g,FLOAT x,FLOAT y,FLOAT w,FLOAT h,FLOAT r=18){
    GraphicsPath path;Round(path,x,y,w,h,r);
    SolidBrush shadow(Color(16,50,91,122));
    GraphicsPath shadowPath;Round(shadowPath,x,y+3,w,h,r);g.FillPath(&shadow,&shadowPath);
    SolidBrush bg(White());Pen border(Line(),1.2f);
    g.FillPath(&bg,&path);g.DrawPath(&border,&path);
}
inline void Gradient(Graphics& g,FLOAT x,FLOAT y,FLOAT w,FLOAT h,Color start,Color end,FLOAT radius){
    GraphicsPath path;Round(path,x,y,w,h,radius);
    LinearGradientBrush fill(PointF(x,y),PointF(x+w,y+h),start,end);
    g.FillPath(&fill,&path);
}
inline void Text(HDC dc,const std::wstring& value,RECT rc,COLORREF fg,HFONT font,UINT flags) {
    HGDIOBJ old=SelectObject(dc,font);
    SetTextColor(dc,fg);SetBkMode(dc,TRANSPARENT);
    DrawTextW(dc,value.c_str(),-1,&rc,flags);
    SelectObject(dc,old);
}

struct Rect {int x=0,y=0,w=0,h=0;};
inline Rect Inset(Rect r,int l,int t,int right,int bottom){
    return {r.x+l,r.y+t,(std::max)(0,r.w-l-right),(std::max)(0,r.h-t-bottom)};
}
inline int Clamp(int v,int lo,int hi){return (std::max)(lo,(std::min)(hi,v));}
struct Metrics{
    int w=1280,h=850,side=235,margin=22,gap=16,footer=48;
    Rect hero,id,body,left,right,footerR,low1,low2,low3;
    bool showBottom=false;
    bool narrow=false;
};
inline Metrics Measure(int w,int h,int page){
    Metrics m; m.w=(std::max)(w,940);m.h=(std::max)(h,650);
    m.side=Clamp(m.w/6,225,260);
    m.margin=Clamp(m.w/70,16,28);
    m.gap=Clamp(m.w/85,12,21);
    int x=m.side+m.margin;
    int cw=m.w-x-m.margin;
    int hy=(page==0?Clamp(m.h/6,116,148):Clamp(m.h/7,105,135));
    m.hero={x,24,cw,hy};
    int iy=m.hero.y+m.hero.h+m.gap;
    if(page==0){
        m.id={x,iy,cw,Clamp(m.h/8,98,116)};
        iy=m.id.y+m.id.h+m.gap;
    }
    m.body={x,iy,cw,(std::max)(220,m.h-iy-70)};
    m.footerR={m.side,m.h-m.footer,m.w-m.side,m.footer};
    int leftWidth=(int)(cw*0.625f);
    m.left={x,iy,leftWidth-m.gap/2,m.body.h};
    m.right={m.left.x+m.left.w+m.gap,iy,cw-m.left.w-m.gap,m.body.h};
    if(page==0 && w>=1170 && h>=835 && m.body.h>=455){
        m.showBottom=true;
        int lowH=Clamp((int)(m.body.h*.31),145,195);
        m.left.h=m.right.h=m.body.h-lowH-m.gap;
        int lowY=m.body.y+m.left.h+m.gap;
        int lowW=(cw-2*m.gap)/3;
        m.low1={x,lowY,lowW,lowH};
        m.low2={x+lowW+m.gap,lowY,lowW,lowH};
        m.low3={x+2*(lowW+m.gap),lowY,cw-2*(lowW+m.gap),lowH};
    }
    m.narrow=m.w<1120;
    return m;
}
inline void Dashboard(HDC dc,RECT client,int page){
    Graphics g(dc);
    g.SetSmoothingMode(SmoothingModeAntiAlias);
    g.Clear(Bg());
    auto m=Measure(client.right-client.left,client.bottom-client.top,page);
    LinearGradientBrush side(Point(0,0),Point(m.side,0),Color(255,226,244,255),Color(255,245,251,255));
    g.FillRectangle(&side,0,0,m.side,m.h);
    SolidBrush divider(Line());
    g.FillRectangle(&divider,m.side-1,0,1,m.h);
    Gradient(g,20.f,24.f,54.f,54.f,Blue(),Sky(),12.f);
    Pen whitePen(White(),3);
    g.DrawRectangle(&whitePen,31,38,31,21);
    g.DrawLine(&whitePen,46,59,46,67);
    g.DrawLine(&whitePen,38,67,54,67);
    SolidBrush dot(White());g.FillEllipse(&dot,61,30,10,10);
    auto header=m.hero;
    Gradient(g,(FLOAT)header.x,(FLOAT)header.y,(FLOAT)header.w,(FLOAT)header.h,
             Color(255,218,238,254),Color(255,239,250,255),19.f);
    if(page==0){
        auto id=m.id;
        Panel(g,(FLOAT)id.x,(FLOAT)id.y,(FLOAT)id.w,(FLOAT)id.h,16.f);
        Panel(g,(FLOAT)m.left.x,(FLOAT)m.left.y,(FLOAT)m.left.w,(FLOAT)m.left.h,18.f);
        Panel(g,(FLOAT)m.right.x,(FLOAT)m.right.y,(FLOAT)m.right.w,(FLOAT)m.right.h,18.f);
        if(m.showBottom){
            Panel(g,(FLOAT)m.low1.x,(FLOAT)m.low1.y,(FLOAT)m.low1.w,(FLOAT)m.low1.h,17.f);
            Panel(g,(FLOAT)m.low2.x,(FLOAT)m.low2.y,(FLOAT)m.low2.w,(FLOAT)m.low2.h,17.f);
            Panel(g,(FLOAT)m.low3.x,(FLOAT)m.low3.y,(FLOAT)m.low3.w,(FLOAT)m.low3.h,17.f);
        }
        // Monitor ilustrado pequeño, sin textos ni dependencias externas.
        FLOAT mx=(FLOAT)(header.x+header.w-110),my=(FLOAT)(header.y+22);
        Pen monitor(Color(255,54,143,210),4.f);
        g.DrawRectangle(&monitor,mx,my,65.f,44.f);
        g.DrawLine(&monitor,mx+32.f,my+44.f,mx+32.f,my+57.f);
        g.DrawLine(&monitor,mx+17.f,my+57.f,mx+48.f,my+57.f);
    }else{
        Panel(g,(FLOAT)m.body.x,(FLOAT)m.body.y,(FLOAT)m.body.w,(FLOAT)m.body.h,18.f);
    }
    Pen hair(Line(),1.f);
    g.DrawLine(&hair,14.f,143.f,(FLOAT)(m.side-14),143.f);
    g.DrawLine(&hair,14.f,(FLOAT)(m.h-140),(FLOAT)(m.side-14),(FLOAT)(m.h-140));
    SolidBrush foot(White());g.FillRectangle(&foot,m.footerR.x,m.footerR.y,m.footerR.w,m.footerR.h);
    g.DrawLine(&hair,(FLOAT)m.side,(FLOAT)m.footerR.y,(FLOAT)m.w,(FLOAT)m.footerR.y);
    SolidBrush ready(Color(255,12,182,138));
    g.FillEllipse(&ready,(FLOAT)(m.side+24),(FLOAT)(m.h-30),10.f,10.f);
    RECT caption={m.side+45,m.h-43,m.w-24,m.h-5};
    Text(dc,L"Listo  ·  Modo portable  ·  Acciones con confirmación y registro",caption,
         RGB(81,118,146),(HFONT)GetStockObject(DEFAULT_GUI_FONT),DT_LEFT|DT_VCENTER|DT_SINGLELINE);
}
inline void OwnerButton(DRAWITEMSTRUCT* item,int page,HFONT font){
    if(!item)return;
    const HWND hwnd=item->hwndItem;
    Graphics g(item->hDC);
    g.SetSmoothingMode(SmoothingModeAntiAlias);
    RECT rc=item->rcItem;
    FLOAT w=(FLOAT)(rc.right-rc.left),h=(FLOAT)(rc.bottom-rc.top);
    bool pressed=(item->itemState & ODS_SELECTED)!=0;
    bool disabled=(item->itemState & ODS_DISABLED)!=0;
    const bool check=GetPropW(hwnd,L"AulaCheckbox")!=nullptr;
    const bool checked=GetPropW(hwnd,L"AulaChecked")!=nullptr;
    SetBkMode(item->hDC,TRANSPARENT);

    wchar_t buf[1200]={0};GetWindowTextW(hwnd,buf,1200);
    std::wstring name(buf);
    int id=(int)GetDlgCtrlID(hwnd);
    if(check){
        // Línea con checkbox azul vectorial, sin controles estándar grises.
        SolidBrush erase(White());
        g.FillRectangle(&erase,0.f,0.f,w,h);
        GraphicsPath sq;Round(sq,3.f,h/2-10.f,20.f,20.f,5.f);
        SolidBrush fill(checked?Blue():White());
        Pen outline(checked?Blue():Color(255,153,185,208),1.7f);
        g.FillPath(&fill,&sq);g.DrawPath(&outline,&sq);
        if(checked){
            Pen tick(White(),2.6f);
            tick.SetStartCap(LineCapRound);tick.SetEndCap(LineCapRound);
            g.DrawLine(&tick,8.f,h/2,12.f,h/2+4.f);g.DrawLine(&tick,12.f,h/2+4.f,20.f,h/2-5.f);
        }
        RECT label={34,0,(LONG)w,(LONG)h};
        Text(item->hDC,name,label,RGB(49,86,119),font,DT_LEFT|DT_VCENTER|DT_SINGLELINE|DT_END_ELLIPSIS);
        return;
    }
    Color bg=White(),fg=Navy(),border=Line();
    bool navigation=id>=100 && id<106;
    bool quick=id>=217 && id<=221;
    bool active=navigation && id-100==page;
    bool primary=id==215||id==201||id==207||id==211||id==212;
    bool destructive=id==205;
    bool restore=id==202||id==214;
    bool green=id==208;
    if(quick){
        const Color backgrounds[]={
            Color(255,229,243,255),Color(255,255,233,239),Color(255,226,248,237),
            Color(255,238,233,255),Color(255,226,244,255)
        };
        const Color inks[]={
            Color(255,20,109,193),Color(255,175,49,73),Color(255,28,124,85),
            Color(255,97,72,171),Color(255,31,112,177)
        };
        bg=backgrounds[id-217];
        fg=inks[id-217];
        border=Color(255,210,231,245);
    }else if(navigation){
        bg=active?Blue():Color(255,240,249,255);
        fg=active?White():Navy();
        border=active?Blue():Color(255,232,244,252);
    }else if(primary){
        bg=pressed?Color(255,18,103,193):Blue();fg=White();border=bg;
    }else if(destructive){
        bg=Color(255,255,239,242);fg=Color(255,182,52,73);border=Color(255,253,215,222);
    }else if(green){
        bg=Color(255,226,249,241);fg=Color(255,19,116,89);border=Color(255,190,232,218);
    }else if(restore){
        bg=Color(255,237,246,255);fg=Color(255,35,105,175);border=Line();
    }
    if(pressed&&!primary&&!navigation)bg=Color(255,217,238,252);
    if(disabled)bg=Color(255,239,242,244);
    GraphicsPath path;Round(path,1.f,1.f,w-3.f,h-3.f,navigation?12.f:10.f);
    SolidBrush brush(bg);Pen stroke(border,1.3f);
    g.FillPath(&brush,&path);g.DrawPath(&stroke,&path);
    RECT label=rc;
    label.left=0;label.top=0;label.right=(LONG)w;label.bottom=(LONG)h;
    if(navigation){
        SolidBrush accent(active?White():Sky());
        g.FillEllipse(&accent,17.f,h/2-5.f,10.f,10.f);
        label.left=42;
    }
    if(quick){
        SolidBrush accent(fg);
        g.FillEllipse(&accent,14.f,h/2.f-12.f,24.f,24.f);
        Pen glyph(White(),2.3f);
        glyph.SetStartCap(LineCapRound);
        glyph.SetEndCap(LineCapRound);
        // Símbolos vectoriales simples, compatibles con Windows 7 (sin fuentes de iconos).
        if(id==217){ // limpieza
            g.DrawLine(&glyph,21.f,h/2.f+4.f,31.f,h/2.f-5.f);
            g.DrawLine(&glyph,21.f,h/2.f-1.f,30.f,h/2.f+8.f);
        }else if(id==218){ // seguridad
            g.DrawLine(&glyph,21.f,h/2.f,25.f,h/2.f+5.f);
            g.DrawLine(&glyph,25.f,h/2.f+5.f,32.f,h/2.f-6.f);
        }else if(id==219){ // documento
            g.DrawRectangle(&glyph,22.f,h/2.f-7.f,9.f,14.f);
            g.DrawLine(&glyph,23.f,h/2.f-2.f,30.f,h/2.f-2.f);
        }else if(id==220){ // actualizar
            g.DrawArc(&glyph,20.f,h/2.f-8.f,13.f,15.f,0.f,270.f);
            g.DrawLine(&glyph,31.f,h/2.f-8.f,32.f,h/2.f-1.f);
        }else{ // informe
            g.DrawRectangle(&glyph,21.f,h/2.f-7.f,11.f,14.f);
            g.DrawLine(&glyph,23.f,h/2.f-3.f,29.f,h/2.f-3.f);
            g.DrawLine(&glyph,23.f,h/2.f+2.f,29.f,h/2.f+2.f);
        }
    }
    if(item->itemState&ODS_FOCUS){
        Pen focus(Color(255,84,174,241),1);
        GraphicsPath focusPath;Round(focusPath,4.f,4.f,w-9.f,h-9.f,9.f);
        g.DrawPath(&focus,&focusPath);
    }
    // Calculate required line count and center text vertically. Never clip button captions into ellipses.
    LONG leftPad=navigation?42:(quick?51:12);
    LONG rightPad=12;
    RECT measured={0,0,(LONG)w-leftPad-rightPad,1000};
    HGDIOBJ old=SelectObject(item->hDC,font);
    DrawTextW(item->hDC,name.c_str(),-1,&measured,DT_CALCRECT|DT_WORDBREAK|DT_NOPREFIX);
    SelectObject(item->hDC,old);
    LONG textH=(std::max)(18L,measured.bottom);
    label.left=leftPad;label.top=(LONG)((h-textH)/2.f);
    label.right=(LONG)w-rightPad;label.bottom=(LONG)h-2;
    Text(item->hDC,name,label,RGB(fg.GetR(),fg.GetG(),fg.GetB()),font,
         ((navigation||quick)?DT_LEFT:DT_CENTER)|DT_WORDBREAK|DT_NOPREFIX);

}
}
