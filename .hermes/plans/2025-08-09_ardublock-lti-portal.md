# ArduBlock — Portal + LTI + Frontpage + Guest Mode

> **Para Hermes:** Usar subagent-driven-development para implementar fase por fase.

**Goal:** Convertir ArduBlock de SPA standalone a LTI tool conectable a cualquier LMS (Chamilo), con frontpage pública, modo invitado, y SEO.

**Architecture:**

```
┌─────────────────────────────────────────────────┐
│  VPS / Servidor                                 │
│                                                 │
│  ┌──────────────┐       ┌────────────────────┐ │
│  │ Chamilo 1.11 │       │  ArduBlock (Flask) │ │
│  │  PHP/MySQL   │ LTI   │  :5001             │ │
│  │  :80/:443    │◀─────▶│                    │ │
│  │              │ 1.3   │  / → frontpage     │ │
│  │  - Users     │       │  /editor → Blockly │ │
│  │  - Courses   │       │  /try → guest mode │ │
│  │  - Grades    │       │  /lti/launch → LTI │ │
│  └──────────────┘       │  /api/* → backend  │ │
│                         └────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Tech Stack:** Flask + Jinja2 + SQLite + pylti1p3 + Blockly/Vite (frontend existente) + Chamilo 1.11.x (PHP/MySQL)

**Lo que NO se construye (lo delega Chamilo):** auth, registro, roles, cursos, calificaciones, dashboard de usuario.

**¿Por qué Chamilo y no Moodle?** Chamilo 1.11.x tiene LTI 1.3 nativo (docs.chamilo.org), GPLv3, 200-400 MB RAM (vs 400-600 de Moodle), interfaz más simple para docentes no técnicos, comunidad LatAm fuerte, y cabe holgadamente en el VPS actual con 3.1 GB libres.

---

## Fase 0 — Prerrequisito: Chamilo en el VPS

> ⚠️ Esta fase es un prerrequisito. Sin Chamilo funcionando, no se puede probar LTI.

### Task 0.1: Instalar LAMP stack mínimo

**Objective:** Tener Apache/Nginx + PHP 8.1+ + MySQL/MariaDB en la VPS.

**Step 1: Instalar paquetes**

```bash
# En la VPS (200.14.81.202)
sudo apt update
sudo apt install -y apache2 mysql-server php8.1 php8.1-mysql \
  php8.1-xml php8.1-mbstring php8.1-curl php8.1-zip php8.1-gd \
  php8.1-intl php8.1-soap php8.1-ldap
```

**Step 2: Verificar PHP**

```bash
php -v | grep "PHP 8"
```

**Step 3: Verificar MySQL**

```bash
sudo mysql -e "SELECT VERSION();"
```

### Task 0.2: Instalar Chamilo 1.11.x

**Objective:** Chamilo funcionando en `http://200.14.81.202/chamilo` o subdominio.

**Step 1: Descargar Chamilo**

```bash
cd /var/www/html
sudo git clone -b 1.11.x https://github.com/chamilo/chamilo-lms.git chamilo
sudo mkdir /var/www/chamilodata
sudo chown -R www-data:www-data /var/www/chamilodata
sudo chown -R www-data:www-data /var/www/html/chamilo
```

**Step 2: Crear base de datos**

```bash
sudo mysql -e "CREATE DATABASE chamilo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'chamilouser'@'localhost' IDENTIFIED BY 'PASSWORD_SEGURO';"
sudo mysql -e "GRANT ALL ON chamilo.* TO 'chamilouser'@'localhost'; FLUSH PRIVILEGES;"
```

**Step 3: Instalación web**

- Abrir http://200.14.81.202/chamilo en navegador
- Seguir wizard de instalación (idioma, paths, DB config)
- Crear cuenta admin

### Task 0.3: Configurar LTI 1.3 en Chamilo

**Objective:** Registrar ArduBlock como herramienta LTI externa en Chamilo.

**Step 1: Administration → Plugins → LTI 1.3 provider**

(Si no ves "LTI 1.3", ir a Configuration → Enable LTI 1.3 support)

**Step 2: "Add external tool" con:**

| Campo | Valor |
|-------|-------|
| Tool name | ArduBlock |
| Launch URL | http://200.14.81.202:5001/lti/launch |
| LTI version | LTI 1.3 |
| Login URL | http://200.14.81.202:5001/lti/login |
| Redirect URL | http://200.14.81.202:5001/lti/launch |
| Client ID | (generado por ArduBlock — ver Task 1.2) |
| Public keyset URL (JWKS) | http://200.14.81.202:5001/lti/jwks |
| Grade passback | Enabled (opcional) |
| Share name | Always |
| Share email | Always |

**Step 3: Guardar y anotar:**

- `Client ID` (el que configuraste en ArduBlock)
- `Deployment ID` (Chamilo lo genera al añadir la herramienta a un curso)
- `Chamilo keyset URL` → `http://200.14.81.202/chamilo/lti1p3keyset`
- `Chamilo token URL` → `http://200.14.81.202/chamilo/lti1p3token`
- `Chamilo OIDC auth URL` → `http://200.14.81.202/chamilo/lti1p3auth`

---

## Fase 1 — ArduBlock LTI Tool

### Task 1.1: Añadir pylti1p3 al backend

**Objective:** Instalar dependencia LTI 1.3 para Flask.

**Files:**
- Modify: `backend/requirements.txt`

**Step 1: Añadir dependencia**

```diff
+PyLTI1p3==2.2.0
+cryptography>=41.0.0
```

**Step 2: Instalar en el entorno**

```bash
cd /home/mortem/Projects/ArduBlock/backend
source .venv/bin/activate
pip install -r requirements.txt
```

**Verification:** `python -c "from pylti1p3.flask import FlaskLTI1P3ToolProvider; print('OK')"`

### Task 1.2: Crear configuración LTI

**Objective:** Archivo de configuración LTI con claves y endpoints de Chamilo.

**Files:**
- Create: `backend/lti_config.py`
- Create: `backend/lti_key.json` (private key, NO commitear)
- Add to: `.gitignore`

**Step 1: Crear `backend/lti_config.py`**

```python
"""ArduBlock — Configuración LTI 1.3"""

import json
from pathlib import Path

LTI_CONFIG = {
    "chamilo": {
        # Client ID que configuraste en Chamilo al registrar ArduBlock
        "client_id": "CHANGE_ME",
        # URL del JWKS de Chamilo
        "key_set_url": "http://200.14.81.202/chamilo/lti1p3keyset",
        # Access token URL de Chamilo
        "token_url": "http://200.14.81.202/chamilo/lti1p3token",
        # URL de inicio de login OIDC de Chamilo
        "auth_login_url": "http://200.14.81.202/chamilo/lti1p3auth",
        # Deployment IDs (Chamilo los genera al añadir la herramienta a un curso)
        "deployment_ids": ["CHANGE_ME"],
    }
}

# Clave privada RSA para firmar JWTs
_LTI_KEY_PATH = Path(__file__).parent / "lti_key.json"


def get_lti_key() -> dict:
    """Carga la clave privada para LTI."""
    if not _LTI_KEY_PATH.exists():
        raise FileNotFoundError(
            f"LTI key no encontrada en {_LTI_KEY_PATH}. "
            "Genera una con: python -m backend.lti_keys generate"
        )
    with open(_LTI_KEY_PATH) as f:
        return json.load(f)
```

**Step 2: Generar clave privada (script auxiliar)**

```bash
cd /home/mortem/Projects/ArduBlock
source backend/.venv/bin/activate
python -c "
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import json

key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048,
    backend=default_backend()
)
private_pem = key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
).decode()

public_pem = key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
).decode()

import json
with open('backend/lti_key.json', 'w') as f:
    json.dump({'private_key': private_pem, 'public_key': public_pem}, f, indent=2)
print('lti_key.json generado')
"
```

**Step 3: Añadir a `.gitignore`**

```diff
+backend/lti_key.json
```

### Task 1.3: Crear blueprint LTI con endpoints

**Objective:** Endpoints `/lti/login`, `/lti/launch`, `/lti/jwks` que implementan el flujo LTI 1.3 OIDC.

**Files:**
- Create: `backend/routes/lti.py`

**Step 1: Crear `backend/routes/lti.py`**

```python
"""
ArduBlock — Rutas LTI 1.3

Flujo:
  1. Chamilo → POST /lti/login (OIDC initiation)
  2. Redirige a Chamilo para auth
  3. Chamilo → POST /lti/launch (JWT con claims del usuario/curso)
  4. ArduBlock redirige al editor con sesión LTI
"""

import uuid
from flask import Blueprint, request, redirect, session, jsonify, url_for
from pylti1p3.flask import (
    FlaskLTI1P3ToolProvider,
    FlaskSessionService,
)
from backend.lti_config import LTI_CONFIG, get_lti_key

lti_bp = Blueprint("lti", __name__, url_prefix="/lti")


def _get_tool_provider() -> FlaskLTI1P3ToolProvider:
    """Crea un tool provider LTI 1.3 con la configuración de Chamilo."""
    lti_key = get_lti_key()
    cfg = LTI_CONFIG["chamilo"]

    return FlaskLTI1P3ToolProvider(
        iss_whitelist=["http://200.14.81.202", "https://200.14.81.202"],
        client_id=cfg["client_id"],
        deployment_ids=cfg["deployment_ids"],
        private_key=lti_key["private_key"],
        public_key=lti_key["public_key"],
        key_set_url=cfg["key_set_url"],
        tool_key_set_url=url_for("lti.jwks", _external=True),
        session_service=FlaskSessionService(session),
    )


@lti_bp.route("/jwks", methods=["GET"])
def jwks():
    """Public keyset endpoint (Chamilo lo consulta para verificar firmas)."""
    from pylti1p3.jwks import Jwks

    lti_key = get_lti_key()
    jwks = Jwks()
    jwks.set_public_key(lti_key["public_key"], "rsa1")
    return jsonify(jwks.get_jwks())


@lti_bp.route("/login", methods=["POST"])
def login():
    """OIDC login initiation — Chamilo redirige aquí primero."""
    tool = _get_tool_provider()
    oidc_login_data = tool.get_oidc_login_data(
        request.args.get("target_link_uri"),
        request.args.get("login_hint"),
        request.args.get("lti_message_hint"),
    )
    # Guardar state en sesión
    session["lti_state"] = oidc_login_data["state"]
    session["lti_nonce"] = oidc_login_data["nonce"]

    return redirect(oidc_login_data["auth_login_url"])


@lti_bp.route("/launch", methods=["POST"])
def launch():
    """LTI launch — Chamilo envía el JWT final con datos del usuario y curso."""
    tool = _get_tool_provider()

    # Verificar estado OIDC
    if "lti_state" not in session:
        return "LTI session expired. Vuelve a intentarlo desde Chamilo.", 400

    try:
        launch_data = tool.verify_launch_data(
            request.form,
            session["lti_state"],
            session["lti_nonce"],
        )
    except Exception as e:
        return f"LTI launch failed: {e}", 403

    # Extraer claims relevantes
    user_id = launch_data.get("sub", "")
    user_name = launch_data.get("name", "Estudiante")
    user_email = launch_data.get("email", "")
    course_id = launch_data.get(
        "https://purl.imsglobal.org/spec/lti/claim/context", {}
    ).get("id", "")
    course_name = launch_data.get(
        "https://purl.imsglobal.org/spec/lti/claim/context", {}
    ).get("title", "")
    resource_id = launch_data.get(
        "https://purl.imsglobal.org/spec/lti/claim/resource_link", {}
    ).get("id", "")
    roles = launch_data.get(
        "https://purl.imsglobal.org/spec/lti/claim/roles", []
    )
    is_teacher = any("Instructor" in r or "Administrator" in r for r in roles)
    # Guardar para grade passback (opcional)
    lineitem_url = launch_data.get(
        "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint", {}
    ).get("lineitem", "")

    # Guardar sesión LTI
    session["lti_authenticated"] = True
    session["lti_user_id"] = user_id
    session["lti_user_name"] = user_name
    session["lti_user_email"] = user_email
    session["lti_course_id"] = course_id
    session["lti_course_name"] = course_name
    session["lti_resource_id"] = resource_id
    session["lti_is_teacher"] = is_teacher
    session["lti_lineitem_url"] = lineitem_url

    return redirect(url_for("editor"))


@lti_bp.route("/session", methods=["GET"])
def session_info():
    """Devuelve datos de la sesión LTI actual (para el frontend JS)."""
    if not session.get("lti_authenticated"):
        return jsonify({"authenticated": False})
    return jsonify({
        "authenticated": True,
        "user_name": session.get("lti_user_name"),
        "course_name": session.get("lti_course_name"),
        "is_teacher": session.get("lti_is_teacher"),
    })
```

**Step 2: Añadir `session.secret_key` a `config.py`**

```diff
+import secrets
+
+# ═══ Sesiones (necesario para LTI) ═══════════════
+SECRET_KEY = os.environ.get("ARDUBLOCK_SECRET_KEY", secrets.token_hex(32))
```

**Step 3: Añadir un fallback en `app.py`**

```diff
 from backend.config import FRONTEND_DIR, HOST, PORT, get_arduino_cli_path
+from backend.config import SECRET_KEY
 from backend.services.serial_manager import SerialManager

 def create_app() -> Flask:
     app = Flask(__name__, static_folder=None)
+    app.secret_key = SECRET_KEY
     app.config["PROPAGATE_EXCEPTIONS"] = True
```

### Task 1.4: Adaptar rutas para sesión LTI vs guest

**Objective:** El editor (`/editor`) detecta si viene de LTI launch o es acceso directo (guest mode rechazado a login).

**Files:**
- Modify: `backend/app.py` (rutas del frontend)

**Step 1: Reorganizar rutas en `app.py`**

```diff
- @app.route("/")
+ @app.route("/editor")
- def index():
+ def editor():
+     # Si no hay sesión LTI, redirigir a login
+     if not session.get("lti_authenticated"):
+         return redirect(url_for("frontpage"))
      return send_from_directory(str(FRONTEND_DIR), "index.html")

+ @app.route("/")
+ def frontpage():
+     return send_from_directory(str(FRONTEND_DIR), "frontpage.html")

+ @app.route("/try")
+ def try_editor():
+     return send_from_directory(str(FRONTEND_DIR), "index.html")
```

### Task 1.5: Registrar blueprint LTI en app.py

**Step 1: Añadir import y registro**

```diff
 from backend.routes.drivers import drivers_bp
 from backend.routes.health import health_bp
+from backend.routes.lti import lti_bp

 def create_app() -> Flask:
     ...
     app.register_blueprint(drivers_bp)
     app.register_blueprint(health_bp)
+    app.register_blueprint(lti_bp)
```

### Task 1.6: Adaptar guardado de proyectos para contexto LTI

**Objective:** Cuando hay sesión LTI, los proyectos se guardan en `backend/projects/{course_id}/{resource_id}/{user_id}.json`. Sin sesión (guest mode), localStorage.

**Files:**
- Modify: `backend/routes/projects.py`

**Step 1: Modificar rutas de proyectos para usar contexto LTI**

```python
def _get_project_dir():
    """Devuelve el directorio de proyectos según el contexto LTI."""
    from flask import session

    if session.get("lti_authenticated"):
        course = session["lti_course_id"]
        resource = session["lti_resource_id"]
        user = session["lti_user_id"]
        d = PROJECTS_DIR / course / resource / user
    else:
        d = PROJECTS_DIR / "guest"
    d.mkdir(parents=True, exist_ok=True)
    return d


@projects_bp.route("/api/projects", methods=["GET"])
def list_projects():
    projects = []
    project_dir = _get_project_dir()
    for f in project_dir.glob("*.json"):
        projects.append({
            "id": f.stem,
            "name": f.stem,
            "modified": os.path.getmtime(str(f)),
        })
    return jsonify(projects)


@projects_bp.route("/api/projects/<project_id>", methods=["GET"])
def load_project(project_id):
    if not validate_project_id(project_id):
        return jsonify({"error": "ID de proyecto inválido"}), 400
    path = _get_project_dir() / f"{project_id}.json"
    if not path.exists():
        return jsonify({"error": "Proyecto no encontrado"}), 404
    with open(path) as f:
        data = json.load(f)
    return jsonify(data)


@projects_bp.route("/api/projects/<project_id>", methods=["PUT"])
def save_project(project_id):
    if not validate_project_id(project_id):
        return jsonify({"error": "ID de proyecto inválido"}), 400
    data = request.get_json()
    if not data:
        return jsonify({"error": "Datos inválidos"}), 400
    path = _get_project_dir() / f"{project_id}.json"
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    return jsonify({"status": "ok", "id": project_id})


@projects_bp.route("/api/projects/<project_id>", methods=["DELETE"])
def delete_project(project_id):
    if not validate_project_id(project_id):
        return jsonify({"error": "ID de proyecto inválido"}), 400
    path = _get_project_dir() / f"{project_id}.json"
    if not path.exists():
        return jsonify({"error": "Proyecto no encontrado"}), 404
    path.unlink()
    return jsonify({"status": "ok", "id": project_id})
```

---

## Fase 2 — Frontpage pública + SEO

### Task 2.1: Crear frontpage HTML estática

**Objective:** Landing page en `/` que explica ArduBlock, botones CTA a "Probar ahora" y "Entrar con Chamilo".

**Files:**
- Create: `frontend/frontpage.html`

**Step 1: Crear `frontend/frontpage.html`**

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArduBlock — Programación Visual para Arduino en el Aula</title>
  <meta name="description" content="ArduBlock es un entorno de programación visual basado en bloques para Arduino. Diseñado para educación escolar. Compatible con Chamilo vía LTI 1.3.">
  <meta name="keywords" content="arduino, blockly, programación visual, educación, stem, robótica, chamilo, lti">
  <link rel="canonical" href="https://ardublock.matemancia.net/">
  <meta property="og:title" content="ArduBlock — Programación Visual para Arduino">
  <meta property="og:description" content="Entorno de programación por bloques para Arduino. Conecta con Chamilo, compila y sube directo a la placa.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://ardublock.matemancia.net/">
  <link rel="stylesheet" href="css/frontpage.css">
</head>
<body>
  <header class="fp-hero">
    <h1>⚡ ArduBlock</h1>
    <p class="fp-tagline">Programación visual para Arduino — del bloque al código C++</p>
    <div class="fp-cta">
      <a href="/try" class="fp-btn fp-btn-primary">Probar ahora (sin registro)</a>
      <a href="https://chamilo.matemancia.net" class="fp-btn fp-btn-secondary">Entrar con Chamilo</a>
    </div>
  </header>

  <main class="fp-content">
    <section class="fp-features">
      <div class="fp-feature">
        <h2>🧩 Bloques visuales</h2>
        <p>Arrastra y conecta bloques. Sin sintaxis, sin punto y coma. Ideal para aprender lógica de programación.</p>
      </div>
      <div class="fp-feature">
        <h2>⚡ Compilación directa</h2>
        <p>Convierte bloques a C++, compila con arduino-cli y sube a la placa. Todo desde el navegador.</p>
      </div>
      <div class="fp-feature">
        <h2>🏫 Integración con Chamilo</h2>
        <p>Conecta ArduBlock como actividad LTI 1.3. Los estudiantes entran directo desde su curso, sin crear cuentas.</p>
      </div>
      <div class="fp-feature">
        <h2>📊 Tres niveles de dificultad</h2>
        <p>Básico, intermedio y avanzado. Los bloques crecen con el estudiante. Mismo concepto, creciente complejidad.</p>
      </div>
      <div class="fp-feature">
        <h2>🌐 Español e inglés</h2>
        <p>Interfaz bilingüe. Bloques, mensajes de error y documentación en ambos idiomas.</p>
      </div>
      <div class="fp-feature">
        <h2>🔌 Monitor serial integrado</h2>
        <p>Lee datos del Arduino en tiempo real. Depura y visualiza sin salir del editor.</p>
      </div>
    </section>

    <section class="fp-placas">
      <h2>Placas compatibles</h2>
      <div class="fp-board-grid">
        <span>Arduino Uno R3</span>
        <span>Arduino Uno R4 Minima</span>
        <span>Arduino Uno R4 WiFi</span>
        <span>Arduino Nano ESP32</span>
        <span>Arduino Mega</span>
      </div>
    </section>

    <section class="fp-cta-bottom">
      <h2>¿Listo para empezar?</h2>
      <p>No necesitas instalar nada. Abre el editor, arrastra bloques y compila.</p>
      <a href="/try" class="fp-btn fp-btn-primary">Probar ArduBlock ahora</a>
    </section>
  </main>

  <footer class="fp-footer">
    <p>ArduBlock · Open source · <a href="https://github.com/javdazdaz/ArduBlock">GitHub</a></p>
  </footer>

  <script type="module">
    // Detectar si el navegador soporta Web Serial para mostrar mensaje
    if (!('serial' in navigator)) {
      document.querySelector('.fp-hero').insertAdjacentHTML('beforeend',
        '<p class="fp-notice">⚠ Tu navegador no soporta Web Serial. ' +
        'Usa Chrome o Edge para compilar directo al Arduino.</p>');
    }
  </script>
</body>
</html>
```

**Step 2: Crear `frontend/css/frontpage.css`**

CSS para la frontpage (estilo limpio, responsive, consistente con el tema oscuro del editor). ~150 líneas. No incluyo el CSS completo aquí pero el diseño sigue el patrón: hero section → features grid 3-col → CTA → footer.

### Task 2.2: SEO técnico

**Objective:** sitemap.xml, robots.txt, y asegurar que Google indexe la frontpage.

**Files:**
- Create: `frontend/dist/robots.txt`
- Create: endpoint `/sitemap.xml` en Flask

**Step 1: Crear `frontend/dist/robots.txt`**

```
User-agent: *
Allow: /
Allow: /try
Disallow: /editor
Disallow: /api/
Disallow: /lti/
Sitemap: https://ardublock.matemancia.net/sitemap.xml
```

**Step 2: Añadir ruta sitemap.xml en `app.py`**

```python
@app.route("/sitemap.xml")
def sitemap():
    from flask import Response
    xml = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://ardublock.matemancia.net/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://ardublock.matemancia.net/try</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>"""
    return Response(xml, mimetype="application/xml")
```

### Task 2.3: Frontend JS detecta contexto

**Objective:** `main.js` detecta si está en `/try` (guest mode, localStorage) o `/editor` (LTI session, server projects).

**Files:**
- Modify: `frontend/js/main.js`

**Step 1: Añadir detección de modo**

```javascript
// Detectar si es guest mode (/try) o LTI mode (/editor)
const IS_GUEST_MODE = window.location.pathname === '/try';

// En guest mode, usar localStorage para proyectos
if (IS_GUEST_MODE) {
  // Deshabilitar compilación/upload (necesitan backend con sesión)
  document.getElementById('btn-upload').style.display = 'none';
  // Mostrar badge "Modo invitado"
  const badge = document.createElement('span');
  badge.className = 'guest-badge';
  badge.textContent = '👤 Invitado';
  document.querySelector('.header-brand').appendChild(badge);
}
```

---

## Fase 3 — Adaptar el editor para ambos modos

### Task 3.1: Project manager dual (localStorage + servidor)

**Objective:** `project-manager.js` guarda en localStorage en guest mode, en API del servidor en LTI mode.

**Files:**
- Modify: `frontend/js/main.js` (o project-manager.js si está separado)

**Step 1: Crear un wrapper de storage**

```javascript
const projectStorage = {
  async list() {
    if (IS_GUEST_MODE) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('ardublock_'));
      return keys.map(k => ({
        id: k.replace('ardublock_', ''),
        name: k.replace('ardublock_', ''),
        modified: Date.now(),
      }));
    }
    const res = await fetch('/api/projects');
    return res.json();
  },

  async load(id) {
    if (IS_GUEST_MODE) {
      const raw = localStorage.getItem(`ardublock_${id}`);
      return raw ? JSON.parse(raw) : null;
    }
    const res = await fetch(`/api/projects/${id}`);
    return res.json();
  },

  async save(id, data) {
    if (IS_GUEST_MODE) {
      localStorage.setItem(`ardublock_${id}`, JSON.stringify(data));
      return { status: 'ok', id };
    }
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async delete(id) {
    if (IS_GUEST_MODE) {
      localStorage.removeItem(`ardublock_${id}`);
      return { status: 'ok' };
    }
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    return res.json();
  },
};
```

### Task 3.2: El editor en `/try` no expone compilar/subir

**Objective:** En guest mode, compilar y subir están deshabilitados porque requieren backend con sesión.

**Files:**
- Modify: `frontend/js/main.js`

Step 1: Ya cubierto en Task 2.3. Asegurar que:
- `btn-upload`: oculto en guest mode
- `btn-export`: visible en guest mode (exportar sketch como archivo)
- `btn-compile`: muestra código generado pero no compila
- Consola serial: oculta en guest mode

---

## Fase 4 — Deploy y pruebas

### Task 4.1: Construir el frontend

```bash
cd /home/mortem/Projects/ArduBlock
npm run build
# Verificar que frontpage.html y index.html están en dist/
ls frontend/dist/frontpage.html frontend/dist/index.html
```

### Task 4.2: Probar flujo LTI end-to-end

**Step 1: Arrancar servidores**

```bash
# Terminal 1: ArduBlock
cd /home/mortem/Projects/ArduBlock
ARDUBLOCK_PRODUCTION=1 source backend/.venv/bin/activate
ARDUBLOCK_PRODUCTION=1 python backend/app.py

# Terminal 2: En el VPS, asegurar que Chamilo está corriendo
```

**Step 2: Probar en Chamilo**
1. Crear un curso en Chamilo
2. Añadir actividad "External tool" → seleccionar ArduBlock
3. Entrar como estudiante → hacer clic en la actividad
4. Verificar que redirige al editor Blockly con sesión LTI
5. Guardar un proyecto, recargar, verificar que persiste

**Step 3: Probar guest mode**
1. Abrir `http://localhost:5001/try`
2. Crear bloques, guardar proyecto (localStorage)
3. Recargar, verificar que el proyecto persiste
4. Verificar que "Compilar" y "Subir" no aparecen

### Task 4.3: Probar frontpage + SEO

1. Abrir `http://localhost:5001/` → debe mostrar la frontpage
2. `curl http://localhost:5001/sitemap.xml` → XML válido
3. `curl http://localhost:5001/robots.txt` → reglas correctas

---

## Riesgos y decisiones pendientes

| Riesgo | Mitigación |
|--------|-----------|
| pylti1p3 puede tener bugs con Flask 3.x | Probar con Flask 3.x antes de commit. Si falla, usar `lti` (librería alternativa) |
| JWKS necesita HTTPS en producción | Para desarrollo HTTP funciona, en producción habilitar Let's Encrypt en nginx |
| localStorage tiene límite 5-10MB | Suficiente para sketches de Blockly (XML pequeño). Si crece, advertir al usuario |
| El VPS tiene recursos limitados para Chamilo+Flask | Chamilo: ~200-400 MB. Flask: ~50 MB. El VPS (3.1 GB libres) aguanta ambos holgadamente |
| Grade passback (opcional) requiere token LTI guardado | Posponer para fase futura — no es crítico para MVP |

## Verificación final

```bash
# 1. Frontpage accesible
curl -s http://localhost:5001/ | grep -q "ArduBlock" && echo "✓ Frontpage"

# 2. Guest mode accesible
curl -s http://localhost:5001/try | grep -q "blocklyDiv" && echo "✓ Guest mode"

# 3. LTI endpoints
curl -s http://localhost:5001/lti/jwks | grep -q "keys" && echo "✓ JWKS"

# 4. API sigue funcionando
curl -s http://localhost:5001/api/health | grep -q "ok" && echo "✓ API health"

# 5. Sitemap
curl -s http://localhost:5001/sitemap.xml | grep -q "urlset" && echo "✓ Sitemap"
```
