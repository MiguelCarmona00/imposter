// Filtra el dataset oficial (data/cah/source/raw-official.json) a los packs
// elegidos en selectedPacks.json, asigna ids estables (b-<índice> / w-<índice>,
// el índice global del dataset — así el id no cambia aunque se reordenen los
// packs elegidos) y escribe el subconjunto en inglés listo para traducir:
//   data/cah/source/black.en.json
//   data/cah/source/white.en.json
//
// Uso: node server/scripts/cah/buildSourceDeck.js
const fs = require("fs")
const path = require("path")

const RAW_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "raw-official.json")
const SELECTED_PACKS_PATH = path.join(__dirname, "selectedPacks.json")
const OUT_BLACK_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "black.en.json")
const OUT_WHITE_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "white.en.json")

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function byNumericId(a, b) {
  const na = parseInt(a.id.split("-")[1], 10)
  const nb = parseInt(b.id.split("-")[1], 10)
  return na - nb
}

function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error(`No existe ${RAW_PATH}. Ejecuta antes: node downloadDataset.js`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"))
  const selectedNames = JSON.parse(fs.readFileSync(SELECTED_PACKS_PATH, "utf8"))

  const selectedPacks = selectedNames.map(name => {
    const pack = raw.packs.find(p => p.name === name && p.official)
    if (!pack) {
      throw new Error(
        `Pack oficial no encontrado: "${name}". Revisa el nombre exacto contra el catálogo ` +
        `(node listPacks.js) y corrígelo en selectedPacks.json.`
      )
    }
    return { name, slug: slugify(name), pack }
  })

  const whiteEntries = new Map() // índice global -> carta
  const blackEntries = new Map()

  selectedPacks.forEach(({ slug, pack }) => {
    new Set(pack.white).forEach(index => {
      if (!whiteEntries.has(index)) {
        whiteEntries.set(index, {
          id: `w-${index}`,
          packId: slug,
          text: raw.white[index]
        })
      }
    })

    new Set(pack.black).forEach(index => {
      if (!blackEntries.has(index)) {
        const card = raw.black[index]
        blackEntries.set(index, {
          id: `b-${index}`,
          packId: slug,
          text: card.text.replace(/_+/g, "_____"),
          pick: card.pick
        })
      }
    })
  })

  const whiteCards = [...whiteEntries.values()].sort(byNumericId)
  const blackCards = [...blackEntries.values()].sort(byNumericId)

  fs.writeFileSync(OUT_WHITE_PATH, JSON.stringify(whiteCards, null, 2))
  fs.writeFileSync(OUT_BLACK_PATH, JSON.stringify(blackCards, null, 2))

  console.log(`Packs seleccionados: ${selectedPacks.map(p => p.name).join(", ")}`)
  console.log(`Cartas blancas únicas: ${whiteCards.length}`)
  console.log(`Cartas negras únicas: ${blackCards.length}`)
  console.log(`Total: ${whiteCards.length + blackCards.length} cartas`)
  console.log(`\nEscrito en:\n  ${OUT_WHITE_PATH}\n  ${OUT_BLACK_PATH}`)
  console.log(`\nSiguiente paso (cuando quieras traducir): node translateBatch.js`)
}

main()
