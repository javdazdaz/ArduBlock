/** Traduce eventos Blockly a operaciones semánticas colaborativas. */

export function operationFromBlocklyEvent(event, workspace) {
  if (!event || event.isUiEvent) return null;
  if (event.type === 'move') {
    if (event.reason?.includes('create')) return null;
    if (event.newParentId && event.newInputName) {
      return { type: 'connect_input', parent_id: event.newParentId,
        input_name: event.newInputName, child_id: event.blockId };
    }
    if (event.newParentId && event.newCoordinate) {
      return { type: 'connect_next', parent_id: event.newParentId, child_id: event.blockId };
    }
    if (event.oldParentId && !event.newParentId) {
      return event.oldInputName
        ? { type: 'disconnect_input', parent_id: event.oldParentId, input_name: event.oldInputName }
        : { type: 'disconnect_next', parent_id: event.oldParentId };
    }
    return null;
  }
  if (event.type === 'create') {
    const block = workspace?.getBlockById?.(event.ids?.[0] || event.blockId);
    if (!block) return null;
    return {
      type: 'create_block', block_id: block.id, block_type: block.type,
      fields: Object.fromEntries(block.inputList?.flatMap(input =>
        input.fieldRow?.filter(field => field.name).map(field => [field.name, field.getValue()]) || []) || []),
    };
  }
  if (event.type === 'delete') return { type: 'delete_block', block_id: event.blockId || event.ids?.[0] };
  if (event.type === 'change' && event.element === 'field') {
    return { type: 'set_field', block_id: event.blockId, field: event.name, value: event.newValue };
  }
  return null;
}

export function semanticEventFilter(event) {
  return Boolean(operationFromBlocklyEvent(event, null));
}
