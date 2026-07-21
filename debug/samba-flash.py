#!/usr/bin/env python3
"""Flashea R4 WiFi vía SAM-BA nativo (Y commands) desde Python."""
import serial, time, sys
from pathlib import Path

PORT = '/dev/ttyACM0'
BAUD = 230400
BIN_PATH = '/tmp/r4test/r4test.ino.bin'
PAGE_SIZE = 4096
BUF_ADDR = 0x20000100
FLASH_BASE = 0x00004000

def cmd(s, command, wait=0.3, read_too=True):
    """Envía comando, lee respuesta."""
    s.write(command.encode())
    s.flush()
    if not read_too:
        return b''
    time.sleep(wait)
    chunks = []
    deadline = time.time() + 3
    while time.time() < deadline:
        if s.in_waiting:
            chunk = s.read(s.in_waiting)
            chunks.append(chunk)
            if b'\n' in chunk:
                break
        time.sleep(0.03)
    resp = b''.join(chunks)
    hex_str = resp.hex(' ') if resp else '(vacío)'
    short_cmd = command[:40] if len(command) <= 40 else command[:37] + '...'
    print(f"  {short_cmd:42s} → {hex_str:30s} ({len(resp)}B)")
    return resp

print("=" * 60)
print("SAM-BA Native Flasher — R4 WiFi")
print(f"Bin: {BIN_PATH}  Puerto: {PORT}")
print("=" * 60)

# Leer .bin
bin_data = Path(BIN_PATH).read_bytes()
total_pages = (len(bin_data) + PAGE_SIZE - 1) // PAGE_SIZE
print(f"📦 {len(bin_data)} bytes → {total_pages} páginas")

# Abrir puerto
s = serial.Serial(PORT, BAUD, timeout=1)
time.sleep(1)
print(f"✓ Puerto abierto: {s.name}")

# Init
print("\n--- Init ---")
r = cmd(s, 'N#')
assert r and len(r) >= 2, f"N# sin respuesta: {r}"
r = cmd(s, 'V#')
ver = r.decode('ascii', errors='replace').strip()
print(f"  ✓ {ver}")
r = cmd(s, 'I#')
print(f"  Chip: {r.decode('ascii', errors='replace').strip()}")

# Flash pages
print(f"\n--- Flasheando {total_pages} páginas ---")
offset = 0
for page_num in range(total_pages):
    flash_addr = FLASH_BASE + offset
    chunk_size = min(PAGE_SIZE, len(bin_data) - offset)
    page = bin_data[offset:offset + chunk_size].ljust(PAGE_SIZE, b'\x00')

    # 1. Y upload a RAM
    upload_cmd = f"Y{BUF_ADDR:08X},{PAGE_SIZE:08X}#"
    s.write(upload_cmd.encode())
    s.flush()
    time.sleep(0.02)
    s.write(page)
    s.flush()

    # Leer respuesta Y\r\n
    time.sleep(0.3)
    resp = b''
    deadline = time.time() + 3
    while time.time() < deadline:
        if s.in_waiting:
            resp += s.read(s.in_waiting)
            if b'\n' in resp:
                break
        time.sleep(0.03)

    ok = len(resp) >= 2
    print(f"  [{page_num+1}/{total_pages}] ↑0x{flash_addr:08X} → {resp.hex(' ') if resp else '(vacío)'} {'✓' if ok else '✕ RETRY'}", end='')

    if not ok:
        print(" — reintentando...")
        time.sleep(1)
        continue

    # 2. Y flash write
    write_cmd = f"Y{flash_addr:08X},00001000#"
    s.write(write_cmd.encode())
    s.flush()
    time.sleep(0.3)
    resp = b''
    deadline = time.time() + 3
    while time.time() < deadline:
        if s.in_waiting:
            resp += s.read(s.in_waiting)
            if b'\n' in resp:
                break
        time.sleep(0.03)
    print(f"  ↓ write → {resp.hex(' ') if resp else '(sin resp)'}")

    offset += PAGE_SIZE
    time.sleep(0.5)

print(f"\n✅ {offset} bytes escritos")

# Reset
print("\n--- Reset ---")
try:
    s.write(b'Z#')
    s.flush()
except:
    pass
s.close()
print("✓ Puerto cerrado. Probá el LED.")
