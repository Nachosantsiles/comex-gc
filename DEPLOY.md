# Deploy en Railway

Esta app usa SQLite (archivo en disco) + archivos subidos, por lo que **necesita
un volumen persistente**. Railway lo soporta; Vercel NO.

## Pasos

1. Crear proyecto en [railway.app](https://railway.app) → **Deploy from GitHub repo** →
   elegir `Nachosantsiles/comex-gc`.
2. En el servicio creado, ir a **Variables** y agregar:

   | Variable        | Valor                                            |
   |-----------------|--------------------------------------------------|
   | `AUTH_SECRET`   | `comex-gc-secret-key-2025-cazorla-arg`           |
   | `AUTH_URL`      | la URL pública que asigna Railway (ej. `https://comex-gc-production.up.railway.app`) |
   | `DATABASE_PATH` | `/data/comex.db`                                 |
   | `UPLOADS_DIR`   | `/data/uploads`                                  |

3. Ir a **Settings → Volumes** → **New Volume**, mount path: `/data`.
4. Redeploy. La primera vez se crea la base, se siembra el admin y los catálogos.

## Login inicial

- Usuario: `admin@cazorla.com`
- Contraseña: `admin123`

## Notas

- El módulo Abastecimiento (proveedores, stock, insumos, OC, destinaciones,
  pólizas) se guarda en la tabla `app_state` y se comparte entre todas las PCs.
- El módulo COMEX (envíos, items, despachos, gastos) usa sus propias tablas.
- Todo vive en el volumen `/data`, así que persiste entre redeploys.
