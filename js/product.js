import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGarment, setupLighting, setupEnvironment, addContactShadow, tickSway } from './garment.js';

// --- Read product id from URL ---
const params = new URLSearchParams(window.location.search);
const id = params.get('id') || 'tshirt-essential';
const product = window.ATELIER_PRODUCTS.find(p => p.id === id) || window.ATELIER_PRODUCTS[0];

document.getElementById('p-category').textContent = product.category;
document.getElementById('p-title').textContent = product.name;
document.getElementById('p-price').textContent = `$${product.price}`;
document.getElementById('p-desc').textContent = product.description;

const specsEl = document.getElementById('p-specs');
product.specs.forEach(([k, v]) => {
  const li = document.createElement('li');
  li.innerHTML = `<strong>${k}</strong><span>${v}</span>`;
  specsEl.appendChild(li);
});

// ===== Photo view (default) =====
const photoView = document.getElementById('photo-view');
const canvasView = document.getElementById('canvas-view');
const photoImg = document.getElementById('product-photo');
const photoShine = document.querySelector('.photo-shine');
photoImg.src = product.imageLarge || product.image;
photoImg.alt = product.name;

// Parallax tilt on the photo
(function photoTilt() {
  const state = { rx: 0, ry: 0, mx: 50, my: 50 };
  const target = { rx: 0, ry: 0, mx: 50, my: 50 };
  let raf = null;
  photoView.addEventListener('pointermove', (e) => {
    const r = photoView.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    target.ry = (nx - 0.5) * 10;
    target.rx = (0.5 - ny) * 10;
    target.mx = nx * 100;
    target.my = ny * 100;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  photoView.addEventListener('pointerleave', () => {
    target.rx = target.ry = 0;
    target.mx = target.my = 50;
  });
  function loop() {
    state.rx += (target.rx - state.rx) * 0.1;
    state.ry += (target.ry - state.ry) * 0.1;
    state.mx += (target.mx - state.mx) * 0.15;
    state.my += (target.my - state.my) * 0.15;
    photoView.style.transform =
      `perspective(1200px) rotateX(${state.rx}deg) rotateY(${state.ry}deg)`;
    photoImg.style.transform =
      `translate3d(${state.ry * 0.8}px, ${-state.rx * 0.8}px, 40px) scale(1.04)`;
    if (photoShine) {
      photoShine.style.background =
        `radial-gradient(circle at ${state.mx}% ${state.my}%, rgba(255,255,255,0.18), transparent 60%)`;
    }
    if (Math.abs(state.rx - target.rx) > 0.01 || Math.abs(state.ry - target.ry) > 0.01) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }
})();

// ===== 3D view (lazy-init when user clicks "View in 3D") =====
let viewer3D = null;
function init3DViewer() {
  if (viewer3D) return viewer3D;

  const canvas = document.getElementById('product-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  setupEnvironment(renderer, scene);
  setupLighting(scene);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const typeKey = product.id === 'jacket-leather' ? 'leather'
                : product.id === 'pants-denim' ? 'denim'
                : product.type;
  const garment = createGarment(typeKey, product.defaultColor);
  scene.add(garment);

  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.45 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -3.6;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);
  addContactShadow(scene, -3.59);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.3, 0.7, 0.88
  ));
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 6;
  controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI * 0.75;
  controls.minPolarAngle = Math.PI * 0.25;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;
  canvas.addEventListener('pointerdown', () => controls.autoRotate = false);

  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  function tick() {
    if (!running) return;
    tickSway(clock.getElapsedTime());
    controls.update();
    composer.render();
    requestAnimationFrame(tick);
  }
  tick();

  gsap.from(garment.position, { y: -6, duration: 1.4, ease: 'power3.out' });
  gsap.from(garment.rotation, { y: -Math.PI, duration: 1.6, ease: 'power3.out' });

  viewer3D = {
    garment,
    pause() { running = false; },
    resume() { if (!running) { running = true; tick(); } }
  };
  return viewer3D;
}

// ===== Photo/3D toggle =====
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.dataset.mode;
    if (mode === '3d') {
      photoView.style.display = 'none';
      canvasView.style.display = 'block';
      init3DViewer().resume();
      gsap.fromTo(canvasView, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    } else {
      canvasView.style.display = 'none';
      photoView.style.display = 'block';
      if (viewer3D) viewer3D.pause();
      gsap.fromTo(photoView, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    }
  });
});

// ===== Color swatches (apply to 3D model only; photo is static) =====
const colorsWrap = document.getElementById('p-colors');
product.colors.forEach((c) => {
  const btn = document.createElement('button');
  btn.className = 'swatch';
  btn.style.background = c;
  btn.dataset.color = c;
  if (c === product.defaultColor) btn.classList.add('active');
  btn.addEventListener('click', () => {
    colorsWrap.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    // If 3D viewer hasn't been initialized yet, init it so color change is visible on switch
    const v = init3DViewer();
    v.garment.userData.setColor(c);
  });
  colorsWrap.appendChild(btn);
});

document.querySelectorAll('#p-sizes .size').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('#p-sizes .size').forEach(s => s.classList.remove('active'));
    b.classList.add('active');
  });
});

// Product info entrance
gsap.from('.product-info > *', {
  x: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out'
});

document.getElementById('add-to-bag').addEventListener('click', () => {
  window.ATELIER_CART.add();
  const btn = document.getElementById('add-to-bag');
  const original = btn.textContent;
  btn.textContent = 'Added to bag \u2713';
  gsap.fromTo(btn, { scale: 1 }, { scale: 1.04, duration: 0.15, yoyo: true, repeat: 1 });
  setTimeout(() => btn.textContent = original, 1600);
});

document.querySelectorAll('.cart-btn').forEach(b => {
  b.addEventListener('click', () => {
    alert(window.ATELIER_CART.count === 0
      ? 'Bag is empty. Add something beautiful.'
      : `You have ${window.ATELIER_CART.count} item(s) in your bag.`);
  });
});

// Fallback: if photo fails, auto-open 3D view so the product is never blank
photoImg.addEventListener('error', () => {
  document.querySelector('.toggle-btn[data-mode="3d"]').click();
});
