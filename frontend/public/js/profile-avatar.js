import { csrfFetch } from './csrf.js';
import { drawAvatarOne, drawAvatarTwo } from './canvas-avatars.js';

const file = document.getElementById('avatar-file');
const area = document.getElementById('crop-area');
const canvas = document.getElementById('crop-canvas');
const ctx = canvas?.getContext('2d');
const zoom = document.getElementById('crop-zoom');
let image = null; let scale = 1; let offsetX = 0; let offsetY = 0; let dragging = false; let start = null;

function drawCrop() {
  if (!image) return;
  const side = Math.min(image.width, image.height);
  const base = 256 / side;
  scale = Number(zoom.value) * base;
  ctx.clearRect(0, 0, 256, 256);
  ctx.drawImage(image, offsetX + (256 - image.width * scale) / 2,
    offsetY + (256 - image.height * scale) / 2, image.width * scale, image.height * scale);
}
function saveData(avatarType, data) {
  return csrfFetch('/api/profile/avatar', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({avatar_type: avatarType, avatar_data: data}) }).then(r => {
    if (!r.ok) throw new Error('No se pudo guardar la imagen');
    const preview = document.getElementById('profile-avatar'); preview.src = `/api/profile/avatar/${document.querySelector('.profile-page').dataset.userId}?v=${Date.now()}`; preview.hidden = false;
    document.getElementById('profile-initials').hidden = true;
  });
}
file?.addEventListener('change', () => {
  const selected = file.files?.[0]; if (!selected) return;
  const reader = new FileReader(); reader.onload = () => { image = new Image(); image.onload = () => { area.classList.remove('hidden'); zoom.value = 1; offsetX = offsetY = 0; drawCrop(); }; image.src = reader.result; }; reader.readAsDataURL(selected);
});
zoom?.addEventListener('input', drawCrop);
canvas?.addEventListener('pointerdown', e => { dragging = true; start = [e.clientX - offsetX, e.clientY - offsetY]; canvas.setPointerCapture(e.pointerId); });
canvas?.addEventListener('pointermove', e => { if (dragging) { offsetX = e.clientX - start[0]; offsetY = e.clientY - start[1]; drawCrop(); } });
canvas?.addEventListener('pointerup', () => { dragging = false; });
document.getElementById('crop-save')?.addEventListener('click', async () => {
  try {
    const side = Math.min(image.width, image.height) / Number(zoom.value);
    const base = Math.min(256, Math.floor(side));
    const renderedScale = Number(zoom.value) * (256 / Math.min(image.width, image.height));
    const left = offsetX + (256 - image.width * renderedScale) / 2;
    const top = offsetY + (256 - image.height * renderedScale) / 2;
    const sourceSide = 256 / renderedScale;
    const sx = Math.max(0, Math.min(image.width - sourceSide, -left / renderedScale));
    const sy = Math.max(0, Math.min(image.height - sourceSide, -top / renderedScale));
    const output = document.createElement('canvas'); output.width = output.height = base;
    output.getContext('2d').drawImage(image, sx, sy, sourceSide, sourceSide, 0, 0, base, base);
    await saveData('upload', output.toDataURL('image/png')); area.classList.add('hidden');
  } catch (e) { alert(e.message); }
});
document.getElementById('crop-cancel')?.addEventListener('click', () => area.classList.add('hidden'));
document.getElementById('avatar-remove')?.addEventListener('click', async () => { const r = await csrfFetch('/api/profile/avatar', {method: 'DELETE'}); if (r.ok) location.reload(); });
for (const button of document.querySelectorAll('.avatar-choice')) {
  const c = button.querySelector('canvas'); (button.dataset.avatar === 'one' ? drawAvatarOne : drawAvatarTwo)(c.getContext('2d'), 96);
  button.addEventListener('click', async () => { const temp = document.createElement('canvas'); temp.width = temp.height = 256; (button.dataset.avatar === 'one' ? drawAvatarOne : drawAvatarTwo)(temp.getContext('2d')); try { await saveData('canvas', temp.toDataURL('image/png')); } catch (e) { alert(e.message); } });
}
