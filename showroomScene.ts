import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildCar, Car3DObject } from './carBuilder';
import { loadGLBCar, GLBModelDetails } from './glbCarLoader';
import { CarSpecs } from '../types/game';

export interface ShowroomController {
  container: HTMLDivElement;
  setCar: (specs: CarSpecs) => void;
  reloadCar: (specs: CarSpecs) => void;
  updateCarSpecs: (specs: CarSpecs) => void;
  setCameraPreset: (preset: 'front34' | 'side' | 'rear' | 'top' | 'front') => void;
  fitCameraToCar: () => void;
  rotateModel: (deltaRad: number) => void;
  toggleAutoRotate: () => boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  dispose: () => void;
}

export function initShowroom(
  container: HTMLDivElement,
  initialCarSpecs: CarSpecs,
  onModelStatus?: (status: 'loading' | 'loaded' | 'fallback', error?: string, details?: GLBModelDetails) => void
): ShowroomController {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;
  const isPortrait = height > width;

  // 1. Scene, Camera, Renderer
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x09090b);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  let zoomDistance = isPortrait ? 6.2 : 5.2;
  let cameraPresetDirection = new THREE.Vector3(0.72, 0.32, 0.72).normalize();
  let targetCamPos = cameraPresetDirection.clone().multiplyScalar(zoomDistance);
  const targetLookAt = new THREE.Vector3(0, 0.65, 0);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  container.appendChild(renderer.domElement);

  // 2. Studio Environment Reflection via RoomEnvironment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  pmremGenerator.dispose();

  // 3. Studio Lighting Rig (Balanced Key, Rim, Fill, and Soft Area Lights)
  const keyLight = new THREE.DirectionalLight(0xfffbeb, 3.6);
  keyLight.position.set(6, 8, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 25;
  keyLight.shadow.camera.left = -4.5;
  keyLight.shadow.camera.right = 4.5;
  keyLight.shadow.camera.top = 4.5;
  keyLight.shadow.camera.bottom = -4.5;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
  rimLight.position.set(-6, 6, -6);
  scene.add(rimLight);

  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x18181b, 0.85);
  scene.add(hemiLight);

  // Overhead soft studio floodlight
  const topSpot = new THREE.SpotLight(0xfef08a, 4.2, 16, Math.PI / 4, 0.45, 1.2);
  topSpot.position.set(0, 7.5, 0);
  topSpot.target.position.set(0, 0, 0);
  scene.add(topSpot);
  scene.add(topSpot.target);

  // 4. Luxury Turntable Stage / Showroom Podium
  const podiumGroup = new THREE.Group();

  const plinthGeo = new THREE.CylinderGeometry(4.4, 4.6, 0.22, 64);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.16,
    metalness: 0.88,
  });
  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.y = -0.11;
  plinthMesh.receiveShadow = true;
  podiumGroup.add(plinthMesh);

  // Glowing Neon Ring around turntable
  const ringGeo = new THREE.RingGeometry(4.36, 4.52, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xd97706,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.005;
  podiumGroup.add(ringMesh);

  // Outer showroom floor
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    roughness: 0.75,
    metalness: 0.25,
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = -0.12;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // Showroom pillars
  const pillarGeo = new THREE.BoxGeometry(0.5, 12, 0.5);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8, roughness: 0.3 });
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 3) {
    const px = Math.cos(angle) * 12;
    const pz = Math.sin(angle) * 12;
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, 5, pz);
    scene.add(pillar);
  }

  scene.add(podiumGroup);

  // 5. Current Car Assembly
  let currentCarObject: Car3DObject | null = null;
  const carWrapper = new THREE.Group();
  podiumGroup.add(carWrapper);

  const presets = {
    front34: new THREE.Vector3(0.70, 0.30, 0.70).normalize(),
    side: new THREE.Vector3(1.0, 0.24, 0.0).normalize(),
    rear: new THREE.Vector3(0.55, 0.28, -0.80).normalize(),
    top: new THREE.Vector3(0.02, 0.96, 0.26).normalize(),
    front: new THREE.Vector3(0.0, 0.25, 0.97).normalize(),
  };

  const updateCameraTarget = () => {
    targetCamPos.copy(cameraPresetDirection).multiplyScalar(zoomDistance);
  };

  const fitCameraToCurrentCar = () => {
    if (!currentCarObject) return;
    const box = new THREE.Box3().setFromObject(currentCarObject.group);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    zoomDistance = Math.max(4.5, Math.min(maxDim * (isPortrait ? 1.45 : 1.25), 8.5));
    updateCameraTarget();
  };

  function loadCar(specs: CarSpecs) {
    if (currentCarObject) {
      carWrapper.remove(currentCarObject.group);
      currentCarObject.bodyMaterial.dispose();
      currentCarObject.glassMaterial.dispose();
      currentCarObject.trimMaterial.dispose();
      currentCarObject.rimMaterial.dispose();
      currentCarObject = null;
    }

    if (specs.glbUrl) {
      onModelStatus?.('loading');
      loadGLBCar(
        specs.glbUrl,
        specs,
        undefined,
        (details) => {
          onModelStatus?.('loaded', undefined, details);
        }
      )
        .then((glbCar) => {
          if (currentCarObject) carWrapper.remove(currentCarObject.group);
          currentCarObject = glbCar;
          carWrapper.add(currentCarObject.group);
          ringMat.color.set(specs.color);
          fitCameraToCurrentCar();
          onModelStatus?.('loaded');
        })
        .catch((err) => {
          console.warn('GLB loading failed, falling back to procedural model:', err);
          currentCarObject = buildCar(specs);
          carWrapper.add(currentCarObject.group);
          ringMat.color.set(specs.color);
          fitCameraToCurrentCar();
          onModelStatus?.('fallback', err?.message || 'GLB model not found or invalid format');
        });
      return;
    }

    currentCarObject = buildCar(specs);
    carWrapper.add(currentCarObject.group);
    ringMat.color.set(specs.color);
    fitCameraToCurrentCar();
    onModelStatus?.('loaded');
  }

  loadCar(initialCarSpecs);

  // 6. Camera Orbiting, Drag, and Presets
  let autoRotate = true;

  // Pointer / Touch Drag & Pinch-to-zoom
  let isDragging = false;
  let prevPointerX = 0;
  let prevPointerY = 0;
  let turntableAngle = 0;
  let turntableVelocity = 0;
  let initialPinchDistance = 0;

  const onPointerDown = (e: PointerEvent) => {
    isDragging = true;
    prevPointerX = e.clientX;
    prevPointerY = e.clientY;
    turntableVelocity = 0;
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - prevPointerX;
    const dy = e.clientY - prevPointerY;
    prevPointerX = e.clientX;
    prevPointerY = e.clientY;

    turntableAngle += dx * 0.008;
    turntableVelocity = dx * 0.008;

    // Adjust camera pitch slightly with Y drag
    cameraPresetDirection.y = Math.min(Math.max(cameraPresetDirection.y - dy * 0.002, 0.1), 0.9);
    cameraPresetDirection.normalize();
    updateCameraTarget();
  };

  const onPointerUp = () => {
    isDragging = false;
  };

  // Wheel zoom
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoomDistance = Math.min(Math.max(zoomDistance + e.deltaY * 0.004, 3.5), 8.5);
    updateCameraTarget();
  };

  // Touch pinch-to-zoom
  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);

      if (initialPinchDistance > 0) {
        const diff = initialPinchDistance - dist;
        zoomDistance = Math.min(Math.max(zoomDistance + diff * 0.01, 3.5), 8.5);
        updateCameraTarget();
      }
      initialPinchDistance = dist;
    }
  };

  const onTouchEnd = () => {
    initialPinchDistance = 0;
  };

  const dom = renderer.domElement;
  dom.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  dom.addEventListener('wheel', onWheel, { passive: false });
  dom.addEventListener('touchmove', onTouchMove, { passive: true });
  dom.addEventListener('touchend', onTouchEnd, { passive: true });

  // Window Resize
  const onResize = () => {
    if (!container) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);

  // 7. Animation Loop
  let reqId: number;
  const clock = new THREE.Clock();

  const animate = () => {
    reqId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Turntable Inertia & Auto-Spin
    if (!isDragging) {
      if (autoRotate) {
        turntableAngle += dt * 0.35;
      } else {
        turntableAngle += turntableVelocity;
        turntableVelocity *= 0.92;
      }
    }
    podiumGroup.rotation.y = turntableAngle;

    // Smooth camera damping
    camera.position.lerp(targetCamPos, 0.08);
    camera.lookAt(targetLookAt);

    renderer.render(scene, camera);
  };

  animate();

  return {
    container,
    setCar: (specs: CarSpecs) => {
      loadCar(specs);
    },
    reloadCar: (specs: CarSpecs) => {
      loadCar(specs);
    },
    updateCarSpecs: (specs: CarSpecs) => {
      if (currentCarObject) {
        currentCarObject.updateAppearance(specs);
        ringMat.color.set(specs.color);
      }
    },
    setCameraPreset: (preset: 'front34' | 'side' | 'rear' | 'top' | 'front') => {
      cameraPresetDirection.copy(presets[preset]);
      updateCameraTarget();
    },
    fitCameraToCar: () => {
      fitCameraToCurrentCar();
    },
    rotateModel: (deltaRad: number) => {
      if (currentCarObject) {
        currentCarObject.group.rotation.y += deltaRad;
      }
    },
    toggleAutoRotate: () => {
      autoRotate = !autoRotate;
      return autoRotate;
    },
    zoomIn: () => {
      zoomDistance = Math.max(3.5, zoomDistance - 0.7);
      updateCameraTarget();
    },
    zoomOut: () => {
      zoomDistance = Math.min(8.5, zoomDistance + 0.7);
      updateCameraTarget();
    },
    dispose: () => {
      cancelAnimationFrame(reqId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('touchmove', onTouchMove);
      dom.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    },
  };
}
