# Juego del Impostor 🎭

Juego multijugador en tiempo real donde los jugadores deben descubrir quién es el impostor.

## 🚀 Inicio Rápido

### Desarrollo Local

#### Servidor
```bash
cd server
npm install
node server.js
```

#### Cliente
```bash
cd client
npm install
npm run dev
```

El servidor estará en `http://localhost:3000`  
El cliente estará en `http://localhost:5173`

---

## 🌐 Desplegar en Producción

### Opción 1: Deploy en Render + Vercel (Recomendado)

#### **Servidor en Render:**
1. Ve a [render.com](https://render.com) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Crea un **Web Service**
4. Configuración:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Environment Variables**:
     - `CLIENT_URL` = `https://tu-cliente.vercel.app`
5. Deploy automático
6. Copia tu URL: `https://tu-app.onrender.com`

#### **Cliente en Vercel:**
1. Ve a [vercel.com](https://vercel.com) y crea una cuenta
2. Conecta tu repositorio de GitHub
3. Selecciona la carpeta `client`
4. Configuración:
   - **Framework Preset**: Vite
   - **Environment Variables**:
     - `VITE_SOCKET_URL` = `https://tu-app.onrender.com`
5. Deploy automático

---

### Opción 2: Pruebas Rápidas con ngrok

Para probar con amigos sin hacer deploy:

1. Descarga [ngrok](https://ngrok.com/download)
2. Inicia el servidor: `node server.js`
3. En otra terminal: `ngrok http 3000`
4. Copia la URL: `https://abc123.ngrok.io`
5. En `client/.env` añade:
   ```
   VITE_SOCKET_URL=https://abc123.ngrok.io
   ```
6. Reinicia el cliente

**Nota**: La URL de ngrok cambia cada vez que lo reinicias.

---

## 🎮 Cómo Jugar

1. **Crear Sala**: El primer jugador crea una sala y obtiene un código
2. **Unirse**: Otros jugadores se unen con el código
3. **Mínimo 4 jugadores**: Se necesitan al menos 4 para empezar
4. **Configuración**: El anfitrión configura:
   - Cantidad de impostores
   - Mostrar pista al impostor
   - Mostrar categoría al impostor
5. **Jugar**: 
   - Los jugadores normales ven la palabra
   - Los impostores ven pistas/categorías
   - Debaten para descubrir al impostor
6. **Terminar**: El anfitrión termina la partida

---

## 🛠️ Tecnologías

- **Frontend**: React + Vite
- **Backend**: Node.js + Express + Socket.IO
- **Tiempo Real**: WebSockets

---

## 📝 Variables de Entorno

### Servidor (`.env` en carpeta `server/`)
```env
PORT=3000
CLIENT_URL=http://localhost:5173
```

### Cliente (`.env` en carpeta `client/`)
```env
VITE_SOCKET_URL=http://localhost:3000
```

---

## 📦 Estructura del Proyecto

```
imposter/
├── server/
│   ├── server.js          # Servidor Socket.IO
│   ├── wordLibrary.js     # Biblioteca de palabras
│   └── package.json
├── client/
│   ├── src/
│   │   ├── Lobby.jsx      # Componente principal
│   │   ├── Room.jsx       # Sala de espera
│   │   ├── GamePlay.jsx   # Vista de juego
│   │   └── ...
│   └── package.json
└── README.md
```

---

## 🔒 Seguridad

Para producción, recuerda:
1. Cambiar `CLIENT_URL` a tu dominio real
2. No usar `origin: "*"` en CORS
3. Añadir validaciones adicionales
4. Usar variables de entorno en lugar de valores hardcodeados

---

## 📄 Licencia

Proyecto educativo - Uso libre
