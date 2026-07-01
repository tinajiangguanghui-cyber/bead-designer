import * as THREE from 'three';

export class BeadRenderer {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = new THREE.Scene();
    this.beadsGroup = new THREE.Group();
    this.ropeGroup = new THREE.Group();
    this.webglAvailable = true;

    // 相机 - 初始视角正对环形手串正面
    this.camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
    this.camera.position.set(0, 8, 0); // 从正上方俯视
    this.camera.lookAt(0, 0, 0);

    // 渲染器 - 尝试创建WebGL上下文
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      console.warn('WebGL not available, falling back to canvas 2D');
      this.webglAvailable = false;
      this.renderer = null;
      // 显示降级提示
      const fallback = document.createElement('div');
      fallback.className = 'webgl-fallback';
      fallback.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">📿<br>3D渲染需要WebGL支持<br>请使用支持WebGL的浏览器打开</div>';
      this.container.appendChild(fallback);
      return;
    }

    // 光照
    this.setupLights();

    // 场景结构
    this.scene.add(this.ropeGroup);
    this.scene.add(this.beadsGroup);

    // 地面参考（可选展示台）
    this.pedestal = null;

    // 挂载
    if (this.renderer) {
      this.container.appendChild(this.renderer.domElement);
      this.resize();
    // 手势状态
    this.isDragging = false;
    this.previousMouse = { x: 0, y: 0 };
    this.spherical = new THREE.Spherical();
    this.targetSpherical = new THREE.Spherical(8, Math.PI / 6, 0); // 从上方斜角俯视
    this.autoRotate = true;
    this.autoRotateSpeed = 0.3;
      this.setupEvents();
    }

    // 动画循环
    this.clock = new THREE.Clock();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupLights() {
    // 环境光
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // 主光（带阴影）
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.mainLight.position.set(5, 8, 5);
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 1024;
    this.mainLight.shadow.mapSize.height = 1024;
    this.mainLight.shadow.camera.near = 0.5;
    this.mainLight.shadow.camera.far = 50;
    this.mainLight.shadow.bias = -0.0001;
    this.scene.add(this.mainLight);

    // 辅助光
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-3, 2, -3);
    this.scene.add(fill);

    // 背光
    const back = new THREE.DirectionalLight(0xffffff, 0.3);
    back.position.set(0, 1, -5);
    this.scene.add(back);
  }

  resize() {
    if (!this.renderer) return;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || 400;
    const h = rect.height || 500;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(h, 1);
    this.camera.updateProjectionMatrix();
  }

  setupEvents() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.previousMouse.x;
      const dy = e.clientY - this.previousMouse.y;
      this.targetSpherical.theta -= dx * 0.008;
      this.targetSpherical.phi -= dy * 0.008;
      this.targetSpherical.phi = Math.max(0.3, Math.min(Math.PI / 2, this.targetSpherical.phi));
      this.previousMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      setTimeout(() => { if (!this.isDragging) this.autoRotate = true; }, 2000);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetSpherical.radius += e.deltaY * 0.01;
      this.targetSpherical.radius = Math.max(4, Math.min(25, this.targetSpherical.radius));
      this.autoRotate = false;
      setTimeout(() => { if (!this.isDragging) this.autoRotate = true; }, 2000);
    }, { passive: false });

    // 双击重置
    canvas.addEventListener('dblclick', () => {
      this.targetSpherical.set(12, Math.PI / 3, 0);
      this.autoRotate = true;
    });

    window.addEventListener('resize', () => this.resize());
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (!this.renderer) return;

    if (this.autoRotate && !this.isDragging) {
      this.targetSpherical.theta += this.autoRotateSpeed * 0.01;
    }

    // 平滑插值
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * 0.1;
    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * 0.1;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * 0.1;

    const pos = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(pos);
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  // 清除所有珠子和串绳
  clear() {
    while (this.beadsGroup.children.length > 0) {
      const child = this.beadsGroup.children[0];
      this.disposeMesh(child);
      this.beadsGroup.remove(child);
    }
    while (this.ropeGroup.children.length > 0) {
      const child = this.ropeGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.ropeGroup.remove(child);
    }
  }

  disposeMesh(obj) {
    obj.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  // 创建串绳
  createRope(curvePoints, radius = 0.15, color = 0x8b7355) {
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeom = new THREE.TubeGeometry(curve, 128, radius, 16, true);
    const tubeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
    const tube = new THREE.Mesh(tubeGeom, tubeMat);
    tube.castShadow = true;
    tube.receiveShadow = true;
    return { mesh: tube, curve };
  }

  // 创建珠子3D模型
  createBeadMesh(beadData, size) {
    const group = new THREE.Group();
    const matParams = this.getMaterialParams(beadData.material, beadData.color, size);

    let geometry;
    const s = size / 2;

    switch (beadData.shape) {
      case 'round':
        geometry = new THREE.SphereGeometry(s, 48, 48);
        break;
      case 'barrel':
        geometry = new THREE.CylinderGeometry(s * 0.7, s * 0.7, s * 1.6, 32);
        break;
      case 'abacus':
        // 算盘珠：扁圆形
        geometry = new THREE.SphereGeometry(s, 40, 20);
        geometry.scale(1, 0.5, 1);
        break;
      case 'carving':
        // 雕刻件：八角柱
        geometry = new THREE.CylinderGeometry(s * 0.8, s * 0.8, s * 1.5, 8);
        break;
      case 'spacer':
        // 隔片：薄圆盘
        geometry = new THREE.CylinderGeometry(s * 0.9, s * 0.9, s * 0.35, 32);
        break;
      default:
        geometry = new THREE.SphereGeometry(s, 32, 32);
    }

    const material = new THREE.MeshStandardMaterial(matParams);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // 打孔效果（小圆柱体切除模拟）
    const holeGeom = new THREE.CylinderGeometry(s * 0.2, s * 0.2, s * 2.5, 16);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const hole = new THREE.Mesh(holeGeom, holeMat);
    hole.rotation.x = Math.PI / 2;
    group.add(hole);

    group.add(mesh);
    group.userData = { beadData, size, mainMesh: mesh };

    return group;
  }

  getMaterialParams(material, colorKey, size) {
    const colorHex = this.getColorHex(colorKey);
    const base = {
      color: new THREE.Color(colorHex),
      roughness: 0.3,
      metalness: 0.0,
    };

    switch (material) {
      case 'crystal':
        return {
          ...base,
          roughness: 0.12,
          metalness: 0.03,
          transparent: true,
          opacity: 0.82,
          envMapIntensity: 0.6,
        };
      case 'jade':
        return {
          ...base,
          roughness: 0.35,
          metalness: 0.0,
          envMapIntensity: 0.2,
        };
      case 'wood':
        return {
          ...base,
          roughness: 0.75,
          metalness: 0.0,
          color: new THREE.Color(colorHex).multiplyScalar(0.9),
        };
      case 'metal':
        return {
          ...base,
          roughness: 0.2,
          metalness: 0.95,
          envMapIntensity: 1.0,
          color: new THREE.Color(colorHex),
        };
      case 'ceramic':
        return {
          ...base,
          roughness: 0.45,
          metalness: 0.02,
          envMapIntensity: 0.3,
        };
      default:
        return base;
    }
  }

  getColorHex(colorKey) {
    const map = {
      red: '#c0392b', orange: '#e67e22', yellow: '#f1c40f', green: '#27ae60',
      blue: '#2980b9', purple: '#8e44ad', white: '#ecf0f1', black: '#2c3e50',
      pink: '#e8a0bf', brown: '#8b5e3c', teal: '#1abc9c',
      gold: '#f0c040', silver: '#c0c0c0', rosegold: '#e8b4b8'
    };
    return map[colorKey] || '#cccccc';
  }

  // 设置背景
  setBackground(type) {
    switch (type) {
      case 'transparent':
        this.renderer.setClearColor(0x000000, 0);
        this.scene.background = null;
        break;
      case 'white':
        this.scene.background = new THREE.Color(0xffffff);
        break;
      case 'gradient':
        this.scene.background = new THREE.Color(0xfdf6f0);
        break;
    }
  }

  // 设置展示台
  setPedestal(visible) {
    if (visible && !this.pedestal) {
      const geom = new THREE.CylinderGeometry(2.5, 3, 0.3, 48);
      const mat = new THREE.MeshStandardMaterial({ color: 0xe8d5c4, roughness: 0.5, metalness: 0.1 });
      this.pedestal = new THREE.Mesh(geom, mat);
      this.pedestal.position.y = -2;
      this.pedestal.receiveShadow = true;
      this.scene.add(this.pedestal);
    } else if (!visible && this.pedestal) {
      this.scene.remove(this.pedestal);
      this.pedestal.geometry.dispose();
      this.pedestal.material.dispose();
      this.pedestal = null;
    }
  }

  // 导出图片
  exportImage(bgType, format) {
    if (!this.renderer) return '';
    this.autoRotate = false;
    this.targetSpherical.theta = 0;
    this.spherical.theta = 0;
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL(`image/${format === 'png' ? 'png' : 'jpeg'}`, 0.95);
    return dataURL;
  }

  resetView() {
    this.targetSpherical.set(12, Math.PI / 3, 0);
    this.autoRotate = true;
  }
}
