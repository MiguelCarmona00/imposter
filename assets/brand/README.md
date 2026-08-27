# Imágenes de marca

Archivos fuente del icono. No se usan en tiempo de ejecución: lo que sirve la
web vive en `client/public/`. Están aquí porque no se pueden regenerar — si se
pierden hay que rehacer el diseño.

- **`pica.ico`** — icono actual ("Lounge"). Una única imagen de 256×256
  comprimida en PNG. Es el mismo archivo que `client/public/pica.ico` y
  `client/public/favicon.ico`; si se cambia, hay que copiarlo a los dos sitios.
- **`logo.png`** — diseño anterior (sombrero y gafas, 1024×1024), descartado
  como favicon porque a tamaño de pestaña es negro sobre negro y sus líneas
  doradas miden menos de un píxel. Se conserva por si sirve para otra cosa.

## Si hace falta afinar el icono

El `.ico` actual solo contiene 256×256, así que el navegador lo reduce al vuelo
para la pestaña (16 o 32 px según la pantalla). Para que se vea más nítido
habría que generar un `.ico` con entradas de 16 y 32 dibujadas a propósito, en
vez de dejar que las escale el navegador.

Para el móvil, un `apple-touch-icon` de 180×180 haría que el icono se vea bien
al añadir la página a la pantalla de inicio.
