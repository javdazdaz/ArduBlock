/**
 * DFU flasher para ESP32 Nano vía node-usb (WebUSB API)
 * Uso: node dfu-flash.js <archivo.bin>
 * 
 * La API es idéntica a navigator.usb del navegador,
 * lo que permite testear el protocolo antes de implementar en ArduBlock.
 */

const { webusb } = require('usb');
const fs = require('fs');

const VID = 0x2341;
const PID = 0x0070;
const CHUNK = 4096;

const delay = ms => new Promise(r => setTimeout(r, ms));

function log(msg) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${ts} ${msg}`);
}

async function getStatus(device) {
  const result = await device.controlTransferIn({
    requestType: 'class',
    recipient: 'interface',
    request: 0x03,  // DFU_GETSTATUS
    value: 0,
    index: 0
  }, 6);
  // WebUSB DataView
  if (!result.data || !result.data.buffer) {
    throw new Error('GETSTATUS: respuesta vacía');
  }
  const buf = new Uint8Array(result.data.buffer);
  if (buf.byteLength < 6) throw new Error('GETSTATUS response too short');
  return {
    status:      buf[0],
    pollTimeout: buf[1] | (buf[2] << 8) | (buf[3] << 16),
    state:       buf[4],
    iString:     buf[5]
  };
}

function stateName(s) {
  return ['appIDLE','appDETACH','dfuIDLE','dfuDNLOAD-SYNC','dfuDNBUSY',
    'dfuDNLOAD-IDLE','dfuMANIFEST-SYNC','dfuMANIFEST',
    'dfuMANIFEST-WAIT-RESET','dfuUPLOAD-IDLE','dfuERROR'][s] || `?(${s})`;
}

async function main() {
  const binPath = process.argv[2];
  if (!binPath) {
    console.error('Uso: node dfu-flash.js <archivo.bin>');
    process.exit(1);
  }
  const bin = fs.readFileSync(binPath);
  log(`Firmware: ${bin.length} bytes, ${Math.ceil(bin.length / CHUNK)} chunks`);

  // 1. Encontrar dispositivo
  log(`Buscando DFU device ${VID.toString(16)}:${PID.toString(16)}...`);
  let device;
  try {
    device = await webusb.findDeviceByIds(VID, PID);
  } catch (_) {}
  if (!device) {
    console.error('Dispositivo DFU no encontrado. ¿Está en modo DFU?');
    process.exit(1);
  }

  // 2. Abrir y claim interface 0 (DFU, sin driver de kernel)
  await device.open();
  await device.claimInterface(0);
  log('DFU interface reclamada');

  // 3. Estado inicial — si no está IDLE, ABORT
  let status = await getStatus(device);
  log(`Estado inicial: ${stateName(status.state)}`);

  if (status.state !== 2) {
    log('Enviando ABORT para limpiar...');
    await device.controlTransferOut({
      requestType: 'class', recipient: 'interface',
      request: 0x06, value: 0, index: 0  // DFU_ABORT
    }, Buffer.alloc(0));
    await delay(200);
    status = await getStatus(device);
    log(`Post-ABORT: ${stateName(status.state)}`);
  }

  // 4. Download
  const t0 = Date.now();
  let offset = 0;
  let blockNum = 0;

  while (offset < bin.length) {
    const chunk = bin.slice(offset, offset + CHUNK);

    await device.controlTransferOut({
      requestType: 'class', recipient: 'interface',
      request: 0x01, value: blockNum, index: 0  // DFU_DNLOAD
    }, chunk);

    // Esperar que termine de procesar: sale de dfuDNBUSY (4)
    // dfuDNLOAD-IDLE (5) ya permite el siguiente DNLOAD
    status = await getStatus(device);
    let polls = 0;
    while (status.state === 4 && polls < 30) {
      await delay(status.pollTimeout || 10);
      status = await getStatus(device);
      polls++;
    }

    if (status.state !== 2 && status.state !== 5) {
      console.error(`Error chunk ${blockNum}: ${stateName(status.state)}`);
      process.exit(1);
    }

    offset += chunk.length;
    blockNum++;
    const pct = Math.round(offset / bin.length * 100);
    if (blockNum % 5 === 0 || offset >= bin.length) {
      log(`  ${blockNum} chunks (${pct}%)`);
    }
  }

  // 5. Finalizar: DNLOAD vacío → MANIFEST → reset
  log('Finalizando (MANIFEST)...');
  try {
    await device.controlTransferOut({
      requestType: 'class', recipient: 'interface',
      request: 0x01, value: blockNum, index: 0  // DFU_DNLOAD
    });
  } catch (_) {
    // Device se resetea al recibir el DNLOAD vacío, puede desaparecer del bus
  }

  // 6. USB reset para salir de modo DFU y ejecutar el sketch
  await delay(200);
  try {
    await device.reset();
    log('USB reset enviado');
  } catch (_) {
    // Puede fallar si ya salió
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  log(`✓ ${bin.length} bytes en ${elapsed}s`);

  await device.close();
}

main().catch(e => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
