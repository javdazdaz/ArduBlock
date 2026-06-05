import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg
/**
 * ArduBlock — Bloques: sensores
 */

export const blocks = [
{
    "type": "dht_create",
    "message0": Blockly.Msg.MSG_DHT_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" },
      { "type": "field_number", "name": "PIN", "value": 7, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "TYPE", "options": [["DHT11", "DHT11"], ["DHT22", "DHT22"]] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 80,
    "tooltip": Blockly.Msg.TOOLTIP_DHT_CREATE,
    "helpUrl": ""
  },
{
    "type": "dht_create_advanced",
    "message0": Blockly.Msg.MSG_DHT_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" },
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "TYPE", "options": [["DHT11", "DHT11"], ["DHT22", "DHT22"]] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 80,
    "tooltip": "Nivel Avanzado. El pin del sensor puede ser una variable. Permite crear el sensor en un pin configurable.",
    "helpUrl": ""
  },
{
    "type": "dht_temp",
    "message0": Blockly.Msg.MSG_DHT_TEMP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" }
    ],
    "output": "Number",
    "colour": 80,
    "tooltip": Blockly.Msg.TOOLTIP_DHT_TEMP,
    "helpUrl": ""
  },
{
    "type": "dht_humidity",
    "message0": Blockly.Msg.MSG_DHT_HUMIDITY,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" }
    ],
    "output": "Number",
    "colour": 80,
    "tooltip": Blockly.Msg.TOOLTIP_DHT_HUMIDITY,
    "helpUrl": ""
  },
{
    "type": "ultrasonic_create",
    "message0": Blockly.Msg.MSG_ULTRASONIC_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "us" },
      { "type": "field_number", "name": "TRIG", "value": 9, "min": 0, "max": 54 },
      { "type": "field_number", "name": "ECHO", "value": 10, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 80,
    "tooltip": Blockly.Msg.TOOLTIP_ULTRASONIC_CREATE,
    "helpUrl": ""
  },
{
    "type": "ultrasonic_create_advanced",
    "message0": Blockly.Msg.MSG_ULTRASONIC_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "us" },
      { "type": "input_value", "name": "TRIG", "check": "Number" },
      { "type": "input_value", "name": "ECHO", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 80,
    "tooltip": "Nivel Avanzado. Los pines TRIG y ECHO pueden ser variables. Permite conectar el sensor a pines configurables dinámicamente.",
    "helpUrl": ""
  },
{
    "type": "ultrasonic_read",
    "message0": Blockly.Msg.MSG_ULTRASONIC_READ,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "us" }
    ],
    "output": "Number",
    "colour": 80,
    "tooltip": Blockly.Msg.TOOLTIP_ULTRASONIC_READ,
    "helpUrl": ""
  }
];

export function registerGenerators(cppGenerator) {
// ── dht_create ─────────────────────────────────
cppGenerator._dhtInstances = [];
cppGenerator.forBlock['dht_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  const pin  = block.getFieldValue('PIN');
  const type = block.getFieldValue('TYPE');
  cppGenerator._dhtInstances.push({ name, pin, type });
  return name + '.begin();\n';
};
// ── dht_create_advanced (N3) ──────────────────
cppGenerator.forBlock['dht_create_advanced'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  const pin  = cppGenerator.valueToCode(block, 'PIN', cppGenerator.ORDER_ATOMIC) || '7';
  const type = block.getFieldValue('TYPE');
  cppGenerator._dhtInstances.push({ name, pin, type });
  return name + '.begin();\n';
};
// ── dht_temp ───────────────────────────────────
cppGenerator.forBlock['dht_temp'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  return [name + '.readTemperature()', cppGenerator.ORDER_ATOMIC];
};
// ── dht_humidity ───────────────────────────────
cppGenerator.forBlock['dht_humidity'] = function(block) {
  const name = block.getFieldValue('NAME') || 'dht';
  return [name + '.readHumidity()', cppGenerator.ORDER_ATOMIC];
};
// ── ultrasonic_create ──────────────────────────
cppGenerator._usInstances = [];
cppGenerator.forBlock['ultrasonic_create'] = function(block) {
  const name = block.getFieldValue('NAME') || 'us';
  const trig = block.getFieldValue('TRIG');
  const echo = block.getFieldValue('ECHO');
  cppGenerator._usInstances.push({ name, trig, echo });
  return 'pinMode(' + trig + ', OUTPUT);\n' +
         '  pinMode(' + echo + ', INPUT);\n';
};
// ── ultrasonic_create_advanced (N3) ────────────
cppGenerator.forBlock['ultrasonic_create_advanced'] = function(block) {
  const name = block.getFieldValue('NAME') || 'us';
  const trig = cppGenerator.valueToCode(block, 'TRIG', cppGenerator.ORDER_ATOMIC) || '9';
  const echo = cppGenerator.valueToCode(block, 'ECHO', cppGenerator.ORDER_ATOMIC) || '10';
  cppGenerator._usInstances.push({ name, trig, echo });
  return 'pinMode(' + trig + ', OUTPUT);\n' +
         '  pinMode(' + echo + ', INPUT);\n';
};
// ── ultrasonic_read ────────────────────────────
cppGenerator.forBlock['ultrasonic_read'] = function(block) {
  const name = block.getFieldValue('NAME') || 'us';
  // Buscar la instancia para obtener trig/echo
  const inst = cppGenerator._usInstances.find(i => i.name === name);
  if (!inst) return ['0', cppGenerator.ORDER_ATOMIC];
  return [name + '_read()', cppGenerator.ORDER_ATOMIC];
};
}
