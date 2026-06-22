# 🏆 Mundial 2026 — Marcador del torneo

Web **mobile-first** para seguir un torneo entre amigos: **10 jugadores fijos**, **5 parejas**, varios deportes (Tenis, Bádminton, Vóley, Fútbol… y los que añadas) y una **clasificación general** acumulada.

Construida con **Next.js 15 + React 19 + Firebase (Auth + Firestore) + Tailwind CSS**. Pensada para verse en el móvil y desplegarse en **Vercel**.

---

## ✨ Funcionamiento del torneo

Cada deporte es un mini-torneo completo:

1. **Fase de grupos** — las 5 parejas se enfrentan todas contra todas. Las **4 mejores clasifican**; la 5ª queda **eliminada**.
2. **Semifinales** — 1º vs 4º y 2º vs 3º.
3. **Final** y **partido por el 3er puesto**.

Puntos que van a la **tabla general** por cada deporte:

| Posición   | Puntos |
| ---------- | :----: |
| 🥇 Campeón   |   3    |
| 🥈 Subcampeón |   2    |
| 🥉 3er puesto |   1    |

Las parejas son fijas y acumulan puntos a lo largo de todos los deportes.

## 👥 Acceso y roles

- **Pantalla de inicio de sesión** (Google o correo/contraseña) la primera vez.
- Tras entrar, cada persona **vincula su cuenta a uno de los 10 jugadores**. Queda fijado salvo que un admin lo cambie.
- **Solo los administradores** pueden crear/editar jugadores, parejas, deportes y **apuntar resultados**. El resto solo consulta.
- Los administradores se definen por correo (ver variable `NEXT_PUBLIC_ADMIN_EMAILS`).

---

## 🚀 Puesta en marcha

### 1. Crear el proyecto de Firebase

1. Entra en [Firebase Console](https://console.firebase.google.com) y crea un proyecto.
2. **Authentication → Sign-in method**: habilita **Google** y **Correo electrónico/contraseña**.
3. **Firestore Database**: créala en modo producción.
4. En **Configuración del proyecto → Tus apps → Web**, copia las claves del SDK.
5. Publica las reglas de seguridad de este repo (`firestore.rules`):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase use --add        # selecciona tu proyecto
   firebase deploy --only firestore:rules
   ```

### 2. Variables de entorno

Copia `.env.example` a `.env.local` y rellena con tus claves:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_ADMIN_EMAILS="tu-correo@gmail.com"
```

### 3. Desarrollo local

```bash
npm install
npm run dev
# http://localhost:3000
```

### 4. Desplegar en Vercel

1. Importa el repo `Webmundial2026` en [Vercel](https://vercel.com/new).
2. En **Settings → Environment Variables** añade las mismas variables del `.env.local`.
3. Deploy. Cada `git push` a `main` vuelve a desplegar automáticamente.
4. En Firebase **Authentication → Settings → Authorized domains**, añade tu dominio de Vercel (`tu-proyecto.vercel.app`).

### 5. Primer arranque

1. Inicia sesión con un correo que esté en `NEXT_PUBLIC_ADMIN_EMAILS` (serás admin).
2. Ve a **Admin → Inicio** y pulsa **Crear jugadores y parejas** y luego **Crear deportes**.
3. ¡Listo! Ya puedes apuntar resultados.

---

## 🗂️ Estructura

```
src/
  app/                # Rutas (App Router)
    page.tsx          # Clasificación general
    login/            # Inicio de sesión
    deportes/         # Listado y detalle de cada deporte
    perfil/           # Perfil del usuario
    admin/            # Panel de administración
  components/         # UI, navegación, podio, deporte
  lib/
    firebase.ts       # Init del SDK
    auth.tsx          # Sesión + perfil
    db.ts             # Hooks en tiempo real + escrituras
    tournament.ts     # Cálculo de clasificaciones y cuadro
    types.ts          # Modelo de datos
firestore.rules       # Seguridad: solo admins escriben
```

## 🔒 Seguridad

Las reglas de Firestore garantizan que **cualquiera autenticado puede leer**, pero **solo los admins escriben** resultados, parejas, jugadores y deportes. Cada usuario solo puede tocar su propio perfil (sin auto-ascenderse a admin).
