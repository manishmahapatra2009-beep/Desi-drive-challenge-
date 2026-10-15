import * as THREE from 'three';
import { TrackId, TrackInfo } from '../types/game';

export interface CoinPickup {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  position: THREE.Vector3;
  collected: boolean;
  value: number;
}

export interface NitroPickup {
  group: THREE.Group;
  position: THREE.Vector3;
  collected: boolean;
  respawnTime: number;
}

export interface CheckpointGate {
  group: THREE.Group;
  distanceAlongTrack: number;
  position: THREE.Vector3;
  passed: boolean;
}

export interface TrackData {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  trackLength: number;
  roadWidth: number;
  coins: CoinPickup[];
  nitroPickups: NitroPickup[];
  checkpoints: CheckpointGate[];
  speedTraps: { position: THREE.Vector3; flashed: boolean }[];
  sceneryElements: THREE.Object3D[];
  update: (dt: number, time: number) => void;
  dispose: () => void;
}

// Procedural road asphalt texture
function createRoadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = '#1c1c20';
  ctx.fillRect(0, 0, 512, 1024);

  // Subtle noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 1024;
    ctx.fillStyle = Math.random() > 0.5 ? '#27272a' : '#141416';
    ctx.fillRect(x, y, 2, 2);
  }

  // Left and right solid white edge lines
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(24, 0, 8, 1024);
  ctx.fillRect(512 - 32, 0, 8, 1024);

  // Center dashed yellow lane dividers
  ctx.fillStyle = '#eab308';
  for (let y = 0; y < 1024; y += 80) {
    ctx.fillRect(252, y, 8, 48);
  }

  // Desi decorative kerb patterns (Red & White alternating shoulders)
  for (let y = 0; y < 1024; y += 40) {
    ctx.fillStyle = Math.floor(y / 40) % 2 === 0 ? '#ef4444' : '#ffffff';
    ctx.fillRect(0, y, 16, 40);
    ctx.fillRect(512 - 16, y, 16, 40);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 40);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildTrack(trackInfo: TrackInfo): TrackData {
  const trackGroup = new THREE.Group();
  const roadWidth = 14;

  // 1. Generate Track Spline Path based on track type
  const points: THREE.Vector3[] = [];
  const trackId = trackInfo.id;

  if (trackId === 'marine_drive') {
    // Coastal sweep along sea with flyover elevation and seaside bends
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(40, 0, 200));
    points.push(new THREE.Vector3(120, 2, 450));
    points.push(new THREE.Vector3(260, 6, 700)); // Sea flyover arch
    points.push(new THREE.Vector3(340, 6, 950));
    points.push(new THREE.Vector3(280, 2, 1250));
    points.push(new THREE.Vector3(160, 0, 1550));
    points.push(new THREE.Vector3(40, 0, 1850));
    points.push(new THREE.Vector3(-120, 0, 2150));
    points.push(new THREE.Vector3(-220, 0, 2450));
    points.push(new THREE.Vector3(-150, 0, 2750));
    points.push(new THREE.Vector3(0, 0, 3100));
  } else if (trackId === 'western_ghats') {
    // Mountain serpent passes with steep hairpins and cliff drops
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(80, 5, 200));
    points.push(new THREE.Vector3(180, 12, 400));
    points.push(new THREE.Vector3(260, 18, 650));
    points.push(new THREE.Vector3(140, 24, 900)); // Hairpin 1
    points.push(new THREE.Vector3(-80, 28, 1150));
    points.push(new THREE.Vector3(-220, 32, 1400)); // Hairpin 2
    points.push(new THREE.Vector3(-180, 26, 1750));
    points.push(new THREE.Vector3(-40, 18, 2100)); // Tunnel descent
    points.push(new THREE.Vector3(120, 10, 2450));
    points.push(new THREE.Vector3(200, 4, 2800));
    points.push(new THREE.Vector3(50, 0, 3300));
    points.push(new THREE.Vector3(0, 0, 3700));
  } else {
    // Thar desert grand expressway: wide, hyper-fast straights with gentle dunes
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(30, 0, 350));
    points.push(new THREE.Vector3(90, 4, 800));
    points.push(new THREE.Vector3(40, 8, 1300));
    points.push(new THREE.Vector3(-60, 4, 1850));
    points.push(new THREE.Vector3(-120, 0, 2400));
    points.push(new THREE.Vector3(-60, 0, 3000));
    points.push(new THREE.Vector3(60, 3, 3650));
    points.push(new THREE.Vector3(120, 6, 4200));
    points.push(new THREE.Vector3(0, 0, 4800));
  }

  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const trackLength = curve.getLength();

  // 2. Generate Road Mesh along Curve
  const segments = 280;
  const roadTex = createRoadTexture();
  roadTex.repeat.set(1, segments * 0.25);

  const roadMaterial = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: 0.65,
    metalness: 0.2,
  });

  const roadGeometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const normals: number[] = [];

  const halfW = roadWidth / 2;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Left vertex
    positions.push(pt.x + normal.x * halfW, pt.y + 0.05, pt.z + normal.z * halfW);
    uvs.push(0, t * segments * 0.25);
    normals.push(0, 1, 0);

    // Right vertex
    positions.push(pt.x - normal.x * halfW, pt.y + 0.05, pt.z - normal.z * halfW);
    uvs.push(1, t * segments * 0.25);
    normals.push(0, 1, 0);
  }

  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const p1 = i * 2;
    const p2 = i * 2 + 1;
    const p3 = (i + 1) * 2;
    const p4 = (i + 1) * 2 + 1;

    indices.push(p1, p3, p2);
    indices.push(p2, p3, p4);
  }

  roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  roadGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  roadGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  roadGeometry.setIndex(indices);
  roadGeometry.computeVertexNormals();

  const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
  roadMesh.receiveShadow = true;
  trackGroup.add(roadMesh);

  // 3. Terrain Base (Extended beyond playable area to avoid rectangular wall floating in void)
  const terrainGeo = new THREE.PlaneGeometry(3500, 5500, 32, 32);
  const terrainMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(trackInfo.groundColor),
    roughness: 0.9,
    metalness: 0.1,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.rotation.x = -Math.PI / 2;
  terrainMesh.position.set(0, -0.05, trackLength * 0.45);
  terrainMesh.receiveShadow = true;
  trackGroup.add(terrainMesh);

  // 4. Guard Rails / Barriers along the road
  const railGeo = new THREE.BoxGeometry(0.3, 0.7, 4.0);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
  const barrierCount = Math.floor(segments / 2);
  const railMeshL = new THREE.InstancedMesh(railGeo, railMat, barrierCount);
  const railMeshR = new THREE.InstancedMesh(railGeo, railMat, barrierCount);

  const _matrix = new THREE.Matrix4();
  const _dummy = new THREE.Object3D();

  for (let i = 0; i < barrierCount; i++) {
    const t = (i * 2) / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    _dummy.position.set(pt.x + normal.x * (halfW + 0.3), pt.y + 0.35, pt.z + normal.z * (halfW + 0.3));
    _dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    _dummy.updateMatrix();
    railMeshL.setMatrixAt(i, _dummy.matrix);

    _dummy.position.set(pt.x - normal.x * (halfW + 0.3), pt.y + 0.35, pt.z - normal.z * (halfW + 0.3));
    _dummy.updateMatrix();
    railMeshR.setMatrixAt(i, _dummy.matrix);
  }

  railMeshL.computeBoundingSphere();
  railMeshR.computeBoundingSphere();
  trackGroup.add(railMeshL, railMeshR);

  // 5. Procedural Scenery Elements
  const sceneryElements: THREE.Object3D[] = [];

  if (trackId === 'marine_drive') {
    // Mumbai Skyline Buildings in distant backdrop
    const bldgMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 });
    for (let i = 0; i < 40; i++) {
      const bh = 40 + Math.random() * 80;
      const bw = 25 + Math.random() * 30;
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), bldgMat);
      bldg.position.set(-220 - Math.random() * 180, bh * 0.5, i * 85);
      trackGroup.add(bldg);
      sceneryElements.push(bldg);

      // Window grid glow
      const winGeo = new THREE.PlaneGeometry(bw * 0.8, bh * 0.7);
      const winMat = new THREE.MeshBasicMaterial({ color: Math.random() > 0.4 ? 0x06b6d4 : 0xf59e0b, opacity: 0.4, transparent: true });
      const winMesh = new THREE.Mesh(winGeo, winMat);
      winMesh.position.set(bldg.position.x + bw * 0.51, bh * 0.5, bldg.position.z);
      winMesh.rotation.y = Math.PI / 2;
      trackGroup.add(winMesh);
    }

    // Sea Water on right side
    const waterGeo = new THREE.PlaneGeometry(600, 3600);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.1,
      metalness: 0.85,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(380, -0.6, 1600);
    trackGroup.add(water);

    // Decorative Streetlights
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 6, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    for (let i = 0; i < segments; i += 8) {
      const t = i / segments;
      const pt = curve.getPointAt(t);
      const normal = new THREE.Vector3().crossVectors(curve.getTangentAt(t).normalize(), new THREE.Vector3(0, 1, 0)).normalize();
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(pt.x + normal.x * (halfW + 1.2), pt.y + 3, pt.z + normal.z * (halfW + 1.2));
      trackGroup.add(pole);

      // Glowing street light bulb
      const lampBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      lampBulb.position.set(pole.position.x, pole.position.y + 2.8, pole.position.z);
      trackGroup.add(lampBulb);
    }
  } else if (trackId === 'western_ghats') {
    // Lush Mountain peaks & cliffs
    const peakGeo = new THREE.ConeGeometry(70, 90, 8);
    const peakMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.9 });
    for (let i = 0; i < 28; i++) {
      const peak = new THREE.Mesh(peakGeo, peakMat);
      const side = i % 2 === 0 ? 1 : -1;
      const t = i / 28;
      const pt = curve.getPointAt(t);
      peak.position.set(pt.x + side * (120 + Math.random() * 60), 45, pt.z);
      trackGroup.add(peak);
    }

    // Tunnel Archway
    const tunnelGroup = new THREE.Group();
    const archGeo = new THREE.TorusGeometry(12, 3, 8, 24, Math.PI);
    const tunnelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    for (let k = 0; k < 12; k++) {
      const arch = new THREE.Mesh(archGeo, tunnelMat);
      arch.position.set(0, 0, k * 8);
      tunnelGroup.add(arch);
    }
    const tunnelT = 0.58;
    const tunnelPos = curve.getPointAt(tunnelT);
    tunnelGroup.position.copy(tunnelPos);
    tunnelGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(tunnelT).normalize());
    trackGroup.add(tunnelGroup);
  } else {
    // Thar Desert Wind Turbines & Golden Dunes
    const duneGeo = new THREE.SphereGeometry(60, 12, 8);
    duneGeo.scale(1.5, 0.3, 1.5);
    const duneMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.95 });
    for (let i = 0; i < 35; i++) {
      const dune = new THREE.Mesh(duneGeo, duneMat);
      const t = i / 35;
      const pt = curve.getPointAt(t);
      const side = (i % 2 === 0 ? 1 : -1) * (110 + Math.random() * 80);
      dune.position.set(pt.x + side, 5, pt.z);
      trackGroup.add(dune);
    }

    // Wind Turbines
    const towerGeo = new THREE.CylinderGeometry(0.5, 1.2, 35, 8);
    const turbMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, metalness: 0.6 });
    for (let i = 0; i < 15; i++) {
      const turbine = new THREE.Group();
      const tower = new THREE.Mesh(towerGeo, turbMat);
      tower.position.y = 17.5;
      turbine.add(tower);

      const blades = new THREE.Group();
      blades.position.y = 35;
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.3, 12, 0.05), turbMat);
        blade.position.y = 6;
        blade.rotation.z = (b * Math.PI * 2) / 3;
        blades.add(blade);
      }
      blades.name = 'blades';
      turbine.add(blades);

      const t = i / 15;
      const pt = curve.getPointAt(t);
      turbine.position.set(pt.x + 180, 0, pt.z);
      trackGroup.add(turbine);
      sceneryElements.push(turbine);
    }
  }

  // 6. Collectible 3D Gold Coins
  const coins: CoinPickup[] = [];
  const coinGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 24);
  coinGeo.rotateX(Math.PI / 2);
  const coinMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.95,
    roughness: 0.15,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
  });

  const haloGeo = new THREE.RingGeometry(0.65, 0.8, 16);
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.6,
  });

  // Distribute 60 coins along track lanes
  for (let i = 2; i < segments - 2; i += 4) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    // Vary lane: left (-3.5), center (0), right (3.5)
    const laneOffset = ((i % 3) - 1) * 3.5;
    const pos = new THREE.Vector3(
      pt.x + normal.x * laneOffset,
      pt.y + 0.8,
      pt.z + normal.z * laneOffset
    );

    const coinMesh = new THREE.Mesh(coinGeo, coinMat);
    coinMesh.position.copy(pos);
    trackGroup.add(coinMesh);

    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(pos);
    trackGroup.add(haloMesh);

    coins.push({
      mesh: coinMesh,
      halo: haloMesh,
      position: pos,
      collected: false,
      value: 25,
    });
  }

  // 7. Nitro Boost Canister Pickups
  const nitroPickups: NitroPickup[] = [];
  const nitroCylinderGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16);
  const nitroMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    metalness: 0.8,
  });

  for (let i = 10; i < segments - 10; i += 22) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const nitroGrp = new THREE.Group();
    const nitroBottle = new THREE.Mesh(nitroCylinderGeo, nitroMat);
    nitroGrp.add(nitroBottle);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ring.rotation.x = Math.PI / 2;
    nitroGrp.add(ring);

    nitroGrp.position.set(pt.x, pt.y + 0.9, pt.z);
    trackGroup.add(nitroGrp);

    nitroPickups.push({
      group: nitroGrp,
      position: nitroGrp.position,
      collected: false,
      respawnTime: 0,
    });
  }

  // 8. Checkpoint Gate Arches
  const checkpoints: CheckpointGate[] = [];
  const checkpointDistances = [0.25, 0.5, 0.75, 1.0]; // 4 checkpoints
  const archFrameGeo = new THREE.BoxGeometry(roadWidth + 4, 0.8, 1.2);
  const pillarFrameGeo = new THREE.BoxGeometry(0.8, 6.5, 1.2);
  const gateMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 });

  checkpointDistances.forEach((fraction, idx) => {
    const pt = curve.getPointAt(fraction);
    const tangent = curve.getTangentAt(fraction).normalize();
    const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

    const gateGroup = new THREE.Group();

    // Top beam
    const beam = new THREE.Mesh(archFrameGeo, gateMat);
    beam.position.y = 5.8;
    gateGroup.add(beam);

    // Left pillar
    const pilL = new THREE.Mesh(pillarFrameGeo, gateMat);
    pilL.position.set((roadWidth + 3.2) * 0.5, 3.2, 0);
    // Right pillar
    const pilR = new THREE.Mesh(pillarFrameGeo, gateMat);
    pilR.position.set(-(roadWidth + 3.2) * 0.5, 3.2, 0);
    gateGroup.add(pilL, pilR);

    // Glowing Banner
    const isFinish = idx === checkpointDistances.length - 1;
    const bannerMat = new THREE.MeshBasicMaterial({
      color: isFinish ? 0x22c55e : 0xf59e0b,
      side: THREE.DoubleSide,
    });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth * 0.75, 1.4), bannerMat);
    banner.position.set(0, 5.5, 0);
    gateGroup.add(banner);

    gateGroup.position.copy(pt);
    gateGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    trackGroup.add(gateGroup);

    checkpoints.push({
      group: gateGroup,
      distanceAlongTrack: fraction * trackLength,
      position: pt,
      passed: false,
    });
  });

  // 9. Speed Traps
  const speedTraps = [
    { position: curve.getPointAt(0.35), flashed: false },
    { position: curve.getPointAt(0.7), flashed: false },
  ];

  const update = (dt: number, time: number) => {
    // Spin coins
    for (const c of coins) {
      if (!c.collected) {
        c.mesh.rotation.z += dt * 3.5;
        c.halo.rotation.z -= dt * 2.5;
        c.mesh.position.y = c.position.y + Math.sin(time * 3 + c.position.x) * 0.12;
        c.halo.position.y = c.mesh.position.y;
      }
    }

    // Spin nitro pickups
    for (const n of nitroPickups) {
      if (!n.collected) {
        n.group.rotation.y += dt * 2.8;
        n.group.position.y = n.position.y + Math.sin(time * 4) * 0.15;
      } else {
        n.respawnTime -= dt;
        if (n.respawnTime <= 0) {
          n.collected = false;
          n.group.visible = true;
        }
      }
    }

    // Rotate wind turbine blades if in desert
    for (const elem of sceneryElements) {
      const blades = elem.getObjectByName('blades');
      if (blades) {
        blades.rotation.z += dt * 1.5;
      }
    }
  };

  const dispose = () => {
    roadGeometry.dispose();
    roadMaterial.dispose();
    terrainGeo.dispose();
    terrainMat.dispose();
    railGeo.dispose();
    railMat.dispose();
    railMeshL.dispose();
    railMeshR.dispose();
  };

  return {
    group: trackGroup,
    curve,
    trackLength,
    roadWidth,
    coins,
    nitroPickups,
    checkpoints,
    speedTraps,
    sceneryElements,
    update,
    dispose,
  };
}
