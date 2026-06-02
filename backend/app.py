"""
ArduBlock Backend — Servidor Flask

Sirve el frontend estático y expone endpoints para:
- Guardar/cargar proyectos (JSON)
- (Futuro) Conexión USB con avrdude para quemar sketches
"""

from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import json
import os
import re
import signal
import sys
import subprocess
import tempfile
import shutil
import threading
from pathlib import Path

app = Flask(__name__, static_folder=None)
CORS(app, origins=['http://localhost:5000', 'http://127.0.0.1:5000'])

# ── Rate Limiting ────────────────────────────────
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# ── Serial Monitor State ────────────────────────
serial_port = None
serial_thread = None
serial_buffer = []
serial_lock = threading.Lock()
serial_running = False

# ── Configuración ───────────────────────────────
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
PROJECTS_DIR = Path(__file__).resolve().parent / "projects"
EXAMPLES_DIR = Path(__file__).resolve().parent.parent / "examples" / "arduino"
PROJECTS_DIR.mkdir(exist_ok=True)

# ── Board config: cores y libs requeridas ──────
BOARD_DEPS = {
    'arduino:avr:uno':              {'cores': [], 'libs': []},
    'arduino:renesas_uno:minima':   {'cores': ['arduino:renesas_uno'], 'libs': []},
    'arduino:renesas_uno:wifi':     {'cores': ['arduino:renesas_uno'], 'libs': []},  # WiFiS3 incluida en el core
    'arduino:esp32:nano_nora':      {'cores': ['arduino:esp32'], 'libs': []},
    'arduino:avr:mega':             {'cores': [], 'libs': []},
}

HOST = os.environ.get('ARDUBLOCK_HOST', '0.0.0.0')
PORT = int(os.environ.get('ARDUBLOCK_PORT', '5001'))

# ── Validación de project_id ────────────────────
_PROJECT_ID_RE = re.compile(r'^[a-zA-Z0-9_-]{1,64}$')

def _validate_project_id(project_id):
    """Valida que el ID del proyecto sea seguro (sin path traversal)."""
    if not _PROJECT_ID_RE.match(project_id):
        return False
    # Prevenir path traversal con ../
    if '..' in project_id or '/' in project_id or '\\' in project_id:
        return False
    return True

# ── Graceful shutdown ───────────────────────────
_shutdown = False

def handle_sigterm(signum, frame):
    """Maneja señales SIGTERM/SIGINT para apagado graceful del servidor."""
    global _shutdown
    print("\n⏳ Recibida señal de parada. Cerrando servidor...", file=sys.stderr)
    _shutdown = True
    # os._exit(0) no es ideal, pero Flask no expone shutdown fácil
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)

# ── Rutas del Frontend ──────────────────────────

@app.route('/')
def index():
    """Sirve index.html"""
    return send_from_directory(str(FRONTEND_DIR), 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """Sirve archivos estáticos (CSS, JS, assets)"""
    return send_from_directory(str(FRONTEND_DIR), filename)

# ── API REST ────────────────────────────────────

def _write_tabs(sketch_dir, tabs):
    """Escribe archivos .h de los tabs en el directorio del sketch."""
    if not tabs:
        return
    for tab in tabs:
        filename = tab.get('filename', '')
        content = tab.get('content', '')
        if not filename or not content.strip():
            continue
        # Sanitizar: solo permitir nombres seguros dentro del sketch dir
        safe = os.path.basename(filename)
        if safe != filename or '..' in safe:
            continue
        (sketch_dir / safe).write_text(content)

@app.route('/api/projects', methods=['GET'])
def list_projects():
    """Lista proyectos guardados"""
    projects = []
    for f in PROJECTS_DIR.glob('*.json'):
        projects.append({
            'id': f.stem,
            'name': f.stem,
            'modified': os.path.getmtime(str(f))
        })
    return jsonify(projects)

@app.route('/api/projects/<project_id>', methods=['GET'])
def load_project(project_id):
    """Carga un proyecto"""
    if not _validate_project_id(project_id):
        return jsonify({'error': 'ID de proyecto inválido'}), 400
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        return jsonify({'error': 'Proyecto no encontrado'}), 404
    with open(path) as f:
        data = json.load(f)
    return jsonify(data)

@app.route('/api/projects/<project_id>', methods=['PUT'])
def save_project(project_id):
    """Guarda un proyecto (estado del workspace Blockly)"""
    if not _validate_project_id(project_id):
        return jsonify({'error': 'ID de proyecto inválido'}), 400
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Datos inválidos'}), 400

    path = PROJECTS_DIR / f"{project_id}.json"
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

    return jsonify({'status': 'ok', 'id': project_id})

@app.route('/api/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """Elimina un proyecto"""
    if not _validate_project_id(project_id):
        return jsonify({'error': 'ID de proyecto inválido'}), 400
    path = PROJECTS_DIR / f"{project_id}.json"
    if not path.exists():
        return jsonify({'error': 'Proyecto no encontrado'}), 404
    path.unlink()
    return jsonify({'status': 'ok', 'id': project_id})

@app.route('/api/examples')
def list_examples():
    """Lista todos los ejemplos de Arduino disponibles"""
    examples = []

    def scan_dir(base, rel_path=''):
        """Escanea recursivamente directorios en busca de archivos .ino."""
        p = base / rel_path
        if not p.is_dir():
            return
        for item in sorted(p.iterdir()):
            if item.name.startswith('.'):
                continue
            rel = f"{rel_path}/{item.name}" if rel_path else item.name
            if item.is_dir():
                scan_dir(base, rel)
            elif item.suffix == '.ino':
                # Leer primeras líneas para extraer descripción
                desc = ''
                try:
                    with open(item) as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith('/*') or line.startswith('*') or line.startswith('//'):
                                cleaned = line.lstrip('/* *//')
                                if cleaned and len(cleaned) > 3:
                                    desc = cleaned[:120]
                                    break
                            elif line and not line.startswith('#'):
                                break
                except Exception:
                    pass
                examples.append({
                    'path': rel,
                    'name': item.stem,
                    'description': desc
                })

    scan_dir(EXAMPLES_DIR)
    return jsonify(examples)

@app.route('/api/examples/<path:example_path>')
def get_example(example_path):
    """Devuelve el contenido de un ejemplo .ino"""
    full = EXAMPLES_DIR / example_path
    if not full.exists() or not full.is_file():
        return jsonify({'error': 'Ejemplo no encontrado'}), 404
    try:
        content = full.read_text()
        return jsonify({'path': example_path, 'name': full.stem, 'content': content})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/boards')
def list_boards():
    """Lista placas Arduino conectadas"""
    try:
        result = subprocess.run(
            ['arduino-cli', 'board', 'list', '--format', 'json'],
            capture_output=True, text=True, timeout=10
        )
        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500
        return jsonify(json.loads(result.stdout))
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout buscando placas'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/compile', methods=['POST'])
def compile_sketch():
    """Compila código C++ de Arduino"""
    data = request.get_json()
    code = data.get('code', '') if data else ''
    fqbn = data.get('fqbn', 'arduino:avr:uno') if data else 'arduino:avr:uno'
    tabs = data.get('tabs', []) if data else []

    if not code.strip():
        return jsonify({'error': 'Código vacío'}), 400

    tmpdir = tempfile.mkdtemp(prefix='ardublock_')
    sketch_name = 'ardublock_sketch'
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    ino_file = sketch_dir / f'{sketch_name}.ino'

    try:
        ino_file.write_text(code)
        _write_tabs(sketch_dir, tabs)

        result = subprocess.run(
            ['arduino-cli', 'compile', '--fqbn', fqbn, str(sketch_dir)],
            capture_output=True, text=True, timeout=60
        )

        return jsonify({
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout de compilación (60s)'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

@app.route('/api/upload', methods=['POST'])
def upload_sketch():
    """Compila y sube código al Arduino"""
    data = request.get_json()
    code = data.get('code', '') if data else ''
    port = data.get('port', '') if data else ''
    fqbn = data.get('fqbn', 'arduino:avr:uno') if data else 'arduino:avr:uno'
    tabs = data.get('tabs', []) if data else []

    if not code.strip():
        return jsonify({'error': 'Código vacío'}), 400
    if not port:
        return jsonify({'error': 'Puerto no especificado. Conectá el Arduino y refrescá.'}), 400

    tmpdir = tempfile.mkdtemp(prefix='ardublock_')
    sketch_name = 'ardublock_sketch'
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    ino_file = sketch_dir / f'{sketch_name}.ino'

    try:
        ino_file.write_text(code)
        _write_tabs(sketch_dir, tabs)

        compile_result = subprocess.run(
            ['arduino-cli', 'compile', '--fqbn', fqbn, str(sketch_dir)],
            capture_output=True, text=True, timeout=60
        )

        if compile_result.returncode != 0:
            return jsonify({
                'success': False,
                'stage': 'compile',
                'stdout': compile_result.stdout,
                'stderr': compile_result.stderr
            })

        upload_result = subprocess.run(
            ['arduino-cli', 'upload', '-p', port, '--fqbn', fqbn, str(sketch_dir)],
            capture_output=True, text=True, timeout=60
        )

        return jsonify({
            'success': upload_result.returncode == 0,
            'stage': 'upload',
            'stdout': compile_result.stdout + '\n' + upload_result.stdout,
            'stderr': upload_result.stderr
        })
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout (60s). ¿Arduino conectado?'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

@app.route('/api/serial/open', methods=['POST'])
def serial_open():
    """Abre el puerto serial para monitor"""
    global serial_port, serial_thread, serial_running, serial_buffer

    if serial_running:
        return jsonify({'status': 'ok', 'message': 'Ya conectado', 'port': serial_port.port if serial_port else '?', 'baud': serial_port.baudrate if serial_port else 0})

    data = request.get_json() or {}
    port = data.get('port', '')
    baud = int(data.get('baud', 9600))

    if not port:
        # Autodetectar
        try:
            result = subprocess.run(
                ['arduino-cli', 'board', 'list', '--format', 'json'],
                capture_output=True, text=True, timeout=10
            )
            try:
                boards = json.loads(result.stdout)
            except json.JSONDecodeError:
                return jsonify({'error': 'No se pudo interpretar la salida de arduino-cli. ¿Está instalado?'}), 500
            ports = boards.get('detected_ports', [])
            if ports:
                port = ports[0]['port']['address']
            else:
                return jsonify({'error': 'No se detectó ningún Arduino'}), 400
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    try:
        import serial
        ser = serial.Serial(port, baud, timeout=0.5)
        serial_port = ser
        serial_running = True
        serial_buffer = []

        def read_loop():
            """Lee continuamente del puerto serial en un hilo daemon."""
            while serial_running:
                try:
                    line = serial_port.readline()
                    if line:
                        with serial_lock:
                            serial_buffer.append(line.decode('utf-8', errors='replace'))
                except Exception:
                    break

        serial_thread = threading.Thread(target=read_loop, daemon=True)
        serial_thread.start()

        return jsonify({'status': 'ok', 'port': port, 'baud': baud})
    except Exception as e:
        serial_running = False
        return jsonify({'error': f'No se pudo abrir {port}: {str(e)}'}), 500

@app.route('/api/serial/read')
@limiter.exempt
def serial_read():
    """Lee datos del buffer serial"""
    global serial_buffer
    if not serial_running:
        return jsonify({'connected': False, 'data': ''})

    with serial_lock:
        data = ''.join(serial_buffer)
        serial_buffer = []
    return jsonify({'connected': True, 'data': data})

@app.route('/api/serial/close', methods=['POST'])
def serial_close():
    """Cierra el puerto serial"""
    global serial_port, serial_running, serial_buffer
    serial_running = False
    if serial_port:
        try:
            serial_port.close()
        except Exception:
            pass
        serial_port = None
    serial_buffer = []
    return jsonify({'status': 'ok'})

@app.route('/api/serial/status')
def serial_status():
    """Estado de la conexión serial"""
    return jsonify({'connected': serial_running})

@app.route('/api/health')
def health():
    """Health check"""
    return jsonify({'status': 'ok', 'app': 'ArduBlock'})

@app.route('/api/board/install', methods=['POST'])
def board_install():
    """Instala cores y librerías necesarias para la placa seleccionada."""
    data = request.get_json() or {}
    fqbn = data.get('fqbn', 'arduino:avr:uno')

    deps = BOARD_DEPS.get(fqbn, {'cores': [], 'libs': []})
    results = []

    # Instalar cores
    for core in deps.get('cores', []):
        try:
            r = subprocess.run(
                ['arduino-cli', 'core', 'install', core],
                capture_output=True, text=True, timeout=120
            )
            results.append({
                'type': 'core', 'name': core,
                'success': r.returncode == 0,
                'stdout': r.stdout[-500:] if r.stdout else '',
                'stderr': r.stderr[-500:] if r.stderr else ''
            })
        except subprocess.TimeoutExpired:
            results.append({'type': 'core', 'name': core, 'success': False, 'error': 'timeout'})
        except Exception as e:
            results.append({'type': 'core', 'name': core, 'success': False, 'error': str(e)})

    # Instalar librerías
    for lib in deps.get('libs', []):
        try:
            r = subprocess.run(
                ['arduino-cli', 'lib', 'install', lib],
                capture_output=True, text=True, timeout=120
            )
            results.append({
                'type': 'lib', 'name': lib,
                'success': r.returncode == 0,
                'stdout': r.stdout[-500:] if r.stdout else '',
                'stderr': r.stderr[-500:] if r.stderr else ''
            })
        except subprocess.TimeoutExpired:
            results.append({'type': 'lib', 'name': lib, 'success': False, 'error': 'timeout'})
        except Exception as e:
            results.append({'type': 'lib', 'name': lib, 'success': False, 'error': str(e)})

    return jsonify({'fqbn': fqbn, 'results': results})

# ── Main ────────────────────────────────────────

if __name__ == '__main__':
    print(f"⚡ ArduBlock backend iniciado")
    print(f"   Host:      {HOST}:{PORT}")
    print(f"   Frontend:  {FRONTEND_DIR}")
    print(f"   Proyectos: {PROJECTS_DIR}")
    app.run(host=HOST, port=PORT, debug=False)
