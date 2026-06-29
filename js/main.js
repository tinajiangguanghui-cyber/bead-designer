import { BEAD_LIBRARY, BEAD_MATERIALS, BEAD_COLORS, TEMPLATES } from './beadData.js';
import { BeadRenderer } from './renderer.js';
import { DesignEngine } from './designEngine.js';
import { WorkManager } from './workManager.js';

class App {
  constructor() {
    try {
      this.renderer = null;
      this.engine = null;
      this.workManager = new WorkManager();
      this.currentWorkId = null;
      this.exportBg = 'transparent';
      this.activeFilter = 'all';
      this.filteredBeads = [...BEAD_LIBRARY];

      this.init();
    } catch (e) {
      console.error('App init error:', e);
      // 确保基本UI可见
      document.getElementById('page-home').classList.add('active');
    }
  }

  init() {
    // 绑定UI事件（无论WebGL是否可用）
    this.bindHomeEvents();
    this.bindTemplateEvents();
    this.bindDesignerEvents();
    this.bindExportEvents();
    this.bindWorksEvents();
    this.bindSaveEvents();
    this.bindBeadEditEvents();
    this.updateWorksCount();

    // 尝试初始化3D，失败则降级
    try {
      const hasWebGL = this.checkWebGL();
      if (!hasWebGL) {
        console.warn('WebGL not available, running in fallback mode');
        this.showWebGLFallback();
        return;
      }
      // 初始化首页3D预览
      setTimeout(() => this.initHomePreview(), 300);
      // 初始化设计画布
      setTimeout(() => this.initDesigner(), 500);
    } catch (e) {
      console.error('3D init error:', e);
      this.showWebGLFallback();
    }
  }

  showWebGLFallback() {
    const hero = document.getElementById('hero-canvas');
    if (hero) {
      hero.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#8b5e3c;font-size:48px;">📿</div>';
    }
  }

  checkWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
    } catch (e) {
      return false;
    }
  }

  // === 首页 ===
  initHomePreview() {
    const container = document.getElementById('hero-canvas');
    const previewRenderer = new BeadRenderer(container);
    if (!previewRenderer.webglAvailable || !previewRenderer.renderer) {
      // WebGL不可用时，显示静态占位
      container.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#8b5e3c;font-size:48px;">📿</div>';
      return;
    }
    previewRenderer.setBackground('transparent');
    // 生成示例手串
    const points = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * 2.5, 0, Math.sin(angle) * 2.5));
    }
    const result = previewRenderer.createRope(points, 0.1, 0x6b5b4a);
    previewRenderer.ropeGroup.add(result.mesh);
    const curve = result.curve;

    const sampleBeads = BEAD_LIBRARY.slice(0, 20);
    for (let i = 0; i < 20; i++) {
      const t = i / 20;
      const point = curve.getPointAt(t);
      const bead = sampleBeads[i % sampleBeads.length];
      const mesh = previewRenderer.createBeadMesh(bead, bead.defaultSize);
      mesh.position.copy(point);
      previewRenderer.beadsGroup.add(mesh);
    }
    this.homePreviewRenderer = previewRenderer;
  }

  initDesigner() {
    const container = document.getElementById('designer-canvas');
    this.renderer = new BeadRenderer(container);
    this.renderer.setBackground('white');
    this.engine = new DesignEngine(this.renderer);
  }

  bindHomeEvents() {
    document.getElementById('btn-start-design').addEventListener('click', () => {
      this.showModal('modal-template');
      this.renderTemplateGrid();
    });
    document.getElementById('btn-my-works').addEventListener('click', () => {
      this.showPage('page-works');
      this.renderWorksList();
    });
  }

  // === 模板选择 ===
  bindTemplateEvents() {
    document.getElementById('btn-close-template').addEventListener('click', () => {
      this.hideModal('modal-template');
    });
  }

  renderTemplateGrid() {
    const grid = document.getElementById('template-grid');
    grid.innerHTML = '';
    TEMPLATES.forEach(tpl => {
      const item = document.createElement('div');
      item.className = 'template-item';
      item.innerHTML = `
        <div class="template-icon">${tpl.icon}</div>
        <div class="template-name">${tpl.name}</div>
        <div class="template-desc">${tpl.desc}</div>
      `;
      item.addEventListener('click', () => {
        this.hideModal('modal-template');
        this.startNewDesign(tpl.id);
      });
      grid.appendChild(item);
    });
  }

  startNewDesign(templateId) {
    if (!this.engine) {
      this.showToast('3D引擎不可用，请使用支持WebGL的浏览器');
      return;
    }
    this.currentWorkId = null;
    this.showPage('page-designer');
    this.engine.setTemplate(templateId);
    document.getElementById('current-template-name').textContent =
      TEMPLATES.find(t => t.id === templateId)?.name || '手串·单圈';
    this.updateDesignerInfo();
    this.updateUndoRedoButtons();
    this.renderBeadList();
  }

  // === 设计画布 ===
  bindDesignerEvents() {
    document.getElementById('btn-back').addEventListener('click', () => {
      this.showPage('page-home');
    });
    document.getElementById('btn-undo').addEventListener('click', () => {
      if (!this.engine) return;
      this.engine.undo();
      this.updateDesignerInfo();
      this.updateUndoRedoButtons();
    });
    document.getElementById('btn-redo').addEventListener('click', () => {
      if (!this.engine) return;
      this.engine.redo();
      this.updateDesignerInfo();
      this.updateUndoRedoButtons();
    });
    document.getElementById('btn-save').addEventListener('click', () => {
      this.openSaveDialog();
    });
    document.getElementById('btn-export').addEventListener('click', () => {
      if (!this.engine || this.engine.getBeadCount() === 0) {
        this.showToast('请先添加珠子');
        return;
      }
      this.showModal('modal-export');
    });

    // 珠子库筛选
    this.renderBeadFilters();
  }

  renderBeadFilters() {
    const container = document.getElementById('bead-filters');
    const categories = [
      { key: 'all', label: '全部' },
      { key: 'crystal', label: '水晶' },
      { key: 'jade', label: '玉石' },
      { key: 'wood', label: '木质' },
      { key: 'metal', label: '金属' },
      { key: 'ceramic', label: '陶瓷' },
    ];
    container.innerHTML = '';
    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn' + (cat.key === this.activeFilter ? ' active' : '');
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        this.activeFilter = cat.key;
        this.renderBeadFilters();
        this.renderBeadList();
      });
      container.appendChild(btn);
    });
  }

  renderBeadList() {
    const container = document.getElementById('bead-list');
    container.innerHTML = '';

    this.filteredBeads = this.activeFilter === 'all'
      ? BEAD_LIBRARY
      : BEAD_LIBRARY.filter(b => b.material === this.activeFilter);

    this.filteredBeads.forEach(bead => {
      const item = document.createElement('div');
      item.className = 'bead-item';
      const colorHex = BEAD_COLORS[bead.color]?.hex || '#ccc';
      item.innerHTML = `
        <div class="bead-thumb" style="background: radial-gradient(circle at 35% 35%, ${this.lightenColor(colorHex)}, ${colorHex})"></div>
        <div class="bead-label">${bead.name}</div>
      `;
      item.addEventListener('click', () => {
        if (!this.engine) return;
        this.engine.addBead(bead);
        this.updateDesignerInfo();
        this.updateUndoRedoButtons();
      });
      container.appendChild(item);
    });
  }

  lightenColor(hex) {
    const r = parseInt(hex.slice(1,3), 16);
    const g = parseInt(hex.slice(3,5), 16);
    const b = parseInt(hex.slice(5,7), 16);
    const lr = Math.min(255, r + 80);
    const lg = Math.min(255, g + 80);
    const lb = Math.min(255, b + 80);
    return `rgb(${lr},${lg},${lb})`;
  }

  updateDesignerInfo() {
    if (!this.engine) return;
    document.getElementById('bead-count').textContent = this.engine.getBeadCount();
    document.getElementById('total-length').textContent = this.engine.getTotalLength();
  }

  updateUndoRedoButtons() {
    if (!this.engine) {
      document.getElementById('btn-undo').disabled = true;
      document.getElementById('btn-redo').disabled = true;
      return;
    }
    document.getElementById('btn-undo').disabled = !this.engine.canUndo();
    document.getElementById('btn-redo').disabled = !this.engine.canRedo();
  }

  // === 珠子编辑 ===
  bindBeadEditEvents() {
    document.getElementById('btn-close-edit').addEventListener('click', () => {
      this.hideModal('modal-bead-edit');
    });
    document.getElementById('btn-delete-bead').addEventListener('click', () => {
      const idx = this.engine.selectedBeadIndex;
      if (idx >= 0) {
        this.engine.removeBead(idx);
        this.hideModal('modal-bead-edit');
        this.updateDesignerInfo();
        this.updateUndoRedoButtons();
      }
    });
  }

  openBeadEdit(index) {
    if (!this.engine) return;
    const bead = this.engine.beads[index];
    if (!bead) return;

    document.getElementById('edit-bead-name').textContent = bead.beadDef.name;
    this.engine.highlightBead(index);

    // 尺寸选项
    const sizesContainer = document.getElementById('edit-sizes');
    sizesContainer.innerHTML = '';
    bead.beadDef.sizes.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'size-opt' + (bead.size === s ? ' active' : '');
      btn.textContent = s + 'mm';
      btn.addEventListener('click', () => {
        this.engine.updateBeadSize(index, s);
        this.updateDesignerInfo();
        this.updateUndoRedoButtons();
        this.openBeadEdit(index); // 刷新面板
      });
      sizesContainer.appendChild(btn);
    });

    // 颜色选项
    const colorsContainer = document.getElementById('edit-colors');
    colorsContainer.innerHTML = '';
    const availableColors = this.getAvailableColors(bead.beadDef.material);
    availableColors.forEach(c => {
      const btn = document.createElement('button');
      btn.className = 'color-opt' + (bead.color === c.key ? ' active' : '');
      btn.innerHTML = `<span class="color-dot" style="background:${c.hex}"></span>${c.name}`;
      btn.addEventListener('click', () => {
        this.engine.updateBeadColor(index, c.key);
        this.updateUndoRedoButtons();
        this.openBeadEdit(index); // 刷新面板
      });
      colorsContainer.appendChild(btn);
    });

    this.showModal('modal-bead-edit');
  }

  getAvailableColors(material) {
    // 根据材质返回合理的颜色列表
    const colorMap = {
      crystal: ['pink','purple','white','yellow','brown','blue'],
      jade: ['green','white','red','blue'],
      wood: ['brown','black'],
      metal: ['silver','gold','rosegold'],
      ceramic: ['white','blue','teal']
    };
    const keys = colorMap[material] || Object.keys(BEAD_COLORS).slice(0, 8);
    return keys.map(k => ({ key: k, name: BEAD_COLORS[k].name, hex: BEAD_COLORS[k].hex }));
  }

  // 设计画布上点击珠子（通过Raycaster或在3D中添加）
  // 简化方案：通过双击3D场景中的珠子来编辑
  setupBeadClickHandler() {
    // 在renderer中处理：双击珠子触发编辑
    // 此功能在后续迭代中实现
  }

  // === 导出 ===
  bindExportEvents() {
    document.getElementById('btn-close-export').addEventListener('click', () => {
      this.hideModal('modal-export');
    });
    document.querySelectorAll('.export-option').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('.export-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.exportBg = opt.dataset.bg;
      });
    });
    document.getElementById('btn-confirm-export').addEventListener('click', () => {
      this.doExport();
    });
  }

  doExport() {
    if (!this.renderer) return;
    this.hideModal('modal-export');
    this.showModal('modal-exporting');

    // 短暂延迟让UI更新
    setTimeout(() => {
      const bgType = this.exportBg;
      const format = bgType === 'transparent' ? 'png' : 'jpeg';

      // 临时设置背景
      const origBg = this.renderer.scene.background;
      if (bgType === 'transparent') {
        this.renderer.scene.background = null;
      } else if (bgType === 'gradient') {
        this.renderer.scene.background = new THREE.Color(0xfdf6f0);
      } else {
        this.renderer.scene.background = new THREE.Color(0xffffff);
      }

      const dataURL = this.renderer.exportImage(bgType, format);

      // 恢复背景
      this.renderer.scene.background = origBg;

      // 添加水印（简化版）
      this.addWatermarkToImage(dataURL, (watermarkedURL) => {
        this.hideModal('modal-exporting');
        this.downloadImage(watermarkedURL, `串珠妙计_${Date.now()}.${format}`);
        this.showToast('导出成功！');
      });
    }, 300);
  }

  addWatermarkToImage(dataURL, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // 水印
      const fontSize = Math.max(14, Math.floor(img.width * 0.025));
      ctx.font = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.fillStyle = 'rgba(139, 94, 60, 0.3)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('📿 串珠妙计', img.width - fontSize, img.height - fontSize);

      callback(canvas.toDataURL('image/png'));
    };
    img.src = dataURL;
  }

  downloadImage(dataURL, filename) {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // === 保存 ===
  bindSaveEvents() {
    document.getElementById('btn-close-save').addEventListener('click', () => {
      this.hideModal('modal-save');
    });
    document.getElementById('btn-confirm-save').addEventListener('click', () => {
      this.doSave();
    });
  }

  openSaveDialog() {
    if (!this.engine || this.engine.getBeadCount() === 0) {
      this.showToast('请先添加珠子');
      return;
    }
    document.getElementById('input-work-name').value = this.currentWorkId
      ? (this.workManager.getWork(this.currentWorkId)?.name || '')
      : '';
    this.showModal('modal-save');
    setTimeout(() => document.getElementById('input-work-name').focus(), 300);
  }

  doSave() {
    if (!this.engine) return;
    const name = document.getElementById('input-work-name').value.trim() || `设计_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '')}`;
    const designData = this.engine.toJSON();

    // 生成缩略图
    const origBg = this.renderer.scene.background;
    this.renderer.scene.background = null;
    const thumbDataURL = this.renderer.exportImage('transparent', 'png');
    this.renderer.scene.background = origBg;

    if (this.currentWorkId) {
      this.workManager.updateWork(this.currentWorkId, designData, thumbDataURL);
    } else {
      const work = this.workManager.addWork(name, designData, thumbDataURL);
      this.currentWorkId = work.id;
    }

    this.hideModal('modal-save');
    this.showToast('保存成功！');
    this.updateWorksCount();
  }

  // === 作品列表 ===
  bindWorksEvents() {
    document.getElementById('btn-works-back').addEventListener('click', () => {
      this.showPage('page-home');
    });
    document.getElementById('btn-works-create')?.addEventListener('click', () => {
      this.showModal('modal-template');
      this.renderTemplateGrid();
    });
  }

  renderWorksList() {
    const container = document.getElementById('works-grid');
    const works = this.workManager.getAllWorks();

    if (works.length === 0) {
      container.innerHTML = `
        <div class="works-empty">
          <div class="empty-icon">📿</div>
          <p>还没有作品</p>
          <button class="btn-primary" id="btn-works-create">去设计第一个吧</button>
        </div>`;
      document.getElementById('btn-works-create')?.addEventListener('click', () => {
        this.showModal('modal-template');
        this.renderTemplateGrid();
      });
      return;
    }

    container.innerHTML = '';
    works.forEach(work => {
      const card = document.createElement('div');
      card.className = 'work-card';
      card.innerHTML = `
        <div class="work-thumb">
          ${work.thumbnail ? `<img src="${work.thumbnail}" alt="${work.name}">` : '<span style="font-size:32px">📿</span>'}
        </div>
        <div class="work-info">
          <div class="work-name">${work.name}</div>
          <div class="work-meta">
            <span>${work.beadCount}颗</span>
            <span>${new Date(work.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>
        <div class="work-actions">
          <button class="btn-edit-work" data-id="${work.id}">编辑</button>
          <button class="btn-del" data-id="${work.id}">删除</button>
        </div>
      `;
      card.querySelector('.work-thumb').addEventListener('click', () => {
        this.openWork(work.id);
      });
      card.querySelector('.btn-edit-work').addEventListener('click', (e) => {
        e.stopPropagation();
        this.openWork(work.id);
      });
      card.querySelector('.btn-del').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`确定要删除「${work.name}」吗？删除后无法恢复。`)) {
          this.workManager.deleteWork(work.id);
          this.renderWorksList();
          this.updateWorksCount();
          this.showToast('已删除');
        }
      });
      container.appendChild(card);
    });
  }

  openWork(workId) {
    if (!this.engine) {
      this.showToast('3D引擎不可用，请使用支持WebGL的浏览器');
      return;
    }
    const work = this.workManager.getWork(workId);
    if (!work) return;
    this.currentWorkId = work.id;
    this.showPage('page-designer');
    this.engine.fromJSON(work.designData);
    document.getElementById('current-template-name').textContent =
      TEMPLATES.find(t => t.id === work.designData.templateId)?.name || '手串·单圈';
    this.updateDesignerInfo();
    this.updateUndoRedoButtons();
    this.renderBeadList();
  }

  updateWorksCount() {
    document.getElementById('works-count').textContent = this.workManager.getCount();
  }

  // === 页面导航 ===
  showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');

    if (pageId === 'page-designer') {
      setTimeout(() => this.renderer?.resize(), 100);
    }
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
  }

  showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

// 启动应用 - 兼容多种加载时序
function bootstrap() {
  if (window.app) return;
  try {
    window.app = new App();
  } catch (e) {
    console.error('App bootstrap failed:', e);
    // 确保基本UI可见
    const home = document.getElementById('page-home');
    if (home) home.classList.add('active');
    const hero = document.getElementById('hero-canvas');
    if (hero && !hero.innerHTML.trim()) {
      hero.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#8b5e3c;font-size:48px;">📿</div>';
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

// 导入THREE（全局引用，用于首页预览）
import * as THREE from 'three';
window.THREE = THREE;
