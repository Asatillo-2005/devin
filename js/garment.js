// Procedural garment builder. Returns a THREE.Group for each type.
// All pieces share a fabric-like PBR material with subtle normal noise.
import * as THREE from 'three';

// ---------- Fabric material (with procedural noise normal map) ----------
function makeFabricNormalMap(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Base mid-normal
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);
  // Fine weave threads — horizontal & vertical
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const weave = Math.sin(x * 0.6) * Math.cos(y * 0.6) * 18
                  + Math.sin(x * 2.1 + y * 1.7) * 6
                  + (Math.random() - 0.5) * 14;
      d[i]     = Math.max(0, Math.min(255, 128 + weave));       // R (X)
      d[i + 1] = Math.max(0, Math.min(255, 128 + weave * 0.6)); // G (Y)
      d[i + 2] = 255;                                           // B (Z up)
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  return tex;
}

const FABRIC_NORMAL = makeFabricNormalMap();

export function makeFabricMaterial(colorHex, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.02,
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(opts.normalScale ?? 0.35, opts.normalScale ?? 0.35),
    side: THREE.DoubleSide
  });
}

export function makeLeatherMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness: 0.45,
    metalness: 0.1,
    normalMap: FABRIC_NORMAL,
    normalScale: new THREE.Vector2(0.6, 0.6),
    side: THREE.DoubleSide
  });
}

// ---------- Helpers ----------
function extrude(shape, depth = 0.35, bevel = 0.08) {
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 24
  });
}

// ---------- T-SHIRT ----------
function buildTshirt(color) {
  const group = new THREE.Group();
  const mat = makeFabricMaterial(color, { roughness: 0.88, normalScale: 0.4 });

  const shape = new THREE.Shape();
  // Symmetric silhouette (coords in "garment units")
  // Start top-left of right sleeve, go clockwise
  shape.moveTo(-2.2, 1.4);           // left sleeve top
  shape.lineTo(-2.2, 0.4);           // left sleeve bottom (outer)
  shape.lineTo(-1.1, 0.6);           // armpit
  shape.lineTo(-1.1, -2.4);          // left waist
  shape.lineTo(1.1, -2.4);           // right waist
  shape.lineTo(1.1, 0.6);            // right armpit
  shape.lineTo(2.2, 0.4);            // right sleeve bottom
  shape.lineTo(2.2, 1.4);            // right sleeve top
  shape.lineTo(0.55, 1.4);           // collar start right
  shape.bezierCurveTo(0.4, 1.2, -0.4, 1.2, -0.55, 1.4); // collar scoop
  shape.lineTo(-2.2, 1.4);

  const geo = extrude(shape, 0.35, 0.08);
  geo.center();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Subtle torso roundness via a hidden "stuffing" mesh
  const stuffGeo = new THREE.SphereGeometry(1.5, 20, 16);
  stuffGeo.scale(1.2, 1.4, 0.55);
  const stuff = new THREE.Mesh(stuffGeo, mat.clone());
  stuff.position.set(0, -0.3, 0.05);
  group.add(stuff);

  group.userData.setColor = (c) => { mat.color.set(c); stuff.material.color.set(c); };
  return group;
}

// ---------- HOODIE ----------
function buildHoodie(color) {
  const group = new THREE.Group();
  const mat = makeFabricMaterial(color, { roughness: 0.92, normalScale: 0.5 });

  const shape = new THREE.Shape();
  shape.moveTo(-2.5, 1.3);
  shape.lineTo(-2.5, 0.2);
  shape.lineTo(-1.2, 0.45);
  shape.lineTo(-1.2, -2.6);
  shape.lineTo(1.2, -2.6);
  shape.lineTo(1.2, 0.45);
  shape.lineTo(2.5, 0.2);
  shape.lineTo(2.5, 1.3);
  // Hood opening
  shape.lineTo(0.9, 1.3);
  shape.bezierCurveTo(0.8, 2.4, -0.8, 2.4, -0.9, 1.3);
  shape.lineTo(-2.5, 1.3);

  const geo = extrude(shape, 0.55, 0.12);
  geo.center();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Hood (back half-sphere)
  const hoodGeo = new THREE.SphereGeometry(0.95, 24, 20, 0, Math.PI * 2, 0, Math.PI * 0.55);
  hoodGeo.scale(1.1, 1, 0.8);
  const hood = new THREE.Mesh(hoodGeo, mat);
  hood.position.set(0, 1.45, -0.15);
  hood.rotation.x = Math.PI * 0.05;
  group.add(hood);

  // Kangaroo pocket (subtle raised rectangle)
  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-0.85, -0.4);
  pocketShape.lineTo(0.85, -0.4);
  pocketShape.lineTo(0.75, -1.6);
  pocketShape.lineTo(-0.75, -1.6);
  pocketShape.lineTo(-0.85, -0.4);
  const pocketGeo = extrude(pocketShape, 0.08, 0.04);
  const pocket = new THREE.Mesh(pocketGeo, mat);
  pocket.position.set(0, 0, 0.32);
  group.add(pocket);

  // Drawstrings
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xeeeadd, roughness: 0.6 });
  for (let s = -1; s <= 1; s += 2) {
    const strGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8);
    const str = new THREE.Mesh(strGeo, stringMat);
    str.position.set(s * 0.25, 0.95, 0.35);
    group.add(str);
  }

  group.userData.setColor = (c) => {
    mat.color.set(c);
  };
  return group;
}

// ---------- JACKET (overcoat or leather biker) ----------
function buildJacket(color, leather = false) {
  const group = new THREE.Group();
  const mat = leather ? makeLeatherMaterial(color) : makeFabricMaterial(color, { roughness: 0.75, normalScale: 0.55 });

  const shape = new THREE.Shape();
  shape.moveTo(-2.6, 1.3);
  shape.lineTo(-2.6, 0.1);
  shape.lineTo(-1.3, 0.35);
  shape.lineTo(-1.3, -3.0);
  shape.lineTo(1.3, -3.0);
  shape.lineTo(1.3, 0.35);
  shape.lineTo(2.6, 0.1);
  shape.lineTo(2.6, 1.3);
  shape.lineTo(0.7, 1.3);
  shape.bezierCurveTo(0.5, 1.1, -0.5, 1.1, -0.7, 1.3);
  shape.lineTo(-2.6, 1.3);

  const geo = extrude(shape, 0.7, 0.15);
  geo.center();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Lapels
  const lapelShape = new THREE.Shape();
  lapelShape.moveTo(-0.7, 1.2);
  lapelShape.lineTo(-0.1, -1.2);
  lapelShape.lineTo(0.1, -1.2);
  lapelShape.lineTo(0.7, 1.2);
  lapelShape.lineTo(0.3, 1.1);
  lapelShape.lineTo(0, -0.9);
  lapelShape.lineTo(-0.3, 1.1);
  lapelShape.lineTo(-0.7, 1.2);
  const lapelGeo = extrude(lapelShape, 0.1, 0.03);
  const lapel = new THREE.Mesh(lapelGeo, mat);
  lapel.position.set(0, 0, 0.42);
  group.add(lapel);

  // Buttons
  const btnMat = new THREE.MeshStandardMaterial({
    color: leather ? 0x333333 : 0x3a2e20,
    roughness: 0.3,
    metalness: leather ? 0.9 : 0.2
  });
  for (let i = 0; i < 3; i++) {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16), btnMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0.15, 0.3 - i * 0.9, 0.48);
    group.add(btn);
  }

  group.userData.setColor = (c) => { mat.color.set(c); lapel.material.color.set(c); };
  return group;
}

// ---------- PANTS (trouser or denim) ----------
function buildPants(color) {
  const group = new THREE.Group();
  const mat = makeFabricMaterial(color, { roughness: 0.82, normalScale: 0.5 });

  const shape = new THREE.Shape();
  // Waistband + two legs silhouette
  shape.moveTo(-1.3, 1.6);
  shape.lineTo(1.3, 1.6);
  shape.lineTo(1.3, 1.3);
  shape.lineTo(1.1, 0.0);     // right hip
  shape.lineTo(0.95, -3.2);   // right ankle outer
  shape.lineTo(0.25, -3.2);   // right ankle inner
  shape.lineTo(0.15, -0.3);   // crotch right
  shape.lineTo(0, -0.1);      // crotch center
  shape.lineTo(-0.15, -0.3);
  shape.lineTo(-0.25, -3.2);
  shape.lineTo(-0.95, -3.2);
  shape.lineTo(-1.1, 0.0);
  shape.lineTo(-1.3, 1.3);
  shape.lineTo(-1.3, 1.6);

  const geo = extrude(shape, 0.45, 0.1);
  geo.center();
  const body = new THREE.Mesh(geo, mat);
  body.castShadow = body.receiveShadow = true;
  group.add(body);

  // Waistband (darker band)
  const bandMat = mat.clone();
  bandMat.color.multiplyScalar(0.82);
  const bandGeo = new THREE.BoxGeometry(2.6, 0.3, 0.55);
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.set(0, 2.25, 0);
  group.add(band);

  group.userData.setColor = (c) => {
    mat.color.set(c);
    bandMat.color.set(c).multiplyScalar(0.82);
  };
  return group;
}

// ---------- Dispatcher ----------
export function createGarment(type, color) {
  let g;
  if (type === 'tshirt') g = buildTshirt(color);
  else if (type === 'hoodie') g = buildHoodie(color);
  else if (type === 'jacket') g = buildJacket(color, false);
  else if (type === 'leather') g = buildJacket(color, true);
  else if (type === 'pants') g = buildPants(color);
  else g = buildTshirt(color);
  return g;
}

// ---------- Shared scene lighting ----------
export function setupLighting(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  const key = new THREE.DirectionalLight(0xfff5e0, 1.8);
  key.position.set(4, 6, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xc9a96e, 1.1);
  rim.position.set(-5, 3, -4);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
  fill.position.set(0, -4, 3);
  scene.add(fill);
}

// ---------- Simple studio environment for reflections ----------
export function setupEnvironment(renderer, scene) {
  // Tiny PMREM from a gradient scene for soft metallic reflections
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const gradient = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(0x1a1a20) },
        bottom: { value: new THREE.Color(0x05050a) }
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec3 vPos; uniform vec3 top; uniform vec3 bottom; void main(){ float h=normalize(vPos).y*0.5+0.5; gl_FragColor=vec4(mix(bottom,top,h),1.); }`
    })
  );
  envScene.add(gradient);
  const envMap = pmrem.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  pmrem.dispose();
}
