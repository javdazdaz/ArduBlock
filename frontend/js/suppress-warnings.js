/**
 * ArduBlock — Suppress known Blockly library warnings.
 * MUST be imported before any Blockly plugin that emits warnings.
 */
(function() {
  const _warn = console.warn.bind(console);
  console.warn = function(...args) {
    const msg = args.join(' ');
    if (msg.includes('[procedures][serializer]')) return;
    _warn(...args);
  };
  const _gEBI = document.getElementById.bind(document);
  document.getElementById = function(id) {
    if (id === '' || id == null) return null;
    return _gEBI(id);
  };
})();
