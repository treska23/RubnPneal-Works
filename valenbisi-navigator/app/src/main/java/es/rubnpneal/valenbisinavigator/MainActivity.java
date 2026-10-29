package es.rubnpneal.valenbisinavigator;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final String BASE = "https://api.cyclocity.fr/contracts/valence/gbfs/v3/";
    private static final int BG=Color.rgb(11,19,31), PANEL=Color.rgb(26,39,55);
    private static final int TEXT=Color.rgb(239,247,250), MUTED=Color.rgb(169,189,198);
    private static final int GREEN=Color.rgb(79,225,180), ORANGE=Color.rgb(255,209,121);
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final List<Station> stations = new ArrayList<>();
    private final Map<String,JSONObject> lastStatus=new HashMap<>();
    private EditText addressInput;
    private TextView status, resultTitle;
    private LinearLayout results, alternatives;
    private boolean loading=false;
    private double destinationLat=Double.NaN,destinationLon=Double.NaN;
    private String destinationText="";

    static class Station {
        String id, name, number;
        double lat,lon,meters;
        int bikes=-1,docks=-1;
        boolean returning=true;
    }

    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        buildUi();
        loadStations(false);
    }
    @Override protected void onDestroy(){worker.shutdownNow();super.onDestroy();}

    private int dp(int x){return (int)(getResources().getDisplayMetrics().density*x+0.5f);}
    private GradientDrawable shape(int color,int radius){
        GradientDrawable d=new GradientDrawable();
        d.setColor(color); d.setCornerRadius(dp(radius));return d;
    }
    private TextView text(String text,int size,int color,boolean bold){
        TextView t=new TextView(this); t.setText(text);t.setTextColor(color);
        t.setTextSize(size);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        return t;
    }
    private void add(LinearLayout parent,View child,int top){
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
        p.topMargin=dp(top);parent.addView(child,p);
    }
    private Button button(String label,boolean primary){
        Button b=new Button(this);b.setText(label);b.setAllCaps(false);
        b.setTextColor(primary?BG:TEXT); b.setTextSize(14);
        b.setBackground(shape(primary?GREEN:Color.rgb(47,65,81),12));
        b.setPadding(dp(10),dp(4),dp(10),dp(4));
        return b;
    }
    private void buildUi(){
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);scroll.setBackgroundColor(BG);
        scroll.setFitsSystemWindows(true);
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(18),dp(16),dp(18),dp(24));
        scroll.addView(root);setContentView(scroll);

        add(root,text("VALENBISI",14,GREEN,true),0);
        add(root,text("Navigator",32,TEXT,true),2);
        add(root,text("Dime a dónde quieres ir y te llevo a la Valenbisi más cercana a ese destino.",14,MUTED,false),6);

        LinearLayout searchBox=new LinearLayout(this);
        searchBox.setOrientation(LinearLayout.VERTICAL);
        searchBox.setPadding(dp(14),dp(16),dp(14),dp(16));
        searchBox.setBackground(shape(PANEL,18));
        add(root,searchBox,20);
        add(searchBox,text("¿A qué dirección de Valencia vas?",17,TEXT,true),0);
        addressInput=new EditText(this);
        addressInput.setTextColor(TEXT); addressInput.setHintTextColor(MUTED);
        addressInput.setHint("Calle y número (p. ej. Colón 20)");
        addressInput.setSingleLine(true);
        addressInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        addressInput.setImeOptions(EditorInfo.IME_ACTION_SEARCH);
        addressInput.setTextSize(15);
        addressInput.setBackground(shape(Color.rgb(42,59,75),11));
        addressInput.setPadding(dp(12),dp(8),dp(12),dp(8));
        add(searchBox,addressInput,12);
        addressInput.setOnEditorActionListener((v,id,event)->{
            if(id==EditorInfo.IME_ACTION_SEARCH){findAddress();return true;}return false;
        });
        Button search=button("Buscar estación más cercana",true);
        search.setOnClickListener(v->findAddress());
        add(searchBox,search,10);

        status=text("Cargando estaciones reales de Valenbisi…",13,MUTED,false);
        add(root,status,16);
        Button refresh=button("Actualizar disponibilidad",false);
        refresh.setOnClickListener(v->loadStations(true));
        add(root,refresh,12);

        results=new LinearLayout(this);results.setOrientation(LinearLayout.VERTICAL);
        results.setPadding(dp(14),dp(14),dp(14),dp(14));
        results.setBackground(shape(PANEL,18));
        results.setVisibility(View.GONE);
        add(root,results,18);
        add(results,text("ESTACIÓN MÁS CERCANA AL DESTINO",12,GREEN,true),0);
        resultTitle=text("",19,TEXT,true);
        add(results,resultTitle,8);

        alternatives=new LinearLayout(this);alternatives.setOrientation(LinearLayout.VERTICAL);
        add(root,alternatives,10);
        add(root,text("Datos de estaciones: JCDecaux / Valenbisi · Las plazas pueden cambiar durante el trayecto.",12,MUTED,false),20);
    }
    private void loadStations(boolean refreshing){
        if(loading)return;loading=true;
        status.setText("Actualizando estaciones y anclajes…");
        worker.execute(()->{
            try{
                JSONObject discovery=new JSONObject(download(BASE+"gbfs.json"));
                Map<String,String> feeds=findFeeds(discovery);
                String info=feeds.containsKey("station_information")?feeds.get("station_information"):BASE+"station_information.json";
                String stat=feeds.containsKey("station_status")?feeds.get("station_status"):BASE+"station_status.json";
                JSONArray i=new JSONObject(download(info)).getJSONObject("data").getJSONArray("stations");
                JSONArray s=new JSONObject(download(stat)).getJSONObject("data").getJSONArray("stations");
                Map<String,JSONObject> statusMap=new HashMap<>();
                for(int k=0;k<s.length();k++){JSONObject ob=s.optJSONObject(k);if(ob!=null)statusMap.put(ob.optString("station_id"),ob);}
                List<Station> found=new ArrayList<>();
                for(int k=0;k<i.length();k++){
                    JSONObject ob=i.optJSONObject(k);if(ob==null)continue;
                    Station a=new Station();a.id=ob.optString("station_id");
                    if(a.id.isEmpty()||!ob.has("lat")||!ob.has("lon"))continue;
                    a.lat=ob.optDouble("lat",Double.NaN);a.lon=ob.optDouble("lon",Double.NaN);
                    if(!Double.isFinite(a.lat)||!Double.isFinite(a.lon))continue;
                    a.number=ob.optString("short_name",a.id);
                    a.name=name(ob.opt("name"),a.id);
                    JSONObject st=statusMap.get(a.id);
                    if(st!=null){a.bikes=st.optInt("num_vehicles_available",-1);a.docks=st.optInt("num_docks_available",-1);a.returning=st.optBoolean("is_returning",true);}
                    found.add(a);
                }
                if(found.isEmpty())throw new Exception("No se recibieron estaciones válidas");
                runOnUiThread(()->{
                    stations.clear();stations.addAll(found);loading=false;
                    status.setText("● "+stations.size()+" estaciones cargadas · disponibilidad orientativa");
                    status.setTextColor(GREEN);
                    if(!Double.isNaN(destinationLat))present();
                });
            }catch(Exception ex){
                runOnUiThread(()->{loading=false;status.setText("No se pudieron cargar las estaciones. Comprueba Internet y pulsa actualizar. "+ex.getMessage());status.setTextColor(ORANGE);});
            }
        });
    }
    private Map<String,String> findFeeds(JSONObject root) throws Exception {
        JSONObject data=root.getJSONObject("data");
        JSONArray list=data.optJSONArray("feeds");
        if(list==null){
            // Buscar los feeds por idioma si no están en data.feeds.
            for(String lang:new String[]{"es","en","fr"}){
                JSONObject language=data.optJSONObject(lang);
                if(language!=null&&language.optJSONArray("feeds")!=null){list=language.optJSONArray("feeds");break;}
            }
        }
        Map<String,String> found=new HashMap<>();
        if(list!=null)for(int k=0;k<list.length();k++){
            JSONObject e=list.optJSONObject(k);if(e==null)continue;
            String u=e.optString("url");if(!u.isEmpty()){
                String absolute=new URL(new URL(BASE+"gbfs.json"),u).toString();
                if(absolute.startsWith("https://"))found.put(e.optString("name"),absolute);
            }
        }
        return found;
    }
    private String name(Object raw,String fallback){
        if(raw instanceof String){String s=(String)raw;return s.isEmpty()?fallback:s;}
        if(raw instanceof JSONArray){
            JSONArray arr=(JSONArray)raw;
            String any=fallback;
            for(int i=0;i<arr.length();i++){
                JSONObject e=arr.optJSONObject(i);if(e==null)continue;
                String t=e.optString("text");if(t.isEmpty())continue;
                if(any.equals(fallback))any=t;
                if(e.optString("language").equals("es"))return t;
            }
            return any;
        }
        return fallback;
    }
    private String download(String link)throws Exception{
        HttpURLConnection c=(HttpURLConnection)new URL(link).openConnection();
        c.setConnectTimeout(12000);c.setReadTimeout(12000);
        c.setRequestProperty("Accept","application/json");
        try{
            if(c.getResponseCode()!=200)throw new Exception("HTTP "+c.getResponseCode());
            StringBuilder sb=new StringBuilder();
            try(BufferedReader r=new BufferedReader(new InputStreamReader(c.getInputStream(),StandardCharsets.UTF_8))){
                String line;while((line=r.readLine())!=null)sb.append(line);
            }
            return sb.toString();
        }finally{c.disconnect();}
    }
    private void findAddress(){
        String q=addressInput.getText().toString().trim();
        if(q.isEmpty()){status.setText("Escribe primero una calle y un número.");return;}
        if(stations.isEmpty()){status.setText("Todavía no se han cargado las estaciones.");return;}
        status.setText("Buscando la dirección en Valencia…");
        worker.execute(()->{
            try{
                if(!Geocoder.isPresent())throw new Exception("No hay un geocodificador disponible en este móvil");
                Geocoder geocoder=new Geocoder(this, new Locale("es","ES"));
                @SuppressWarnings("deprecation")
                List<Address> addresses=geocoder.getFromLocationName(q+", Valencia, España",5,39.18,-0.62,39.62,-0.19);
                Address selected=null;
                if(addresses!=null)for(Address a:addresses){
                    if(a.hasLatitude()&&a.hasLongitude()&&a.getLatitude()>=39.18&&a.getLatitude()<=39.62&&a.getLongitude()>=-0.62&&a.getLongitude()<=-0.19){selected=a;break;}
                }
                if(selected==null)throw new Exception("No encuentro esa dirección dentro de Valencia");
                final double lat=selected.getLatitude(),lon=selected.getLongitude();
                final String display=selected.getAddressLine(0)!=null?selected.getAddressLine(0):q;
                runOnUiThread(()->{
                    destinationLat=lat;destinationLon=lon;destinationText=display;
                    status.setText("Dirección localizada: "+display);
                    status.setTextColor(GREEN);
                    present();
                });
            }catch(Exception ex){runOnUiThread(()->{status.setText("No se pudo localizar: "+ex.getMessage());status.setTextColor(ORANGE);});}
        });
    }
    private void present(){
        if(Double.isNaN(destinationLat)||stations.isEmpty())return;
        List<Station> ranked=new ArrayList<>(stations);
        float[] d=new float[1];
        for(Station s:ranked){
            Location.distanceBetween(destinationLat,destinationLon,s.lat,s.lon,d);
            s.meters=d[0];
        }
        Collections.sort(ranked,Comparator.comparingDouble(s->s.meters));
        Station nearest=ranked.get(0);
        results.setVisibility(View.VISIBLE);
        results.removeAllViews();
        add(results,text("ESTACIÓN MÁS CERCANA A TU DESTINO",12,GREEN,true),0);
        resultTitle=text(nearest.number+" · "+nearest.name,19,TEXT,true);
        add(results,resultTitle,9);
        add(results,text("A "+distance(nearest.meters)+" en línea recta de "+destinationText,13,MUTED,false),7);
        String docks=nearest.docks<0?"Huecos: sin datos":nearest.docks+" anclajes libres";
        add(results,text(docks+" · "+(nearest.bikes<0?"Bicis: sin datos":nearest.bikes+" bicis disponibles"),14,nearest.docks==0?ORANGE:GREEN,true),8);
        if(nearest.docks==0||!nearest.returning)
            add(results,text("Atención: esta estación no admite devoluciones ahora mismo. Revisa las alternativas.",13,ORANGE,false),6);
        addNavigationButtons(results,nearest);
        alternatives.removeAllViews();
        add(alternatives,text("OTRAS ESTACIONES PRÓXIMAS CON HUECOS",13,GREEN,true),14);
        int count=0;
        for(Station s:ranked){
            if(s.id.equals(nearest.id)||s.docks<=0||!s.returning)continue;
            LinearLayout card=new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(dp(14),dp(12),dp(14),dp(12));
            card.setBackground(shape(PANEL,14));
            add(alternatives,card,10);
            add(card,text(s.number+" · "+s.name,16,TEXT,true),0);
            add(card,text(distance(s.meters)+" del destino · "+s.docks+" huecos libres",13,MUTED,false),5);
            addNavigationButtons(card,s);
            if(++count>=3)break;
        }
        if(count==0)add(alternatives,text("No se han encontrado alternativas con huecos confirmados.",13,MUTED,false),8);
    }
    private String distance(double meters){return meters<1000?Math.round(meters)+" m":String.format(Locale.forLanguageTag("es-ES"),"%.1f km",meters/1000);}
    private void addNavigationButtons(LinearLayout parent,Station s){
        LinearLayout row=new LinearLayout(this);row.setOrientation(LinearLayout.HORIZONTAL);
        add(parent,row,10);
        Button cycle=button("Ir en bici",true),walk=button("A pie",false);
        row.addView(cycle,new LinearLayout.LayoutParams(0,dp(46),1));
        LinearLayout.LayoutParams wp=new LinearLayout.LayoutParams(0,dp(46),1);wp.leftMargin=dp(8);row.addView(walk,wp);
        cycle.setOnClickListener(v->navigate(s,"b"));
        walk.setOnClickListener(v->navigate(s,"w"));
    }
    private void navigate(Station s,String mode){
        String coord=s.lat+","+s.lon;
        try{
            Intent g=new Intent(Intent.ACTION_VIEW,Uri.parse("google.navigation:q="+coord+"&mode="+mode));
            g.setPackage("com.google.android.apps.maps");
            startActivity(g);
        }catch(ActivityNotFoundException ex){
            String type=mode.equals("b")?"bicycling":"walking";
            try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse("https://www.google.com/maps/dir/?api=1&destination="+coord+"&travelmode="+type)));}
            catch(ActivityNotFoundException other){new AlertDialog.Builder(this).setMessage("Necesitas Google Maps o un navegador.").setPositiveButton("Aceptar",null).show();}
        }
    }
}
