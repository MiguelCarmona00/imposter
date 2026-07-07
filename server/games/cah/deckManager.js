// Barajado Fisher-Yates
function shuffle(array) {
  const copy = [...array]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

// Roba `count` cartas de `deck`. Si no alcanzan, baraja `discard` y lo añade al
// mazo antes de seguir robando (así nunca se repite una carta ya vista salvo
// que el mazo completo se haya agotado y reciclado). No muta los arrays de entrada.
function draw(deck, discard, count) {
  let currentDeck = [...deck]
  let currentDiscard = [...discard]
  const drawn = []

  while (drawn.length < count) {
    if (currentDeck.length === 0) {
      if (currentDiscard.length === 0) {
        // No quedan cartas en todo el juego (mazo + descarte agotados)
        break
      }
      currentDeck = shuffle(currentDiscard)
      currentDiscard = []
    }
    drawn.push(currentDeck.pop())
  }

  return { drawn, deck: currentDeck, discard: currentDiscard }
}

module.exports = { shuffle, draw }
