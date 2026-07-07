// Dataset en español de Cartas Contra la Humanidad.
//
// Hoy contiene un mazo semilla escrito a mano (packId "seed") para que el juego
// sea jugable de inmediato. El pipeline real (server/scripts/cah/) descarga el
// dataset oficial de crhallberg/json-against-humanity, filtra los packs elegidos
// y traduce por lotes con la API de Claude — al ejecutarlo, sustituye (o amplía)
// estos mismos archivos manteniendo la forma {id, text, pick} / {id, text}.
const blackCards = require("../../data/cah/es/black.json")
const whiteCards = require("../../data/cah/es/white.json")

const blackCardsById = new Map(
  blackCards.map(c => [c.id, { id: c.id, text: c.text, pick: c.pick }])
)

const whiteCardsById = new Map(
  whiteCards.map(c => [c.id, { id: c.id, text: c.text }])
)

module.exports = {
  allBlackIds: blackCards.map(c => c.id),
  allWhiteIds: whiteCards.map(c => c.id),
  blackCardsById,
  whiteCardsById
}
