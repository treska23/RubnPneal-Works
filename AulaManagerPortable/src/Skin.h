#pragma once
#include <windows.h>
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

inline GraphicsPath Round(FLOAT x,FLOAT y,FLOAT w,FLOAT h,FLOAT r) {
    GraphicsPath path;
    r=(std::min)(r,(std::min)(w,h)/2);
    const FLOAT d=r*2;
    path.AddArc(x,y,d,d,180,90);path.AddArc(x+w-d,y,d,d,270,90);
    path.AddArc(x+w-d,y+h-d,d,d,0,90);path.AddArc(x,y+h-d,d,d,90,90);
    path.CloseFigure();return path;
}
inline void Panel(Graphics& g,FLOAT x,FLOAT y,FLOAT w,FLOAT h,FLOAT r=18){
    auto path=Round(x,y,w,h,r);
    SolidBrush shadow(Color(16,50,91,122));
    auto shadowPath=Round(x,y+3,w,h,r);g.FillPath(&shadow,&shadowPath);
    SolidBrush bg(White());Pen border(Line(),1.2f);
    g.FillPath(&bg,&path);g.DrawPath(&border,&path);
}
inline void Gradient(Graphics& g,FLOAT x,FLOAT y,FLOAT w,FLOAT h,Color start,Color end,FLOAT radius){
    auto path=Round(x,y,w,h,radius);
    LinearGradientBrush fill(PointF(x,y),PointF(x+w,y+h),start,end);
    g.FillPath(&fill,&path);
}
inline void Text(HDC dc,const std::wstring& value,RECT rc,COLORREF fg,HFONT font,UINT flags) {
    HGDIOBJ old=SelectObject(dc,font);
    SetTextColor(dc,fg);SetBkMode(dc,TRANSPARENT);
    DrawTextW(dc,value.c_str(),-1,&rc,flags);
    SelectObject(dc,old);
}
inline void Dashboard(HDC dc,RECT rect,int page){
    Graphics g(dc);
    g.SetSmoothingMode(SmoothingModeAntiAlias);
    g.Clear(Bg());
    FLOAT h=(FLOAT)rect.bottom, w=(FLOAT)rect.right;

    // Menú lateral: blanco azulado sereno con borde muy discreto.
    LinearGradientBrush side(Point(0,0),Point(248,0),Color(255,231,246,255),Color(255,245,251,255));
    g.FillRectangle(&side,0,0,245,(INT)h);
    SolidBrush sideDivider(Line());
    g.FillRectangle(&sideDivider,244,0,1,(INT)h);

    // Marca: aplicación de mantenimiento, no icono genérico.
    Gradient(g,24,29,50,50,Blue(),Sky(),12);
    Pen whitePen(White(),3);
    g.DrawRectangle(&whitePen,34,42,29,19);
    g.DrawLine(&whitePen,47,61,47,68);
    g.DrawLine(&whitePen,40,68,55,68);
    SolidBrush dot(White());
    g.FillEllipse(&dot,59,33,8,8);

    RECT title={87,30,232,57};
    Text(dc,L"AULA",title,RGB(18,61,105),(HFONT)GetStockObject(DEFAULT_GUI_FONT),DT_LEFT|DT_SINGLELINE|DT_VCENTER);
    RECT slogan={88,55,232,89};
    Text(dc,L"MANAGER  PORTABLE",slogan,RGB(40,127,191),(HFONT)GetStockObject(DEFAULT_GUI_FONT),DT_LEFT|DT_WORDBREAK);

    Pen line(Line(),1);
    g.DrawLine(&line,20,148,223,148);
    g.DrawLine(&line,20,(INT)h-132,223,(INT)h-132);

    // Etiqueta discreta de estado y ubicación portátil.
    SolidBrush mint(Color(255,22,175,126));
    g.FillEllipse(&mint,27,(INT)h-106,10,10);
    RECT state={47,(LONG)h-114,219,(LONG)h-80};
    Text(dc,L"LISTO PARA TRABAJAR",state,RGB(19,79,107),(HFONT)GetStockObject(DEFAULT_GUI_FONT),DT_LEFT|DT_SINGLELINE|DT_VCENTER);
    RECT port={27,(LONG)h-72,215,(LONG)h-31};
    Text(dc,L"Modo portable\nSin instalación",port,RGB(90,126,151),(HFONT)GetStockObject(DEFAULT_GUI_FONT),DT_LEFT|DT_WORDBREAK);

    // Parte principal: cabecera aérea y tarjeta blanca.
    if(page==0){
        Gradient(g,263,27,w-299,232,Color(255,219,240,255),Color(255,238,249,255),19);
        Panel(g,263,280,w-299,430,19);
        Gradient(g,w-181,47,102,88,Color(140,145,211,255),Color(45,204,234,252),19);
        // Mini terminal en cabecera.
        Pen screen(Color(255,32,112,189),5);
        g.DrawRectangle(&screen,w-162,66,65,42);
        g.DrawLine(&screen,w-130,108,w-130,121);
        g.DrawLine(&screen,w-146,121,w-114,121);
    }else{
        Gradient(g,263,26,w-299,112,Color(255,220,241,255),Color(255,241,251,255),19);
        Panel(g,263,153,w-299,555,19);
    }
    SolidBrush statusBg(White());
    g.FillRectangle(&statusBg,245,(INT)h-45,(INT)w-245,45);
    g.DrawLine(&line,245,(INT)h-45,(INT)w,(INT)h-45);
    SolidBrush ready(Color(255,15,178,138));
    g.FillEllipse(&ready,267,(INT)h-28,10,10);
    RECT foot={286,(LONG)h-38,(LONG)w-20,(LONG)h-9};
    Text(dc,L"Todo listo  •  Cambios manuales y registrados  •  Datos junto al ejecutable",foot,
         RGB(94,126,150),(HFONT)GetStockObject(DEFAULT_GUI_FONT),DT_LEFT|DT_VCENTER|DT_SINGLELINE);
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
        g.FillRectangle(&erase,0,0,w,h);
        auto sq=Round(3,h/2-10,20,20,5);
        SolidBrush fill(checked?Blue():White());
        Pen outline(checked?Blue():Color(255,153,185,208),1.7f);
        g.FillPath(&fill,&sq);g.DrawPath(&outline,&sq);
        if(checked){
            Pen tick(White(),2.6f);
            tick.SetStartCap(LineCapRound);tick.SetEndCap(LineCapRound);
            g.DrawLine(&tick,8,h/2,12,h/2+4);g.DrawLine(&tick,12,h/2+4,20,h/2-5);
        }
        RECT label={34,0,(LONG)w,(LONG)h};
        Text(item->hDC,name,label,RGB(49,86,119),font,DT_LEFT|DT_VCENTER|DT_SINGLELINE|DT_END_ELLIPSIS);
        return;
    }
    Color bg=White(),fg=Navy(),border=Line();
    bool navigation=id>=100 && id<106;
    bool active=navigation && id-100==page;
    bool primary=id==215||id==201||id==207||id==211||id==212;
    bool destructive=id==205;
    bool restore=id==202||id==214;
    bool green=id==208;
    if(navigation){
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
    auto path=Round(1,1,w-3,h-3,navigation?12.f:10.f);
    SolidBrush brush(bg);Pen stroke(border,1.3f);
    g.FillPath(&brush,&path);g.DrawPath(&stroke,&path);
    RECT label=rc;
    label.left=0;label.top=0;label.right=(LONG)w;label.bottom=(LONG)h;
    if(navigation){
        SolidBrush accent(active?White():Sky());
        g.FillEllipse(&accent,17,h/2-5,10,10);
        label.left=42;
    }
    if(item->itemState&ODS_FOCUS){
        Pen focus(Color(255,84,174,241),1);
        auto focusPath=Round(4,4,w-9,h-9,9);
        g.DrawPath(&focus,&focusPath);
    }
    Text(item->hDC,name,label,RGB(fg.GetR(),fg.GetG(),fg.GetB()),font,
         (navigation?DT_LEFT:DT_CENTER)|DT_VCENTER|DT_SINGLELINE|DT_END_ELLIPSIS);
}
}
