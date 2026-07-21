#!/usr/bin/env python3
"""Microservidor standalone para debug SAM-BA — solo Flask stdlib, sin deps extra."""
import base64, json, subprocess, tempfile, os, sys
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')

# CORS manual — sin flask_cors
@app.after_request
def cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

ARDUINO_CLI = '/usr/bin/arduino-cli'
FQBN = 'arduino:renesas_uno:unor4wifi'

@app.route('/')
def index():
    return send_from_directory('.', 'samba-webserial-test.html')

@app.route('/api/compile-hex', methods=['POST', 'OPTIONS'])
def compile_hex():
    if request.method == 'OPTIONS':
        return '', 204

    data = request.get_json()
    code = data.get('code', '') if data else ''
    if not code.strip():
        return jsonify({'error': 'Código vacío'}), 400

    tmpdir = tempfile.mkdtemp(prefix='samba_hex_')
    try:
        sketch_dir = Path(tmpdir) / 'sketch'
        sketch_dir.mkdir()
        ino = sketch_dir / 'sketch.ino'
        ino.write_text(code)

        build_dir = Path(tmpdir) / 'build'
        build_dir.mkdir()

        result = subprocess.run(
            [ARDUINO_CLI, 'compile', '--fqbn', FQBN, '--output-dir', str(build_dir), str(sketch_dir)],
            capture_output=True, text=True, timeout=60
        )

        if result.returncode != 0:
            return jsonify({
                'success': False,
                'stdout': result.stdout,
                'stderr': result.stderr
            }), 422

        # Buscar .bin
        bin_files = list(build_dir.glob('*.ino.bin'))
        if not bin_files:
            return jsonify({'error': 'No se generó .bin', 'stdout': result.stdout}), 500

        bin_data = bin_files[0].read_bytes()
        return jsonify({
            'success': True,
            'bin': base64.b64encode(bin_data).decode('ascii'),
            'size': len(bin_data),
            'stdout': result.stdout
        })

    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout de compilación (60s)'}), 504
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)

if __name__ == '__main__':
    print(f'Serving on http://localhost:8090')
    print(f'FQBN: {FQBN}')
    app.run(host='0.0.0.0', port=8090, debug=False)
