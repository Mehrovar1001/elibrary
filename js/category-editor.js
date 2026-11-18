/* eLibrary — Category photo & touch-drag framing editor (admin) */
let catEditorState = {
  id: null,
  isNew: false,
  customImage: '',
  displayMode: 'full',
  panX: 0,
  panY: 0,
  scale: 1.0,
  isDragging: false,
  startX: 0,
  startY: 0,
  initialPanX: 0,
  initialPanY: 0
};

function openCategoryEditorModal(catId) {
  if (!isAdmin()) {
    showToast(t('accessDenied'), 'offline');
    return;
  }

  const cats = getCategories();
  const existing = catId ? cats.find(c => c.id === catId) : null;

  const heading = document.getElementById('cat-modal-heading');
  const idInput = document.getElementById('cat-edit-id');
  const nameRu = document.getElementById('cat-name-ru');
  const nameTg = document.getElementById('cat-name-tg');
  const nameEn = document.getElementById('cat-name-en');
  const glowSel = document.getElementById('cat-glow-select');
  const delBtn = document.getElementById('cat-delete-btn');
  const countEl = document.getElementById('cat-live-preview-count');

  if (existing) {
    catEditorState.id = existing.id;
    catEditorState.isNew = false;
    catEditorState.customImage = existing.customImage || '';
    catEditorState.displayMode = existing.displayMode || 'full';
    catEditorState.panX = Number(existing.panX) || 0;
    catEditorState.panY = Number(existing.panY) || 0;
    catEditorState.scale = Number(existing.scale) || 1.0;

    if (heading) heading.textContent = `Редактировать: ${existing.name.ru || existing.id}`;
    if (idInput) idInput.value = existing.id;
    if (nameRu) nameRu.value = existing.name.ru || '';
    if (nameTg) nameTg.value = existing.name.tg || '';
    if (nameEn) nameEn.value = existing.name.en || '';
    if (glowSel) glowSel.value = existing.glow || 'rgba(138, 92, 246, 0.34)';
    if (delBtn) delBtn.style.display = cats.length > 1 ? 'inline-flex' : 'none';
    if (countEl) countEl.textContent = state.books.filter(b => b.genre === existing.id).length;
  } else {
    const newId = 'cat_' + Date.now();
    catEditorState.id = newId;
    catEditorState.isNew = true;
    catEditorState.customImage = '';
    catEditorState.displayMode = 'full';
    catEditorState.panX = 0;
    catEditorState.panY = 0;
    catEditorState.scale = 1.0;

    if (heading) heading.textContent = 'Новая категория';
    if (idInput) idInput.value = newId;
    if (nameRu) nameRu.value = '';
    if (nameTg) nameTg.value = '';
    if (nameEn) nameEn.value = '';
    if (glowSel) glowSel.value = 'rgba(138, 92, 246, 0.34)';
    if (delBtn) delBtn.style.display = 'none';
    if (countEl) countEl.textContent = '0';
  }

  const slider = document.getElementById('cat-scale-slider');
  const scaleVal = document.getElementById('cat-scale-value');
  if (slider) slider.value = catEditorState.scale;
  if (scaleVal) scaleVal.textContent = Math.round(catEditorState.scale * 100) + '%';

  updateLiveCategoryTitle();
  updateLiveCategoryGlow(glowSel ? glowSel.value : 'rgba(138, 92, 246, 0.34)');
  syncCategoryEditorPreviewLayers();

  const modal = document.getElementById('category-editor-modal');
  if (modal) modal.classList.add('open');
}

function closeCategoryEditorModal() {
  const modal = document.getElementById('category-editor-modal');
  if (modal) modal.classList.remove('open');
}

function updateLiveCategoryTitle() {
  const nameRu = document.getElementById('cat-name-ru');
  const nameTg = document.getElementById('cat-name-tg');
  const nameEn = document.getElementById('cat-name-en');
  const titleEl = document.getElementById('cat-live-preview-title');
  if (!titleEl) return;

  let val = (nameRu && nameRu.value.trim()) || 'Категория';
  if (state.currentLang === 'tg' && nameTg && nameTg.value.trim()) val = nameTg.value.trim();
  if (state.currentLang === 'en' && nameEn && nameEn.value.trim()) val = nameEn.value.trim();
  titleEl.textContent = val;
}

function updateLiveCategoryGlow(glowVal) {
  const card = document.getElementById('cat-live-preview-card');
  if (card) card.style.setProperty('--cat-glow', glowVal);
}

function syncCategoryEditorPreviewLayers() {
  const imgLayer = document.getElementById('cat-live-img-layer');
  const imgEl = document.getElementById('cat-live-img-el');
  const stage3d = document.getElementById('cat-live-3d-stage');
  const canvas3d = document.getElementById('cat-live-3d-canvas');
  const modeFullBtn = document.getElementById('cat-mode-full');
  const modeObjBtn = document.getElementById('cat-mode-object');

  if (modeFullBtn && modeObjBtn) {
    modeFullBtn.classList.toggle('active', catEditorState.displayMode === 'full');
    modeObjBtn.classList.toggle('active', catEditorState.displayMode === 'object');
  }

  const hasPhoto = !!(catEditorState.customImage && catEditorState.customImage.trim().length > 0);
  if (hasPhoto) {
    if (imgLayer) {
      imgLayer.style.display = 'block';
      imgLayer.className = 'cat-custom-img-layer ' + (catEditorState.displayMode === 'object' ? 'mode-object' : 'mode-full');
    }
    if (imgEl) {
      imgEl.src = catEditorState.customImage;
      applyLiveCategoryTransform();
    }
    if (stage3d) stage3d.style.display = 'none';
  } else {
    if (imgLayer) imgLayer.style.display = 'none';
    if (stage3d) stage3d.style.display = 'flex';
    if (canvas3d) {
      draw3DStudioGenreObject(canvas3d, catEditorState.id || 'history');
      canvas3d.style.transform = `translate3d(${catEditorState.panX}px, ${catEditorState.panY}px, 0) scale(${catEditorState.scale})`;
    }
  }
}

function applyLiveCategoryTransform() {
  const imgEl = document.getElementById('cat-live-img-el');
  const canvas3d = document.getElementById('cat-live-3d-canvas');
  const px = catEditorState.panX;
  const py = catEditorState.panY;
  const sc = catEditorState.scale;

  if (catEditorState.customImage) {
    if (imgEl) {
      if (catEditorState.displayMode === 'full') {
        imgEl.style.transform = `translate3d(calc(-50% + ${px}px), calc(-50% + ${py}px), 0) scale(${sc})`;
      } else {
        imgEl.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${sc})`;
      }
    }
  } else if (canvas3d) {
    canvas3d.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${sc})`;
  }
}

function setCategoryDisplayMode(mode) {
  catEditorState.displayMode = mode;
  syncCategoryEditorPreviewLayers();
}

function handleCategoryScaleChange(val) {
  catEditorState.scale = parseFloat(val) || 1.0;
  const scaleVal = document.getElementById('cat-scale-value');
  if (scaleVal) scaleVal.textContent = Math.round(catEditorState.scale * 100) + '%';
  applyLiveCategoryTransform();
}

function resetCategoryPanZoom() {
  catEditorState.panX = 0;
  catEditorState.panY = 0;
  catEditorState.scale = 1.0;
  const slider = document.getElementById('cat-scale-slider');
  const scaleVal = document.getElementById('cat-scale-value');
  if (slider) slider.value = 1.0;
  if (scaleVal) scaleVal.textContent = '100%';
  applyLiveCategoryTransform();
}

function restoreCategoryDefault3D() {
  catEditorState.customImage = '';
  resetCategoryPanZoom();
  syncCategoryEditorPreviewLayers();
}

function handleCategoryPhotoSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    /* Compress to max 720x720 so multi-object photos stay sharp when panning & zooming */
    compressImage(rawData, 720, 720, 0.86, function(compressedData) {
      catEditorState.customImage = compressedData;
      catEditorState.panX = 0;
      catEditorState.panY = 0;
      syncCategoryEditorPreviewLayers();
    });
  };
  reader.readAsDataURL(file);
}

/* Finger Touch & Mouse Drag-to-Pan on Live Category Card Preview */
function setupCategoryPreviewDrag() {
  const card = document.getElementById('cat-live-preview-card');
  if (!card) return;

  const startDrag = (clientX, clientY) => {
    catEditorState.isDragging = true;
    catEditorState.startX = clientX;
    catEditorState.startY = clientY;
    catEditorState.initialPanX = catEditorState.panX;
    catEditorState.initialPanY = catEditorState.panY;
  };

  const moveDrag = (clientX, clientY) => {
    if (!catEditorState.isDragging) return;
    const dx = clientX - catEditorState.startX;
    const dy = clientY - catEditorState.startY;
    catEditorState.panX = Math.round(catEditorState.initialPanX + dx);
    catEditorState.panY = Math.round(catEditorState.initialPanY + dy);
    applyLiveCategoryTransform();
  };

  const endDrag = () => {
    catEditorState.isDragging = false;
  };

  card.addEventListener('mousedown', e => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', e => {
    if (catEditorState.isDragging) moveDrag(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', endDrag);

  card.addEventListener('touchstart', e => {
    if (e.touches && e.touches.length === 1) {
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    if (catEditorState.isDragging && e.touches && e.touches.length === 1) {
      e.preventDefault();
      moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  card.addEventListener('touchend', endDrag);

  /* Mouse Wheel Zoom inside Live Preview Card */
  card.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    const nextScale = Math.min(3.0, Math.max(0.5, Number((catEditorState.scale + delta).toFixed(2))));
    catEditorState.scale = nextScale;
    const slider = document.getElementById('cat-scale-slider');
    const scaleVal = document.getElementById('cat-scale-value');
    if (slider) slider.value = nextScale;
    if (scaleVal) scaleVal.textContent = Math.round(nextScale * 100) + '%';
    applyLiveCategoryTransform();
  }, { passive: false });
}


async function handleSaveCategory(event) {
  event.preventDefault();
  const id = document.getElementById('cat-edit-id').value || ('cat_' + Date.now());
  const ru = document.getElementById('cat-name-ru').value.trim();
  const tg = document.getElementById('cat-name-tg').value.trim() || ru;
  const en = document.getElementById('cat-name-en').value.trim() || ru;
  const glow = document.getElementById('cat-glow-select').value;
  if (!ru) return;
  if (!/^[a-z0-9_]+$/.test(id)) {
    showToast('Некорректный идентификатор категории', 'offline');
    return;
  }

  const saveBtn = document.getElementById('cat-save-btn');
  if (saveBtn) saveBtn.disabled = true;
  try {
    let image = catEditorState.customImage || '';
    if (/^data:image\//.test(image)) {
      image = await api.uploadImage('categories', dataUrlToBlob(image));
    }
    const existing = state.categories.find(c => c.id === id);
    const saved = await api.saveCategory({
      id,
      glow,
      name: { ru, tg, en },
      customImage: image,
      displayMode: catEditorState.displayMode || 'full',
      panX: catEditorState.panX || 0,
      panY: catEditorState.panY || 0,
      scale: catEditorState.scale || 1.0,
      sortOrder: existing ? existing.sortOrder : state.categories.length + 1
    });
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx >= 0) state.categories[idx] = saved; else state.categories.push(saved);
    closeCategoryEditorModal();
    renderAll();
    renderCurrentScreen();
    showToast('Категория сохранена', 'online');
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function handleDeleteCategory() {
  const id = catEditorState.id;
  if (!id || state.categories.length <= 1) return;
  if (!confirm('Удалить эту категорию? Книги останутся, но без направления.')) return;
  try {
    await api.deleteCategory(id);
    state.categories = state.categories.filter(c => c.id !== id);
    state.books.forEach(b => { if (b.genre === id) b.genre = null; });
    closeCategoryEditorModal();
    renderAll();
    renderCurrentScreen();
    showToast('Категория удалена', 'online');
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}
