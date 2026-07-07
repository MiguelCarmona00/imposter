// Lista los packs de fans/comunidad del dataset descargado (data/cah/source/raw-official.json)
// -- el mismo dump de JSON Against Humanity trae 205 packs en total: 71 oficiales y 134 hechos
// por la comunidad. Este script cataloga esos 134 para poder elegir cuáles traducir a mano
// como ampliación del mazo, igual que se hizo con selectedPacks.json para los oficiales.
//
// Uso: node server/scripts/cah/listFanPacks.js
const fs = require("fs")
const path = require("path")

const RAW_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "raw-official.json")
const CATALOG_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "fan-packs-catalog.json")

function main() {
  if (!fs.existsSync(RAW_PATH)) {
    console.error(`No existe ${RAW_PATH}. Ejecuta antes: node downloadDataset.js`)
    process.exit(1)
  }

  const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"))
  const officialPacks = raw.packs.filter(p => p.official)
  const fanPacks = raw.packs.filter(p => !p.official)

  const officialWhite = new Set(officialPacks.flatMap(p => p.white || []))
  const officialBlack = new Set(officialPacks.flatMap(p => p.black || []))

  const catalog = fanPacks
    .map(p => {
      const whiteIdx = new Set(p.white || [])
      const blackIdx = new Set(p.black || [])
      const whiteNew = [...whiteIdx].filter(i => !officialWhite.has(i)).length
      const blackNew = [...blackIdx].filter(i => !officialBlack.has(i)).length
      return {
        name: p.name,
        whiteCount: whiteIdx.size,
        blackCount: blackIdx.size,
        whiteNew,
        blackNew
      }
    })
    .sort((a, b) => (b.whiteCount + b.blackCount) - (a.whiteCount + a.blackCount))

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2))

  console.log(`${fanPacks.length} packs de fans de ${raw.packs.length} totales en el dataset (${officialPacks.length} son oficiales).\n`)
  console.log("nombre".padEnd(65), "blancas".padStart(8), "negras".padStart(8), "nuevas-b".padStart(9), "nuevas-n".padStart(9))
  console.log("-".repeat(100))
  catalog.forEach(p => {
    console.log(p.name.padEnd(65), String(p.whiteCount).padStart(8), String(p.blackCount).padStart(8), String(p.whiteNew).padStart(9), String(p.blackNew).padStart(9))
  })

  const totalW = catalog.reduce((s, p) => s + p.whiteCount, 0)
  const totalB = catalog.reduce((s, p) => s + p.blackCount, 0)
  const totalNewW = catalog.reduce((s, p) => s + p.whiteNew, 0)
  const totalNewB = catalog.reduce((s, p) => s + p.blackNew, 0)
  console.log("-".repeat(100))
  console.log(`Total fans (con solapes entre packs): ${totalW} blancas + ${totalB} negras = ${totalW + totalB} cartas.`)
  console.log(`Nota: "nuevas" = cartas que no están ya en ningún pack oficial (no cuentan solapes entre packs de fans entre sí).`)
  console.log(`\nCatálogo guardado en: ${CATALOG_PATH}`)
}

main()
