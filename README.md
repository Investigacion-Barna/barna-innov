# Diagnóstico de Cultura de Innovación · BARNA

Página web autoaplicable que reemplaza el Google Form de la investigación
BARNA. El encuestado completa **9 datos demográficos + 50 ítems Likert +
5 preguntas abiertas** y al terminar ve **al instante**:

- Un **gráfico de araña** con sus 8 dimensiones culturales (escala 1–5).
- El **perfil cultural** que mejor describe a su empresa. Si encaja
  exactamente en uno de los 5 perfiles puros, se muestra ese. Si no, se
  presenta como una **mezcla de los 2 perfiles puros más cercanos**
  (ej. *"Burocracia innovadora + Aprendizaje distribuido incipiente"*),
  con descripción y riesgos sintetizados de ambos perfiles.
- Un **detalle por dimensión** con el promedio, el nivel (Alto/Medio/Bajo)
  y un **feedback corto** específico para cada combinación dimensión + nivel.
- Botón para **descargar el reporte en PDF** (incluye todo el análisis).

El backend opcional escribe cada respuesta en una Google Sheet vía Apps
Script, con token compartido, honeypot y validación de payload contra abuso
automatizado.

## Estructura

```
index.html               ← Wizard de 4 pasos + resultados
styles.css               ← Estilos BARNA (mobile-first, print/PDF)
js/questions.js          ← Demográficas + 50 Likert + 5 abiertas + feedback por dim
js/profiles.js           ← 5 perfiles puros + fallback, evaluador y cercanía
js/matrix.js             ← Matriz de Interpretación · referencia documental (no en uso)
js/app.js                ← Wizard, scoring, radar (Chart.js), webhook
js/profiles.test.html    ← Pruebas en el navegador del motor de perfiles
apps-script/webhook.gs   ← Web App que recibe respuestas y las guarda en Sheets
scripts/generate-demos.js← Generador de los 25 demos para presentación
demos/                   ← 25 HTMLs autocontenidos · uno por resultado posible
```

## Cómo funciona el resultado

1. **Cálculo de promedios.** Para cada dimensión D1..D8 se promedian los
   ítems Likert (6 o 7 por dimensión).
2. **Clasificación.** Cada promedio cae en Alto (≥ 3.75), Medio (2.5–3.74) o
   Bajo (< 2.5). Umbrales editables en `THRESHOLDS` al inicio de
   [js/profiles.js](js/profiles.js).
3. **Asignación de perfil.** Se evalúan los 5 perfiles puros en orden de
   especificidad. El primero cuyas condiciones se cumplan todas gana.
4. **Mezcla de perfiles cuando ninguno matchea exactamente.** Para cada
   perfil puro se calcula `cumplidos − 0.5 × desviación`, donde desviación
   es la distancia ordinal (Alto–Bajo cuenta 2; Alto–Medio o Medio–Bajo
   cuentan 1). Los 2 perfiles con mejor score se combinan en una tarjeta
   "*A + B*" con su porcentaje de coincidencia, descripciones sintetizadas
   y los riesgos de transformación de ambos. En el dataset interno estos
   casos se etiquetan como `mixto_transicion` para facilitar el análisis.
5. **Feedback por dimensión.** Cada una de las 8 dimensiones se presenta
   como una tarjeta con su promedio, su clasificación (Alto/Medio/Bajo) y un
   párrafo corto que describe qué significa ese resultado para la
   organización. Los textos están definidos por (dim × nivel) = 24 lecturas
   en `Q.dimensions[D#].feedback` dentro de [js/questions.js](js/questions.js).

## Probar localmente

Cualquier servidor estático sirve:

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```

Pruebas del motor de perfiles: abrir
`http://localhost:8000/js/profiles.test.html`. Debe mostrar **11/11 PASS**.

## Conectar a Google Sheets

1. Abre la Google Sheet donde quieras recolectar las respuestas.
2. **Extensiones → Apps Script**. Pega el contenido de
   [apps-script/webhook.gs](apps-script/webhook.gs) en `Code.gs`.
3. **Implementar → Nueva implementación**:
   - Tipo: *Aplicación web*.
   - Ejecutar como: *yo*.
   - Quién tiene acceso: *Cualquier persona*.
   - Implementar y **copiar la URL** que termina en `/exec`.
4. Pega esa URL en [js/app.js](js/app.js) como `WEBHOOK_URL`.
5. Define un `SHARED_TOKEN` igual en **ambos** archivos (`js/app.js` y
   `apps-script/webhook.gs`). Es una cadena arbitraria de >16 caracteres.
6. Cada vez que cambies algo en `webhook.gs`: en Apps Script,
   **Implementar → Administrar implementaciones → ✎ Editar → Versión:
   Nueva versión → Implementar**. La URL `/exec` no cambia.

La hoja `Respuestas web` se crea automáticamente en la primera respuesta,
con una columna por cada campo demográfico, cada ítem Likert (`D1.1`…`D8.6`),
cada pregunta abierta, los 8 promedios, las 8 clasificaciones y el perfil
final.

### Seguridad del webhook

El Apps Script aplica tres comprobaciones antes de escribir:

1. **Honeypot**: campo oculto `website` en el form. Si llega lleno, es bot
   y se descarta silenciosamente.
2. **Token compartido**: `SHARED_TOKEN` debe coincidir. Visible en el JS
   pero filtra el 99% del abuso automatizado.
3. **Forma del payload**: rechaza JSON malformado o con < 40 ítems Likert.

Esto detiene scripts genéricos y POST de prueba de fuerza bruta. Para un
atacante dedicado se necesitaría reCAPTCHA o auth server-side.

## Publicar la página

### Opción 1 — GitHub Pages (recomendado, gratis)

Este repositorio ya está conectado a `dearson33/barna-innov` con GitHub
Pages activo. Para hacer cambios:

```bash
git add .
git commit -m "tu mensaje"
git push
```

En ~1 min los cambios estarán en
`https://dearson33.github.io/barna-innov/`.

### Opción 2 — Netlify

Arrastra la carpeta completa en [app.netlify.com/drop](https://app.netlify.com/drop).

## Calibración

- **Umbrales Alto/Medio/Bajo** (`THRESHOLDS` en [js/profiles.js](js/profiles.js)):
  ```js
  BAJO_MAX: 2.5,   // promedio < 2.5  → Bajo
  ALTO_MIN: 3.75,  // promedio ≥ 3.75 → Alto
  ```
  Tras ajustar, abrir `js/profiles.test.html` y verificar que los 11 casos
  sigan en verde.

- **Reglas de perfiles**: cada perfil expone un array `targets` (lista de
  `{dim, nivel}`) en [js/profiles.js](js/profiles.js). Modificar ahí cambia
  tanto el matching exacto como el cálculo de cercanía.

- **Feedback por dimensión**: cada `Q.dimensions[D#]` en
  [js/questions.js](js/questions.js) expone `feedback: { Bajo, Medio, Alto }`.
  Editar ahí cambia inmediatamente lo que ve el encuestado en su tarjeta de
  detalle por dimensión y los demos pre-generados al regenerarlos.

## Marco de los 5 perfiles puros

Las reglas siguen la **Hoja 2 "Reglas de perfiles culturales · ajustadas al
marco 6.2"** del archivo de la investigación. Si la organización no cumple
ninguno de los 5 perfiles puros exactamente, el resultado se presenta como
una **mezcla de los 2 perfiles puros más cercanos** (ej. *"Burocracia
innovadora + Cultura reactiva de urgencia"*).

| # | Perfil | Condición |
|---|--------|-----------|
| 1 | Cultura de innovación abierta | D1·D2·D3·D7·D8 Alto |
| 2 | Aprendizaje distribuido incipiente | D2·D6 Alto + D7 Medio |
| 3 | Burocracia innovadora | D3 Alto + D4·D5 Bajo |
| 4 | Innovación centralizada y frágil | D8 Alto + D2·D7 Bajo |
| 5 | Cultura reactiva de urgencia | D4·D1·D5 Bajo |

## 8 dimensiones del instrumento

Las dimensiones siguen el marco oficial BARNA. Cada una con su título
amigable (mostrado al encuestado) y su feedback corto por nivel
(Alto/Medio/Bajo) que aparece en la tarjeta de detalle del resultado.

- **D1** · Aprendizaje del fallo
- **D2** · Apertura a ideas y diversidad
- **D3** · Decisiones basadas en datos
- **D4** · Tiempo y recursos para innovar
- **D5** · Disposición al cambio
- **D6** · Madurez digital e IA
- **D7** · Colaboración interdepartamental
- **D8** · Liderazgo que modela innovación

El archivo [js/matrix.js](js/matrix.js) contiene la **Matriz de
Interpretación** original (50 ítems con narrativa Bajo/Medio/Alto por ítem
+ señal diagnóstica). Hoy no se usa en runtime — sirve como referencia
documental del marco BARNA por si en el futuro se quiere volver al
análisis por ítem.

## Demos para presentación

El directorio `demos/` contiene un HTML por cada resultado posible que el
diagnóstico puede producir (5 perfiles puros + 20 mezclas ordenadas =
**25 demos**). Cada uno es una página estática autocontenida que muestra
el reporte final como lo vería un encuestado, sin tener que rellenar las
50 preguntas en vivo.

Para regenerarlos después de cambiar perfiles, matriz o estilos:

```bash
node scripts/generate-demos.js
```

El script enumera por fuerza bruta los 3⁸ = 6561 vectores posibles de
niveles, encuentra un ejemplo representativo de cada resultado, genera el
HTML correspondiente y produce un índice navegable en `demos/index.html`.

## Datos sensibles

El `.xlsx` original con respuestas reales **no se sube al repo** (está en
`.gitignore`). Si tienes que compartir el repo, asegúrate de que esa
exclusión sigue activa.
