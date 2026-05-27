# Diagnóstico de Cultura de Innovación · BARNA

Página web autoaplicable que reemplaza el Google Form de la investigación.
El encuestado completa 50 ítems Likert + 5 preguntas abiertas, y al terminar
ve **al instante** un gráfico de araña con las 8 dimensiones culturales y el
**perfil cultural** que mejor describe a su empresa, según el marco del
documento `Diagnostico_Cultura_Innovacion_ARREGLADO (Aleatorio)`.

## Estructura

```
index.html             ← Wizard de 4 pasos + resultados
styles.css             ← Estilos (mobile-first, print/PDF)
js/questions.js        ← 9 demográficas + 50 Likert + 5 abiertas
js/profiles.js         ← 14 perfiles + fallback, motor de evaluación
js/app.js              ← Wizard, scoring, radar (Chart.js), webhook
js/profiles.test.html  ← Pruebas en el navegador del motor de perfiles
apps-script/webhook.gs ← Web App que recibe respuestas y las guarda en Sheets
```

## Probar localmente

Cualquier servidor estático sirve. Por ejemplo:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Pruebas del motor de perfiles: abrir
`http://localhost:8000/js/profiles.test.html`. Debe mostrar **17/17 PASS**.

## Conectar a Google Sheets

1. Abre la Google Sheet donde quieras recolectar las respuestas (puede ser
   una hoja nueva o la misma de la investigación).
2. **Extensiones → Apps Script**. Pega el contenido de
   `apps-script/webhook.gs` en `Code.gs`.
3. **Implementar → Nueva implementación**:
   - Tipo: *Aplicación web*.
   - Ejecutar como: *yo* (tu cuenta).
   - Quién tiene acceso: *Cualquier persona*.
   - Implementar y **copiar la URL** que termina en `/exec`.
4. Pega esa URL en [js/app.js](js/app.js) en la constante `WEBHOOK_URL`.

La hoja `Respuestas web` se crea automáticamente en la primera respuesta, con
una columna por cada campo demográfico, cada ítem Likert (`D1.1` … `D8.6`),
cada pregunta abierta, los 8 promedios, las 8 clasificaciones y el perfil
final.

## Publicar la página

### Opción 1 — GitHub Pages (recomendado, gratis)

```bash
git init
git add .
git commit -m "Diagnóstico de cultura de innovación · v1"
git branch -M main
git remote add origin git@github.com:<usuario>/Encuesta-barna.git
git push -u origin main
```

Luego en GitHub → *Settings → Pages → Source: Deploy from a branch → main /
(root) → Save*. En ~1 min la página estará en
`https://<usuario>.github.io/Encuesta-barna/`.

### Opción 2 — Netlify (arrastrar y soltar)

Arrastra la carpeta completa en [app.netlify.com/drop](https://app.netlify.com/drop).

## Calibración

Si quieres ajustar los umbrales Alto/Medio/Bajo (por defecto < 2.5, ≥ 3.75),
edita las constantes `THRESHOLDS` al inicio de [js/profiles.js](js/profiles.js)
y vuelve a abrir `profiles.test.html` para confirmar que las reglas siguen
clasificando correctamente.

## Marco de los 14 perfiles

Las reglas siguen el documento "Reglas de perfiles culturales · ajustadas al
marco 6.2 del instrumento". El primer match gana; el orden va de más
específico a más general. Si nada matchea, se devuelve **"Perfil mixto / en
transición"**.

| # | Perfil | Condición |
|---|--------|-----------|
| 1 | Cultura abierta con presión operativa | D1·D2·D3·D7·D8 Alto + D4 Bajo |
| 2 | Cultura de innovación abierta | D1·D2·D3·D7·D8 Alto |
| 3 | Cultura abierta con rezago digital | D1·D2·D7·D8 Alto + D6 Bajo/Medio |
| 4 | Aprendizaje distribuido avanzado | D2·D6·D7 Alto |
| 5 | Aprendizaje distribuido incipiente | D2·D6 Alto + D7 Medio |
| 6 | Aprendizaje distribuido con silos | D2·D6 Alto + D7 Bajo |
| 7 | Burocracia innovadora liderada | D3·D8 Alto + D4·D5 Bajo/Medio |
| 8 | Cultura reactiva con liderazgo impulsor | D4 Bajo + D1·D5 Bajo/Medio + D8 Alto |
| 9 | Burocracia innovadora | D3 Alto + D4·D5 Bajo |
| 10 | Cultura reactiva de urgencia | D4·D1·D5 Bajo |
| 11 | Cultura reactiva basada en datos | D4 Bajo + D1·D5 Bajo/Medio + D3 Alto |
| 12 | Burocracia innovadora con fricción adaptativa | D3 Alto + D4·D5 Bajo/Medio |
| 13 | Innovación centralizada en transición colaborativa | D8 Alto + D2 Bajo + D7 Medio |
| 14 | Innovación centralizada y frágil | D8 Alto + D2 Bajo + D7 Bajo |
| – | Perfil mixto / en transición | Fallback |
