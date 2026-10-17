import { beforeEach, describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import '../frontend/js/blocks.js';
import { cppGenerator, generateArduinoCode } from '../frontend/js/generator.js';

/**
 * Estos tres bloques están en el toolbox de nivel 3 y hasta ahora no tenían
 * generador: blockToCode lanzaba "CPP generator does not know how to generate
 * code for block type ...". Se prueban contra Blockly real en un workspace
 * sin render.
 */

function code(block) {
  const out = cppGenerator.blockToCode(block);
  return Array.isArray(out) ? out[0] : out;
}

function numberBlock(ws, value) {
  const n = ws.newBlock('math_number');
  n.setFieldValue(String(value), 'NUM');
  return n;
}

function connectValue(ws, parent, inputName, value) {
  const child = numberBlock(ws, value);
  parent.getInput(inputName).connection.connect(child.outputConnection);
  return child;
}

describe('generadores built-in que faltaban', () => {
  let ws;

  beforeEach(() => {
    ws = new Blockly.Workspace();
  });

  it('genera break dentro de un bucle', () => {
    const flow = ws.newBlock('controls_flow_statements');
    flow.setFieldValue('BREAK', 'FLOW');

    expect(code(flow)).toBe('break;\n');
  });

  it('genera continue', () => {
    const flow = ws.newBlock('controls_flow_statements');
    flow.setFieldValue('CONTINUE', 'FLOW');

    expect(code(flow)).toBe('continue;\n');
  });

  it('genera el operador ternario con paréntesis propios', () => {
    const tern = ws.newBlock('logic_ternary');
    const cond = ws.newBlock('logic_boolean');
    cond.setFieldValue('TRUE', 'BOOL');
    tern.getInput('IF').connection.connect(cond.outputConnection);
    connectValue(ws, tern, 'THEN', 1);
    connectValue(ws, tern, 'ELSE', 2);

    expect(code(tern)).toBe('(true ? 1 : 2)');
  });

  it('mantiene la precedencia al usar el ternario dentro de una operación', () => {
    const sum = ws.newBlock('math_arithmetic');
    sum.setFieldValue('ADD', 'OP');
    const tern = ws.newBlock('logic_ternary');
    const cond = ws.newBlock('logic_boolean');
    cond.setFieldValue('FALSE', 'BOOL');
    tern.getInput('IF').connection.connect(cond.outputConnection);
    connectValue(ws, tern, 'THEN', 1);
    connectValue(ws, tern, 'ELSE', 2);
    sum.getInput('A').connection.connect(tern.outputConnection);
    connectValue(ws, sum, 'B', 4);

    expect(code(sum)).toBe('(false ? 1 : 2) + 4');
  });

  it('genera la salida anticipada con valor de retorno', () => {
    const early = ws.newBlock('procedures_ifreturn');
    const cond = ws.newBlock('logic_boolean');
    cond.setFieldValue('TRUE', 'BOOL');
    early.getInput('CONDITION').connection.connect(cond.outputConnection);
    connectValue(ws, early, 'VALUE', 5);

    expect(code(early)).toBe('if (true) { return 5; }\n');
  });

  it('genera la salida anticipada sin valor, para una función void', () => {
    const early = ws.newBlock('procedures_ifreturn');
    const cond = ws.newBlock('logic_boolean');
    cond.setFieldValue('TRUE', 'BOOL');
    early.getInput('CONDITION').connection.connect(cond.outputConnection);
    early.removeInput('VALUE');

    expect(code(early)).toBe('if (true) { return; }\n');
  });

  it('inserta el break dentro del bucle al generar el sketch completo', () => {
    const workspace = new Blockly.Workspace();
    const loop = workspace.newBlock('arduino_loop');
    const repeat = workspace.newBlock('controls_repeat_ext');
    connectValue(workspace, repeat, 'TIMES', 10);
    const flow = workspace.newBlock('controls_flow_statements');
    flow.setFieldValue('BREAK', 'FLOW');

    loop.getInput('BODY').connection.connect(repeat.previousConnection);
    repeat.getInput('DO').connection.connect(flow.previousConnection);

    const sketch = generateArduinoCode(workspace);

    expect(sketch).toContain('for (int');
    expect(sketch).toContain('break;');
  });
});
