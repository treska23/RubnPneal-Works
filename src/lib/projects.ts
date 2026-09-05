export const projects = [
  {
    slug: 'tinta-es',
    name: 'Tinta ES',
    status: 'Lector y traducción local',
    title: 'Tinta ES: leer y traducir cómics al español en Windows',
    description:
      'Lector de cómics para Windows con OCR y traducción local: conserva la página original y muestra el texto traducido al pulsar sobre él.',
    tags: ['C#', '.NET 10', 'WPF', 'Ollama', 'OCR'],
    href: 'https://github.com/treska23/TintaES',
    intro:
      'Entender un cómic en otro idioma no debería obligarte a sustituir sus dibujos. Tinta ES mantiene la página intacta y permite consultar la traducción de cada texto en una tarjeta temporal.',
    uses: [
      [
        'Leer sin alterar la página',
        'Pulsa sobre un texto detectado para consultar su traducción al español mientras conservas la imagen original.',
      ],
      [
        'Organizar una lectura',
        'Abre imágenes, carpetas o archivos CBZ y guarda el trabajo en un proyecto .tinta.',
      ],
      [
        'Revisar la traducción',
        'Corrige las traducciones del proyecto. El OCR y la traducción automática requieren revisión, especialmente en tipografías y composiciones difíciles.',
      ],
    ],
    requirements:
      'Windows 10 2004 o posterior, SDK .NET 10, entorno Python 3.11 y los motores y modelos indicados en el repositorio. Utiliza PaddleOCR-VL y Ollama con TranslateGemma; una GPU NVIDIA con CUDA es recomendable. Los modelos y entornos se preparan por separado.',
    start:
      'Consulta el README y prepara sus dependencias y submódulo. Con el entorno listo, inicia Ollama y la aplicación mediante iniciar.bat; abre una página y utiliza «Detectar y traducir».',
    faqs: [
      [
        '¿Modifica el dibujo original?',
        'La vista de lectura conserva los píxeles originales. La traducción aparece en una tarjeta al pulsar sobre el texto.',
      ],
      [
        '¿Necesita una API de traducción de pago?',
        'El flujo documentado funciona con modelos locales, sin claves de APIs de pago. Primero hay que preparar y descargar los modelos necesarios.',
      ],
    ],
  },
  {
    slug: 'drum-practice-studio',
    name: 'Drum Practice Studio',
    status: 'Prototipo para Windows',
    title: 'Drum Practice Studio: practicar batería con MIDI en Windows',
    description:
      'Practica batería con MIDI, acompañamientos y grabación en Windows. Conoce Drum Practice Studio y su separación local de pistas con Demucs.',
    tags: ['.NET 10', 'MIDI', 'ASIO', 'VST3', 'Demucs'],
    href: 'https://github.com/treska23/Drumless',
    intro:
      'Drum Practice Studio reúne instrumento, acompañamiento y grabación para preparar una sesión de práctica musical en Windows. El proyecto está en desarrollo y su código incluye instrucciones para ejecutarlo.',
    uses: [
      [
        'Tocar y preparar un kit',
        'Usa una entrada MIDI o el ratón para tocar los pads. Puedes importar sonidos WAV y comenzar con los kits de demostración sintetizados.',
      ],
      [
        'Practicar con acompañamiento',
        'Separa una pista local con Demucs y ajusta la mezcla de sus instrumentos, incluida la batería, conservando el archivo original.',
      ],
      [
        'Escuchar y revisar una sesión',
        'Graba la mezcla y revisa la precisión temporal de los golpes MIDI. Comprueba el tempo detectado antes de usarlo como referencia.',
      ],
    ],
    requirements:
      'Windows de 64 bits y SDK .NET 10. La separación requiere preparar Demucs, Python y PyTorch. Los instrumentos VST3 se instalan por separado y el anfitrión VST3 usa tecnología en fase preview.',
    start:
      'Sigue las instrucciones del repositorio y ejecuta dotnet run desde el proyecto en un equipo preparado. Empieza con un kit de demostración y una pista local antes de configurar instrumentos externos.',
    faqs: [
      [
        '¿Puedo bajar la batería de una canción?',
        'La separación local permite ajustar seis pistas o stems, entre ellas la batería. El resultado depende del audio y del modelo de separación.',
      ],
      [
        '¿Incluye instrumentos VST3 comerciales?',
        'No se documenta su inclusión. Debes disponer de tus propios instrumentos y comprobar su compatibilidad con el anfitrión.',
      ],
    ],
  },
  {
    slug: 'controlpcia',
    name: 'ControlPCIA',
    status: 'Windows + Android',
    title: 'ControlPCIA: controlar un PC Windows desde Android',
    description:
      'Controla aplicaciones, ventanas y multimedia de Windows desde Android en tu red privada. ControlPCIA combina funciones concretas e IA local opcional.',
    tags: ['.NET 10', 'Windows', 'Android', 'Ollama', 'LAN'],
    href: 'https://github.com/treska23/ControlPCIA',
    intro:
      'ControlPCIA conecta el móvil con funciones concretas de un ordenador Windows dentro de una red privada. Permite manejar aplicaciones, ventanas y reproducción multimedia; Ollama amplía la interpretación de órdenes.',
    uses: [
      [
        'Abrir y organizar',
        'Abre aplicaciones o páginas web y organiza ventanas y pantallas desde el móvil.',
      ],
      [
        'Controlar la reproducción',
        'Maneja funciones multimedia o utiliza el teléfono como ratón y teclado remoto.',
      ],
      [
        'Preparar el encendido remoto',
        'Configura Wake-on-LAN en un equipo compatible después de emparejarlo y guardar sus datos de red.',
      ],
    ],
    requirements:
      'Windows 10 u 11, .NET 10 y el móvil conectado a la misma red privada. Ollama es opcional para las funciones deterministas. Wake-on-LAN depende de la BIOS/UEFI, la tarjeta de red y el estado del equipo.',
    start:
      'Consulta el README, restaura las dependencias y ejecuta el proyecto en modo servidor. Empareja el móvil con el código mostrado por el PC y prueba primero una función concreta, como el control multimedia.',
    faqs: [
      [
        '¿Hace falta Ollama para todas las funciones?',
        'No. Las funciones deterministas de aplicaciones, ventanas, pantallas y multimedia siguen funcionando sin Ollama.',
      ],
      [
        '¿Puede controlar cualquier aplicación por dentro?',
        'El proyecto ofrece funciones concretas de Windows y entrada remota; no promete control interno general de todas las aplicaciones.',
      ],
    ],
  },
];
