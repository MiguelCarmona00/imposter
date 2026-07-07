// Descarga (una sola vez) el dataset compacto oficial de JSON Against Humanity
// (https://github.com/crhallberg/json-against-humanity) y lo guarda tal cual en
// data/cah/source/raw-official.json. No requiere clave de API de Claude ni tiene
// coste: es solo un fetch a un archivo JSON público.
//
// Uso: node server/scripts/cah/downloadDataset.js
const fs = require("fs")
const path = require("path")
const https = require("https")

const DATASET_URL = "https://raw.githubusercontent.com/crhallberg/json-against-humanity/latest/cah-all-compact.json"
const OUT_PATH = path.join(__dirname, "..", "..", "data", "cah", "source", "raw-official.json")

function download(url, outPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location, outPath).then(resolve, reject)
        return
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Descarga fallida: HTTP ${res.statusCode}`))
        return
      }
      const chunks = []
      res.on("data", (chunk) => chunks.push(chunk))
      res.on("end", () => {
        fs.writeFileSync(outPath, Buffer.concat(chunks))
        resolve()
      })
      res.on("error", reject)
    }).on("error", reject)
  })
}

async function main() {
  console.log(`Descargando dataset compacto de JSON Against Humanity...\n${DATASET_URL}`)
  await download(DATASET_URL, OUT_PATH)

  const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"))
  const officialCount = data.packs.filter(p => p.official).length

  console.log(
    `Descarga completa: ${data.white.length} cartas blancas, ${data.black.length} cartas negras, ` +
    `${data.packs.length} packs (${officialCount} oficiales).`
  )
  console.log(`Guardado en: ${OUT_PATH}`)
  console.log(`\nSiguiente paso: node listPacks.js`)
}

main().catch(err => {
  console.error("Error al descargar el dataset:", err.message)
  process.exit(1)
})
