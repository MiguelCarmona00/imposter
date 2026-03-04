# 🏠 Conectar desde otro dispositivo en la misma red (LAN)

## 📍 Tu IP Local
**IP del servidor**: `192.168.1.133`

---

## 🚀 Pasos para jugar en tu red local

### 1️⃣ En el dispositivo SERVIDOR (este PC)

#### A. Configurar el servidor
El servidor ya está configurado para aceptar conexiones externas (0.0.0.0).

```bash
cd server
node server.js
```

Deberías ver: `Servidor corriendo en puerto 3000`

#### B. Configurar el firewall de Windows
1. Presiona `Win + R` y escribe: `wf.msc`
2. Click en **"Reglas de entrada"**
3. Click derecho → **"Nueva regla"**
4. Tipo: **Puerto**
5. Protocolo: **TCP**
6. Puerto: **3000**
7. Acción: **Permitir la conexión**
8. Perfil: Marca **Dominio, Privado y Público**
9. Nombre: **Impostor Game Server**

**Atajo rápido (ejecutar en PowerShell como Administrador):**
```powershell
New-NetFirewallRule -DisplayName "Impostor Game Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

---

### 2️⃣ En el dispositivo CLIENTE (móvil, tablet, otro PC)

#### Opción A: Cliente Vite (desarrollo)

Si quieres que el cliente también se ejecute en red local y acceder desde otros dispositivos:

1. En **este PC**, edita `client/.env`:
   ```env
   VITE_SOCKET_URL=http://192.168.1.133:3000
   ```

2. Inicia el cliente con acceso de red:
   ```bash
   cd client
   npm run dev -- --host
   ```

3. Verás algo como:
   ```
   Local:   http://localhost:5173/
   Network: http://192.168.1.133:5173/
   ```

4. **Desde otro dispositivo**, abre el navegador y ve a:
   ```
   http://192.168.1.133:5173
   ```

#### Opción B: Build de producción (más rápido)

1. Edita `client/.env`:
   ```env
   VITE_SOCKET_URL=http://192.168.1.133:3000
   ```

2. Compila el cliente:
   ```bash
   cd client
   npm run build
   ```

3. En **este PC**, instala y ejecuta un servidor HTTP simple:
   ```bash
   npm install -g http-server
   cd client/dist
   http-server -p 8080
   ```

4. **Desde otro dispositivo**, abre:
   ```
   http://192.168.1.133:8080
   ```

---

## 🔍 Verificación rápida

### Comprobar que el servidor está escuchando
```powershell
netstat -an | Select-String "3000"
```
Deberías ver: `0.0.0.0:3000` o `:::3000`

### Probar conectividad desde otro dispositivo
Desde el otro dispositivo (en la terminal o cmd):
```bash
ping 192.168.1.133
```

Si responde, la conectividad es correcta.

---

## 📱 Resumen de URLs

### Dispositivo servidor (este PC):
- **Servidor**: Ya corriendo en puerto 3000
- **Cliente**: http://192.168.1.133:5173 (con `--host`) o http://192.168.1.133:8080 (build)

### Otros dispositivos en la misma red:
- **Abrir navegador** → Ir a la URL del cliente
- **Jugar** normalmente

---

## ⚠️ Problemas comunes

### "No se puede conectar al servidor"
- ✅ Verifica que el servidor esté corriendo: `node server.js`
- ✅ Verifica el firewall (paso 1B)
- ✅ Verifica que ambos dispositivos estén en la **misma red WiFi**
- ✅ Prueba con `ping 192.168.1.133` desde el otro dispositivo

### "Socket desconectado"
- La variable `VITE_SOCKET_URL` debe tener la IP correcta
- Recuerda reiniciar el cliente después de cambiar `.env`

### "La página no carga"
- Verifica que el cliente esté corriendo con `--host`
- O usa el build y `http-server`

### "Mi IP cambió"
Si tu router asigna IPs dinámicas, la IP puede cambiar. 
- Vuelve a ejecutar: `ipconfig | Select-String "IPv4"`
- Actualiza `client/.env` con la nueva IP

---

## 🎮 Flujo completo (TL;DR)

**Terminal 1 (Servidor):**
```bash
cd server
node server.js
```

**Terminal 2 (Cliente):**
```bash
cd client
npm run dev -- --host
```

**En otro dispositivo:**
- Abre navegador → `http://192.168.1.133:5173`
- Juega normalmente

---

## 🌐 Alternativa: ngrok (sin configurar nada)

Si no quieres lidiar con firewalls o IPs:

1. Descarga [ngrok](https://ngrok.com/download)
2. Ejecuta:
   ```bash
   ngrok http 3000
   ```
3. Copia la URL: `https://abc123.ngrok.io`
4. Edita `client/.env`:
   ```env
   VITE_SOCKET_URL=https://abc123.ngrok.io
   ```
5. Cualquiera con esa URL puede jugar (incluso fuera de tu red)

⚠️ La URL cambia cada vez que reinicias ngrok (gratis).

---

## 📝 Checklist

- [ ] Servidor corriendo en puerto 3000
- [ ] Firewall configurado
- [ ] `client/.env` con IP correcta (`192.168.1.133:3000`)
- [ ] Cliente corriendo con `--host` o build con `http-server`
- [ ] Ambos dispositivos en la misma red WiFi
- [ ] Probado desde otro dispositivo

¡Listo para jugar en red local! 🎉
