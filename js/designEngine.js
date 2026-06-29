import * as THREE from 'three';
import { BEAD_LIBRARY, BEAD_MATERIALS, BEAD_COLORS, TEMPLATES } from './beadData.js';

export class DesignEngine {
  constructor(renderer) {
    this.renderer = renderer;
    this.template = TEMPLATES[0];
    this.beads = []; // { beadDef, size, color }
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndo = 30;

    this.ropeMesh = null;
    this.beadMeshes = [];

    // 当前选中的珠子索引
    this.selectedBeadIndex = -1;
  }

  // === 模板管理 ===
  setTemplate(templateId) {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    this.template = tpl;
    this.clearBeads();
    this.renderer.clear();
    this.rebuildRope();
    this.renderer.resetView();
    this.undoStack = [];
    this.redoStack = [];
  }

  // === 串绳重建 ===
  rebuildRope() {
    const points = this.getRopeCurvePoints();
    const result = this.renderer.createRope(points, 0.12, 0x6b5b4a);
    this.ropeMesh = result.mesh;
    this.ropeCurve = result.curve;
    this.renderer.ropeGroup.add(result.mesh);
  }

  getRopeCurvePoints() {
    const { ropeType, ropeCount, defaultLength } = this.template;
    const points = [];
    const R = defaultLength / (2 * Math.PI); // 圆形半径

    switch (ropeType) {
      case 'circle': {
        const segments = 128;
        const r = R;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
        }
        break;
      }
      case 'uShape': {
        const totalLen = defaultLength;
        const halfLen = totalLen / 2;
        const dropLen = totalLen * 0.25;
        const segments = 100;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          let x, y, z;
          if (t < 0.15) {
            const tt = t / 0.15;
            x = -halfLen + tt * halfLen * 0.5;
            y = -tt * dropLen * 0.5;
            z = -tt * 1;
          } else if (t < 0.85) {
            const tt = (t - 0.15) / 0.7;
            const angle = Math.PI * tt;
            x = -halfLen * 0.5 + halfLen * 0.5 * (1 - Math.cos(angle));
            y = -dropLen * 0.5 - dropLen * Math.sin(angle) * 0.8;
            z = -1 + Math.sin(angle) * 0.5;
          } else {
            const tt = (t - 0.85) / 0.15;
            x = -halfLen * 0.5 + halfLen * (1 - tt * 0.5);
            y = -dropLen * 0.5 + tt * dropLen * 0.5;
            z = -1 + 0.5 - tt * 0.5;
          }
          points.push(new THREE.Vector3(x, y, z));
        }
        break;
      }
      case 'straight': {
        const segments = 80;
        const totalLen = defaultLength;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          points.push(new THREE.Vector3(0, totalLen * (0.5 - t), 0));
        }
        break;
      }
      case 'straight_hook': {
        const segments = 100;
        const totalLen = defaultLength;
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          let x = 0, y, z = 0;
          if (t < 0.1) {
            y = totalLen * (0.5 - t * totalLen * 0.1 / totalLen);
            // 挂钩环
            const angle = t / 0.1 * Math.PI * 2;
            x = Math.cos(angle) * totalLen * 0.06;
            z = Math.sin(angle) * totalLen * 0.06;
          } else {
            const tt = (t - 0.1) / 0.9;
            y = totalLen * (0.5 - 0.1) - tt * totalLen * 0.8;
          }
          points.push(new THREE.Vector3(x, y, z));
        }
        break;
      }
      default: {
        for (let i = 0; i <= 64; i++) {
          const angle = (i / 64) * Math.PI * 2;
          points.push(new THREE.Vector3(Math.cos(angle) * R, 0, Math.sin(angle) * R));
        }
      }
    }
    return points;
  }

  // === 珠子操作 ===
  addBead(beadDef, size = null) {
    const s = size || beadDef.defaultSize;
    const bead = { beadDef, size: s, color: beadDef.color };
    this.pushUndo({ type: 'add', index: this.beads.length });
    this.beads.push(bead);
    this.redoStack = [];
    this.rebuildAllBeads();
  }

  removeBead(index) {
    if (index < 0 || index >= this.beads.length) return;
    const removed = this.beads[index];
    this.pushUndo({ type: 'remove', index, bead: removed });
    this.beads.splice(index, 1);
    this.redoStack = [];
    if (this.selectedBeadIndex === index) this.selectedBeadIndex = -1;
    if (this.selectedBeadIndex > index) this.selectedBeadIndex--;
    this.rebuildAllBeads();
  }

  moveBead(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= this.beads.length) return;
    if (toIndex < 0 || toIndex >= this.beads.length) return;
    this.pushUndo({ type: 'move', from: fromIndex, to: toIndex });
    const [bead] = this.beads.splice(fromIndex, 1);
    this.beads.splice(toIndex, 0, bead);
    this.redoStack = [];
    if (this.selectedBeadIndex === fromIndex) this.selectedBeadIndex = toIndex;
    this.rebuildAllBeads();
  }

  updateBeadSize(index, size) {
    if (index < 0 || index >= this.beads.length) return;
    const oldSize = this.beads[index].size;
    if (oldSize === size) return;
    this.pushUndo({ type: 'edit', index, field: 'size', oldValue: oldSize, newValue: size });
    this.beads[index].size = size;
    this.redoStack = [];
    this.rebuildAllBeads();
  }

  updateBeadColor(index, color) {
    if (index < 0 || index >= this.beads.length) return;
    const oldColor = this.beads[index].color;
    if (oldColor === color) return;
    this.pushUndo({ type: 'edit', index, field: 'color', oldValue: oldColor, newValue: color });
    this.beads[index].color = color;
    this.redoStack = [];
    this.rebuildAllBeads();
  }

  clearBeads() {
    this.beads = [];
    this.beadMeshes = [];
    this.renderer.clear();
    this.selectedBeadIndex = -1;
  }

  // 重建所有珠子3D模型
  rebuildAllBeads() {
    // 清除旧模型
    this.renderer.clear();
    this.beadMeshes = [];

    if (this.beads.length === 0) {
      this.rebuildRope();
      return;
    }

    // 获取曲线采样点
    const points = this.getRopeCurvePoints();
    const curve = new THREE.CatmullRomCurve3(points);
    this.ropeCurve = curve;

    // 计算珠子在曲线上的位置
    const totalBeads = this.beads.length;
    const curveLength = curve.getLength();

    // 为每颗珠子计算曲线位置
    for (let i = 0; i < totalBeads; i++) {
      const bead = this.beads[i];
      const t = totalBeads > 1 ? i / (totalBeads - 1) : 0.5;
      // 使用弧长参数化
      const point = curve.getPointAt(Math.max(0.01, Math.min(0.99, t)));
      const tangent = curve.getTangentAt(Math.max(0.01, Math.min(0.99, t)));

      const mesh = this.renderer.createBeadMesh(
        { ...bead.beadDef, color: bead.color },
        bead.size
      );
      mesh.position.copy(point);

      // 使珠子朝向切线方向
      const quaternion = new THREE.Quaternion();
      const up = new THREE.Vector3(0, 1, 0);
      quaternion.setFromUnitVectors(up, tangent.normalize());
      mesh.setRotationFromQuaternion(quaternion);

      this.renderer.beadsGroup.add(mesh);
      this.beadMeshes.push(mesh);
    }

    // 重建串绳
    this.renderer.ropeGroup.clear();
    const ropeResult = this.renderer.createRope(points, 0.12, 0x6b5b4a);
    this.ropeMesh = ropeResult.mesh;
    this.renderer.ropeGroup.add(ropeResult.mesh);
  }

  // 高亮选中的珠子
  highlightBead(index) {
    this.beadMeshes.forEach((mesh, i) => {
      if (mesh.userData.mainMesh) {
        const emissive = i === index ? 0x333333 : 0x000000;
        mesh.userData.mainMesh.material.emissive = new THREE.Color(emissive);
        mesh.userData.mainMesh.material.emissiveIntensity = i === index ? 0.4 : 0;
      }
    });
    this.selectedBeadIndex = index;
  }

  // === 撤销重做 ===
  pushUndo(action) {
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxUndo) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    const action = this.undoStack.pop();
    this.redoStack.push(action);

    switch (action.type) {
      case 'add':
        this.beads.splice(action.index, 1);
        break;
      case 'remove':
        this.beads.splice(action.index, 0, action.bead);
        break;
      case 'move':
        const [bead] = this.beads.splice(action.to, 1);
        this.beads.splice(action.from, 0, bead);
        break;
      case 'edit':
        this.beads[action.index][action.field] = action.oldValue;
        break;
    }
    this.rebuildAllBeads();
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    const action = this.redoStack.pop();
    this.undoStack.push(action);

    switch (action.type) {
      case 'add':
        this.beads.splice(action.index, 0, action.bead || { beadDef: BEAD_LIBRARY[0], size: 8, color: 'white' });
        break;
      case 'remove':
        this.beads.splice(action.index, 1);
        break;
      case 'move':
        const [bead] = this.beads.splice(action.from, 1);
        this.beads.splice(action.to, 0, bead);
        break;
      case 'edit':
        this.beads[action.index][action.field] = action.newValue;
        break;
    }
    this.rebuildAllBeads();
    return true;
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  // === 统计信息 ===
  getTotalLength() {
    let total = 0;
    this.beads.forEach(b => { total += b.size; });
    // 加上珠子间隙（约0.5mm/颗）
    total += this.beads.length * 0.5;
    return Math.round(total);
  }

  getBeadCount() { return this.beads.length; }

  // === 序列化 ===
  toJSON() {
    return {
      templateId: this.template.id,
      beads: this.beads.map(b => ({
        beadId: b.beadDef.id,
        size: b.size,
        color: b.color
      }))
    };
  }

  fromJSON(json) {
    this.template = TEMPLATES.find(t => t.id === json.templateId) || TEMPLATES[0];
    this.beads = json.beads.map(b => {
      const def = BEAD_LIBRARY.find(d => d.id === b.beadId);
      return def ? { beadDef: def, size: b.size, color: b.color } : null;
    }).filter(Boolean);
    this.undoStack = [];
    this.redoStack = [];
    this.rebuildAllBeads();
  }
}
