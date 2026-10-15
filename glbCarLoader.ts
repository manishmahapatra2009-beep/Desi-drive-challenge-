import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { CarSpecs } from '../types/game';
import { Car3DObject } from './carBuilder';

let gltfLoaderInstance: GLTFLoader | null = null;

function getGLTFLoader(): GLTFLoader {
  if (!gltfLoaderInstance) {
    gltfLoaderInstance = new GLTFLoader();

    // Draco Loader for compressed GLB files
    try {
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      gltfLoaderInstance.setDRACOLoader(dracoLoader);
    } catch {
      // Standard fallback if Draco decoder CDN is unavailable
    }
  }
  return gltfLoaderInstance;
}

export interface GLBModelDetails {
  meshCount: number;
  vertexCount: number;
  originalSize: { x: number; y: number; z: number };
  detectedBodyMaterialsCount: number;
}

/**
 * Loads a GLB/GLTF 3D model and normalizes it into a fully controllable Car3DObject
 * with proper scale, ground centering, lighting, shadows, wheels, and driving compatibility.
 */
export async function loadGLBCar(
  url: string,
  specs: CarSpecs,
  onProgress?: (progressPercent: number) => void,
  onModelDetails?: (details: GLBModelDetails) => void
): Promise<Car3DObject> {
  const loader = getGLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        try {
          const carGroup = new THREE.Group();
          carGroup.name = `glb_car_${specs.id}`;

          const rawModel = gltf.scene;
          rawModel.name = 'glb_raw_model';

          // 1. Initial Bounding Box Analysis
          let initialBox = new THREE.Box3().setFromObject(rawModel);
          let initialSize = initialBox.getSize(new THREE.Vector3());

          // Count meshes & vertices for diagnostic info
          let meshCount = 0;
          let vertexCount = 0;
          rawModel.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
              meshCount++;
              const geom = (node as THREE.Mesh).geometry;
              if (geom) {
                vertexCount += geom.attributes.position ? geom.attributes.position.count : 0;
              }
            }
          });

          // Check if vehicle was modeled facing sideways along X axis instead of forward along Z
          const isAlignedAlongX = initialSize.x > initialSize.z * 1.25;
          if (isAlignedAlongX) {
            rawModel.rotation.y = Math.PI / 2;
            initialBox = new THREE.Box3().setFromObject(rawModel);
            initialSize = initialBox.getSize(new THREE.Vector3());
          }

          // Apply user custom rotation offset (e.g. if the imported car faces backward or sideways)
          if (specs.glbRotationOffset) {
            rawModel.rotation.y += specs.glbRotationOffset;
            initialBox = new THREE.Box3().setFromObject(rawModel);
            initialSize = initialBox.getSize(new THREE.Vector3());
          }

          // 2. Scale Normalization (Standard sports car length ~ 4.5 units)
          const targetLength = 4.5 * (specs.glbScaleMultiplier || 1.0);
          const currentLength = Math.max(initialSize.z, 0.001);
          const scaleFactor = targetLength / currentLength;
          rawModel.scale.setScalar(scaleFactor);

          // 3. Ground & Center Alignment
          const scaledBox = new THREE.Box3().setFromObject(rawModel);
          const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
          const scaledMin = scaledBox.min;

          // Shift model so lowest Y touches ground (0.02) + user custom Y offset, and is centered on X & Z
          const yAdjustment = specs.glbYOffset || 0;
          rawModel.position.x = -scaledCenter.x;
          rawModel.position.z = -scaledCenter.z;
          rawModel.position.y = -scaledMin.y + 0.02 + yAdjustment;

          carGroup.add(rawModel);

          // 4. Mesh Processing: Shadows, Reflections & Material Detection
          const detectedBodyMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[] = [];
          const detectedRimMaterials: THREE.MeshStandardMaterial[] = [];
          const detectedGlassMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[] = [];
          const wheelMeshes: { mesh: THREE.Mesh; isFront: boolean; isLeft: boolean }[] = [];

          rawModel.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
              const mesh = node as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              // Ensure geometry normals are computed
              if (mesh.geometry && !mesh.geometry.attributes.normal) {
                mesh.geometry.computeVertexNormals();
              }

              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

              materials.forEach((matCandidate) => {
                const mat = matCandidate as THREE.MeshStandardMaterial;
                if (!mat) return;

                // Environment map reflection boost
                mat.envMapIntensity = 1.35;
                if (mat.map) {
                  mat.map.colorSpace = THREE.SRGBColorSpace;
                }

                // Preserve original colors and textures
                if (!mat.userData.origColor) {
                  mat.userData.origColor = mat.color.clone();
                  mat.userData.origMap = mat.map;
                  mat.userData.origRoughness = mat.roughness;
                  mat.userData.origMetalness = mat.metalness;
                }

                const matName = (mat.name || '').toLowerCase();
                const nodeName = (node.name || '').toLowerCase();

                const isGlass =
                  matName.includes('glass') ||
                  matName.includes('window') ||
                  matName.includes('windshield') ||
                  matName.includes('vitre') ||
                  nodeName.includes('glass') ||
                  nodeName.includes('window');

                const isWheel =
                  matName.includes('wheel') ||
                  matName.includes('tire') ||
                  matName.includes('rim') ||
                  matName.includes('roue') ||
                  matName.includes('rad') ||
                  matName.includes('jante') ||
                  nodeName.includes('wheel') ||
                  nodeName.includes('tire') ||
                  nodeName.includes('rim') ||
                  nodeName.includes('roue') ||
                  nodeName.includes('rad') ||
                  nodeName.includes('jante');

                const isBody =
                  !isGlass &&
                  !isWheel &&
                  (matName.includes('body') ||
                    matName.includes('paint') ||
                    matName.includes('carrosserie') ||
                    matName.includes('exterior') ||
                    matName.includes('chassis') ||
                    matName.includes('hood') ||
                    matName.includes('door') ||
                    nodeName.includes('body') ||
                    nodeName.includes('chassis') ||
                    nodeName.includes('hood') ||
                    nodeName.includes('door'));

                if (isGlass) {
                  detectedGlassMaterials.push(mat);
                } else if (isWheel && (matName.includes('rim') || nodeName.includes('rim') || matName.includes('jante'))) {
                  detectedRimMaterials.push(mat);
                } else if (isBody) {
                  if (!detectedBodyMaterials.includes(mat)) {
                    detectedBodyMaterials.push(mat);
                  }
                }
              });

              // Track wheel meshes for physics steering / spinning
              const nameLower = (mesh.name || '').toLowerCase();
              const isWheelMesh =
                nameLower.includes('wheel') ||
                nameLower.includes('tire') ||
                nameLower.includes('rim') ||
                nameLower.includes('roue') ||
                nameLower.includes('rad') ||
                nameLower.includes('jante');

              if (isWheelMesh) {
                const worldPos = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                wheelMeshes.push({
                  mesh,
                  isFront: worldPos.z > 0,
                  isLeft: worldPos.x > 0,
                });
              }
            }
          });

          // Fallback: If no body material was detected by keywords, pick the material on the largest mesh
          if (detectedBodyMaterials.length === 0) {
            let maxArea = 0;
            let fallbackMat: THREE.MeshStandardMaterial | null = null;
            rawModel.traverse((node) => {
              if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                if (mesh.geometry) {
                  mesh.geometry.computeBoundingBox();
                  const b = mesh.geometry.boundingBox;
                  const area = b ? (b.max.x - b.min.x) * (b.max.z - b.min.z) : 0;
                  if (area > maxArea && mesh.material) {
                    maxArea = area;
                    const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
                    fallbackMat = mat as THREE.MeshStandardMaterial;
                  }
                }
              }
            });
            if (fallbackMat) {
              detectedBodyMaterials.push(fallbackMat);
            }
          }

          // Primary Body Paint Material fallback
          const primaryBodyMaterial = detectedBodyMaterials[0] || new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(specs.color),
            metalness: 0.85,
            roughness: 0.15,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
          });

          // Trim & Rim Materials
          const trimMaterial = new THREE.MeshStandardMaterial({
            color: 0x141416,
            roughness: 0.45,
            metalness: 0.65,
          });

          const glassMaterial = detectedGlassMaterials[0] || new THREE.MeshPhysicalMaterial({
            color: 0x090d16,
            transmission: 0.8,
            roughness: 0.05,
            transparent: true,
          });

          const rimMaterial = detectedRimMaterials[0] || new THREE.MeshStandardMaterial({
            color: new THREE.Color(specs.rimColor),
            metalness: 0.95,
            roughness: 0.14,
          });

          // Apply initial paint or preserve original textures based on specs
          const applyPaintState = (useOriginal: boolean, carColor: string, rimCol: string) => {
            detectedBodyMaterials.forEach((mat) => {
              if (useOriginal) {
                if (mat.userData.origColor) mat.color.copy(mat.userData.origColor);
                if (mat.userData.origMap !== undefined) mat.map = mat.userData.origMap;
                if (mat.userData.origRoughness !== undefined) mat.roughness = mat.userData.origRoughness;
                if (mat.userData.origMetalness !== undefined) mat.metalness = mat.userData.origMetalness;
              } else {
                mat.color.set(carColor);
                mat.metalness = 0.88;
                mat.roughness = 0.18;
              }
              mat.needsUpdate = true;
            });

            detectedRimMaterials.forEach((mat) => {
              if (useOriginal) {
                if (mat.userData.origColor) mat.color.copy(mat.userData.origColor);
              } else {
                mat.color.set(rimCol);
              }
              mat.needsUpdate = true;
            });
          };

          applyPaintState(!!specs.glbUseOriginalMaterials, specs.color, specs.rimColor);

          // 5. Functional Wheel Pivots for Physics Integration (smoke, sounds, steer anchors)
          const frontLeftWheel = new THREE.Group();
          const frontRightWheel = new THREE.Group();
          const rearLeftWheel = new THREE.Group();
          const rearRightWheel = new THREE.Group();

          frontLeftWheel.position.set(0.95, 0.36, 1.4);
          frontRightWheel.position.set(-0.95, 0.36, 1.4);
          rearLeftWheel.position.set(0.95, 0.36, -1.4);
          rearRightWheel.position.set(-0.95, 0.36, -1.4);

          carGroup.add(frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel);

          // 6. Real 3D Headlights & Taillights
          const spotLeft = new THREE.SpotLight(0xfffaed, 4.2, 55, Math.PI / 7, 0.35, 1.2);
          spotLeft.position.set(0.7, 0.6, 2.15);
          spotLeft.target.position.set(0.7, 0, 30);
          carGroup.add(spotLeft, spotLeft.target);

          const spotRight = new THREE.SpotLight(0xfffaed, 4.2, 55, Math.PI / 7, 0.35, 1.2);
          spotRight.position.set(-0.7, 0.6, 2.15);
          spotRight.target.position.set(-0.7, 0, 30);
          carGroup.add(spotRight, spotRight.target);

          // Taillight bar indicator
          const taillightMat = new THREE.MeshStandardMaterial({
            color: 0xff1e00,
            emissive: 0xaa0000,
            emissiveIntensity: 0.9,
          });
          const taillightMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.05), taillightMat);
          taillightMesh.position.set(0, 0.65, -2.2);
          carGroup.add(taillightMesh);

          // 7. Ground Contact Shadow
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
            new THREE.PlaneGeometry(2.6, 4.8),
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

          // 8. Neon Underglow
          const hasUg = specs.hasUnderglow && specs.underglowColor && specs.underglowColor !== 'off';
          const ugColor = new THREE.Color(hasUg ? specs.underglowColor : '#F59E0B');
          const underglowLight = new THREE.PointLight(ugColor, hasUg ? 3.4 : 0, 4.8);
          underglowLight.position.set(0, 0.2, 0);
          carGroup.add(underglowLight);

          const underglowMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(1.9, 3.2),
            new THREE.MeshBasicMaterial({
              color: ugColor,
              transparent: true,
              opacity: hasUg ? 0.38 : 0,
              depthWrite: false,
            })
          );
          underglowMesh.rotation.x = -Math.PI / 2;
          underglowMesh.position.y = 0.03;
          carGroup.add(underglowMesh);

          // 9. Exhaust Pipes for Nitro Flames
          const exhaustPipes = [
            new THREE.Vector3(0.38, 0.32, -2.25),
            new THREE.Vector3(-0.38, 0.32, -2.25),
          ];

          // 10. Dynamic Spoiler Placeholder
          const spoilerGroup = new THREE.Group();
          spoilerGroup.name = 'glb_spoiler';
          carGroup.add(spoilerGroup);

          // Callbacks for live tuning and paint shop
          const updateAppearance = (newSpecs: CarSpecs) => {
            applyPaintState(!!newSpecs.glbUseOriginalMaterials, newSpecs.color, newSpecs.rimColor);

            primaryBodyMaterial.color.set(newSpecs.color);
            rimMaterial.color.set(newSpecs.rimColor);

            const activeUg = newSpecs.hasUnderglow && newSpecs.underglowColor && newSpecs.underglowColor !== 'off';
            if (activeUg) {
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
          };

          const updateWheels = (steerAngle: number, wheelSpin: number) => {
            frontLeftWheel.rotation.y = steerAngle;
            frontRightWheel.rotation.y = steerAngle;

            // If wheel meshes were identified in the GLB
            wheelMeshes.forEach((w) => {
              if (w.isFront) {
                w.mesh.rotation.y = steerAngle;
              }
              w.mesh.rotation.x = wheelSpin;
            });
          };

          const setBraking = (braking: boolean) => {
            taillightMat.emissiveIntensity = braking ? 2.6 : 0.9;
            taillightMat.emissive.setHex(braking ? 0xff0000 : 0xaa0000);
          };

          const setUnderglowVisible = (visible: boolean) => {
            const activeUg = specs.hasUnderglow && specs.underglowColor && specs.underglowColor !== 'off';
            const active = visible && activeUg;
            underglowLight.intensity = active ? 3.4 : 0;
            (underglowMesh.material as THREE.MeshBasicMaterial).opacity = active ? 0.38 : 0;
          };

          onModelDetails?.({
            meshCount,
            vertexCount,
            originalSize: { x: initialSize.x, y: initialSize.y, z: initialSize.z },
            detectedBodyMaterialsCount: detectedBodyMaterials.length,
          });

          resolve({
            group: carGroup,
            bodyMesh: (rawModel.children[0] as THREE.Mesh) || new THREE.Mesh(),
            bodyMaterial: primaryBodyMaterial,
            trimMaterial,
            glassMaterial,
            rimMaterial,
            spoilerGroup,
            underglowLight,
            underglowMesh,
            frontLeftWheel,
            frontRightWheel,
            rearLeftWheel,
            rearRightWheel,
            headlights: [spotLeft, spotRight],
            taillightMeshes: [taillightMesh],
            exhaustPipes,
            updateAppearance,
            updateWheels,
            setBraking,
            setUnderglowVisible,
          });
        } catch (err) {
          reject(err);
        }
      },
      (xhr) => {
        if (xhr.total && onProgress) {
          const percent = Math.round((xhr.loaded / xhr.total) * 100);
          onProgress(percent);
        }
      },
      (error) => {
        reject(error);
      }
    );
  });
}
