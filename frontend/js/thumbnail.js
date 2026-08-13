/**
 * ArduBlock — Thumbnail del workspace (PNG 128x128)
 *
 * Captura los bloques de un workspace Blockly y los rasteriza a un PNG
 * de 128x128 con fondo blanco. Usado por el editor (al guardar) y por la
 * utilidad de regeneración masiva (/teacher/regen-thumbnails).
 */

export function captureWorkspaceThumbnail(workspace) {
  try {
    const bbox = workspace.getBlocksBoundingBox();
    const w = bbox.right - bbox.left;
    const h = bbox.bottom - bbox.top;
    if (w <= 1 && h <= 1) return Promise.resolve(null); // sin bloques

    const PAD = 12;
    const svg = workspace.getParentSvg().cloneNode(true);

    svg.setAttribute('viewBox', `${bbox.left - PAD} ${bbox.top - PAD} ${w + PAD * 2} ${h + PAD * 2}`);
    svg.setAttribute('width', '128');
    svg.setAttribute('height', '128');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Quitar elementos de UI/fondo que no forman parte de los bloques.
    svg.querySelectorAll(
      '.blocklyMainBackground, .blocklyGrid, .blocklyGridPattern, ' +
      '.blocklyScrollbarHorizontal, .blocklyScrollbarVertical, ' +
      '.blocklyZoom, .blocklyTrash, .blocklyFlyout'
    ).forEach((el) => el.remove());

    // Forzar fuente legible (Blockly aplica la fuente vía CSS, que no viaja en el SVG exportado).
    svg.querySelectorAll('text').forEach((t) => {
      t.setAttribute('font-family', 'sans-serif');
      if (!t.getAttribute('font-size')) t.setAttribute('font-size', '11pt');
    });

    return svgToPng(svg);
  } catch (e) {
    return Promise.resolve(null);
  }
}

function svgToPng(svg) {
  return new Promise((resolve) => {
    let url;
    try {
      const xml = new XMLSerializer().serializeToString(svg);
      url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    } catch (e) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 128, 128);
        ctx.drawImage(img, 0, 0, 128, 128);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
