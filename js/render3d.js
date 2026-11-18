/* eLibrary — 3D studio objects for category cards and hero (canvas renderer) */
function renderAll3DCategoryCanvases(rootEl) {
  const scope = rootEl || document;
  const canvases = scope.querySelectorAll('.cat-3d-canvas');
  canvases.forEach(canvas => {
    const genreId = canvas.getAttribute('data-genre');
    if (genreId) draw3DStudioGenreObject(canvas, genreId);
  });
}

/* Studio 3D Primitives Helper (Phong/PBR Volumetric Shading on 2x Retina Canvas) */
function draw3DStudioGenreObject(canvas, genreId) {
  const dpr = Math.min(window.devicePixelRatio || 2, 2);
  const size = 154;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  /* Soft Floor Ambient Occlusion Shadow */
  const shadowGrad = ctx.createRadialGradient(84, 134, 4, 84, 134, 52);
  shadowGrad.addColorStop(0, 'rgba(6, 5, 14, 0.55)');
  shadowGrad.addColorStop(1, 'rgba(6, 5, 14, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(84, 134, 48, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  if (genreId === 'science') {
    /* 3D Blister Pack & Glossy Cyan/Violet Capsules (Direct Reference Image 1 Style!) */
    draw3DBlisterPack(ctx, 52, 84, -0.32, '#B993FF', '#7B42F6');
    draw3DBlisterPack(ctx, 102, 76, -0.18, '#B8C6D8', '#2ED3F2');
  } else if (genreId === 'business') {
    /* 3D Hot-Pink & Coral Percent Price Tag with Metallic Ring (Direct Reference Image 1 Style!) */
    draw3DPercentTag(ctx);
  } else if (genreId === 'tech') {
    /* 3D Pastel Lilac Desk Organizer & Precision Tools (Direct Reference Image 1 Style!) */
    draw3DDeskOrganizer(ctx);
  } else if (genreId === 'history') {
    /* 3D Sculpted Violet & Mint Classical Roller / Artifact Pillar */
    draw3DHistoryArtifact(ctx);
  } else if (genreId === 'philosophy') {
    /* 3D Mint-Emerald Bucket & Violet Spade / Wisdom Vessel (Direct Reference Image 1 Palette!) */
    draw3DEmeraldVessel(ctx);
  } else if (genreId === 'psychology') {
    /* 3D Refractive Glass Sphere & Golden Ring (Direct Reference Image 2 Style!) */
    draw3DRefractiveGlassSphere(ctx, 84, 78, 44);
  } else if (genreId === 'literature') {
    /* 3D Open Hardcover Volume with Extruded Pages & Coral Bookmark */
    draw3DOpenBook(ctx);
  } else {
    /* Poetry: 3D Pastel Lilac & Rose Sculptural Lyre / Quill */
    draw3DPoetrySculpture(ctx);
  }
}

function draw3DSphere(ctx, cx, cy, r, cLight, cMid, cDark) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.08, cx, cy, r);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.18, cLight);
  g.addColorStop(0.65, cMid);
  g.addColorStop(1, cDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function draw3DCapsulePill(ctx, x, y, w, h, lightCol, darkCol) {
  ctx.save();
  ctx.translate(x, y);
  /* 3D Rim shadow */
  ctx.fillStyle = 'rgba(15, 10, 35, 0.28)';
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 2, -h / 2 + 3, w, h, w / 2);
  ctx.fill();

  /* Main 3D Pill Dome */
  const g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.28, lightCol);
  g.addColorStop(1, darkCol);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, w / 2);
  ctx.fill();

  /* Glossy Specular Highlight */
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.16, -h * 0.2, w * 0.14, h * 0.22, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw3DBlisterPack(ctx, cx, cy, angle, trayColor, pillColor) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  /* 3D Extruded Tray Thickness */
  ctx.fillStyle = 'rgba(20, 16, 38, 0.45)';
  ctx.beginPath();
  ctx.roundRect(-27, -45, 58, 94, 11);
  ctx.fill();

  /* Metallic/Lilac Tray Surface */
  const trayG = ctx.createLinearGradient(-28, -48, 28, 48);
  trayG.addColorStop(0, '#F3EAFF');
  trayG.addColorStop(0.5, trayColor);
  trayG.addColorStop(1, '#685496');
  ctx.fillStyle = trayG;
  ctx.beginPath();
  ctx.roundRect(-29, -48, 58, 94, 11);
  ctx.fill();

  /* 6 3D Capsules in 2x3 Grid */
  const rows = [-28, 0, 28];
  const cols = [-13, 13];
  rows.forEach(ry => {
    cols.forEach(rx => {
      draw3DCapsulePill(ctx, rx, ry, 14, 21, '#E8F9FF', pillColor);
    });
  });

  ctx.restore();
}

function draw3DPercentTag(ctx) {
  ctx.save();
  ctx.translate(88, 88);
  ctx.rotate(-0.42);

  /* 3D Extrusion Depth */
  ctx.fillStyle = '#9E1946';
  ctx.beginPath();
  ctx.moveTo(-36, -24);
  ctx.lineTo(18, -42);
  ctx.lineTo(44, -12);
  ctx.lineTo(28, 44);
  ctx.lineTo(-32, 38);
  ctx.closePath();
  ctx.fill();

  /* Main 3D Pink Tag Body */
  const tagG = ctx.createLinearGradient(-38, -40, 38, 42);
  tagG.addColorStop(0, '#FF7EB3');
  tagG.addColorStop(0.45, '#FF3E7F');
  tagG.addColorStop(1, '#C81E5B');
  ctx.fillStyle = tagG;
  ctx.beginPath();
  ctx.roundRect(-34, -38, 68, 82, 16);
  ctx.fill();

  /* Hole Punch */
  ctx.fillStyle = '#1B1C26';
  ctx.beginPath();
  ctx.arc(0, -22, 7, 0, Math.PI * 2);
  ctx.fill();

  /* Metallic 3D Ring Loop */
  ctx.strokeStyle = '#E6E9F2';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(-10, -40, 12, 22, -0.35, 0, Math.PI * 2);
  ctx.stroke();

  /* 3D White Extruded % Symbol */
  ctx.strokeStyle = '#FFF5F8';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-12, 26);
  ctx.lineTo(14, 0);
  ctx.stroke();

  draw3DSphere(ctx, -13, 4, 7.5, '#FFFFFF', '#F6E8EE', '#C9A9B8');
  draw3DSphere(ctx, 13, 22, 7.5, '#FFFFFF', '#F6E8EE', '#C9A9B8');
  ctx.restore();
}

function draw3DDeskOrganizer(ctx) {
  ctx.save();
  ctx.translate(78, 82);

  /* Back Vertical Compartment */
  const backG = ctx.createLinearGradient(-30, -44, 38, 36);
  backG.addColorStop(0, '#F5ECFF');
  backG.addColorStop(0.5, '#D7C0F0');
  backG.addColorStop(1, '#9A7BBF');
  ctx.fillStyle = backG;
  ctx.beginPath();
  ctx.roundRect(-8, -42, 48, 72, 8);
  ctx.fill();

  /* 3D Pencils / Styluses sticking out */
  const colors = ['#FF5E9E', '#7C4DFF', '#38D2F2'];
  colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(-24 + i * 10, -46 + i * 4, 7, 46, 3);
    ctx.fill();
  });

  /* Cylinder Cup */
  const cupG = ctx.createLinearGradient(-34, -18, 4, 34);
  cupG.addColorStop(0, '#FFE5F4');
  cupG.addColorStop(0.5, '#E2B4E8');
  cupG.addColorStop(1, '#9C6FB0');
  ctx.fillStyle = cupG;
  ctx.beginPath();
  ctx.roundRect(-34, -12, 34, 46, 8);
  ctx.fill();

  /* Front Pastel Tray */
  const frontG = ctx.createLinearGradient(-48, 12, 42, 46);
  frontG.addColorStop(0, '#FCEEFF');
  frontG.addColorStop(0.6, '#DEB8F0');
  frontG.addColorStop(1, '#A47CC2');
  ctx.fillStyle = frontG;
  ctx.beginPath();
  ctx.roundRect(-48, 14, 88, 28, 8);
  ctx.fill();

  ctx.restore();
}

function draw3DHistoryArtifact(ctx) {
  ctx.save();
  ctx.translate(78, 76);

  /* Metallic Chrome Bent Arm */
  ctx.strokeStyle = '#C9D6EA';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(28, -32);
  ctx.lineTo(-34, -32);
  ctx.lineTo(-34, -6);
  ctx.lineTo(2, 12);
  ctx.lineTo(2, 26);
  ctx.stroke();

  /* 3D Velvet Purple Cylinder Roller (Direct Reference Image 1 Top-Left!) */
  const cylG = ctx.createLinearGradient(-28, -54, -28, -12);
  cylG.addColorStop(0, '#B993FF');
  cylG.addColorStop(0.45, '#7843E6');
  cylG.addColorStop(1, '#3E1C96');
  ctx.fillStyle = cylG;
  ctx.beginPath();
  ctx.roundRect(-28, -52, 68, 36, 12);
  ctx.fill();

  /* Handle Grip in Cyan & Coral */
  const gripG = ctx.createLinearGradient(-8, 20, 14, 56);
  gripG.addColorStop(0, '#5CE1E6');
  gripG.addColorStop(1, '#258EA6');
  ctx.fillStyle = gripG;
  ctx.beginPath();
  ctx.roundRect(-8, 22, 20, 34, 7);
  ctx.fill();

  ctx.fillStyle = '#FF7B54';
  ctx.beginPath();
  ctx.roundRect(-10, 18, 24, 8, 4);
  ctx.fill();

  ctx.restore();
}

function draw3DEmeraldVessel(ctx) {
  ctx.save();
  ctx.translate(82, 82);

  /* Mint-Emerald 3D Bucket/Vessel (Direct Reference Image 1 Top-Center!) */
  ctx.strokeStyle = '#68E3A6';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(4, -14, 34, Math.PI, 0);
  ctx.stroke();

  /* Top Orange Handle Grip */
  ctx.fillStyle = '#FF8E64';
  ctx.beginPath();
  ctx.roundRect(-8, -52, 22, 8, 4);
  ctx.fill();

  /* Vessel Body */
  const bodyG = ctx.createLinearGradient(-30, -16, 36, 44);
  bodyG.addColorStop(0, '#80F5BC');
  bodyG.addColorStop(0.5, '#46C98B');
  bodyG.addColorStop(1, '#1E7A52');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.moveTo(-28, -14);
  ctx.lineTo(36, -14);
  ctx.lineTo(26, 44);
  ctx.lineTo(-18, 44);
  ctx.closePath();
  ctx.fill();

  /* 3D Violet Spade leaning against it */
  ctx.save();
  ctx.translate(-18, 12);
  ctx.rotate(0.38);
  const spadeG = ctx.createLinearGradient(-14, 0, 14, 34);
  spadeG.addColorStop(0, '#A77BFF');
  spadeG.addColorStop(1, '#4C1D95');
  ctx.fillStyle = spadeG;
  ctx.beginPath();
  ctx.roundRect(-14, 2, 26, 32, [4, 4, 14, 14]);
  ctx.fill();

  ctx.fillStyle = '#FF8E64';
  ctx.beginPath();
  ctx.roundRect(-4, -26, 7, 30, 3);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function draw3DRefractiveGlassSphere(ctx, cx, cy, r) {
  ctx.save();
  /* Background Warm Gold Bars Refracted inside Sphere (Direct Reference Image 2!) */
  for (let i = -3; i <= 3; i++) {
    ctx.strokeStyle = 'rgba(235, 175, 110, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + i * 9, cy - r - 12);
    ctx.lineTo(cx + i * 9, cy + r + 10);
    ctx.stroke();
  }

  /* Outer Glass Sphere Body */
  const g = ctx.createRadialGradient(cx - r * 0.32, cy - r * 0.32, 4, cx, cy, r);
  g.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  g.addColorStop(0.25, 'rgba(245, 196, 142, 0.55)');
  g.addColorStop(0.7, 'rgba(138, 86, 46, 0.72)');
  g.addColorStop(0.92, 'rgba(255, 226, 194, 0.85)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  /* Internal Refracted Caustic Wave */
  ctx.strokeStyle = 'rgba(255, 248, 235, 0.78)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.84, -0.8, 1.4);
  ctx.stroke();

  /* Top Specular Bead */
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.32, cy - r * 0.35, r * 0.22, r * 0.12, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw3DOpenBook(ctx) {
  ctx.save();
  ctx.translate(82, 82);
  ctx.rotate(-0.14);

  /* Purple 3D Hardcover Base */
  const covG = ctx.createLinearGradient(-44, -28, 44, 36);
  covG.addColorStop(0, '#9E7BFF');
  covG.addColorStop(1, '#4B27B8');
  ctx.fillStyle = covG;
  ctx.beginPath();
  ctx.roundRect(-44, -24, 88, 60, 10);
  ctx.fill();

  /* Cream Left & Right 3D Curved Pages */
  ctx.fillStyle = '#FAF6EE';
  ctx.beginPath();
  ctx.roundRect(-38, -28, 37, 56, [6, 2, 2, 6]);
  ctx.roundRect(1, -28, 37, 56, [2, 6, 6, 2]);
  ctx.fill();

  /* Coral 3D Bookmark Ribbon */
  ctx.fillStyle = '#FF5484';
  ctx.beginPath();
  ctx.moveTo(14, -28);
  ctx.lineTo(26, -28);
  ctx.lineTo(26, 16);
  ctx.lineTo(20, 10);
  ctx.lineTo(14, 16);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function draw3DPoetrySculpture(ctx) {
  ctx.save();
  ctx.translate(82, 82);

  /* 3D Lilac & Pink Wheelchair / Comfort Chair or Lyre Sculpture */
  draw3DSphere(ctx, -18, -12, 22, '#F6E6FF', '#C792F5', '#6E38B5');
  draw3DSphere(ctx, 18, 8, 26, '#FFE3F1', '#F472B6', '#9D174D');
  draw3DSphere(ctx, 2, -26, 14, '#E0F9FF', '#38BDF8', '#0369A1');

  ctx.restore();
}

/* Interactive 3D Hero Canvas Sculpture */
function initHero3DCanvas() {
  const canvas = document.getElementById('hero-3d-canvas');
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 2, 2);
  canvas.width = 190 * dpr;
  canvas.height = 190 * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let t = 0;
  function animateHero() {
    ctx.clearRect(0, 0, 190, 190);
    const dy = Math.sin(t * 0.03) * 5;

    /* Orbiting 3D Mint & Violet Spheres behind Glass Lens */
    draw3DSphere(ctx, 52 + Math.cos(t * 0.025) * 14, 58 + dy, 22, '#B993FF', '#7C4DFF', '#3B1D9E');
    draw3DSphere(ctx, 136 - Math.cos(t * 0.025) * 12, 128 - dy, 24, '#88F7C4', '#38C985', '#156E47');

    /* Central Refractive 3D Liquid Glass Orb */
    draw3DRefractiveGlassSphere(ctx, 95, 95 + dy * 0.6, 52);

    t += 1;
    requestAnimationFrame(animateHero);
  }
  animateHero();
}

