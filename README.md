# Evaluación del ambiente laboral

Aplicación web estática para GitHub Pages con backend en Google Apps Script y datos normalizados en Google Sheets.

## Arquitectura

- `index.html`: formulario para el personal.
- `panel.html`: resultados con clave validada por el backend.
- `apps-script/Code.gs`: API y persistencia.
- Google Sheets: tablas `Envios`, `Personas`, `Respuestas`, `Comentarios` y `Log`.

El token público permite únicamente registrar respuestas. La clave administrativa nunca se incluye en GitHub Pages.

## Configurar Google Sheets

1. Crea una hoja en Google Sheets y copia su ID desde la URL.
2. En **Extensiones > Apps Script**, pega `apps-script/Code.gs`.
3. En `CONFIG`, reemplaza `SHEET_ID`, `WRITE_TOKEN` y `ADMIN_KEY` con valores largos y distintos.
4. Ejecuta `initialize()` una vez y autoriza el script.
5. Implementa como **Aplicación web**, ejecutando como tu cuenta y con acceso para **Cualquier usuario**.
6. Copia la URL terminada en `/exec`.
7. En `config.js`, pega esa URL en `API_URL` y el mismo `WRITE_TOKEN`. No pongas `ADMIN_KEY` en ningún archivo público.

## Publicar en GitHub Pages

Sube el contenido de esta carpeta a la raíz de un repositorio. En **Settings > Pages**, selecciona `Deploy from a branch`, rama `main`, carpeta `/ (root)`.

- Encuesta: `https://USUARIO.github.io/REPOSITORIO/`
- Resultados: `https://USUARIO.github.io/REPOSITORIO/panel.html`
- QR estático: `qr-encuesta.png`

## Criterios

Cada reactivo vale de 1 a 3. La efectividad se calcula como `puntos obtenidos / puntos máximos × 100`.

- Excelente: 85% a 100%.
- Regular: 70% a 84.9%.
- Deficiente: menos de 70%.
