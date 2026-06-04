/**
 * ArduBlock — Definición de Bloques Arduino
 *
 * Define los bloques visuales específicos de Arduino:
 * setup/loop, pines digitales/analógicos, Serial, delays.
 */

import * as Blockly from 'blockly';
import { registerFieldAngle } from '@blockly/field-angle';
import { initLanguage } from './i18n.js';
import { blocks as procBlocks, unregisterProcedureBlocks, registerProcedureSerializer,
         ObservableParameterModel, ObservableProcedureModel }
  from '@blockly/block-shareable-procedures';

// Inicializar idioma antes de definir bloques — Blockly.Msg debe estar poblado
// o message0/tooltip con Blockly.Msg.KEY quedan undefined y Blockly lanza
// "args0 must have a corresponding message (message0)"
initLanguage();

// Registrar field_angle antes de definir bloques que lo usan
registerFieldAngle();

// Reemplazar bloques de procedimientos built-in por los shareables
unregisterProcedureBlocks();
Blockly.common.defineBlocks(procBlocks);
registerProcedureSerializer();

// ═══ Tipado de parámetros en procedimientos ═══
// ObservableParameterModel no soporta tipos: getTypes() → [],
// setTypes() lanza error. Implementamos TypedParameterModel
// con dropdown de tipo igual que variable_declare.

const ARDUINO_TYPES = [
  ['int', 'int'], ['float', 'float'], ['char', 'char'],
  ['String', 'String'], ['bool', 'bool'], ['byte', 'byte'],
  ['long', 'long'], ['unsigned int', 'unsigned int'],
  ['unsigned long', 'unsigned long'], ['double', 'double']
];

class TypedParameterModel extends ObservableParameterModel {
  constructor(workspace, name, id, varId, paramType) {
    super(workspace, name, id, varId);
    this.paramType_ = paramType || 'int';
  }
  getTypes() { return [this.paramType_]; }
  setTypes(types) {
    this.paramType_ = (types && types[0]) || 'int';
    return this;
  }
  saveState() {
    const state = super.saveState();
    state.types = [this.paramType_];
    return state;
  }
  static loadState(state, workspace) {
    return new TypedParameterModel(
      workspace, state.name, state.id, undefined,
      (state.types && state.types[0]) || 'int'
    );
  }
}

// Redefinir procedures_mutatorarg con dropdown de tipo
delete Blockly.Blocks['procedures_mutatorarg'];
Blockly.common.defineBlocksWithJsonArray([{
  type: 'procedures_mutatorarg',
  message0: '%1 : %2',
  args0: [
    { type: 'field_input', name: 'NAME', text: 'x' },
    { type: 'field_dropdown', name: 'TYPE', options: ARDUINO_TYPES }
  ],
  previousStatement: null,
  nextStatement: null,
  style: 'procedure_blocks',
  tooltip: 'Parámetro de la función'
}]);

// Reemplazar el serializer para que use TypedParameterModel
Blockly.serialization.registry.unregister('procedures');
Blockly.serialization.registry.register(
  'procedures',
  new Blockly.serialization.procedures.ProcedureSerializer(
    ObservableProcedureModel,
    TypedParameterModel
  )
);

// Sobrescribir el mutator de definiciones para manejar tipos
Blockly.Extensions.unregister('procedure_def_mutator');
Blockly.Extensions.registerMutator('procedure_def_mutator', {
  hasStatements_: true,

  mutationToDom: function() {
    const container = Blockly.utils.xml.createElement('mutation');
    const params = this.getProcedureModel().getParameters();
    for (let i = 0; i < params.length; i++) {
      const parameter = Blockly.utils.xml.createElement('arg');
      const varModel = params[i].getVariableModel();
      parameter.setAttribute('name', varModel.name);
      parameter.setAttribute('varid', varModel.getId());
      const types = params[i].getTypes();
      if (types && types[0]) parameter.setAttribute('type', types[0]);
      container.appendChild(parameter);
    }
    if (!this.hasStatements_) {
      container.setAttribute('statements', 'false');
    }
    return container;
  },

  domToMutation: function(xmlElement) {
    for (let i = 0; i < xmlElement.childNodes.length; i++) {
      const node = xmlElement.childNodes[i];
      if (node.nodeName.toLowerCase() !== 'arg') continue;
      const varId = node.getAttribute('varid');
      const paramType = node.getAttribute('type') || 'int';
      this.getProcedureModel().insertParameter(
        new TypedParameterModel(
          this.workspace,
          node.getAttribute('name'),
          undefined,
          varId,
          paramType
        ),
        i
      );
    }
    this.setStatements_(xmlElement.getAttribute('statements') !== 'false');
  },

  saveExtraState: function(doFullSerialization) {
    const state = Object.create(null);
    state['procedureId'] = this.getProcedureModel().getId();
    if (doFullSerialization) {
      state['fullSerialization'] = true;
      const params = this.getProcedureModel().getParameters();
      if (params.length) {
        state['params'] = params.map(p => {
          const types = p.getTypes();
          return {
            name: p.getName(),
            id: p.getVariableModel().getId(),
            paramId: p.getId(),
            type: (types && types[0]) || 'int'
          };
        });
      }
    }
    if (!this.hasStatements_) {
      state['hasStatements'] = false;
    }
    return state;
  },

  loadExtraState: function(state) {
    const map = this.workspace.getProcedureMap();
    const procedureId = state['procedureId'];
    if (map.has(procedureId) && !state['fullSerialization']) {
      if (map.has(this.model_.getId())) {
        map.delete(this.model_.getId());
      }
      this.model_ = map.get(procedureId);
    }
    const model = this.getProcedureModel();
    const newParams = state['params'] ?? [];
    const newIds = new Set(newParams.map(p => p.id));
    const currParams = model.getParameters();
    if (state['fullSerialization']) {
      for (let i = currParams.length - 1; i >= 0; i--) {
        if (!newIds.has(currParams[i].getId())) {
          model.deleteParameter(i);
        }
      }
    }
    for (let i = 0; i < newParams.length; i++) {
      const {name, id, paramId, type} = state['params'][i];
      this.getProcedureModel().insertParameter(
        new TypedParameterModel(this.workspace, name, paramId, id, type || 'int'),
        i
      );
    }
    this.doProcedureUpdate();
    this.setStatements_(state['hasStatements'] === false ? false : true);
  },

  decompose: function(workspace) {
    const containerBlockDef = {
      type: 'procedures_mutatorcontainer',
      inputs: { STACK: {} }
    };
    let connDef = containerBlockDef['inputs']['STACK'];
    for (const param of this.getProcedureModel().getParameters()) {
      const types = param.getTypes();
      connDef['block'] = {
        type: 'procedures_mutatorarg',
        id: param.getId(),
        fields: {
          NAME: param.getName(),
          TYPE: (types && types[0]) || 'int'
        },
        next: {}
      };
      connDef = connDef['block']['next'];
    }
    const containerBlock = Blockly.serialization.blocks.append(
      containerBlockDef, workspace, {recordUndo: false}
    );
    if (this.type === 'procedures_defreturn') {
      containerBlock.setFieldValue(this.hasStatements_, 'STATEMENTS');
    } else {
      containerBlock.removeInput('STATEMENT_INPUT');
    }
    return containerBlock;
  },

  compose: function(containerBlock) {
    this.deleteParamsFromModel_(containerBlock);
    this.renameParamsInModel_(containerBlock);
    this.addParamsToModel_(containerBlock);
    const hasStatements = containerBlock.getFieldValue('STATEMENTS');
    if (hasStatements !== null) {
      this.setStatements_(hasStatements === 'TRUE');
    }
  },

  deleteParamsFromModel_: function(containerBlock) {
    const ids = new Set(containerBlock.getDescendants().map(b => b.id));
    const model = this.getProcedureModel();
    const count = model.getParameters().length;
    for (let i = count - 1; i >= 0; i--) {
      if (!ids.has(model.getParameter(i).getId())) {
        model.deleteParameter(i);
      }
    }
  },

  renameParamsInModel_: function(containerBlock) {
    const model = this.getProcedureModel();
    let i = 0;
    let paramBlock = containerBlock.getInputTargetBlock('STACK');
    while (paramBlock && !paramBlock.isInsertionMarker()) {
      const param = model.getParameter(i);
      if (param && param.getId() === paramBlock.id &&
          param.getName() !== paramBlock.getFieldValue('NAME')) {
        param.setName(paramBlock.getFieldValue('NAME'));
      }
      paramBlock = paramBlock.nextConnection && paramBlock.nextConnection.targetBlock();
      i++;
    }
  },

  addParamsToModel_: function(containerBlock) {
    const model = this.getProcedureModel();
    let i = 0;
    let paramBlock = containerBlock.getInputTargetBlock('STACK');
    while (paramBlock && !paramBlock.isInsertionMarker()) {
      if (!model.getParameter(i) || model.getParameter(i).getId() !== paramBlock.id) {
        const pType = paramBlock.getFieldValue('TYPE') || 'int';
        model.insertParameter(
          new TypedParameterModel(
            this.workspace,
            paramBlock.getFieldValue('NAME'),
            paramBlock.id,
            undefined,
            pType
          ),
          i
        );
      }
      paramBlock = paramBlock.nextConnection && paramBlock.nextConnection.targetBlock();
      i++;
    }
  }
}, undefined, ['procedures_mutatorarg']);

// ═══ Nombres de categorías + Registro de bloques ═══

// ── Nombres de categorías en español ──────────
Blockly.Msg.CAT_ARDUINO = "Arduino";
Blockly.Msg.CAT_PINES   = "Pines";
Blockly.Msg.CAT_TIEMPO  = "Tiempo";
Blockly.Msg.CAT_SERIAL  = "Serial";

Blockly.Msg.ARD_SETUP   = "al iniciar (setup)";
Blockly.Msg.ARD_LOOP    = "repetir siempre (loop)";

Blockly.Msg.PINMODE_PIN  = "pin";
Blockly.Msg.PINMODE_MODE = "modo";
Blockly.Msg.INPUT        = "ENTRADA";
Blockly.Msg.OUTPUT       = "SALIDA";
Blockly.Msg.INPUT_PULLUP = "ENTRADA_PULLUP";

Blockly.Msg.DWRITE_PIN   = "pin";
Blockly.Msg.DWRITE_VAL   = "valor";
Blockly.Msg.HIGH         = "HIGH";
Blockly.Msg.LOW          = "LOW";

Blockly.Msg.AREAD_PIN    = "pin";
Blockly.Msg.AWRITE_PIN   = "pin";
Blockly.Msg.AWRITE_VAL   = "valor";

Blockly.Msg.DELAY_MS     = "esperar";
Blockly.Msg.DELAY_UNIT   = "milisegundos";

Blockly.Msg.SERIAL_BEGIN = "iniciar Serial a";
Blockly.Msg.SERIAL_PRINT = "enviar por Serial";
Blockly.Msg.SERIAL_PRINTLN = "enviar por Serial (con salto)";
Blockly.Msg.SERIAL_BAUD  = "baudios";

// ── Definición de bloques ──────────────────────
Blockly.common.defineBlocksWithJsonArray([

  // ═══ setup () ═══════════════════════════════
  {
    "type": "arduino_setup",
    "message0": Blockly.Msg.MSG_ARDUINO_SETUP,
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "colour": 230,   // amarillo/naranja
    "tooltip": Blockly.Msg.TOOLTIP_ARDUINO_SETUP,
    "helpUrl": ""
  },

  // ═══ loop () ════════════════════════════════
  {
    "type": "arduino_loop",
    "message0": Blockly.Msg.MSG_ARDUINO_LOOP,
    "args0": [
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "colour": 230,
    "tooltip": Blockly.Msg.TOOLTIP_ARDUINO_LOOP,
    "helpUrl": ""
  },

  // ═══ pinMode ═══════════════════════════════
  {
    "type": "pin_mode",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": Blockly.Msg.TOOLTIP_PIN_MODE,
    "helpUrl": ""
  },

  // ═══ pinMode — Variante Básico (N1): dropdown de pines ═══
  {
    "type": "pin_mode_basic",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "field_dropdown", "name": "PIN",
        "options": [
          ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"],
          ["6", "6"], ["7", "7"], ["8", "8"], ["9", "9"],
          ["10", "10"], ["11", "11"], ["12", "12"], ["13", "13"],
          ["A0", "A0"], ["A1", "A1"], ["A2", "A2"],
          ["A3", "A3"], ["A4", "A4"], ["A5", "A5"]
        ]
      },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": "Nivel Básico. Elige el pin de una lista. En Intermedio puedes escribir el número y en Avanzado usar una variable.",
    "helpUrl": ""
  },

  // ═══ pinMode — Variante Avanzado (N3): input_value para variables ═══
  {
    "type": "pin_mode_advanced",
    "message0": Blockly.Msg.MSG_PIN_MODE,
    "args0": [
      { "type": "input_value", "name": "PIN", "check": "Number" },
      { "type": "field_dropdown", "name": "MODE",
        "options": [
          ["ENTRADA", "INPUT"],
          ["SALIDA", "OUTPUT"],
          ["ENTRADA_PULLUP", "INPUT_PULLUP"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": "Nivel Avanzado. El pin puede ser una variable o expresión matemática. Permite controlar pines dinámicamente desde un bucle o arreglo.",
    "helpUrl": ""
  },

  // ═══ digitalWrite ═══════════════════════════
  {
    "type": "digital_write",
    "message0": Blockly.Msg.MSG_DIGITAL_WRITE,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 13, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "VALUE",
        "options": [
          ["HIGH", "HIGH"],
          ["LOW", "LOW"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": Blockly.Msg.TOOLTIP_DIGITAL_WRITE,
    "helpUrl": ""
  },

  // ═══ digitalRead ════════════════════════════
  {
    "type": "digital_read",
    "message0": Blockly.Msg.MSG_DIGITAL_READ,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 54 }
    ],
    "output": "Number",
    "colour": 190,
    "tooltip": Blockly.Msg.TOOLTIP_DIGITAL_READ,
    "helpUrl": ""
  },

  // ═══ analogWrite ════════════════════════════
  {
    "type": "analog_write",
    "message0": Blockly.Msg.MSG_ANALOG_WRITE,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 54 },
      { "type": "input_value", "name": "VALUE", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 160,
    "tooltip": Blockly.Msg.TOOLTIP_ANALOG_WRITE,
    "helpUrl": ""
  },

  // ═══ analogRead ═════════════════════════════
  {
    "type": "analog_read",
    "message0": Blockly.Msg.MSG_ANALOG_READ,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 0, "min": 0, "max": 15 }
    ],
    "output": "Number",
    "colour": 160,
    "tooltip": Blockly.Msg.TOOLTIP_ANALOG_READ,
    "helpUrl": ""
  },

  // ═══ delay ══════════════════════════════════
  {
    "type": "delay_ms",
    "message0": Blockly.Msg.MSG_DELAY_MS,
    "args0": [
      { "type": "field_number", "name": "MS", "value": 1000, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 290,
    "tooltip": Blockly.Msg.TOOLTIP_DELAY_MS,
    "helpUrl": ""
  },

  // ═══ millis ═════════════════════════════════
  {
    "type": "millis",
    "message0": Blockly.Msg.MSG_MILLIS,
    "output": "Number",
    "colour": 290,
    "tooltip": Blockly.Msg.TOOLTIP_MILLIS,
    "helpUrl": ""
  },

  // ═══ Serial.begin ════════════════════════════
  {
    "type": "serial_begin",
    "message0": Blockly.Msg.MSG_SERIAL_BEGIN,
    "args0": [
      { "type": "field_dropdown", "name": "BAUD",
        "options": [
          ["9600", "9600"],
          ["19200", "19200"],
          ["38400", "38400"],
          ["57600", "57600"],
          ["115200", "115200"]
        ]
      }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_BEGIN,
    "helpUrl": ""
  },

  // ═══ Serial.print ════════════════════════════
  {
    "type": "serial_print",
    "message0": Blockly.Msg.MSG_SERIAL_PRINT,
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PRINT,
    "helpUrl": ""
  },

  // ═══ Serial.println ══════════════════════════
  {
    "type": "serial_println",
    "message0": Blockly.Msg.MSG_SERIAL_PRINTLN,
    "args0": [
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PRINTLN,
    "helpUrl": ""
  },

  // ═══ Serial.available ═════════════════════════
  {
    "type": "serial_available",
    "message0": Blockly.Msg.MSG_SERIAL_AVAILABLE,
    "args0": [],
    "output": "Number",
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_AVAILABLE,
    "helpUrl": ""
  },

  // ═══ Serial.read ══════════════════════════════
  {
    "type": "serial_read",
    "message0": Blockly.Msg.MSG_SERIAL_READ,
    "args0": [],
    "output": "Number",
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_READ,
    "helpUrl": ""
  },

  // ═══ Serial.parseInt ══════════════════════════
  {
    "type": "serial_parse_int",
    "message0": Blockly.Msg.MSG_SERIAL_PARSE_INT,
    "args0": [],
    "output": "Number",
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PARSE_INT,
    "helpUrl": ""
  },

  // ═══ Serial.parseFloat ════════════════════════
  {
    "type": "serial_parse_float",
    "message0": Blockly.Msg.MSG_SERIAL_PARSE_FLOAT,
    "args0": [],
    "output": "Number",
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_PARSE_FLOAT,
    "helpUrl": ""
  },

  // ═══ Serial.readString ════════════════════════
  {
    "type": "serial_read_string",
    "message0": Blockly.Msg.MSG_SERIAL_READ_STRING,
    "args0": [],
    "output": "String",
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_READ_STRING,
    "helpUrl": ""
  },

  // ═══ Serial.write ═════════════════════════════
  {
    "type": "serial_write",
    "message0": Blockly.Msg.MSG_SERIAL_WRITE,
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_SERIAL_WRITE,
    "helpUrl": ""
  },

  // ═══ Servo: crear (declara + attach) ════════
  {
    "type": "servo_create",
    "message0": Blockly.Msg.MSG_SERVO_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_number", "name": "PIN", "value": 9, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": Blockly.Msg.TOOLTIP_SERVO_CREATE,
    "helpUrl": ""
  },

  // ═══ Servo: write (usa nombre, field-angle) ══
  {
    "type": "servo_write",
    "message0": Blockly.Msg.MSG_SERVO_WRITE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_angle", "name": "ANGLE", "value": 90 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": Blockly.Msg.TOOLTIP_SERVO_WRITE,
    "helpUrl": ""
  },

  // ═══ Servo: write microseconds (avanzado) ════
  {
    "type": "servo_write_us",
    "message0": Blockly.Msg.MSG_SERVO_WRITE_US,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "servo" },
      { "type": "field_number", "name": "US", "value": 1500, "min": 500, "max": 2500 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 40,
    "tooltip": Blockly.Msg.TOOLTIP_SERVO_WRITE_US,
    "helpUrl": ""
  },

  // ═══ Sonido: tone(pin, freq) ═════════════════
  {
    "type": "tone_output",
    "message0": Blockly.Msg.MSG_TONE_OUTPUT,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "FREQ", "value": 440, "min": 31, "max": 65535 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 260,
    "tooltip": Blockly.Msg.TOOLTIP_TONE_OUTPUT,
    "helpUrl": ""
  },

  // ═══ Sonido: tone(pin, freq, duration) ═══════
  {
    "type": "tone_duration",
    "message0": Blockly.Msg.MSG_TONE_DURATION,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 },
      { "type": "input_value", "name": "FREQ", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 440 } } },
      { "type": "input_value", "name": "DURATION", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 500 } } }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 260,
    "tooltip": Blockly.Msg.TOOLTIP_TONE_DURATION,
    "helpUrl": ""
  },

  // ═══ Sonido: noTone(pin) ═════════════════════
  {
    "type": "no_tone_output",
    "message0": Blockly.Msg.MSG_NO_TONE_OUTPUT,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 8, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 260,
    "tooltip": Blockly.Msg.TOOLTIP_NO_TONE_OUTPUT,
    "helpUrl": ""
  },

  // ═══ Matemáticas: map() ═══════════════════════
  {
    "type": "map_value",
    "message0": Blockly.Msg.MSG_MAP_VALUE,
    "args0": [
      { "type": "input_value", "name": "VALUE", "check": "Number" },
      { "type": "field_number", "name": "FROM_LOW", "value": 0 },
      { "type": "field_number", "name": "FROM_HIGH", "value": 1023 },
      { "type": "field_number", "name": "TO_LOW", "value": 0 },
      { "type": "field_number", "name": "TO_HIGH", "value": 255 }
    ],
    "output": "Number",
    "colour": 230,
    "tooltip": Blockly.Msg.TOOLTIP_MAP_VALUE,
    "helpUrl": ""
  },

  // ═══ Pines: pulseIn() ═════════════════════════
  {
    "type": "pulse_in",
    "message0": Blockly.Msg.MSG_PULSE_IN,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 7, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "VALUE", "options": [["HIGH", "HIGH"], ["LOW", "LOW"]] },
      { "type": "field_number", "name": "TIMEOUT", "value": 1000000, "min": 1 }
    ],
    "output": "Number",
    "colour": 190,
    "tooltip": Blockly.Msg.TOOLTIP_PULSE_IN,
    "helpUrl": ""
  },

  // ═══ Pines: attachInterrupt() ═════════════════
  {
    "type": "attach_interrupt",
    "message0": Blockly.Msg.MSG_ATTACH_INTERRUPT,
    "args0": [
      { "type": "field_number", "name": "PIN", "value": 2, "min": 0, "max": 54 },
      { "type": "field_dropdown", "name": "MODE", "options": [
        ["LOW", "LOW"], ["CHANGE", "CHANGE"], ["RISING", "RISING"], ["FALLING", "FALLING"]
      ]},
      { "type": "input_dummy" },
      { "type": "input_statement", "name": "BODY" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 190,
    "tooltip": Blockly.Msg.TOOLTIP_ATTACH_INTERRUPT,
    "helpUrl": ""
  },

  // ═══ LCD: LiquidCrystal ═══════════════════════
  {
    "type": "lcd_create",
    "message0": Blockly.Msg.MSG_LCD_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_number", "name": "RS", "value": 12, "min": 0, "max": 54 },
      { "type": "field_number", "name": "EN", "value": 11, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D4", "value": 5, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D5", "value": 4, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D6", "value": 3, "min": 0, "max": 54 },
      { "type": "field_number", "name": "D7", "value": 2, "min": 0, "max": 54 },
      { "type": "input_dummy" },
      { "type": "field_number", "name": "COLS", "value": 16, "min": 8, "max": 40 },
      { "type": "field_number", "name": "ROWS", "value": 2, "min": 1, "max": 4 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_CREATE,
    "helpUrl": ""
  },
  {
    "type": "lcd_print",
    "message0": Blockly.Msg.MSG_LCD_PRINT,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "input_value", "name": "TEXT", "check": ["String", "Number"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_PRINT,
    "helpUrl": ""
  },
  {
    "type": "lcd_set_cursor",
    "message0": Blockly.Msg.MSG_LCD_SET_CURSOR,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_number", "name": "COL", "value": 0, "min": 0 },
      { "type": "field_number", "name": "ROW", "value": 0, "min": 0 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_SET_CURSOR,
    "helpUrl": ""
  },
  {
    "type": "lcd_clear",
    "message0": Blockly.Msg.MSG_LCD_CLEAR,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_CLEAR,
    "helpUrl": ""
  },

  // ═══ LCD I2C ══════════════════════════════════
  {
    "type": "lcd_i2c_create",
    "message0": Blockly.Msg.MSG_LCD_I2C_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "lcd" },
      { "type": "field_dropdown", "name": "ADDR", "options": [["0x27", "0x27"], ["0x3F", "0x3F"]] },
      { "type": "field_number", "name": "COLS", "value": 16, "min": 8, "max": 40 },
      { "type": "field_number", "name": "ROWS", "value": 2, "min": 1, "max": 4 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 180,
    "tooltip": Blockly.Msg.TOOLTIP_LCD_I2C_CREATE,
    "helpUrl": ""
  },

  // ═══ DHT: Sensor temperatura/humedad ═════════
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
    "colour": 100,
    "tooltip": Blockly.Msg.TOOLTIP_DHT_CREATE,
    "helpUrl": ""
  },
  {
    "type": "dht_temp",
    "message0": Blockly.Msg.MSG_DHT_TEMP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "dht" }
    ],
    "output": "Number",
    "colour": 100,
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
    "colour": 100,
    "tooltip": Blockly.Msg.TOOLTIP_DHT_HUMIDITY,
    "helpUrl": ""
  },

  // ═══ Ultrasonic: Sensor distancia HC-SR04 ════
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
    "type": "ultrasonic_read",
    "message0": Blockly.Msg.MSG_ULTRASONIC_READ,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "us" }
    ],
    "output": "Number",
    "colour": 80,
    "tooltip": Blockly.Msg.TOOLTIP_ULTRASONIC_READ,
    "helpUrl": ""
  },

  // ═══ Stepper: Motor paso a paso ══════════════
  {
    "type": "stepper_create",
    "message0": Blockly.Msg.MSG_STEPPER_CREATE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "STEPS", "value": 2048, "min": 1 },
      { "type": "field_number", "name": "P1", "value": 8, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P2", "value": 9, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P3", "value": 10, "min": 0, "max": 54 },
      { "type": "field_number", "name": "P4", "value": 11, "min": 0, "max": 54 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_STEPPER_CREATE,
    "helpUrl": ""
  },
  {
    "type": "stepper_speed",
    "message0": Blockly.Msg.MSG_STEPPER_SPEED,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "RPM", "value": 10, "min": 1 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_STEPPER_SPEED,
    "helpUrl": ""
  },
  {
    "type": "stepper_step",
    "message0": Blockly.Msg.MSG_STEPPER_STEP,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "motor" },
      { "type": "field_number", "name": "COUNT", "value": 100, "min": -32768 }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 310,
    "tooltip": Blockly.Msg.TOOLTIP_STEPPER_STEP,
    "helpUrl": ""
  },
  {
    "type": "variable_declare",
    "message0": Blockly.Msg.MSG_VARIABLE_DECLARE,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "a" },
      { "type": "field_dropdown", "name": "TYPE",
        "options": [
          ["int", "int"],
          ["float", "float"],
          ["char", "char"],
          ["String", "String"],
          ["bool", "bool"],
          ["byte", "byte"],
          ["long", "long"],
          ["unsigned int", "unsigned int"],
          ["unsigned long", "unsigned long"],
          ["double", "double"]
        ]
      },
      { "type": "input_value", "name": "VALUE", "check": ["Number", "String", "Boolean"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_VARIABLE_DECLARE,
    "helpUrl": ""
  },
  {
    "type": "variable_set",
    "message0": Blockly.Msg.MSG_VARIABLE_SET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "a" },
      { "type": "input_value", "name": "VALUE", "check": ["Number", "String", "Boolean"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_VARIABLE_SET,
    "helpUrl": ""
  },
  {
    "type": "variable_get",
    "message0": Blockly.Msg.MSG_VARIABLE_GET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "a" }
    ],
    "output": ["Number", "String", "Boolean"],
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_VARIABLE_GET,
    "helpUrl": ""
  },
  {
    "type": "include_header",
    "message0": Blockly.Msg.MSG_INCLUDE_HEADER,
    "args0": [
      { "type": "field_input", "name": "FILE", "text": "config.h" }
    ],
    "colour": 230,
    "tooltip": Blockly.Msg.TOOLTIP_INCLUDE_HEADER,
    "helpUrl": ""
  },
  {
    "type": "arduino_for_index",
    "message0": Blockly.Msg.MSG_FOR_INDEX,
    "args0": [
      { "type": "field_input", "name": "VAR", "text": "i" },
      { "type": "input_value", "name": "FROM", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 0 } } },
      { "type": "input_value", "name": "TO", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 10 } } },
      { "type": "input_value", "name": "BY", "check": "Number",
        "shadow": { "type": "math_number", "fields": { "NUM": 1 } } }
    ],
    "message1": "hacer %1",
    "args1": [
      { "type": "input_statement", "name": "DO" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 120,
    "tooltip": Blockly.Msg.TOOLTIP_FOR_INDEX,
    "helpUrl": ""
  },
  {
    "type": "array_declare",
    "message0": Blockly.Msg.MSG_ARRAY_DECLARE,
    "args0": [
      { "type": "field_dropdown", "name": "TYPE",
        "options": [
          ["int", "int"],
          ["float", "float"],
          ["char", "char"],
          ["long", "long"],
          ["byte", "byte"]
        ]
      },
      { "type": "field_input", "name": "NAME", "text": "arr" },
      { "type": "field_input", "name": "VALUES", "text": "1, 2, 3" }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_DECLARE,
    "helpUrl": ""
  },
  {
    "type": "array_get",
    "message0": Blockly.Msg.MSG_ARRAY_GET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "arr" },
      { "type": "input_value", "name": "INDEX", "check": "Number" }
    ],
    "output": ["Number", "String", "Boolean"],
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_GET,
    "helpUrl": ""
  },
  {
    "type": "array_set",
    "message0": Blockly.Msg.MSG_ARRAY_SET,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "arr" },
      { "type": "input_value", "name": "INDEX", "check": "Number" },
      { "type": "input_value", "name": "VALUE", "check": ["Number", "String", "Boolean"] }
    ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_SET,
    "helpUrl": ""
  },
  {
    "type": "array_length",
    "message0": Blockly.Msg.MSG_ARRAY_LENGTH,
    "args0": [
      { "type": "field_input", "name": "NAME", "text": "arr" }
    ],
    "output": "Number",
    "colour": 330,
    "tooltip": Blockly.Msg.TOOLTIP_ARRAY_LENGTH,
    "helpUrl": ""
  }

]);

// ═══ Toolbox dinámico por placa ═════════════════
import { getBoardConfig, getDefaultFqbn } from './board.js';

// ═══ Mapa de niveles por bloque ═══════════════
// Usado por la protección de nivel: detecta si un bloque
// cargado requiere un nivel superior al actual.
// key = block type, value = nivel mínimo (1,2,3)
function _buildBlockLevelMap(toolboxContents) {
  const map = {};
  function walk(items) {
    for (const item of items) {
      if (item.level && item.type) {
        // Bloque con nivel explícito: guardar el mínimo
        if (!map[item.type] || item.level < map[item.type]) {
          map[item.type] = item.level;
        }
      }
      if (item.contents) walk(item.contents);
    }
  }
  walk(toolboxContents);
  return map;
}

// Precomputamos el mapa con toolbox completo (nivel 3)
const _FULL_TOOLBOX_TEMPLATE = [
  { kind: 'block', type: 'arduino_setup', level: 1 },
  { kind: 'block', type: 'arduino_loop', level: 1 },
  { kind: 'block', type: 'include_header', level: 3 },
  { kind: 'block', type: 'pin_mode_basic', level: 1 },
  { kind: 'block', type: 'pin_mode', level: 2 },
  { kind: 'block', type: 'pin_mode_advanced', level: 3 },
  { kind: 'block', type: 'digital_write', level: 1 },
  { kind: 'block', type: 'digital_read', level: 1 },
  { kind: 'block', type: 'analog_write', level: 2 },
  { kind: 'block', type: 'analog_read', level: 2 },
  { kind: 'block', type: 'pulse_in', level: 2 },
  { kind: 'block', type: 'attach_interrupt', level: 3 },
  { kind: 'block', type: 'delay_ms', level: 1 },
  { kind: 'block', type: 'millis', level: 2 },
  { kind: 'block', type: 'tone_output', level: 2 },
  { kind: 'block', type: 'tone_duration', level: 2 },
  { kind: 'block', type: 'no_tone_output', level: 2 },
  { kind: 'block', type: 'lcd_create', level: 3 },
  { kind: 'block', type: 'lcd_i2c_create', level: 3 },
  { kind: 'block', type: 'lcd_print', level: 3 },
  { kind: 'block', type: 'lcd_set_cursor', level: 3 },
  { kind: 'block', type: 'lcd_clear', level: 3 },
  { kind: 'block', type: 'dht_create', level: 3 },
  { kind: 'block', type: 'dht_temp', level: 3 },
  { kind: 'block', type: 'dht_humidity', level: 3 },
  { kind: 'block', type: 'ultrasonic_create', level: 2 },
  { kind: 'block', type: 'ultrasonic_read', level: 2 },
  { kind: 'block', type: 'stepper_create', level: 3 },
  { kind: 'block', type: 'stepper_speed', level: 3 },
  { kind: 'block', type: 'stepper_step', level: 3 },
  { kind: 'block', type: 'servo_create', level: 2 },
  { kind: 'block', type: 'servo_write', level: 2 },
  { kind: 'block', type: 'servo_write_us', level: 3 },
  { kind: 'block', type: 'serial_begin', level: 2 },
  { kind: 'block', type: 'serial_print', level: 2 },
  { kind: 'block', type: 'serial_println', level: 1 },
  { kind: 'block', type: 'serial_available', level: 3 },
  { kind: 'block', type: 'serial_read', level: 3 },
  { kind: 'block', type: 'serial_parse_int', level: 3 },
  { kind: 'block', type: 'serial_parse_float', level: 3 },
  { kind: 'block', type: 'serial_read_string', level: 3 },
  { kind: 'block', type: 'serial_write', level: 3 },
  { kind: 'block', type: 'controls_if', level: 2 },
  { kind: 'block', type: 'logic_compare', level: 2 },
  { kind: 'block', type: 'logic_operation', level: 3 },
  { kind: 'block', type: 'logic_negate', level: 3 },
  { kind: 'block', type: 'logic_boolean', level: 2 },
  { kind: 'block', type: 'controls_repeat_ext', level: 2 },
  { kind: 'block', type: 'controls_whileUntil', level: 2 },
  { kind: 'block', type: 'arduino_for_index', level: 3 },
  { kind: 'block', type: 'controls_for', level: 3 },
  { kind: 'block', type: 'math_number', level: 1 },
  { kind: 'block', type: 'math_arithmetic', level: 2 },
  { kind: 'block', type: 'math_single', level: 2 },
  { kind: 'block', type: 'math_modulo', level: 3 },
  { kind: 'block', type: 'math_random_int', level: 2 },
  { kind: 'block', type: 'math_constrain', level: 3 },
  { kind: 'block', type: 'map_value', level: 3 },
  { kind: 'block', type: 'math_number_property', level: 3 },
  { kind: 'block', type: 'variable_declare', level: 3 },
  { kind: 'block', type: 'variable_set', level: 3 },
  { kind: 'block', type: 'variable_get', level: 3 },
  { kind: 'block', type: 'array_declare', level: 3 },
  { kind: 'block', type: 'array_get', level: 3 },
  { kind: 'block', type: 'array_set', level: 3 },
  { kind: 'block', type: 'array_length', level: 3 },
  { kind: 'block', type: 'text', level: 3 },
  { kind: 'block', type: 'text_join', level: 3 },
  { kind: 'block', type: 'text_print', level: 3 },
  { kind: 'block', type: 'text_length', level: 3 },
  { kind: 'block', type: 'procedures_defnoreturn', level: 3 },
  { kind: 'block', type: 'procedures_defreturn', level: 3 },
  { kind: 'block', type: 'procedures_callnoreturn', level: 3 },
  { kind: 'block', type: 'procedures_callreturn', level: 3 },
  { kind: 'block', type: 'procedures_ifreturn', level: 3 },
  { kind: 'block', type: 'logic_ternary', level: 3 },
  { kind: 'block', type: 'controls_flow_statements', level: 3 },
];

export const BLOCK_LEVELS = _buildBlockLevelMap(_FULL_TOOLBOX_TEMPLATE);

export function getBlockLevel(blockType) {
  return BLOCK_LEVELS[blockType] || 3; // desconocidos → nivel 3
}

export function buildToolboxForBoard(fqbn, level) {
  const board = getBoardConfig(fqbn || getDefaultFqbn());
  // Por ahora el toolbox es idéntico para todas las placas.
  // En el futuro se filtrarán bloques según capacidades (WiFi, BLE, etc.).

  // Nivel por defecto: Básico (1)
  const currentLevel = level || 1;

  const toolbox = {
    'kind': 'categoryToolbox',
    'contents': [
      { 'kind': 'category', 'name': '%{BKY_CAT_ARDUINO}', 'colour': '230', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'arduino_setup', 'level': 1 },
          { 'kind': 'block', 'type': 'arduino_loop', 'level': 1 },
          { 'kind': 'block', 'type': 'include_header', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_PINES}', 'colour': '190', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'pin_mode_basic', 'level': 1 },
          { 'kind': 'block', 'type': 'pin_mode', 'level': 2 },
          { 'kind': 'block', 'type': 'pin_mode_advanced', 'level': 3 },
          { 'kind': 'block', 'type': 'digital_write', 'level': 1 },
          { 'kind': 'block', 'type': 'digital_read', 'level': 1 },
          { 'kind': 'block', 'type': 'analog_write', 'level': 2 },
          { 'kind': 'block', 'type': 'analog_read', 'level': 2 },
          { 'kind': 'block', 'type': 'pulse_in', 'level': 2 },
          { 'kind': 'block', 'type': 'attach_interrupt', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_TIEMPO}', 'colour': '290', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'delay_ms', 'level': 1 },
          { 'kind': 'block', 'type': 'millis', 'level': 2 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SONIDO}', 'colour': '260', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'tone_output', 'level': 2 },
          { 'kind': 'block', 'type': 'tone_duration', 'level': 2 },
          { 'kind': 'block', 'type': 'no_tone_output', 'level': 2 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_LCD}', 'colour': '180', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'lcd_create', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_i2c_create', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_print', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_set_cursor', 'level': 3 },
          { 'kind': 'block', 'type': 'lcd_clear', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SENSORES}', 'colour': '100', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'dht_create', 'level': 3 },
          { 'kind': 'block', 'type': 'dht_temp', 'level': 3 },
          { 'kind': 'block', 'type': 'dht_humidity', 'level': 3 },
          { 'kind': 'block', 'type': 'ultrasonic_create', 'level': 2 },
          { 'kind': 'block', 'type': 'ultrasonic_read', 'level': 2 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_MOTOR}', 'colour': '310', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'stepper_create', 'level': 3 },
          { 'kind': 'block', 'type': 'stepper_speed', 'level': 3 },
          { 'kind': 'block', 'type': 'stepper_step', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SERVO}', 'colour': '40', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'servo_create', 'level': 2 },
          { 'kind': 'block', 'type': 'servo_write', 'level': 2 },
          { 'kind': 'block', 'type': 'servo_write_us', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_SERIAL}', 'colour': '120', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'serial_begin', 'level': 2 },
          { 'kind': 'block', 'type': 'serial_print', 'level': 2 },
          { 'kind': 'block', 'type': 'serial_println', 'level': 1 },
          { 'kind': 'block', 'type': 'serial_available', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_read', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_parse_int', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_parse_float', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_read_string', 'level': 3 },
          { 'kind': 'block', 'type': 'serial_write', 'level': 3 }
        ]},
      { 'kind': 'sep' },
      { 'kind': 'category', 'name': '%{BKY_CAT_LOGICA}', 'colour': '210', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'controls_if', 'level': 2 },
          { 'kind': 'block', 'type': 'logic_compare', 'level': 2 },
          { 'kind': 'block', 'type': 'logic_operation', 'level': 3 },
          { 'kind': 'block', 'type': 'logic_negate', 'level': 3 },
          { 'kind': 'block', 'type': 'logic_boolean', 'level': 2 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_BUCLES}', 'colour': '120', 'level': 2,
        'contents': [
          { 'kind': 'block', 'type': 'controls_repeat_ext', 'level': 2 },
          { 'kind': 'block', 'type': 'controls_whileUntil', 'level': 2 },
          { 'kind': 'block', 'type': 'arduino_for_index', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_MATEMATICAS}', 'colour': '230', 'level': 1,
        'contents': [
          { 'kind': 'block', 'type': 'math_number', 'level': 1 },
          { 'kind': 'block', 'type': 'math_arithmetic', 'level': 2 },
          { 'kind': 'block', 'type': 'math_single', 'level': 2 },
          { 'kind': 'block', 'type': 'math_modulo', 'level': 3 },
          { 'kind': 'block', 'type': 'math_random_int', 'level': 2 },
          { 'kind': 'block', 'type': 'math_constrain', 'level': 3 },
          { 'kind': 'block', 'type': 'map_value', 'level': 3 },
          { 'kind': 'block', 'type': 'math_number_property', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_VARIABLES}', 'colour': '330', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'variable_declare', 'level': 3 },
          { 'kind': 'block', 'type': 'variable_set', 'level': 3 },
          { 'kind': 'block', 'type': 'variable_get', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_ARRAYS}', 'colour': '330', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'array_declare', 'level': 3 },
          { 'kind': 'block', 'type': 'array_get', 'level': 3 },
          { 'kind': 'block', 'type': 'array_set', 'level': 3 },
          { 'kind': 'block', 'type': 'array_length', 'level': 3 }
        ]},
      { 'kind': 'category', 'name': '%{BKY_CAT_FUNCTIONS}', 'colour': '290', 'custom': 'PROCEDURE', 'level': 3 },
      { 'kind': 'category', 'name': '%{BKY_CAT_TEXTO}', 'colour': '160', 'level': 3,
        'contents': [
          { 'kind': 'block', 'type': 'text', 'level': 3 },
          { 'kind': 'block', 'type': 'text_join', 'level': 3 },
          { 'kind': 'block', 'type': 'text_print', 'level': 3 },
          { 'kind': 'block', 'type': 'text_length', 'level': 3 }
        ]},
      { 'kind': 'search', 'name': '%{BKY_CAT_BUSCAR}', 'contents': [] }
    ]
  };

  // ═══ Filtrar por nivel ═════════════════════
  // Elimina categorías completas cuyo nivel > currentLevel,
  // y dentro de categorías visibles, oculta bloques de nivel superior.
  if (currentLevel < 3) {
    toolbox.contents = toolbox.contents
      .filter(cat => {
        // Sep preservar, search preservar
        if (cat.kind === 'sep' || cat.kind === 'search') return true;
        // Categoría: mantener si tiene nivel <= currentLevel o no tiene nivel
        return !cat.level || cat.level <= currentLevel;
      })
      .map(cat => {
        if (cat.contents && Array.isArray(cat.contents)) {
          cat.contents = cat.contents.filter(block => {
            return !block.level || block.level <= currentLevel;
          });
        }
        return cat;
      });

    // Limpiar categorías vacías
    toolbox.contents = toolbox.contents.filter(cat => {
      if (cat.kind === 'sep' || cat.kind === 'search') return true;
      if (cat.contents && cat.contents.length === 0) return false;
      return true;
    });
  }

  return toolbox;
}

// Dummy export para evitar que Vite haga tree-shaking del side-effect
export const _arduinoBlocksDefined = true;