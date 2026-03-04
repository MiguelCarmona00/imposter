// Biblioteca de palabras para el juego
// Cada palabra tiene una palabra, una categoría y una pista para el impostor

const wordLibrary = [

  // 🐶 Animales
  { word: "Gato", category: "Animal", hint: "Felino doméstico" },
  { word: "Elefante", category: "Animal", hint: "Animal grande con trompa" },
  { word: "Delfín", category: "Animal", hint: "Mamífero marino inteligente" },
  { word: "Águila", category: "Animal", hint: "Ave rapaz" },
  { word: "León", category: "Animal", hint: "Rey de la selva" },
  { word: "Pingüino", category: "Animal", hint: "Ave que no vuela y vive en el frío" },
  { word: "Tiburón", category: "Animal", hint: "Depredador marino" },
  { word: "Caballo", category: "Animal", hint: "Animal que se puede montar" },
  { word: "Canguro", category: "Animal", hint: "Animal con bolsa" },

  // 🍕 Comida
  { word: "Hamburguesa", category: "Comida", hint: "Comida rápida con pan" },
  { word: "Sushi", category: "Comida", hint: "Comida japonesa con arroz" },
  { word: "Paella", category: "Comida", hint: "Plato típico español con arroz" },
  { word: "Chocolate", category: "Comida", hint: "Dulce de cacao" },
  { word: "Ensalada", category: "Comida", hint: "Plato frío con verduras" },
  { word: "Taco", category: "Comida", hint: "Comida mexicana" },
  { word: "Croqueta", category: "Comida", hint: "Frita y crujiente por fuera" },

  // 🌍 Países
  { word: "España", category: "País", hint: "País europeo" },
  { word: "Japón", category: "País", hint: "País asiático insular" },
  { word: "Brasil", category: "País", hint: "País sudamericano famoso por el carnaval" },
  { word: "Canadá", category: "País", hint: "País con bandera de hoja roja" },
  { word: "Egipto", category: "País", hint: "País de las pirámides" },
  { word: "Australia", category: "País", hint: "País-continente" },

  // 🎬 Películas
  { word: "Titanic", category: "Película", hint: "Romance en un barco" },
  { word: "Avatar", category: "Película", hint: "Planeta azul" },
  { word: "Gladiator", category: "Película", hint: "Lucha en el Coliseo" },
  { word: "Frozen", category: "Película", hint: "Princesa con poderes de hielo" },
  { word: "Jurassic Park", category: "Película", hint: "Parque con dinosaurios" },

  // ⚽ Deportes
  { word: "Fútbol", category: "Deporte", hint: "Se juega con balón y pies" },
  { word: "Baloncesto", category: "Deporte", hint: "Se encesta un balón" },
  { word: "Tenis", category: "Deporte", hint: "Raqueta y pelota pequeña" },
  { word: "Natación", category: "Deporte", hint: "Se practica en el agua" },
  { word: "Boxeo", category: "Deporte", hint: "Combate con guantes" },

  // 🎮 Videojuegos
  { word: "Minecraft", category: "Videojuego", hint: "Construcción con bloques" },
  { word: "Fortnite", category: "Videojuego", hint: "Battle royale" },
  { word: "Mario Bros", category: "Videojuego", hint: "Fontanero famoso" },
  { word: "Zelda", category: "Videojuego", hint: "Aventura con espada y princesa" },
  { word: "Call of Duty", category: "Videojuego", hint: "Shooter bélico" },

  // 🏠 Objetos
  { word: "Silla", category: "Objeto", hint: "Sirve para sentarse" },
  { word: "Teléfono", category: "Objeto", hint: "Sirve para llamar" },
  { word: "Reloj", category: "Objeto", hint: "Marca la hora" },
  { word: "Espejo", category: "Objeto", hint: "Refleja tu imagen" },
  { word: "Llave", category: "Objeto", hint: "Abre puertas" },
  { word: "Ordenador", category: "Objeto", hint: "Dispositivo electrónico para trabajar" },

  // 👨‍💼 Profesiones
  { word: "Doctor", category: "Profesión", hint: "Trabaja en un hospital" },
  { word: "Profesor", category: "Profesión", hint: "Enseña en clase" },
  { word: "Bombero", category: "Profesión", hint: "Apaga incendios" },
  { word: "Policía", category: "Profesión", hint: "Mantiene el orden" },
  { word: "Cocinero", category: "Profesión", hint: "Prepara comida" },

  // 🧠 Conceptos abstractos (más difíciles 👀)
  { word: "Amor", category: "Concepto", hint: "Sentimiento fuerte" },
  { word: "Libertad", category: "Concepto", hint: "Poder elegir" },
  { word: "Miedo", category: "Concepto", hint: "Sensación ante peligro" },
  { word: "Tiempo", category: "Concepto", hint: "No se puede detener" },
  { word: "Sueño", category: "Concepto", hint: "Ocurre al dormir" },

  // 🌦 Naturaleza
  { word: "Montaña", category: "Naturaleza", hint: "Elevación natural del terreno" },
  { word: "Río", category: "Naturaleza", hint: "Corriente de agua" },
  { word: "Desierto", category: "Naturaleza", hint: "Zona con arena y poco agua" },
  { word: "Volcán", category: "Naturaleza", hint: "Expulsa lava" },
  { word: "Bosque", category: "Naturaleza", hint: "Lugar con muchos árboles" },

  // 👻 Cultura / Fantasía
  { word: "Dragón", category: "Fantasía", hint: "Criatura que escupe fuego" },
  { word: "Vampiro", category: "Fantasía", hint: "Bebe sangre" },
  { word: "Pirata", category: "Historia", hint: "Navega buscando tesoros" },
  { word: "Ninja", category: "Historia", hint: "Guerrero sigiloso japonés" },
  { word: "Robot", category: "Tecnología", hint: "Máquina con apariencia humana" }

];

module.exports = wordLibrary
