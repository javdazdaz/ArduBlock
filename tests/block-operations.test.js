import { describe, expect, it } from 'vitest';
import { operationFromBlocklyEvent } from '../frontend/js/block-operations.js';

describe('Blockly semantic operations', () => {
  it('ignores visual-only moves', () => {
    expect(operationFromBlocklyEvent({ type: 'move', blockId: 'b1', newCoordinate: { x: 10, y: 20 } }, null)).toBeNull();
  });

  it('emits semantic connection operations', () => {
    expect(operationFromBlocklyEvent({
      type: 'move', blockId: 'child', newParentId: 'parent', newInputName: 'VALUE',
    }, null)).toEqual({
      type: 'connect_input', parent_id: 'parent', input_name: 'VALUE', child_id: 'child',
    });
  });

  it('emits field changes and deletions', () => {
    expect(operationFromBlocklyEvent({
      type: 'change', element: 'field', blockId: 'b1', name: 'TEXT', newValue: 'hola',
    }, null)).toEqual({ type: 'set_field', block_id: 'b1', field: 'TEXT', value: 'hola' });
    expect(operationFromBlocklyEvent({ type: 'delete', blockId: 'b1' }, null))
      .toEqual({ type: 'delete_block', block_id: 'b1' });
  });
});
