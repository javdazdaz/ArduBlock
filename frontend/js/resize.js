/**
 * ArduBlock — Resizers de Paneles (toolbox, código).
 */

import * as Blockly from 'blockly';

let workspace, resizer, editorPanel, codePanel, floatExpandBtn, collapseBtn;
let isResizing = false;
let resizeTarget = null;
let codeCollapsed = false;

export function initResize(deps) {
  workspace      = deps.workspace;
  resizer        = deps.resizer;
  editorPanel    = deps.editorPanel;
  codePanel      = deps.codePanel;
  floatExpandBtn = deps.floatExpandBtn;
  collapseBtn    = deps.collapseBtn;

  resizer.addEventListener('mousedown', () => {
    isResizing = true;
    resizeTarget = 'code';
    resizer.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  resizer.addEventListener('dblclick', () => {
    if (!codeCollapsed) collapseCode();
  });

  collapseBtn.addEventListener('click', () => {
    if (codeCollapsed) expandCode(); else collapseCode();
  });
  floatExpandBtn.addEventListener('click', expandCode);

  setTimeout(setupToolboxResize, 300);
  setTimeout(setupToolboxResize, 1000);
  workspace.addChangeListener(() => setTimeout(setupToolboxResize, 50));

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    if (resizeTarget === 'code') {
      const main = document.querySelector('main');
      const rect = main.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const total = rect.width - resizer.offsetWidth;
      const editorPct = (x / total) * 100;
      editorPanel.style.flex = editorPct;
      codePanel.style.flex = 100 - editorPct;
    } else if (resizeTarget === 'toolbox') {
      const toolbox = document.querySelector('.blocklyToolbox');
      if (toolbox) {
        const w = Math.max(60, Math.min(400, e.clientX - toolbox.getBoundingClientRect().left));
        toolbox.style.width = w + 'px';
      }
    }
    Blockly.svgResize(workspace);
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeTarget = null;
    resizer.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    Blockly.svgResize(workspace);
  });
}

function setupToolboxResize() {
  const toolbox = document.querySelector('.blocklyToolbox');
  if (!toolbox || toolbox.dataset.resizerReady) return;
  toolbox.dataset.resizerReady = '1';

  toolbox.addEventListener('mousedown', (e) => {
    const rect = toolbox.getBoundingClientRect();
    if ((rect.right - e.clientX) >= 14) return;
    isResizing = true;
    resizeTarget = 'toolbox';
    toolbox.style.borderRightColor = 'var(--accent2)';
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  toolbox.addEventListener('dblclick', (e) => {
    const rect = toolbox.getBoundingClientRect();
    if ((rect.right - e.clientX) >= 14) return;
    const collapsed = toolbox.dataset.collapsed === '1';
    if (collapsed) {
      toolbox.style.width = toolbox.dataset.prevWidth || '';
      toolbox.style.minWidth = '';
      toolbox.style.overflow = '';
      toolbox.dataset.collapsed = '0';
    } else {
      toolbox.dataset.prevWidth = toolbox.style.width || getComputedStyle(toolbox).width;
      toolbox.dataset.collapsed = '1';
      toolbox.style.width = '5px';
      toolbox.style.minWidth = '5px';
      toolbox.style.overflow = 'hidden';
    }
    Blockly.svgResize(workspace);
  });
}

function collapseCode() {
  codeCollapsed = true;
  codePanel.dataset.prevFlex = codePanel.style.flex || '1';
  codePanel.style.flex = '0 0 0';
  codePanel.classList.add('collapsed');
  collapseBtn.textContent = '▶';
  const headerRect = codePanel.querySelector('.panel-header').getBoundingClientRect();
  floatExpandBtn.style.top = headerRect.top + 'px';
  floatExpandBtn.classList.add('visible');
  setTimeout(() => Blockly.svgResize(workspace), 100);
}

function expandCode() {
  codeCollapsed = false;
  codePanel.style.flex = codePanel.dataset.prevFlex || '1';
  codePanel.classList.remove('collapsed');
  collapseBtn.textContent = '◀';
  floatExpandBtn.classList.remove('visible');
  setTimeout(() => Blockly.svgResize(workspace), 100);
}
