# Seguridad

Defensa en capas alrededor de la compilación remota de sketches. El vector
principal: `avr-gcc` lee archivos del host vía `#include` y `/api/compile`
devuelve `stderr` tal cual.

## Capas

| Capa | Qué hace | Dónde |
|---|---|---|
| Guard de includes | Rechaza `#include`/`#include_next`/`#import`/`#pragma GCC dependency` con ruta absoluta o `..` (422) | `backend/sketch_guard.py` |
| Sandbox bwrap | `arduino-cli compile` en `bwrap --unshare-all` sin red: ve solo `/usr` (ro), el binario (ro), un data-dir scratch y el sketch | `backend/services/arduino_cli.py` |
| Límites de recursos | `RLIMIT_AS` (default 4096 MB, configurable), `RLIMIT_CPU` 60 s, `RLIMIT_FSIZE` 256 MB; no se usa `RLIMIT_NPROC` | `backend/services/arduino_cli.py` |
| Concurrencia acotada | Semáforo + cola (ThreadPoolExecutor) con tope | `backend/compile_queue.py` |
| Rate limiting | In-memory por IP | `backend/rate_limit.py` |
| Modos de hardware | Local: hardware del host disponible. Producción: solo compilación; USB por Web Serial en el navegador | `backend/app.py`, `backend/routes/*` |
| Cookie | `HttpOnly` + `SameSite=Lax` + `Secure` (prod) | `backend/app.py` |
| Path traversal | Resuelve y verifica contención de rutas de usuario | `backend/routes/examples.py` |
| Usuario no-root | El servicio corre como `ardublock` | `INSTALL.md` |

## Compilación asíncrona

`POST /api/compile` encola (202 con `job_id`); el frontend hace polling a
`GET /api/compile/<job_id>`. Cola en memoria: los jobs se pierden al reiniciar.

| Variable | Default | Efecto |
|---|---|---|
| `ARDUBLOCK_COMPILE_WORKERS` | `2` | Workers + semáforo |
| `ARDUBLOCK_COMPILE_MEMORY_MB` | `4096` | `RLIMIT_AS` por compilación |

## Rate limiting

| Endpoint | Límite | Clave |
|---|---|---|
| `/api/compile`, `/api/compile-hex` | 30 / 5 min | IP |
| `/login` | 10 / min | IP + email |
| `/api/register` | 20 / min | IP |

Desactivable en tests con `ARDUBLOCK_RATE_LIMIT_DISABLED=1`.

## Modos local y producción

`ARDUBLOCK_PRODUCTION=1` deshabilita los blueprints que acceden al hardware del
host: `/api/serial/*`, `/api/upload`, `/api/boards` y las rutas de instalación.
La producción solo expone la compilación y la API de proyectos/autenticación.
El flasheo y el monitor serial se realizan desde el navegador mediante Web
Serial. La compilación se rechaza si `bwrap` o el data-dir de Arduino no están
disponibles; no existe fallback sin sandbox.

Las placas y librerías se limitan a la allowlist declarada en `BOARD_DEPS`.
Compilar nunca instala automáticamente un core o una librería.

Las APIs mutables autenticadas usan CSRF mediante el endpoint
`GET /api/csrf-token` y el header `X-CSRFToken`. La compilación pública está
exenta porque no muta sesión ni datos persistentes.

## Verificar en producción

```bash
curl -D - https://ardublock.matemancia.net/login | grep -i set-cookie  # HttpOnly; SameSite=Lax; Secure
systemctl show ardublock -p User                                       # ardublock
ps -eo comm | grep bwrap                                               # durante un compile
```

## Reportar

`javier@matemancia.net` — no publicar la vulnerabilidad.
