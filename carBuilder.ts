import * as THREE from 'three';
import { CarSpecs, SpoilerType } from '../types/game';

export interface Car3DObject {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  bodyMaterial: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  trimMaterial: THREE.MeshStandardMaterial;
  glassMaterial: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial;
  rimMaterial: THREE.MeshStandardMaterial;
  spoilerGroup: THREE.Group;
  underglowLight: THREE.PointLight;
  underglowMesh: THREE.Mesh;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  headlights: THREE.SpotLight[];
  taillightMeshes: THREE.Mesh[];
  exhaustPipes: THREE.Vector3[];
  updateAppearance: (specs: CarSpecs) => void;
  updateWheels: (steerAngle: number, wheelRotation: number) => void;
  setBraking: (braking: boolean) => void;
  setUnderglowVisible: (visible: boolean) => void;
}

// Procedural Honeycomb Grille Texture
function createHoneycombTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#27272a';
  ctx.lineWidth = 2.5;

  const hexRadius = 8;
  const hexHeight = Math.sqrt(3) * hexRadius;
  for (let y = 0; y < 140; y += hexHeight) {
    for (let x = 0; x < 140; x += hexRadius * 3) {
      drawHex(ctx, x, y, hexRadius);
      drawHex(ctx, x + hexRadius * 1.5, y + hexHeight / 2, hexRadius);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawHex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + r * Math.cos(angle);
    const hy = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();
}

// Procedural Carbon Fiber Texture
function createCarbonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#111113';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#222226';
  for (let y = 0; y < 64; y += 4) {
    for (let x = 0; x < 64; x += 4) {
      if ((x + y) % 8 === 0) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Desi License Plate Texture ("MH 01 DESI")
function createLicensePlateTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 256, 64);
  
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 252, 60);
  
  ctx.fillStyle = '#1D4ED8';
  ctx.fillRect(4, 4, 34, 56);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IND', 21, 36);

  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(21, 46, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 26px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MH 01 DESI', 145, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const honeycombTexture = createHoneycombTexture();
const carbonTexture = createCarbonTexture();
const licensePlateTexture = createLicensePlateTexture();

/**
 * Builds realistic sports car wheel assembly:
 * - Rounded profile performance rubber tire with sidewall grooves
 * - Deep alloy rim with styled spokes and polished barrel
 * - Center hub with chrome lug nuts
 * - Cross-drilled steel brake disc rotor
 * - Red Brembo-style brake caliper
 */
function createRealisticWheel(rimMaterial: THREE.MeshStandardMaterial): THREE.Group {
  const wheelGroup = new THREE.Group();

  // 1. Tire Rubber with rounded profile
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.88,
    metalness: 0.08,
  });

  const tireWidth = 0.30;
  const outerRadius = 0.36;
  const innerRadius = 0.23;

  // Main tire body
  const tireGeo = new THREE.CylinderGeometry(outerRadius, outerRadius, tireWidth, 32);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMesh = new THREE.Mesh(tireGeo, tireMat);
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  wheelGroup.add(tireMesh);

  // Tire sidewall bevels (left and right rounded edges)
  const sidewallGeo = new THREE.TorusGeometry(outerRadius - 0.03, 0.035, 12, 32);
  sidewallGeo.rotateY(Math.PI / 2);
  const swLeft = new THREE.Mesh(sidewallGeo, tireMat);
  swLeft.position.x = tireWidth * 0.45;
  const swRight = swLeft.clone();
  swRight.position.x = -tireWidth * 0.45;
  wheelGroup.add(swLeft, swRight);

  // 2. Alloy Rim Barrel & Deep Lip
  const rimBarrelGeo = new THREE.CylinderGeometry(innerRadius, innerRadius + 0.015, tireWidth * 0.95, 32);
  rimBarrelGeo.rotateZ(Math.PI / 2);
  const rimBarrel = new THREE.Mesh(rimBarrelGeo, rimMaterial);
  rimBarrel.castShadow = true;
  wheelGroup.add(rimBarrel);

  // Outer polished rim lip
  const rimLipGeo = new THREE.TorusGeometry(innerRadius, 0.018, 10, 32);
  rimLipGeo.rotateY(Math.PI / 2);
  const rimLip = new THREE.Mesh(rimLipGeo, rimMaterial);
  rimLip.position.x = tireWidth * 0.48;
  rimLip.castShadow = true;
  wheelGroup.add(rimLip);

  // 3. Deep-dish alloy spokes (5 dual-spoke twin blade design)
  const spokeCount = 5;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spokePair = new THREE.Group();

    const spokeGeo = new THREE.BoxGeometry(0.022, innerRadius * 0.92, 0.035);
    const s1 = new THREE.Mesh(spokeGeo, rimMaterial);
    s1.position.set(tireWidth * 0.44, (innerRadius * 0.92) / 2, 0.022);
    s1.rotation.x = 0.08;

    const s2 = new THREE.Mesh(spokeGeo, rimMaterial);
    s2.position.set(tireWidth * 0.44, (innerRadius * 0.92) / 2, -0.022);
    s2.rotation.x = -0.08;

    spokePair.add(s1, s2);
    spokePair.rotation.x = angle;
    wheelGroup.add(spokePair);
  }

  // 4. Center hub cap & chrome lug nuts
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Regal Gold center emblem
    metalness: 0.95,
    roughness: 0.15,
  });
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, tireWidth + 0.01, 16), hubMat);
  hubCap.rotateZ(Math.PI / 2);
  wheelGroup.add(hubCap);

  // Lug nuts (5 chrome bolts)
  const lugMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 });
  const lugGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8);
  lugGeo.rotateZ(Math.PI / 2);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const lug = new THREE.Mesh(lugGeo, lugMat);
    lug.position.set(tireWidth * 0.48, Math.sin(a) * 0.035, Math.cos(a) * 0.035);
    wheelGroup.add(lug);
  }

  // 5. Cross-drilled steel brake disc rotor
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.88,
    roughness: 0.22,
  });
  const rotorGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.025, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  const rotorMesh = new THREE.Mesh(rotorGeo, rotorMat);
  rotorMesh.position.x = -0.03;
  wheelGroup.add(rotorMesh);

  // 6. Monobloc Sport Brake Caliper
  const caliperMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Crimson racing caliper
    metalness: 0.6,
    roughness: 0.25,
  });
  const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.11, 0.14), caliperMat);
  caliper.position.set(-0.03, 0.14, 0.02);
  wheelGroup.add(caliper);

  return wheelGroup;
}

/**
 * Builds realistic side mirrors with stalk, aerodynamic shell, and reflective glass
 */
function createSideMirror(bodyMaterial: THREE.Material, trimMaterial: THREE.Material): THREE.Group {
  const mirrorGroup = new THREE.Group();

  // Mounting stalk
  const stalkGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.14, 8);
  stalkGeo.rotateZ(Math.PI / 3);
  const stalk = new THREE.Mesh(stalkGeo, trimMaterial);
  mirrorGroup.add(stalk);

  // Aerodynamic mirror housing shell
  const shellGeo = new THREE.SphereGeometry(0.08, 12, 10);
  shellGeo.scale(1.2, 0.7, 1.6);
  const shell = new THREE.Mesh(shellGeo, bodyMaterial);
  shell.position.set(0.12, 0.05, 0);
  mirrorGroup.add(shell);

  // Mirror glass surface
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.95,
    roughness: 0.05,
  });
  const glassPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.07), glassMat);
  glassPlane.position.set(0.12, 0.05, -0.09);
  glassPlane.rotation.y = Math.PI;
  mirrorGroup.add(glassPlane);

  return mirrorGroup;
}

/**
 * Builds aerodynamic rear spoilers
 */
function buildSpoilerMesh(
  type: SpoilerType,
  bodyWidth: number,
  bodyLength: number,
  bodyHeight: number,
  rearDeckY: number,
  rearDeckZ: number,
  bodyMat: THREE.Material,
  trimMat: THREE.Material
): THREE.Group {
  const spoilerGroup = new THREE.Group();
  spoilerGroup.name = 'car_spoiler';

  if (type === 'ducktail') {
    // Elegant integrated carbon ducktail lip
    const ducktailGeo = new THREE.BoxGeometry(bodyWidth * 0.88, 0.08, 0.28);
    const ducktail = new THREE.Mesh(ducktailGeo, bodyMat);
    ducktail.position.set(0, rearDeckY + 0.05, rearDeckZ + 0.06);
    ducktail.rotation.x = -0.32;
    ducktail.castShadow = true;
    spoilerGroup.add(ducktail);

    const lipTrim = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.9, 0.03, 0.06), trimMat);
    lipTrim.position.set(0, rearDeckY + 0.09, rearDeckZ + 0.04);
    lipTrim.rotation.x = -0.32;
    spoilerGroup.add(lipTrim);
  } else if (type === 'gt_wing') {
    // Carbon Swan-Neck GT Racing Wing with dual aerofoil struts and endplates
    const wingWidth = bodyWidth * 1.08;
    const wingPlane = new THREE.Mesh(new THREE.BoxGeometry(wingWidth, 0.04, 0.42), trimMat);
    wingPlane.position.set(0, rearDeckY + 0.52, rearDeckZ);
    wingPlane.castShadow = true;

    // Swan-neck hanging struts
    const strutGeo = new THREE.BoxGeometry(0.035, 0.55, 0.16);
    const strutL = new THREE.Mesh(strutGeo, trimMat);
    strutL.position.set(0.42, rearDeckY + 0.26, rearDeckZ + 0.04);
    strutL.rotation.x = 0.22;
    strutL.castShadow = true;

    const strutR = strutL.clone();
    strutR.position.x = -0.42;

    // Wing endplates
    const endplateGeo = new THREE.BoxGeometry(0.02, 0.26, 0.44);
    const endplateL = new THREE.Mesh(endplateGeo, bodyMat);
    endplateL.position.set(wingWidth * 0.5, wingPlane.position.y, wingPlane.position.z);
    const endplateR = endplateL.clone();
    endplateR.position.x = -wingWidth * 0.5;

    spoilerGroup.add(wingPlane, strutL, strutR, endplateL, endplateR);
  } else if (type === 'hyper_fin') {
    // Le-Mans Apex Hyper Fin with central dorsal spine and floating boomerang winglets
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0, 0.52);
    finShape.lineTo(1.35, 0);
    finShape.closePath();

    const finExtrude = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.038,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
    });
    const finMesh = new THREE.Mesh(finExtrude, trimMat);
    finMesh.position.set(-0.019, rearDeckY + 0.15, rearDeckZ + 0.85);
    finMesh.rotation.y = Math.PI / 2;
    finMesh.castShadow = true;
    spoilerGroup.add(finMesh);

    // Dual floating aerodynamic winglets
    const boomL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.045, 0.52), trimMat);
    boomL.position.set(bodyWidth * 0.38, rearDeckY + 0.36, rearDeckZ + 0.05);
    boomL.rotation.z = -0.16;
    boomL.rotation.y = 0.14;
    boomL.castShadow = true;

    const boomR = boomL.clone();
    boomR.position.x = -bodyWidth * 0.38;
    boomR.rotation.z = 0.16;
    boomR.rotation.y = -0.14;

    spoilerGroup.add(boomL, boomR);
  }

  return spoilerGroup;
}

export function buildCar(specs: CarSpecs): Car3DObject {
  const carGroup = new THREE.Group();
  carGroup.name = `car_${specs.id}`;

  // 1. Automotive Materials: High-end PBR Clearcoat Paint
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(specs.color),
    metalness: 0.82,
    roughness: 0.14,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    reflectivity: 0.98,
  });

  const trimMaterial = new THREE.MeshStandardMaterial({
    color: 0x141416,
    roughness: 0.45,
    metalness: 0.65,
    map: carbonTexture,
  });

  const grilleMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.7,
    metalness: 0.4,
    map: honeycombTexture,
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x090d16,
    transmission: 0.75,
    roughness: 0.04,
    ior: 1.54,
    thickness: 0.35,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(specs.rimColor),
    metalness: 0.94,
    roughness: 0.14,
  });

  const headlightGlassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.5,
    roughness: 0.08,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff1e00,
    emissive: 0xaa0000,
    emissiveIntensity: 0.9,
    roughness: 0.18,
  });

  // Base dimensions & proportions per vehicle category
  let bodyWidth = 1.96;
  let bodyLength = 4.45;
  let bodyHeight = 0.54;
  let cabinHeight = 0.52;
  let wheelRadius = 0.36;
  let wheelTrack = 0.98;
  let wheelbase = 1.42;

  const style = specs.style;

  if (style === 'raja') {
    // Luxury Grand Touring Coupe (long sweeping hood, muscular haunches, graceful fastback)
    bodyWidth = 1.98;
    bodyLength = 4.60;
    bodyHeight = 0.52;
    cabinHeight = 0.50;
    wheelbase = 1.48;
  } else if (style === 'thar') {
    // Sporty Muscular Street Coupe (widebody flared arches, scooped power hood)
    bodyWidth = 2.08;
    bodyLength = 4.48;
    bodyHeight = 0.58;
    cabinHeight = 0.54;
    wheelbase = 1.40;
  } else if (style === 'cheetah') {
    // Low, Angular Exotic Supercar (sharp Italian wedge, mid-engine stance)
    bodyWidth = 2.06;
    bodyLength = 4.52;
    bodyHeight = 0.44;
    cabinHeight = 0.45;
    wheelbase = 1.44;
  } else if (style === 'garuda') {
    // Rounded, Aerodynamic Hypercar (teardrop canopy, sweeping side C-contour)
    bodyWidth = 2.14;
    bodyLength = 4.65;
    bodyHeight = 0.42;
    cabinHeight = 0.44;
    wheelbase = 1.46;
  }

  const groundY = wheelRadius;

  // --- (1) SCULPTED MAIN CHASSIS & AERODYNAMIC BODYWORK ---
  // Lower Body Belly Pan / Underbody
  const underbodyGeo = new THREE.BoxGeometry(bodyWidth * 0.94, 0.08, bodyLength * 0.98);
  const underbody = new THREE.Mesh(underbodyGeo, trimMaterial);
  underbody.position.set(0, groundY * 0.45, 0);
  underbody.receiveShadow = true;
  carGroup.add(underbody);

  // Sculpted Main Lower Body Silhouette with contoured side haunches
  const mainBodyShape = new THREE.Shape();
  // Side silhouette profile (Z forward is positive, Y is height)
  const halfL = bodyLength * 0.5;
  mainBodyShape.moveTo(-halfL * 0.96, 0.0);
  mainBodyShape.lineTo(halfL * 0.92, 0.0);
  mainBodyShape.lineTo(halfL * 0.98, bodyHeight * 0.35); // Front nose lip
  mainBodyShape.lineTo(halfL * 0.88, bodyHeight * 0.65); // Front hood dip
  mainBodyShape.lineTo(halfL * 0.30, bodyHeight * 0.95); // Base of windshield
  mainBodyShape.lineTo(-halfL * 0.25, bodyHeight * 0.95); // Roof line transition
  mainBodyShape.lineTo(-halfL * 0.85, bodyHeight * 0.75); // Rear deck slope
  mainBodyShape.lineTo(-halfL * 0.98, bodyHeight * 0.35); // Rear bumper curve
  mainBodyShape.closePath();

  const bodyExtrude = new THREE.ExtrudeGeometry(mainBodyShape, {
    depth: bodyWidth * 0.92,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.08,
    bevelThickness: 0.06,
  });
  bodyExtrude.center();
  const bodyMesh = new THREE.Mesh(bodyExtrude, bodyMaterial);
  bodyMesh.rotation.y = Math.PI / 2;
  bodyMesh.position.set(0, groundY + bodyHeight * 0.45, 0);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  carGroup.add(bodyMesh);

  // Wheel Arch Cavity Liners (prevent see-through gaps)
  const archMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const archGeo = new THREE.CylinderGeometry(wheelRadius * 1.15, wheelRadius * 1.15, 0.28, 16, 1, true, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);

  const archFL = new THREE.Mesh(archGeo, archMat);
  archFL.position.set(wheelTrack * 0.85, groundY, wheelbase);
  const archFR = archFL.clone(); archFR.position.x = -wheelTrack * 0.85; archFR.rotation.y = Math.PI;
  const archRL = archFL.clone(); archRL.position.z = -wheelbase;
  const archRR = archFR.clone(); archRR.position.z = -wheelbase;
  carGroup.add(archFL, archFR, archRL, archRR);

  // --- (2) SCULPTED GREENHOUSE & WINDOW GLASS CABIN ---
  const cabinWidth = bodyWidth * 0.74;
  const cabinLength = bodyLength * 0.46;
  const cabinCenterZ = -bodyLength * 0.04;
  const cabinY = bodyMesh.position.y + bodyHeight * 0.42 + cabinHeight * 0.45;

  // Canopy Glass Shell (Curved teardrop with beveled structural pillars)
  const canopyShape = new THREE.Shape();
  const halfCL = cabinLength * 0.5;
  canopyShape.moveTo(-halfCL * 0.98, 0);
  canopyShape.lineTo(halfCL * 0.96, 0);
  canopyShape.lineTo(halfCL * 0.72, cabinHeight * 0.92); // A-pillar slope
  canopyShape.lineTo(-halfCL * 0.45, cabinHeight); // Roof peak
  canopyShape.lineTo(-halfCL * 0.92, cabinHeight * 0.35); // Fastback slope
  canopyShape.closePath();

  const canopyExtrude = new THREE.ExtrudeGeometry(canopyShape, {
    depth: cabinWidth * 0.90,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.05,
    bevelThickness: 0.05,
  });
  canopyExtrude.center();
  const canopyMesh = new THREE.Mesh(canopyExtrude, glassMaterial);
  canopyMesh.rotation.y = Math.PI / 2;
  canopyMesh.position.set(0, cabinY, cabinCenterZ);
  carGroup.add(canopyMesh);

  // Structural Roof Pillar Shell (A-pillars, roof, C-pillars)
  const roofShellGeo = new THREE.BoxGeometry(cabinWidth * 0.88, 0.04, cabinLength * 0.55);
  const roofShell = new THREE.Mesh(roofShellGeo, bodyMaterial);
  roofShell.position.set(0, cabinY + cabinHeight * 0.48, cabinCenterZ - 0.08);
  roofShell.castShadow = true;
  carGroup.add(roofShell);

  // Window Trim Border Seals (Matte rubber/black frames)
  const aPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.04, cabinHeight * 1.15, 0.05), trimMaterial);
  aPillarL.position.set(cabinWidth * 0.44, cabinY + 0.02, cabinCenterZ + halfCL * 0.55);
  aPillarL.rotation.x = -0.68;
  const aPillarR = aPillarL.clone(); aPillarR.position.x = -cabinWidth * 0.44;
  carGroup.add(aPillarL, aPillarR);

  // --- (3) FRONT BUMPER, GRILLE & AIR INTAKE DAM ---
  const noseZ = bodyLength * 0.485;
  const bumperGroup = new THREE.Group();

  // Primary Center Air Intake Grille
  const grilleGeo = new THREE.BoxGeometry(bodyWidth * 0.65, bodyHeight * 0.45, 0.12);
  const grilleMesh = new THREE.Mesh(grilleGeo, grilleMaterial);
  grilleMesh.position.set(0, groundY + bodyHeight * 0.26, noseZ);
  bumperGroup.add(grilleMesh);

  // Dual Side Cooling Vents (Brake Cooling Ducts)
  const ductGeo = new THREE.BoxGeometry(bodyWidth * 0.18, bodyHeight * 0.35, 0.12);
  const ductL = new THREE.Mesh(ductGeo, grilleMaterial);
  ductL.position.set(bodyWidth * 0.40, groundY + bodyHeight * 0.22, noseZ - 0.04);
  const ductR = ductL.clone(); ductR.position.x = -bodyWidth * 0.40;
  bumperGroup.add(ductL, ductR);

  // Front Carbon Aero Splitter with Side Fangs
  const splitterGeo = new THREE.BoxGeometry(bodyWidth * 1.04, 0.05, 0.55);
  const frontSplitter = new THREE.Mesh(splitterGeo, trimMaterial);
  frontSplitter.position.set(0, groundY * 0.35, noseZ - 0.08);
  frontSplitter.castShadow = true;
  bumperGroup.add(frontSplitter);

  // Side winglets on splitter
  const wingletGeo = new THREE.BoxGeometry(0.04, 0.12, 0.22);
  const wingletL = new THREE.Mesh(wingletGeo, trimMaterial);
  wingletL.position.set(bodyWidth * 0.52, groundY * 0.35 + 0.05, noseZ - 0.08);
  const wingletR = wingletL.clone(); wingletR.position.x = -bodyWidth * 0.52;
  bumperGroup.add(wingletL, wingletR);

  carGroup.add(bumperGroup);

  // --- (4) HIGH-TECH HEADLIGHT ASSEMBLIES WITH DRL STRIPS ---
  const headlightY = groundY + bodyHeight * 0.48;
  const headlightZ = noseZ - 0.08;

  // Left headlight housing
  const hlHousingGeo = new THREE.BoxGeometry(0.26, 0.09, 0.18);
  const hlHousingL = new THREE.Mesh(hlHousingGeo, trimMaterial);
  hlHousingL.position.set(bodyWidth * 0.38, headlightY, headlightZ);
  hlHousingL.rotation.y = -0.22;
  const hlHousingR = hlHousingL.clone();
  hlHousingR.position.x = -bodyWidth * 0.38;
  hlHousingR.rotation.y = 0.22;
  carGroup.add(hlHousingL, hlHousingR);

  // Projector spherical glass lenses
  const lensGeo = new THREE.SphereGeometry(0.038, 16, 16);
  const lensL1 = new THREE.Mesh(lensGeo, headlightGlassMat);
  lensL1.position.set(bodyWidth * 0.36, headlightY, headlightZ + 0.06);
  const lensL2 = lensL1.clone(); lensL2.position.x += 0.065;
  const lensR1 = lensL1.clone(); lensR1.position.x = -bodyWidth * 0.36;
  const lensR2 = lensL2.clone(); lensR2.position.x = -bodyWidth * 0.36 - 0.065;
  carGroup.add(lensL1, lensL2, lensR1, lensR2);

  // Daytime Running Light (DRL) LED light-strip brow
  const drlMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 2.2,
  });
  const drlGeo = new THREE.BoxGeometry(0.24, 0.016, 0.02);
  const drlL = new THREE.Mesh(drlGeo, drlMat);
  drlL.position.set(bodyWidth * 0.38, headlightY + 0.045, headlightZ + 0.08);
  drlL.rotation.y = -0.22;
  const drlR = drlL.clone();
  drlR.position.x = -bodyWidth * 0.38;
  drlR.rotation.y = 0.22;
  carGroup.add(drlL, drlR);

  // Spotlights for 3D track illumination
  const spotLeft = new THREE.SpotLight(0xfffaed, 4.2, 50, Math.PI / 7, 0.35, 1.2);
  spotLeft.position.copy(lensL1.position);
  spotLeft.target.position.set(lensL1.position.x, 0, lensL1.position.z + 30);
  carGroup.add(spotLeft, spotLeft.target);

  const spotRight = new THREE.SpotLight(0xfffaed, 4.2, 50, Math.PI / 7, 0.35, 1.2);
  spotRight.position.copy(lensR1.position);
  spotRight.target.position.set(lensR1.position.x, 0, lensR1.position.z + 30);
  carGroup.add(spotRight, spotRight.target);

  // --- (5) REAR BUMPER, TAILLIGHT LIGHT-BAR & REAR DIFFUSER ---
  const rearZ = -bodyLength * 0.49;
  const taillightMeshes: THREE.Mesh[] = [];

  // Full-width continuous LED lightbar
  const tailBarGeo = new THREE.BoxGeometry(bodyWidth * 0.90, 0.065, 0.05);
  const tailBar = new THREE.Mesh(tailBarGeo, taillightMat);
  tailBar.position.set(0, groundY + bodyHeight * 0.52, rearZ + 0.02);
  carGroup.add(tailBar);
  taillightMeshes.push(tailBar);

  // Outer corner brake clusters
  const clusterGeo = new THREE.BoxGeometry(0.24, 0.12, 0.06);
  const clL = new THREE.Mesh(clusterGeo, taillightMat);
  clL.position.set(bodyWidth * 0.36, groundY + bodyHeight * 0.52, rearZ + 0.015);
  const clR = clL.clone(); clR.position.x = -bodyWidth * 0.36;
  carGroup.add(clL, clR);
  taillightMeshes.push(clL, clR);

  // Rear Aerodynamic Finned Diffuser Channels
  const diffuserMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6, metalness: 0.7 });
  const diffGroup = new THREE.Group();
  diffGroup.position.set(0, groundY * 0.35, rearZ + 0.12);

  const diffPlane = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.88, 0.06, 0.45), diffuserMat);
  diffGroup.add(diffPlane);

  // 4 Diffuser fins
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.14, 0.42), diffuserMat);
    fin.position.set(i * 0.26, -0.04, 0);
    fin.rotation.x = -0.15;
    diffGroup.add(fin);
  }
  carGroup.add(diffGroup);

  // Front & Rear License Plates
  const rearPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.14),
    new THREE.MeshStandardMaterial({ map: licensePlateTexture, roughness: 0.3 })
  );
  rearPlate.position.set(0, groundY + bodyHeight * 0.24, rearZ - 0.01);
  rearPlate.rotation.y = Math.PI;
  carGroup.add(rearPlate);

  const frontPlate = rearPlate.clone();
  frontPlate.position.set(0, groundY + bodyHeight * 0.18, noseZ + 0.02);
  frontPlate.rotation.y = 0;
  carGroup.add(frontPlate);

  // --- (6) SIDE MIRRORS & DOOR HANDLES ---
  const mirrorL = createSideMirror(bodyMaterial, trimMaterial);
  mirrorL.position.set(bodyWidth * 0.46, cabinY + 0.02, cabinCenterZ + halfCL * 0.45);
  const mirrorR = mirrorL.clone();
  mirrorR.position.x = -bodyWidth * 0.46;
  mirrorR.scale.x = -1;
  carGroup.add(mirrorL, mirrorR);

  // Aerodynamic flush door handles
  const handleGeo = new THREE.BoxGeometry(0.012, 0.022, 0.14);
  const handleL = new THREE.Mesh(handleGeo, trimMaterial);
  handleL.position.set(bodyWidth * 0.495, groundY + bodyHeight * 0.45, cabinCenterZ - 0.05);
  const handleR = handleL.clone(); handleR.position.x = -bodyWidth * 0.495;
  carGroup.add(handleL, handleR);

  // --- (7) EXHAUST PIPES & BESPOKE CATEGORY ACCENTS ---
  const exhaustPipes: THREE.Vector3[] = [];

  const createExhaustTip = (x: number, y: number, z: number, r: number = 0.055) => {
    const tipGroup = new THREE.Group();
    const outerPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.22, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
    );
    outerPipe.rotateX(Math.PI / 2);

    const innerHole = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.85, r * 0.85, 0.21, 16),
      new THREE.MeshBasicMaterial({ color: 0x050507 })
    );
    innerHole.rotateX(Math.PI / 2);
    tipGroup.add(outerPipe, innerHole);
    tipGroup.position.set(x, y, z);
    carGroup.add(tipGroup);

    exhaustPipes.push(new THREE.Vector3(x, y, z - 0.08));
  };

  // Distinct Accents per Category:
  if (style === 'raja') {
    // Luxury Grand Touring Coupe: Elegant Dual Oval Chrome Exhausts & Hood Stripes
    createExhaustTip(0.42, groundY * 0.65, rearZ + 0.04, 0.065);
    createExhaustTip(-0.42, groundY * 0.65, rearZ + 0.04, 0.065);

    // Regal dual central gold hood accents
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.92, roughness: 0.15 });
    const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, bodyLength * 0.85), stripeMat);
    s1.position.set(0.14, bodyMesh.position.y + bodyHeight * 0.52, 0.1);
    const s2 = s1.clone(); s2.position.x = -0.14;
    carGroup.add(s1, s2);
  } else if (style === 'thar') {
    // Sporty Muscular Street Coupe: Flared Bolt-On Fender Flares & Hood Scoop
    const flareMat = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.65, metalness: 0.3 });
    const flareGeo = new THREE.BoxGeometry(0.12, 0.32, 0.92);

    const flareFL = new THREE.Mesh(flareGeo, flareMat);
    flareFL.position.set(bodyWidth * 0.49, groundY + 0.08, wheelbase);
    const flareFR = flareFL.clone(); flareFR.position.x = -bodyWidth * 0.49;
    const flareRL = flareFL.clone(); flareRL.position.z = -wheelbase;
    const flareRR = flareFR.clone(); flareRR.position.z = -wheelbase;
    carGroup.add(flareFL, flareFR, flareRL, flareRR);

    // Sculpted Hood Air Scoop
    const scoopGeo = new THREE.BoxGeometry(bodyWidth * 0.36, 0.08, 0.65);
    const scoop = new THREE.Mesh(scoopGeo, trimMaterial);
    scoop.position.set(0, bodyMesh.position.y + bodyHeight * 0.52, noseZ - 0.75);
    scoop.rotation.x = -0.12;
    carGroup.add(scoop);

    // Quad side-by-side exhaust tips
    createExhaustTip(0.48, groundY * 0.65, rearZ + 0.04, 0.05);
    createExhaustTip(0.36, groundY * 0.65, rearZ + 0.04, 0.05);
    createExhaustTip(-0.36, groundY * 0.65, rearZ + 0.04, 0.05);
    createExhaustTip(-0.48, groundY * 0.65, rearZ + 0.04, 0.05);
  } else if (style === 'cheetah') {
    // Low, Angular Exotic Supercar: Geometric Front Canards, Hexagon Vents & Center Exhaust
    const canardMat = trimMaterial;
    const canardGeo = new THREE.BoxGeometry(0.24, 0.025, 0.22);

    const canL1 = new THREE.Mesh(canardGeo, canardMat);
    canL1.position.set(bodyWidth * 0.48, groundY + 0.16, noseZ - 0.32);
    canL1.rotation.y = 0.28; canL1.rotation.z = -0.18;

    const canL2 = canL1.clone();
    canL2.position.y += 0.12; canL2.position.z -= 0.05;

    const canR1 = canL1.clone(); canR1.position.x = -bodyWidth * 0.48; canR1.rotation.y = -0.28; canR1.rotation.z = 0.18;
    const canR2 = canL2.clone(); canR2.position.x = -bodyWidth * 0.48; canR2.rotation.y = -0.28; canR2.rotation.z = 0.18;
    carGroup.add(canL1, canL2, canR1, canR2);

    // Mid-engine glass engine bay with visible intake runners
    const runnerMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.9 });
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 12), runnerMat);
      pipe.rotateZ(Math.PI / 2);
      pipe.position.set(i * 0.08, cabinY + 0.06, cabinCenterZ - halfCL * 0.45);
      carGroup.add(pipe);
    }

    // High center dual rocket exhaust
    createExhaustTip(0.12, groundY + bodyHeight * 0.35, rearZ + 0.04, 0.06);
    createExhaustTip(-0.12, groundY + bodyHeight * 0.35, rearZ + 0.04, 0.06);
  } else if (style === 'garuda') {
    // Rounded, Aerodynamic Hypercar: Sweeping C-contour side pods & quad circular exhaust
    const cContourMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.18 });
    const cContourGeo = new THREE.TorusGeometry(cabinLength * 0.42, 0.045, 12, 32, Math.PI * 1.1);
    cContourGeo.rotateY(Math.PI / 2);

    const cL = new THREE.Mesh(cContourGeo, cContourMat);
    cL.position.set(bodyWidth * 0.48, cabinY - 0.05, cabinCenterZ);
    const cR = cL.clone(); cR.position.x = -bodyWidth * 0.48; cR.scale.x = -1;
    carGroup.add(cL, cR);

    // Quad central rocket exhausts in titanium rainbow finish
    createExhaustTip(0.18, groundY + bodyHeight * 0.28, rearZ + 0.04, 0.05);
    createExhaustTip(0.06, groundY + bodyHeight * 0.28, rearZ + 0.04, 0.05);
    createExhaustTip(-0.06, groundY + bodyHeight * 0.28, rearZ + 0.04, 0.05);
    createExhaustTip(-0.18, groundY + bodyHeight * 0.28, rearZ + 0.04, 0.05);
  }

  // --- (8) DYNAMIC REAR SPOILER ---
  let spoilerGroup = buildSpoilerMesh(
    specs.spoilerType || 'stock',
    bodyWidth,
    bodyLength,
    bodyHeight,
    groundY + bodyHeight * 0.52,
    rearZ,
    bodyMaterial,
    trimMaterial
  );
  carGroup.add(spoilerGroup);

  // --- (9) WHEEL ASSEMBLIES ---
  const flWheel = createRealisticWheel(rimMaterial);
  flWheel.position.set(wheelTrack, groundY, wheelbase);

  const frWheel = createRealisticWheel(rimMaterial);
  frWheel.position.set(-wheelTrack, groundY, wheelbase);
  frWheel.rotation.y = Math.PI;

  const rlWheel = createRealisticWheel(rimMaterial);
  rlWheel.position.set(wheelTrack, groundY, -wheelbase);

  const rrWheel = createRealisticWheel(rimMaterial);
  rrWheel.position.set(-wheelTrack, groundY, -wheelbase);
  rrWheel.rotation.y = Math.PI;

  const frontLeftGroup = new THREE.Group();
  frontLeftGroup.position.copy(flWheel.position);
  flWheel.position.set(0, 0, 0);
  frontLeftGroup.add(flWheel);

  const frontRightGroup = new THREE.Group();
  frontRightGroup.position.copy(frWheel.position);
  frWheel.position.set(0, 0, 0);
  frontRightGroup.add(frWheel);

  carGroup.add(frontLeftGroup, frontRightGroup, rlWheel, rrWheel);

  // --- (10) SOFT CONTACT GROUND SHADOW & NEON UNDERGLOW ---
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 128, 12, 64, 128, 110);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 256);

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(bodyWidth * 1.38, bodyLength * 1.25),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    })
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.02;
  carGroup.add(contactShadow);

  // Neon Underglow Light & Ground Glow Plane
  const isUgActive = specs.hasUnderglow && specs.underglowColor && specs.underglowColor !== 'off';
  const ugColorVal = isUgActive ? specs.underglowColor : '#F59E0B';
  const underglowColor = new THREE.Color(ugColorVal);
  const underglowLight = new THREE.PointLight(underglowColor, isUgActive ? 3.4 : 0, 4.8);
  underglowLight.position.set(0, 0.2, 0);
  carGroup.add(underglowLight);

  const underglowPlaneGeo = new THREE.PlaneGeometry(bodyWidth * 0.95, bodyLength * 0.75);
  const underglowMesh = new THREE.Mesh(
    underglowPlaneGeo,
    new THREE.MeshBasicMaterial({
      color: underglowColor,
      transparent: true,
      opacity: isUgActive ? 0.38 : 0,
      depthWrite: false,
    })
  );
  underglowMesh.rotation.x = -Math.PI / 2;
  underglowMesh.position.y = 0.03;
  carGroup.add(underglowMesh);

  // Callbacks
  const updateAppearance = (newSpecs: CarSpecs) => {
    bodyMaterial.color.set(newSpecs.color);
    rimMaterial.color.set(newSpecs.rimColor);

    const hasUg = newSpecs.hasUnderglow && newSpecs.underglowColor && newSpecs.underglowColor !== 'off';
    if (hasUg) {
      const col = new THREE.Color(newSpecs.underglowColor);
      underglowLight.color.copy(col);
      (underglowMesh.material as THREE.MeshBasicMaterial).color.copy(col);
      underglowLight.intensity = 3.4;
      (underglowMesh.material as THREE.MeshBasicMaterial).opacity = 0.38;
      underglowLight.visible = true;
      underglowMesh.visible = true;
    } else {
      underglowLight.intensity = 0;
      (underglowMesh.material as THREE.MeshBasicMaterial).opacity = 0;
      underglowLight.visible = false;
      underglowMesh.visible = false;
    }

    if (spoilerGroup) {
      carGroup.remove(spoilerGroup);
    }
    spoilerGroup = buildSpoilerMesh(
      newSpecs.spoilerType || 'stock',
      bodyWidth,
      bodyLength,
      bodyHeight,
      groundY + bodyHeight * 0.52,
      rearZ,
      bodyMaterial,
      trimMaterial
    );
    carGroup.add(spoilerGroup);
  };

  const updateWheels = (steerAngle: number, wheelSpin: number) => {
    frontLeftGroup.rotation.y = steerAngle;
    frontRightGroup.rotation.y = steerAngle;

    flWheel.rotation.x = wheelSpin;
    frWheel.rotation.x = -wheelSpin;
    rlWheel.rotation.x = wheelSpin;
    rrWheel.rotation.x = -wheelSpin;
  };

  const setBraking = (braking: boolean) => {
    taillightMat.emissiveIntensity = braking ? 2.6 : 0.9;
    taillightMat.emissive.setHex(braking ? 0xff0000 : 0xaa0000);
  };

  const setUnderglowVisible = (visible: boolean) => {
    const hasUg = specs.hasUnderglow && specs.underglowColor && specs.underglowColor !== 'off';
    const active = visible && hasUg;
    underglowLight.intensity = active ? 3.4 : 0;
    (underglowMesh.material as THREE.MeshBasicMaterial).opacity = active ? 0.38 : 0;
  };

  return {
    group: carGroup,
    bodyMesh,
    bodyMaterial,
    trimMaterial,
    glassMaterial,
    rimMaterial,
    spoilerGroup,
    underglowLight,
    underglowMesh,
    frontLeftWheel: frontLeftGroup,
    frontRightWheel: frontRightGroup,
    rearLeftWheel: rlWheel,
    rearRightWheel: rrWheel,
    headlights: [spotLeft, spotRight],
    taillightMeshes,
    exhaustPipes,
    updateAppearance,
    updateWheels,
    setBraking,
    setUnderglowVisible,
  };
}
