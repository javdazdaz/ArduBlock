/**
 * ArduBlock — Paleta App Inventor para bloques compartidos.
 *
 * Los bloques built-in de Blockly que App Inventor también usa deben verse
 * idénticos. Overrideamos los 7 estilos con los hex exactos de App Inventor
 * (saturación alta, vibrantes). Compartida entre el editor y la utilidad de
 * regeneración de thumbnails para que los colores nunca se desincronicen.
 */

export const AI_PALETTE = {
  loop_blocks:      { colourPrimary: '#cfac4b', colourSecondary: '#9b8138', colourTertiary: '#332b12' },  // Control — ámbar
  logic_blocks:     { colourPrimary: '#88b652', colourSecondary: '#66883d', colourTertiary: '#222d14' },  // Lógica — verde
  math_blocks:      { colourPrimary: '#4f86c2', colourSecondary: '#3b6491', colourTertiary: '#132130' },  // Matemáticas — azul
  text_blocks:      { colourPrimary: '#c24471', colourSecondary: '#913354', colourTertiary: '#30111c' },  // Texto — rosa
  list_blocks:      { colourPrimary: '#58b5dc', colourSecondary: '#4287a5', colourTertiary: '#162d37' },  // Arreglos — celeste
  variable_blocks:  { colourPrimary: '#db743a', colourSecondary: '#a4572b', colourTertiary: '#361d0e' },  // Variables — naranja
  procedure_blocks: { colourPrimary: '#8f6997', colourSecondary: '#6b4e71', colourTertiary: '#231a25' },  // Funciones — violeta
};

export function applyAiPalette(workspace) {
  const theme = workspace.getTheme();
  for (const [name, style] of Object.entries(AI_PALETTE)) {
    theme.setBlockStyle(name, style);
  }
}
