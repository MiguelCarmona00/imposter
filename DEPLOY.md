# Guía de Despliegue - Render + Vercel

## 📋 Checklist Pre-Deploy

- [ ] Código funcionando localmente
- [ ] Variables de entorno configuradas en `.env.example`
- [ ] `.gitignore` actualizado (no subir `.env`)
- [ ] Repositorio en GitHub

---

## 🚀 Paso 1: Desplegar Servidor en Render

### 1.1 Crear cuenta y conectar GitHub
1. Ve a [render.com](https://render.com)
2. Sign up con GitHub
3. Autoriza acceso a tu repositorio

### 1.2 Crear Web Service
1. Click en **"New +"** → **"Web Service"**
2. Selecciona tu repositorio `imposter`
3. Configuración:
   - **Name**: `imposter-server` (o el que quieras)
   - **Region**: Frankfurt (más cercano a España)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

### 1.3 Configurar Variables de Entorno
En la sección **Environment**:
- Click en **"Add Environment Variable"**
- Añadir:
  ```
  CLIENT_URL = (dejar vacío por ahora, lo añadimos después)
  ```

### 1.4 Deploy
1. Selecciona el plan **Free**
2. Click en **"Create Web Service"**
3. Espera 2-5 minutos
4. **Copia la URL**: `https://imposter-server-xxxx.onrender.com`

⚠️ **Importante**: El plan gratuito se duerme después de 15 minutos sin uso. La primera petición puede tardar ~30 segundos.

---

## 🎨 Paso 2: Desplegar Cliente en Vercel

### 2.1 Crear cuenta
1. Ve a [vercel.com](https://vercel.com)
2. Sign up con GitHub

### 2.2 Configurar Proyecto
1. Click en **"Add New Project"**
2. Import tu repositorio `imposter`
3. Configuración:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.3 Variables de Entorno
En **Environment Variables**:
```
VITE_SOCKET_URL = https://imposter-server-xxxx.onrender.com
```
*Usa LA URL que copiaste de Render*

### 2.4 Deploy
1. Click en **"Deploy"**
2. Espera 1-2 minutos
3. **Copia la URL**: `https://imposter-xxxx.vercel.app`

---

## 🔗 Paso 3: Conectar Ambos Servicios

### 3.1 Actualizar Render
1. Vuelve a [Render Dashboard](https://dashboard.render.com)
2. Selecciona tu servicio `imposter-server`
3. Ve a **Environment**
4. Edita la variable `CLIENT_URL`:
   ```
   CLIENT_URL = https://imposter-xxxx.vercel.app
   ```
   *Usa la URL de Vercel que copiaste*
5. Click en **"Save Changes"**
6. El servicio se redesplegará automáticamente

---

## ✅ Paso 4: Verificar

1. Ve a tu URL de Vercel: `https://imposter-xxxx.vercel.app`
2. Abre la consola del navegador (F12)
3. Deberías ver:
   ```
   Socket conectado
   ```
4. Prueba:
   - Crear una sala
   - Copiar el código
   - Abrir en otra ventana/navegador
   - Unirse con el código

---

## 🐛 Solución de Problemas

### Error: "Socket desconectado"
**Causa**: El servidor de Render está durmiendo (plan gratuito)
**Solución**: Espera 30 segundos y recarga la página

### Error: CORS
**Causa**: `CLIENT_URL` mal configurado
**Solución**: 
1. Verifica que la URL en Render sea exacta (sin `/` al final)
2. Redespliega el servicio

### La sala no se crea
**Causa**: El servidor no responde
**Solución**:
1. Ve a Render Dashboard
2. Revisa los logs de tu servicio
3. Busca errores en rojo

### No puedo unirme a la sala
**Causa**: Código incorrecto o sala expirada
**Solución**: Las salas se reinician cuando el servidor duerme. Crea una nueva sala.

---

## 📊 Monitoreo

### Render Logs
- Dashboard → Tu servicio → **Logs**
- Ver conexiones en tiempo real
- Detectar errores del servidor

### Vercel Analytics (opcional)
- Dashboard → Tu proyecto → **Analytics**
- Ver visitantes y rendimiento

---

## 💰 Costos

**Todo es GRATIS** pero con limitaciones:

| Servicio | Plan     | Límites                          |
|----------|----------|----------------------------------|
| Render   | Free     | Se duerme tras 15min sin uso     |
| Vercel   | Hobby    | 100GB bandwidth/mes              |

Para uso personal/amigos: **SUFICIENTE**
Para producción: Considera planes de pago

---

## 🔄 Actualizaciones Futuras

Cada vez que hagas `git push`:
1. **Vercel**: Redespliega automáticamente
2. **Render**: Redespliega automáticamente

No necesitas hacer nada manual.

---

## 📞 URLs Importantes

**Anótalas aquí después del deploy:**

- **Cliente (Vercel)**: `https://_____________________.vercel.app`
- **Servidor (Render)**: `https://_____________________.onrender.com`
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## ✨ ¡Listo!

Comparte la URL de Vercel con tus amigos y juega online 🎉
