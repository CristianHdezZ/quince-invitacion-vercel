# Mis XV Años — Sitio + API en un solo proyecto de Vercel

Este proyecto une la invitación (HTML/CSS/JS estático) y el backend del
RSVP (funciones serverless) en un solo despliegue. Mismo dominio para todo:
`/`, `/admin.html` y `/api/rsvp` conviven juntos, sin CORS ni configuración
extra.

## Estructura

```
/
├── index.html            ← la invitación
├── admin.html             ← panel de confirmaciones (protegido con clave)
├── css/style.css
├── js/script.js
├── assets/
├── api/
│   ├── rsvp.js            ← POST crea confirmación · GET lista (protegido)
│   └── rsvp-export.js     ← GET exporta CSV (protegido)
├── lib/
│   └── store.js           ← guarda en Upstash Redis (o /tmp en local)
├── package.json
└── .env.example
```

**No necesitas `vercel.json`.** Vercel detecta automáticamente:
- todo lo que está en `api/*.js` → funciones serverless (`/api/rsvp`, `/api/rsvp-export`)
- todo lo demás (`index.html`, `css/`, `js/`, `assets/`, `admin.html`) → archivos estáticos servidos tal cual

Si ya tienes un `vercel.json` con `builds`/`routes` apuntando a un `index.js`
(como el que compartiste), bórralo — con esta estructura no hace falta, y
ese `vercel.json` haría que **todo** pase por una sola función Node en vez
de servir los archivos estáticos directamente.

## ⚠️ Por qué cambié el almacenamiento

Tu `server.js` original guardaba las confirmaciones en un archivo JSON en
disco. Eso funciona en un servidor tradicional (Render, Railway, tu propia
máquina), pero **no en Vercel**: las funciones serverless corren en
contenedores efímeros — el disco no persiste entre invocaciones, así que
las confirmaciones se perderían.

`lib/store.js` ahora guarda en **Upstash Redis** (vía su API REST, que
funciona perfecto en serverless) y solo cae a un archivo temporal en local
si no configuraste Upstash — útil para probar rápido, pero avísalo: eso NO
persiste en producción.

## Configurar Upstash (gratis)

1. Ve a **Vercel → tu proyecto → Storage → Marketplace Database Providers**
   y agrega **Upstash** (o crea una cuenta directo en https://upstash.com).
2. Crea una base Redis. Te da dos valores: `UPSTASH_REDIS_REST_URL` y
   `UPSTASH_REDIS_REST_TOKEN`.
3. Si lo agregaste desde el marketplace de Vercel, esas variables ya quedan
   inyectadas automáticamente al proyecto. Si lo creaste aparte, agrégalas
   tú mismo en **Settings → Environment Variables**.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué |
|---|---|
| `ADMIN_KEY` | contraseña para `/admin.html` y para listar/exportar RSVPs |
| `ALLOWED_ORIGIN` | dominios permitidos para llamar la API (`*` si todo vive en el mismo dominio) |
| `UPSTASH_REDIS_REST_URL` | endpoint de tu base Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | token de tu base Upstash |

Después de agregarlas, vuelve a desplegar (Vercel no las aplica a
despliegues ya hechos).

## Probar en local

```bash
npm i -g vercel   # si no lo tienes
cp .env.example .env   # y complétalo
vercel dev
```

`vercel dev` simula exactamente el entorno de producción (estáticos +
funciones), así que es más confiable que levantar un servidor Express
aparte para este proyecto.

## Desplegar

```bash
vercel        # despliegue de prueba
vercel --prod # despliegue de producción
```

O simplemente conecta el repo de GitHub desde el dashboard de Vercel —
cada push a `main` despliega solo.

## Ver las confirmaciones

Entra a `https://tu-dominio.vercel.app/admin.html`, escribe la clave que
pusiste en `ADMIN_KEY` y pulsa **Ver confirmaciones**. Desde ahí también
puedes exportar todo a CSV.

## No pude probarlo en vivo

Este entorno donde armé el proyecto no tiene acceso a internet, así que no
pude correr `vercel dev` ni desplegar de verdad para confirmarlo end to end.
Validé la sintaxis de cada archivo, pero si al desplegar ves algún error,
pégame el mensaje del log de Vercel y lo ajustamos.
