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
import zipfile
import tarfile
import urllib.request
import platform
import stat
from pathlib import Path

# ── Detección de arduino-cli ────────────────────
# Directorio local de ArduBlock para binarios auto-instalados
_ARDUINO_CLI_DIR = Path.home() / '.ardublock' / 'bin'
_ARDUINO_CLI_LOCAL = _ARDUINO_CLI_DIR / ('arduino-cli.exe' if sys.platform == 'win32' else 'arduino-cli')

_ARDUINO_CLI = None
# 1. Buscar en PATH del sistema
_ARDUINO_CLI = shutil.which('arduino-cli')
# 2. Buscar en instalación local automática de ArduBlock
if not _ARDUINO_CLI and _ARDUINO_CLI_LOCAL.is_file():
    _ARDUINO_CLI = str(_ARDUINO_CLI_LOCAL)
# 3. Windows: buscar en rutas comunes de instalación manual
if not _ARDUINO_CLI and sys.platform == 'win32':
    _candidates = [
        os.path.join(os.path.expandvars('%LOCALAPPDATA%'), 'arduino-cli', 'arduino-cli.exe'),
        os.path.join(os.path.expandvars('%PROGRAMFILES%'), 'arduino-cli', 'arduino-cli.exe'),
        os.path.join(os.path.expandvars('%PROGRAMFILES(X86)%'), 'arduino-cli', 'arduino-cli.exe'),
    ]
    for _c in _candidates:
        if os.path.isfile(_c):
            _ARDUINO_CLI = _c
            break

_ARDUINO_CLI_AVAILABLE = _ARDUINO_CLI is not None and os.path.isfile(_ARDUINO_CLI)


def _run_arduino_cli(args, **kwargs):
    """Ejecuta arduino-cli usando la ruta resuelta.
    
    Lanza FileNotFoundError con mensaje descriptivo si no está instalado.
    """
    cli_path: str | None = _ARDUINO_CLI
    if not cli_path or not os.path.isfile(cli_path):
        raise FileNotFoundError(
            'arduino-cli no encontrado. Instálalo desde '
            'https://arduino.github.io/arduino-cli/installation/ '
            'y asegurate de que esté en el PATH.'
        )
    cmd = [cli_path] + list(args)
    # Forzar encoding UTF-8 en Windows para evitar mojibake
    if sys.platform == 'win32':
        kwargs.setdefault('encoding', 'utf-8')
        kwargs.setdefault('errors', 'replace')
    if 'text' not in kwargs and 'encoding' not in kwargs:
        kwargs['text'] = True
    return subprocess.run(cmd, **kwargs)

app = Flask(__name__, static_folder=None)
CORS(app, origins=['http://localhost:5000', 'http://127.0.0.1:5000'])

# ── Rate Limiting ────────────────────────────────
limiter = Limiter(
    key_func=get_remote_address,
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
_FRONTEND_BASE = Path(__file__).resolve().parent.parent / "frontend"
FRONTEND_DIR = _FRONTEND_BASE / "dist" if os.environ.get("ARDUBLOCK_PRODUCTION") else _FRONTEND_BASE
PROJECTS_DIR = Path(__file__).resolve().parent / "projects"
EXAMPLES_DIR = Path(__file__).resolve().parent.parent / "examples" / "arduino"
PROJECTS_DIR.mkdir(exist_ok=True)

# ── Board config: cores y libs requeridas ──────
BOARD_DEPS = {
    'arduino:avr:uno':              {'cores': ['arduino:avr'], 'libs': []},
    'arduino:avr:nano':             {'cores': ['arduino:avr'], 'libs': []},
    'arduino:avr:mega':             {'cores': ['arduino:avr'], 'libs': []},
    'arduino:renesas_uno:minima':   {'cores': ['arduino:renesas_uno'], 'libs': []},
    'arduino:renesas_uno:wifi':     {'cores': ['arduino:renesas_uno'], 'libs': []},  # WiFiS3 incluida en el core
    'arduino:esp32:nano_nora':      {'cores': ['arduino:esp32'], 'libs': []},
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


def _try_install_missing_core(stderr_text):
    """Intenta instalar un core faltante a partir del mensaje de error de arduino-cli.
    
    Reconoce mensajes como:
      "Error during build: Platform 'arduino:avr' not found: platform not installed"
      "Invalid FQBN: board arduino:renesas_uno:wifi not found"
    """
    import re as _re
    
    # Caso 1: "Platform 'arduino:avr' not found"
    m = _re.search(r"Platform '([^']+)' not found", stderr_text)
    if m:
        core_id = m.group(1)
        try:
            _run_arduino_cli(['core', 'install', core_id], capture_output=True, timeout=120)
            return True
        except Exception:
            return False
    
    # Caso 2: "Invalid FQBN: board arduino:renesas_uno:wifi not found"
    m = _re.search(r'board (\S+) not found', stderr_text)
    if m:
        fqbn = m.group(1)  # ej: arduino:renesas_uno:wifi
        parts = fqbn.split(':')
        if len(parts) >= 2:
            core_id = f'{parts[0]}:{parts[1]}'  # ej: arduino:renesas_uno
            try:
                _run_arduino_cli(['core', 'install', core_id], capture_output=True, timeout=120)
                return True
            except Exception:
                return False
    
    # Caso 3: "platform not installed" (genérico, sin nombre de plataforma)
    if 'platform not installed' in stderr_text.lower():
        return False  # no se puede determinar cuál instalar
    
    return False

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

# ── Mapeo chips USB → placas probables ──────────
# (VID, PID): { suggested_fqbn, compatible_fqbns, label }
_CHIP_BOARD_MAP = {
    ('1A86', '7523'): {
        'suggested_fqbn': 'arduino:avr:uno',
        'compatible_fqbns': ['arduino:avr:uno', 'arduino:avr:nano', 'arduino:avr:mega'],
        'label': 'CH340 (clon Arduino AVR)',
    },
    ('1A86', '5523'): {
        'suggested_fqbn': 'arduino:avr:uno',
        'compatible_fqbns': ['arduino:avr:uno', 'arduino:avr:nano', 'arduino:avr:mega'],
        'label': 'CH341 (clon Arduino AVR)',
    },
    ('10C4', 'EA60'): {
        'suggested_fqbn': 'arduino:avr:nano',
        'compatible_fqbns': ['arduino:avr:nano', 'arduino:avr:uno', 'arduino:avr:mega', 'arduino:esp32:nano_nora'],
        'label': 'CP2102 (clon Arduino/ESP)',
    },
}


def _extract_vid_pid(port_info):
    """Extrae (VID, PID) normalizados de un puerto, o (None, None)."""
    props = port_info.get('properties', {})
    vid = pid = None
    
    # Formato Windows: hardware_id = "USB\\VID_1A86&PID_7523\\..."
    hw_id = port_info.get('hardware_id', '') or ''
    for part in hw_id.replace('&', '\\').split('\\'):
        if part.upper().startswith('VID_'):
            vid = part[4:].upper()
        elif part.upper().startswith('PID_'):
            pid = part[4:].upper()
    
    # Formato Linux: properties.vid = "0x1a86", properties.pid = "0x7523"
    if not (vid and pid):
        raw_vid = props.get('vid', '')
        raw_pid = props.get('pid', '')
        if raw_vid and raw_pid:
            vid = raw_vid.replace('0x', '').replace('0X', '').upper().zfill(4)
            pid = raw_pid.replace('0x', '').replace('0X', '').upper().zfill(4)
    
    return (vid, pid)


@app.route('/api/boards')
def list_boards():
    """Lista placas Arduino conectadas, con sugerencia para clones."""
    try:
        result = _run_arduino_cli(
            ['board', 'list', '--format', 'json'],
            capture_output=True, timeout=10
        )
        if result.returncode != 0:
            return jsonify({'error': result.stderr}), 500
        
        data = json.loads(result.stdout)
        
        # Enriquecer puertos no identificados con sugerencias
        for entry in data.get('detected_ports', []):
            port_info = entry.get('port', {})
            matching = entry.get('matching_boards', [])
            
            if not matching:
                vid, pid = _extract_vid_pid(port_info)
                chip_map = _CHIP_BOARD_MAP.get((vid, pid)) if vid and pid else None
                if chip_map:
                    entry['suggested_fqbn'] = chip_map['suggested_fqbn']
                    entry['compatible_fqbns'] = chip_map['compatible_fqbns']
                    entry['chip_label'] = chip_map['label']
        
        return jsonify(data)
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

        result = _run_arduino_cli(
            ['compile', '--fqbn', fqbn, str(sketch_dir)],
            capture_output=True, timeout=60
        )
        
        # Auto-instalar core faltante y reintentar
        if result.returncode != 0 and _try_install_missing_core(result.stderr):
            result = _run_arduino_cli(
                ['compile', '--fqbn', fqbn, str(sketch_dir)],
                capture_output=True, timeout=60
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
@app.route('/api/compile-hex', methods=['POST'])
def compile_hex():
    """Compila y devuelve el .hex para flasheo Web Serial."""
    data = request.get_json()
    code = data.get('code', '') if data else ''
    fqbn = data.get('fqbn', 'arduino:avr:uno') if data else 'arduino:avr:uno'
    tabs = data.get('tabs', []) if data else []

    if not code.strip():
        return jsonify({'error': 'Código vacío'}), 400

    tmpdir = tempfile.mkdtemp(prefix='ardublock_hex_')
    sketch_name = 'ardublock_sketch'
    sketch_dir = Path(tmpdir) / sketch_name
    sketch_dir.mkdir()
    ino_file = sketch_dir / f'{sketch_name}.ino'
    build_dir = Path(tmpdir) / 'build'
    build_dir.mkdir()

    try:
        ino_file.write_text(code)
        _write_tabs(sketch_dir, tabs)

        result = _run_arduino_cli(
            ['compile', '--fqbn', fqbn, '--output-dir', str(build_dir), str(sketch_dir)],
            capture_output=True, timeout=60
        )

        if result.returncode != 0 and _try_install_missing_core(result.stderr):
            result = _run_arduino_cli(
                ['compile', '--fqbn', fqbn, '--output-dir', str(build_dir), str(sketch_dir)],
                capture_output=True, timeout=60
            )

        if result.returncode != 0:
            return jsonify({
                'success': False,
                'stdout': result.stdout,
                'stderr': result.stderr
            }), 422

        hex_files = list(build_dir.glob('*.hex'))
        if not hex_files:
            return jsonify({
                'success': False,
                'error': 'No se encontró .hex en la salida de compilación'
            }), 500

        hex_content = hex_files[0].read_text()

        return jsonify({
            'success': True,
            'hex': hex_content,
            'fqbn': fqbn,
            'hex_name': hex_files[0].name,
            'stdout': result.stdout
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

        compile_result = _run_arduino_cli(
            ['compile', '--fqbn', fqbn, str(sketch_dir)],
            capture_output=True, timeout=60
        )

        # Auto-instalar core faltante y reintentar compilación
        if compile_result.returncode != 0 and _try_install_missing_core(compile_result.stderr):
            compile_result = _run_arduino_cli(
                ['compile', '--fqbn', fqbn, str(sketch_dir)],
                capture_output=True, timeout=60
            )

        if compile_result.returncode != 0:
            return jsonify({
                'success': False,
                'stage': 'compile',
                'stdout': compile_result.stdout,
                'stderr': compile_result.stderr
            })

        upload_result = _run_arduino_cli(
            ['upload', '-p', port, '--fqbn', fqbn, str(sketch_dir)],
            capture_output=True, timeout=60
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
            result = _run_arduino_cli(
                ['board', 'list', '--format', 'json'],
                capture_output=True, timeout=10
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
    """Health check — incluye estado de arduino-cli."""
    return jsonify({
        'status': 'ok',
        'app': 'ArduBlock',
        'arduino_cli': {
            'available': _ARDUINO_CLI_AVAILABLE,
            'path': _ARDUINO_CLI,
        }
    })

@app.route('/api/board/install', methods=['POST'])
def board_install():
    """Instala cores y librerías necesarias para la placa seleccionada.
    
    Solo instala lo que no esté ya instalado (consulta core list y lib list).
    """
    data = request.get_json() or {}
    fqbn = data.get('fqbn', 'arduino:avr:uno')

    deps = BOARD_DEPS.get(fqbn, {'cores': [], 'libs': []})
    
    # Consultar qué hay instalado (una sola vez cada uno)
    installed_cores = _get_installed_cores()
    installed_libs = _get_installed_libs()
    
    results = []
    skipped = 0

    # Instalar cores (solo los que falten)
    for core in deps.get('cores', []):
        if core in installed_cores:
            skipped += 1
            results.append({
                'type': 'core', 'name': core,
                'success': True, 'already_installed': True,
            })
            continue
        try:
            r = _run_arduino_cli(
                ['core', 'install', core],
                capture_output=True, timeout=120
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

    # Instalar librerías (solo las que falten)
    for lib in deps.get('libs', []):
        if lib in installed_libs:
            skipped += 1
            results.append({
                'type': 'lib', 'name': lib,
                'success': True, 'already_installed': True,
            })
            continue
        try:
            r = _run_arduino_cli(
                ['lib', 'install', lib],
                capture_output=True, timeout=120
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

    return jsonify({'fqbn': fqbn, 'results': results, 'skipped': skipped})


def _get_installed_cores():
    """Devuelve un set con los IDs de cores instalados (ej: 'arduino:renesas_uno')."""
    try:
        r = _run_arduino_cli(
            ['core', 'list', '--format', 'json'],
            capture_output=True, timeout=15
        )
        data = json.loads(r.stdout)
        # Formato: {"platforms": [{"id": "arduino:avr", ...}, ...]}
        platforms = data.get('platforms', data) if isinstance(data, dict) else data
        items = platforms if isinstance(platforms, list) else []
        return {item['id'] for item in items if isinstance(item, dict) and item.get('id')}
    except Exception:
        return set()


def _get_installed_libs():
    """Devuelve un set con los nombres de librerías instaladas."""
    try:
        r = _run_arduino_cli(
            ['lib', 'list', '--format', 'json'],
            capture_output=True, timeout=15
        )
        data = json.loads(r.stdout)
        # Formato: [{"name": "WiFiS3", "author": "...", "installed": "1.0.0"}, ...]
        return {item['name'] for item in data if isinstance(item, dict) and item.get('name')}
    except Exception:
        return set()


# ══════════════════════════════════════════════════
#  Auto-instalación de arduino-cli
# ══════════════════════════════════════════════════

_ARDUINO_CLI_DOWNLOADS = {
    ('linux', 'x86_64'):  'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_64bit.tar.gz',
    ('linux', 'aarch64'): 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_ARM64.tar.gz',
    ('linux', 'armv7l'):  'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_ARMv7.tar.gz',
    ('linux', 'i686'):    'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Linux_32bit.tar.gz',
    ('win32', 'AMD64'):   'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_Windows_64bit.zip',
    ('darwin', 'x86_64'): 'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_64bit.tar.gz',
    ('darwin', 'arm64'):  'https://downloads.arduino.cc/arduino-cli/arduino-cli_latest_macOS_ARM64.tar.gz',
}


def _get_download_url():
    """Devuelve la URL de descarga para la plataforma actual, o None."""
    return _ARDUINO_CLI_DOWNLOADS.get((sys.platform, platform.machine()))


def _install_arduino_cli():
    """Descarga e instala arduino-cli en ~/.ardublock/bin/.
    
    Returns:
        dict con 'success' (bool) y 'path' o 'error'.
    """
    url = _get_download_url()
    if not url:
        return {
            'success': False,
            'error': f'Plataforma no soportada: {sys.platform}/{platform.machine()}. '
                      'Instalá arduino-cli manualmente desde https://arduino.github.io/arduino-cli/installation/'
        }
    
    try:
        _ARDUINO_CLI_DIR.mkdir(parents=True, exist_ok=True)
        
        with tempfile.TemporaryDirectory(prefix='ardublock_cli_') as tmpdir:
            tmppath = Path(tmpdir)
            
            # Descargar
            archive_name = url.split('/')[-1]
            archive_path = tmppath / archive_name
            urllib.request.urlretrieve(url, str(archive_path))
            
            # Extraer
            if archive_name.endswith('.zip'):
                with zipfile.ZipFile(archive_path, 'r') as zf:
                    zf.extractall(tmppath)
            elif archive_name.endswith('.tar.gz') or archive_name.endswith('.tgz'):
                with tarfile.open(archive_path, 'r:gz') as tf:
                    tf.extractall(tmppath)
            else:
                return {'success': False, 'error': f'Formato desconocido: {archive_name}'}
            
            # Buscar el binario arduino-cli en lo extraído
            cli_bin = None
            for root, _dirs, files in os.walk(tmppath):
                for f in files:
                    if f.startswith('arduino-cli') and not f.endswith(('.zip', '.tar.gz', '.tgz', '.txt', '.md')):
                        cli_bin = Path(root) / f
                        break
                if cli_bin:
                    break
            
            if not cli_bin:
                return {'success': False, 'error': 'No se encontró el binario arduino-cli en el archivo descargado'}
            
            # Mover al destino
            if _ARDUINO_CLI_LOCAL.exists():
                _ARDUINO_CLI_LOCAL.unlink()
            shutil.move(str(cli_bin), str(_ARDUINO_CLI_LOCAL))
            
            # Hacer ejecutable en Unix
            if sys.platform != 'win32':
                st = _ARDUINO_CLI_LOCAL.stat()
                _ARDUINO_CLI_LOCAL.chmod(st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
            
            # Actualizar variable global
            global _ARDUINO_CLI, _ARDUINO_CLI_AVAILABLE
            _ARDUINO_CLI = str(_ARDUINO_CLI_LOCAL)
            _ARDUINO_CLI_AVAILABLE = True
            
            return {'success': True, 'path': _ARDUINO_CLI}
            
    except Exception as e:
        return {'success': False, 'error': f'Error al instalar arduino-cli: {str(e)}'}


@app.route('/api/arduino-cli/install', methods=['POST'])
def install_arduino_cli():
    """Instala arduino-cli automáticamente para la plataforma actual."""
    if _ARDUINO_CLI_AVAILABLE:
        return jsonify({'success': True, 'path': _ARDUINO_CLI, 'message': 'arduino-cli ya está instalado'})
    
    result = _install_arduino_cli()
    status_code = 200 if result['success'] else 500
    return jsonify(result), status_code


@app.route('/api/arduino-cli/status')
def arduino_cli_status():
    """Estado de arduino-cli: disponible, ruta, y si se puede instalar automáticamente."""
    return jsonify({
        'available': _ARDUINO_CLI_AVAILABLE,
        'path': _ARDUINO_CLI,
        'can_auto_install': _get_download_url() is not None,
        'platform': f'{sys.platform}/{platform.machine()}',
    })


# ══════════════════════════════════════════════════
#  Detección de drivers USB-Serial (CH340, etc.)
# ══════════════════════════════════════════════════

# VID/PID de chips USB-Serial comunes que pueden requerir driver
_KNOWN_USB_SERIAL = {
    # (VID, PID): { name, driver_url por plataforma }
    ('1A86', '7523'): {
        'name': 'CH340',
        'drivers': {
            'win32': 'http://www.wch-ic.com/downloads/CH341SER_EXE.html',
            'darwin': 'http://www.wch-ic.com/downloads/CH34XSER_MAC_ZIP.html',
            'linux': None,  # incluido en kernel desde 2.6
        }
    },
    ('1A86', '5523'): {
        'name': 'CH341',
        'drivers': {
            'win32': 'http://www.wch-ic.com/downloads/CH341SER_EXE.html',
            'darwin': 'http://www.wch-ic.com/downloads/CH34XSER_MAC_ZIP.html',
            'linux': None,
        }
    },
    ('10C4', 'EA60'): {
        'name': 'CP2102',
        'drivers': {
            'win32': 'https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers',
            'darwin': 'https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers',
            'linux': None,
        }
    },
}


def _detect_driver_issues():
    """Ejecuta arduino-cli board list y detecta chips que pueden necesitar drivers.
    
    Returns:
        dict con 'ports' (lista de puertos con chips conocidos) y 'recommendations'.
    """
    ports = []
    recommendations = []
    
    if not _ARDUINO_CLI_AVAILABLE:
        return {'ports': [], 'recommendations': [], 'error': 'arduino-cli no disponible'}
    
    try:
        result = _run_arduino_cli(
            ['board', 'list', '--format', 'json'],
            capture_output=True, timeout=10
        )
        data = json.loads(result.stdout)
        detected = data.get('detected_ports', [])
    except Exception:
        return {'ports': [], 'recommendations': [], 'error': 'No se pudo consultar las placas'}
    
    for entry in detected:
        port_info = entry.get('port', {})
        address = port_info.get('address', '?')
        matching = entry.get('matching_boards', [])
        
        vid, pid = _extract_vid_pid(port_info)
        if not (vid and pid):
            continue
        
        chip_info = _KNOWN_USB_SERIAL.get((vid, pid))
        if not chip_info:
            continue
        
        driver_url = chip_info['drivers'].get(sys.platform)
        driver_needed = driver_url is not None
        
        # Info de placas compatibles
        board_map = _CHIP_BOARD_MAP.get((vid, pid), {})
        
        port_entry = {
            'address': address,
            'chip': chip_info['name'],
            'vid': vid,
            'pid': pid,
            'driver_needed': driver_needed,
            'driver_url': driver_url,
            'board_identified': len(matching) > 0,
            'suggested_fqbn': board_map.get('suggested_fqbn'),
            'compatible_fqbns': board_map.get('compatible_fqbns', []),
            'chip_label': board_map.get('label', chip_info['name']),
        }
        ports.append(port_entry)
        
        if driver_needed and not matching:
            os_name = {'win32': 'Windows', 'darwin': 'macOS', 'linux': 'Linux'}.get(sys.platform, sys.platform)
            recommendations.append(
                f'Chip {chip_info["name"]} detectado en {address}. '
                f'En {os_name} este chip requiere instalar el driver manualmente.'
            )
    
    # Recomendaciones generales según plataforma
    if ports and sys.platform == 'darwin':
        recommendations.append(
            'En macOS, después de instalar el driver CH34x, '
            'reinicia el Mac y autorizá la extensión en Preferencias del Sistema → Seguridad.'
        )
    elif ports and sys.platform == 'win32':
        recommendations.append(
            'En Windows, si el driver no se instala automáticamente, '
            'descargalo del sitio del fabricante y ejecutalo como administrador.'
        )
    
    return {
        'ports': ports,
        'recommendations': recommendations,
    }


@app.route('/api/drivers')
def drivers_status():
    """Detecta chips USB-Serial que pueden necesitar drivers."""
    result = _detect_driver_issues()
    return jsonify(result)


# ── Main ────────────────────────────────────────

if __name__ == '__main__':
    print(f"⚡ ArduBlock backend iniciado")
    print(f"   Host:      {HOST}:{PORT}")
    print(f"   Frontend:  {FRONTEND_DIR}")
    print(f"   Proyectos: {PROJECTS_DIR}")
    if _ARDUINO_CLI_AVAILABLE:
        print(f"   arduino-cli: ✓ {_ARDUINO_CLI}")
    else:
        print(f"   arduino-cli: ✕ NO ENCONTRADO (compilar/subir requiere arduino-cli)")
    app.run(host=HOST, port=PORT, debug=False)
