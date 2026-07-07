// Lista los packs oficiales del dataset descargado (data/cah/source/raw-official.json)
// con su nombre y número de cartas, para poder elegir en concreto cuáles van en
// selectedPacks.json. Guarda también un resumen en data/cah/source/packs-catalog.json.
//
// Uso: node server/scripts/cah/listPacks.js
const fs = require("fs")
const path = require("path")

const RAW_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "raw-official.json")
const CATALOG_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "packs-catalog.json")

function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error(`No existe ${RAW_PATH}. Ejecuta antes: node downloadDataset.js`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"))
  const official = raw.packs.filter(p => p.official)

  const catalog = official
    .map(p => ({
      name: p.name,
      whiteCount: new Set(p.white).size,
      blackCount: new Set(p.black).size
    }))
    .sort((a, b) => (b.whiteCount + b.blackCount) - (a.whiteCount + a.blackCount))

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2))

  console.log(`${official.length} packs oficiales de ${raw.packs.length} totales en el dataset (incluye packs de fans).\n`)
  console.log("nombre".padEnd(65), "blancas".padStart(8), "negras".padStart(8), "total".padStart(8))
  console.log("-".repeat(90))
  catalog.forEach(p => {
    const total = p.whiteCount + p.blackCount
    console.log(p.name.padEnd(65), String(p.whiteCount).padStart(8), String(p.blackCount).padStart(8), String(total).padStart(8))
  })

  const totalW = catalog.reduce((s, p) => s + p.whiteCount, 0)
  const totalB = catalog.reduce((s, p) => s + p.blackCount, 0)
  console.log("-".repeat(90))
  console.log(`Total oficial: ${totalW} blancas + ${totalB} negras = ${totalW + totalB} cartas.`)
  console.log(`\nCatálogo guardado en: ${CATALOG_PATH}`)
  console.log(`Siguiente paso: edita selectedPacks.json con los nombres exactos que quieras incluir, luego node buildSourceDeck.js`)
}

main()
