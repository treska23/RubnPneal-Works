# KID D — disco vivo

Micrositio musical independiente. La portada muestra la lista de canciones y un reproductor HTML5 persistente al navegar por las secciones de la página. Incluye galería y vídeos.

## Publicar canciones

1. Coloca el MP3, M4A u OGG en un almacenamiento público y estable que entregue el archivo directamente por HTTPS (o en `kid-d-site/media/` si el repositorio admite el tamaño).
2. Edita `kid-d-site/content.json` y añade un objeto a `tracks`:

```json
{"title":"Título de la canción","subtitle":"KID D","src":"https://servidor.com/tema.mp3","duration":"3:42"}
```

Las canciones salen en el orden del JSON. Se reproducen de forma secuencial. La web no arranca audio automáticamente para respetar las restricciones de navegadores.

## Ilustraciones y vídeos

Edita `artwork` con `{"title":"Título","src":"https://.../imagen.jpg"}`. Para vídeos, añade `{"title":"Título","url":"https://www.youtube.com/watch?v=...","poster":"https://.../miniatura.jpg"}`. Los vídeos se abren en una pestaña nueva.

## Estado

Estructura y reproductor funcionales. Las canciones y vídeos reales aún no están incorporados porque no se ha obtenido acceso directo a los ficheros de OneDrive compartidos. Las dos imágenes iniciales proceden del portfolio de RubnPneal.

## Desarrollo

Sitio estático sin dependencias. Abre `index.html` con servidor local o publica la carpeta `kid-d-site` como raíz en un hosting estático. El contenido se lee de `content.json`.
