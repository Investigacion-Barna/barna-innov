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
- Una **lectura detallada por ítem** según la Matriz de Interpretación del
  instrumento, con filtro para ver sólo los ítems bajos o sólo los altos.
- Botón para **descargar el reporte en PDF** (incluye todo el análisis).

El backend opcional escribe cada respuesta en una Google Sheet vía Apps
Script, con token compartido, honeypot y validación de payload contra abuso
automatizado.

## Estructura

```
index.html               ← Wizard de 4 pasos + resultados
styles.css               ← Estilos BARNA (mobile-first, print/PDF)
js/questions.js          ← 9 demográficas + 50 Likert + 5 abiertas
js/profiles.js           ← 5 perfiles puros + fallback, evaluador y cercanía
js/matrix.js             ← Matriz de Interpretación · 50 ítems con narrativa
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
5. **Análisis por ítem.** Para cada ítem, según el score del encuestado
   (1–2 → Bajo, 3 → Medio, 4–5 → Alto), se muestra la lectura interpretativa
   correspondiente extraída de la Matriz de Interpretación, junto con la
   señal diagnóstica que el ítem mide (ej. "Seguridad psicológica frente al
   error", "Tiempo protegido para innovación").
6. **Filtro.** Tres chips encima del análisis: *Todos*, *▼ Sólo bajos*,
   *▲ Sólo altos*. Al filtrar, las dimensiones sin ítems del nivel
   seleccionado se ocultan y las restantes se expanden, para enfocar de
   inmediato fortalezas o debilidades.

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

- **Interpretación por ítem**: editar el array `items` en
  [js/matrix.js](js/matrix.js). Cada ítem tiene `low`, `mid`, `high`,
  `signal` (etiqueta corta) y `text` (la pregunta original).

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

## Matriz de Interpretación

Fuente: hoja **"Matriz de Interpretación"** del archivo de la investigación.
50 filas (una por ítem Likert), agrupadas en las 8 dimensiones oficiales del
instrumento:

- **D1** · Relación con el error y la incertidumbre
- **D2** · Poder, jerarquía y origen de las ideas
- **D3** · Cultura de datos vs. intuición e improvisación
- **D4** · Relación con el tiempo y la velocidad
- **D5** · Identidad organizacional y apertura al cambio
- **D6** · Capacidades digitales y disposición hacia la IA
- **D7** · Colaboración, silos y capital social interno
- **D8** · Liderazgo y modelaje de comportamientos innovadores

Cada ítem define una **señal diagnóstica** y tres narrativas (1-2 Bajo,
3 Medio, 4-5 Alto) que se muestran al encuestado según su respuesta. En el
resultado web cada ítem aparece como una tarjeta color-coded (rojo / ámbar /
verde) con código, señal, score y la lectura interpretativa exacta.

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
