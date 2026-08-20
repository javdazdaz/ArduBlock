import * as Blockly from 'blockly';
import '../i18n.js';  // side-effect: puebla Blockly.Msg

/**
 * ArduBlock — Bloques de texto (conversión texto ↔ número).
 */

export const blocks = [
  {
    type: 'text_to_number',
    message0: Blockly.Msg.MSG_TEXT_TO_NUMBER,
    args0: [
      { type: 'input_value', name: 'VALUE' }
    ],
    inputsInline: true,
    output: 'Number',
    colour: '#c24471',
    tooltip: Blockly.Msg.TOOLTIP_TEXT_TO_NUMBER,
    helpUrl: ''
  }
];

export function registerGenerators(cppGenerator) {
  cppGenerator.forBlock['text_to_number'] = function(block) {
    const v = cppGenerator.valueToCode(block, 'VALUE', cppGenerator.ORDER_ATOMIC) || '""';
    return ['String(' + v + ').toInt()', cppGenerator.ORDER_ATOMIC];
  };
}
