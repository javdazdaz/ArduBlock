// Avatares prediseñados de ArduBlock. Se mantienen como código fuente.
export function drawAvatarOne(ctx, size = 256) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#276749'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#f6e05e'; ctx.beginPath(); ctx.arc(size/2, size*.48, size*.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a202c'; ctx.beginPath(); ctx.arc(size*.41, size*.45, size*.035, 0, Math.PI*2); ctx.arc(size*.59, size*.45, size*.035, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#1a202c'; ctx.lineWidth = size*.025; ctx.beginPath(); ctx.arc(size/2, size*.48, size*.16, .2, Math.PI-.2); ctx.stroke();
}

export function drawAvatarTwo(ctx, size = 256) {
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#2b6cb0'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#fed7d7'; ctx.beginPath(); ctx.arc(size/2, size*.5, size*.28, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#553c9a'; ctx.beginPath(); ctx.arc(size/2, size*.3, size*.25, Math.PI, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a202c'; ctx.beginPath(); ctx.arc(size*.41, size*.5, size*.035, 0, Math.PI*2); ctx.arc(size*.59, size*.5, size*.035, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#1a202c'; ctx.lineWidth = size*.025; ctx.beginPath(); ctx.arc(size/2, size*.55, size*.13, 0, Math.PI); ctx.stroke();
}
