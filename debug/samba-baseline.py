#!/usr/bin/env python3
"""Fase 0: Diagnóstico SAM-BA baseline — R4 WiFi en modo bootloader."""
import serial
import time

PORT = '/dev/ttyACM0'
BAUD = 230400

def cmd(s, command, wait=0.5):
    """Envía comando SAM-BA y lee respuesta."""
    s.write(command.encode())
    s.flush()
    time.sleep(wait)
    chunks = []
    while s.in_waiting:
        chunk = s.read(s.in_waiting)
        chunks.append(chunk)
        time.sleep(0.05)
    resp = b''.join(chunks)
    hex_str = resp.hex(' ') if resp else '(vacío)'
    ascii_str = ''.join(chr(b) if 32 <= b < 127 else '.' for b in resp)
    print(f">> {command.strip():20s} << {hex_str:30s} | {ascii_str}  ({len(resp)}B)")
    return resp

print("=" * 70)
print("SAM-BA Baseline Diagnostic — R4 WiFi")
print(f"Puerto: {PORT}  Baud: {BAUD}")
print("=" * 70)

try:
    s = serial.Serial(PORT, BAUD, timeout=1)
    print(f"✓ Puerto abierto: {s.name}")
except Exception as e:
    print(f"✕ Error abriendo puerto: {e}")
    exit(1)

# Dar tiempo al bootloader
time.sleep(1)

print("\n--- Comandos de handshake ---")
r1 = cmd(s, 'N#')
r2 = cmd(s, 'V#')
r3 = cmd(s, 'I#')

print("\n--- Análisis ---")
if r1 and len(r1) >= 2 and 0x0a in r1:
    print("✓ N# OK — bootloader responde en modo binario")
else:
    print(f"✕ N# inesperado — esperado 0x0a 0x0d, recibido {len(r1)}B")

if r2:
    ver = r2.decode('ascii', errors='replace').strip()
    print(f"✓ Versión: {ver}")
    if 'Arduino' in ver:
        print("  → Bootloader SAM-BA extended de Arduino confirmado")
else:
    print("✕ V# sin respuesta")

if r3:
    chip = r3.decode('ascii', errors='replace').strip()
    print(f"✓ Chip ID: {chip}")
else:
    print("✕ I# sin respuesta")

# Probar un comando más: S (write RAM) con datos mínimos
print("\n--- Prueba de write RAM (S) ---")
test_data = bytes([0x00, 0x01, 0x02, 0x03])
cmd_str = f'S20000100,{len(test_data):08X}#'
s.write(cmd_str.encode())
s.flush()
time.sleep(0.1)
s.write(test_data)
s.flush()
time.sleep(0.5)
resp = b''
while s.in_waiting:
    resp += s.read(s.in_waiting)
    time.sleep(0.05)
print(f">> S + {len(test_data)}B datos{' ' * 12} << {resp.hex(' ') if resp else '(vacío)'}  ({len(resp)}B)")

# Probar Y (native write buffer)
print("\n--- Prueba de write buffer nativo (Y) ---")
test_data2 = bytes([0xAA] * 16)
cmd_str = f'Y20000100,{len(test_data2):08X}#'
s.write(cmd_str.encode())
s.flush()
time.sleep(0.1)
s.write(test_data2)
s.flush()
time.sleep(0.5)
resp = b''
while s.in_waiting:
    resp += s.read(s.in_waiting)
    time.sleep(0.05)
print(f">> Y + {len(test_data2)}B datos{' ' * 11} << {resp.hex(' ') if resp else '(vacío)'}  ({len(resp)}B)")

s.close()
print("\n✓ Puerto cerrado. Diagnóstico completo.")
