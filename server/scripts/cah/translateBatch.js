// Traduce por lotes (Message Batches API) el subconjunto en inglés generado por
// buildSourceDeck.js (data/cah/source/{black,white}.en.json) al español,
// preservando el humor y marcando needsReview en las cartas que dependan de
// juegos de palabras o referencias culturales estadounidenses intraducibles.
//
// Requiere:
//   - npm install @anthropic-ai/sdk   (ya añadido a server/package.json)
//   - variable de entorno ANTHROPIC_API_KEY (o sesión de `ant auth login`)
//
// NO se ejecuta como parte del pipeline de desarrollo normal: es un paso manual,
// deliberado, que se corre una vez (o cada vez que se amplíen los packs elegidos).
// Tiene un coste de API real, aunque pequeño para este volumen de cartas.
//
// Uso: node server/scripts/cah/translateBatch.js
const fs = require("fs")
const path = require("path")
const Anthropic = require("@anthropic-ai/sdk")

const MODEL = "claude-opus-4-8"
const BLACK_BATCH_SIZE = 25
const WHITE_BATCH_SIZE = 40
const POLL_INTERVAL_MS = 30000

const SOURCE_DIR = path.join(__dirname, "..", "..", "data", "cah", "source")
const ES_DIR = path.join(__dirname, "..", "..", "data", "cah", "es")
const BLACK_EN_PATH = path.join(SOURCE_DIR, "black.en.json")
const WHITE_EN_PATH = path.join(SOURCE_DIR, "white.en.json")
const BLACK_ES_PATH = path.join(ES_DIR, "black.json")
const WHITE_ES_PATH = path.join(ES_DIR, "white.json")

const SYSTEM_PROMPT = `Eres un traductor y adaptador de humor para el juego de cartas "Cartas Contra la Humanidad" (Cards Against Humanity), traduciendo del inglés original al español.

Reglas:
1. No traduzcas literalmente si el original depende de un juego de palabras, un modismo o una referencia cultural estadounidense sin equivalente directo en español. En esos casos, ADAPTA la carta a una versión igual de graciosa/incómoda en español, aunque el contenido literal cambie.
2. Preserva el tono adulto, irreverente y políticamente incorrecto del original. No suavices ni censures el contenido.
3. Las cartas negras contienen "_____" donde va el hueco — consérvalo exactamente igual, en la misma posición relativa dentro de la frase. No añadas ni quites huecos.
4. Cada carta del lote es independiente: no reutilices el texto de una carta en otra.
5. Devuelve SIEMPRE una traducción para cada id recibido, en el mismo orden, sin omitir ninguna.
6. needsReview=true cuando: (a) tuviste que adaptar/inventar por un juego de palabras o referencia cultural intraducible, (b) el resultado es una adaptación libre y no una traducción directa, o (c) tienes dudas razonables sobre si la adaptación mantiene la gracia original. reviewReason debe explicar en una frase corta el motivo (ej: "juego de palabras con 'sixty-nine'", "referencia a Applebee's sin equivalente directo en España").
7. needsReview=false y reviewReason="" cuando la traducción es directa y no requiere revisión humana.`

const TRANSLATION_SCHEMA = {
  type: "object",
  properties: {
    translations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          text: { type: "string" },
          needsReview: { type: "boolean" },
          reviewReason: { type: "string" }
        },
        required: ["id", "text", "needsReview", "reviewReason"],
        additionalProperties: false
      }
    }
  },
  required: ["translations"],
  additionalProperties: false
}

function chunk(array, size) {
  const chunks = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

function byNumericId(a, b) {
  return parseInt(a.id.split("-")[1], 10) - parseInt(b.id.split("-")[1], 10)
}

function loadExistingById(filePath) {
  if (!fs.existsSync(filePath)) return new Map()
  const arr = JSON.parse(fs.readFileSync(filePath, "utf8"))
  return new Map(arr.map(c => [c.id, c]))
}

function buildRequests(cards, customPrefix, batchSize) {
  return chunk(cards, batchSize).map((cardsInBatch, index) => ({
    custom_id: `${customPrefix}-${index}`,
    params: {
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: TRANSLATION_SCHEMA }
      },
      system: SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: JSON.stringify(cardsInBatch.map(c => ({ id: c.id, text: c.text, pick: c.pick })))
      }]
    }
  }))
}

async function pollUntilDone(client, batchId) {
  for (;;) {
    const batch = await client.messages.batches.retrieve(batchId)
    const { processing, succeeded, errored, canceled, expired } = batch.request_counts
    console.log(
      `[batch ${batchId}] estado=${batch.processing_status} procesando=${processing} ` +
      `ok=${succeeded} error=${errored} cancelado=${canceled} expirado=${expired}`
    )
    if (batch.processing_status === "ended") return batch
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}

async function collectTranslations(client, batchId) {
  const translatedById = new Map()
  for await (const result of await client.messages.batches.results(batchId)) {
    if (result.result.type !== "succeeded") {
      console.error(`Request ${result.custom_id} no tuvo éxito: ${result.result.type}`)
      continue
    }
    const textBlock = result.result.message.content.find(b => b.type === "text")
    if (!textBlock) {
      console.error(`Request ${result.custom_id}: no se encontró bloque de texto en la respuesta`)
      continue
    }
    const parsed = JSON.parse(textBlock.text)
    parsed.translations.forEach(t => translatedById.set(t.id, t))
  }
  return translatedById
}

function mergeAndWrite(sourceCards, translatedById, existingById, outPath) {
  const merged = new Map(existingById)

  sourceCards.forEach(sourceCard => {
    const existing = merged.get(sourceCard.id)
    if (existing && existing.reviewedBy) {
      // Ya revisado a mano por el grupo: no lo pisamos en re-ejecuciones
      return
    }
    const translated = translatedById.get(sourceCard.id)
    if (!translated) {
      console.warn(`Aviso: no llegó traducción para ${sourceCard.id}, se deja sin traducir`)
      return
    }
    merged.set(sourceCard.id, {
      id: sourceCard.id,
      packId: sourceCard.packId,
      text: translated.text,
      ...(sourceCard.pick !== undefined ? { pick: sourceCard.pick } : {}),
      needsReview: translated.needsReview,
      reviewReason: translated.reviewReason || ""
    })
  })

  const final = [...merged.values()].sort(byNumericId)
  fs.writeFileSync(outPath, JSON.stringify(final, null, 2))
  return final
}

async function translateDeck(client, sourceCards, customPrefix, batchSize, esPath) {
  if (sourceCards.length === 0) return []

  const requests = buildRequests(sourceCards, customPrefix, batchSize)
  console.log(`Enviando ${requests.length} requests en un único batch (${sourceCards.length} cartas, lotes de ${batchSize})...`)

  const created = await client.messages.batches.create({ requests })
  console.log(`Batch creado: ${created.id}`)

  await pollUntilDone(client, created.id)
  const translatedById = await collectTranslations(client, created.id)

  const existingById = loadExistingById(esPath)
  const final = mergeAndWrite(sourceCards, translatedById, existingById, esPath)
  console.log(`Escritas ${final.length} cartas en ${esPath}`)
  return final
}

async function main() {
  if (!fs.existsSync(BLACK_EN_PATH) || !fs.existsSync(WHITE_EN_PATH)) {
    console.error("Faltan black.en.json / white.en.json. Ejecuta antes: node buildSourceDeck.js")
    process.exit(1)
  }

  fs.mkdirSync(ES_DIR, { recursive: true })

  const client = new Anthropic()

  const blackCards = JSON.parse(fs.readFileSync(BLACK_EN_PATH, "utf8"))
  const whiteCards = JSON.parse(fs.readFileSync(WHITE_EN_PATH, "utf8"))

  const blackFinal = await translateDeck(client, blackCards, "black", BLACK_BATCH_SIZE, BLACK_ES_PATH)
  const whiteFinal = await translateDeck(client, whiteCards, "white", WHITE_BATCH_SIZE, WHITE_ES_PATH)

  const needsReviewCount = [...blackFinal, ...whiteFinal].filter(c => c.needsReview).length
  console.log(`\nTraducción completa. ${needsReviewCount} cartas marcadas needsReview para revisión manual del grupo.`)
}

if (require.main === module) {
  main().catch(err => {
    console.error("Error en la traducción por lotes:", err)
    process.exit(1)
  })
}

module.exports = { buildRequests, mergeAndWrite, TRANSLATION_SCHEMA }
