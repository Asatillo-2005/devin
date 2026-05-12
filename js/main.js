import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createGarment, setupLighting, setupEnvironment, addContactShadow, tickSway } from './garment.js';

gsap.registerPlugin(ScrollTrigger);

// ======= HERO SCENE (with bloom post-processing) =======
(function heroScene() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

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

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 9.5);

  let current = createGarment('hoodie', '#4a4038');
  current.scale.setScalar(1.05);
  scene.add(current);

  // Real shadow on a ground plane
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.45 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -3.4;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);
  addContactShadow(scene, -3.39);

  // Post-processing: subtle bloom on rim highlights
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
    0.35, 0.8, 0.85
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // Pointer-driven rotation
  const target = { rx: 0, ry: 0 };
  const current_rot = { rx: 0, ry: 0 };
  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    target.ry = nx * 0.5;
    target.rx = ny * 0.25;
  });

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
  function tick() {
    const t = clock.getElapsedTime();
    tickSway(t);
    current_rot.rx += (target.rx - current_rot.rx) * 0.05;
    current_rot.ry += (target.ry - current_rot.ry) * 0.05;
    current.rotation.x = current_rot.rx;
    current.rotation.y = current_rot.ry + t * 0.2;
    current.position.y = Math.sin(t * 0.8) * 0.06;
    composer.render();
    requestAnimationFrame(tick);
  }
  tick();

  // Color swatches
  const swatches = document.querySelectorAll('.hero .swatch');
  swatches.forEach((btn, i) => {
    if (i === 0) btn.classList.add('active');
    btn.addEventListener('click', () => {
      swatches.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      current.userData.setColor(btn.dataset.color);
    });
  });

  // Entrance
  gsap.from(current.position, { y: -6, duration: 1.6, ease: 'power3.out' });
  gsap.from(current.rotation, { y: Math.PI * 2, duration: 2.0, ease: 'power3.out' });
})();

// ======= FEATURED PIECE =======
(function featuredScene() {
  const canvas = document.getElementById('featured-canvas');
  if (!canvas) return;

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

  const garment = createGarment('hoodie', '#4a4038');
  scene.add(garment);
  addContactShadow(scene, -3.2);

  function resize() {
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    tickSway(t);
    garment.rotation.y = t * 0.3;
    garment.rotation.x = Math.sin(t * 0.4) * 0.08;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();

  ScrollTrigger.create({
    trigger: '.featured',
    start: 'top 80%',
    end: 'bottom 20%',
    onUpdate: (self) => {
      camera.position.z = 10 - self.progress * 1.5;
    }
  });
})();

// ======= COLLECTION GRID =======
(function collectionGrid() {
  const grid = document.getElementById('collection-grid');
  if (!grid) return;

  const featured = window.ATELIER_PRODUCTS.slice(0, 6);
  featured.forEach((p, idx) => {
    const card = document.createElement('a');
    card.className = 'card reveal';
    card.href = `product.html?id=${p.id}`;
    const typeKey = p.id === 'jacket-leather' ? 'leather'
                  : p.id === 'pants-denim' ? 'denim'
                  : p.type;
    card.innerHTML = `
      <canvas class="card-canvas" data-type="${typeKey}" data-color="${p.defaultColor}"></canvas>
      <div class="card-info">
        <div>
          <div class="card-cat">${p.category}</div>
          <div class="card-name">${p.name}</div>
        </div>
        <div class="card-price">$${p.price}</div>
      </div>
    `;
    grid.appendChild(card);
    initCardCanvas(card.querySelector('canvas'), idx);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => e.isIntersecting && e.target.classList.add('in'));
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
})();

function initCardCanvas(canvas, idx) {
  const type = canvas.dataset.type;
  const color = canvas.dataset.color;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  setupEnvironment(renderer, scene);
  setupLighting(scene);

  const camera = new THREE.PerspectiveCamera(30, 3/4, 0.1, 100);
  camera.position.set(0, 0, 11);

  const g = createGarment(type, color);
  scene.add(g);
  addContactShadow(scene, -3.3);

  function resize() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    const h = canvas.clientHeight || w * 4/3;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = false;
  new IntersectionObserver((es) => es.forEach(e => visible = e.isIntersecting),
    { threshold: 0.1 }).observe(canvas);

  let hover = 0, hoverTarget = 0;
  canvas.parentElement.addEventListener('mouseenter', () => hoverTarget = 1);
  canvas.parentElement.addEventListener('mouseleave', () => hoverTarget = 0);

  const clock = new THREE.Clock();
  const offset = idx * 0.4;
  function tick() {
    if (visible) {
      const t = clock.getElapsedTime() + offset;
      tickSway(t);
      hover += (hoverTarget - hover) * 0.08;
      g.rotation.y = t * 0.3 + hover * 0.6;
      g.rotation.x = Math.sin(t * 0.5) * 0.1;
      g.scale.setScalar(1 + hover * 0.05);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  tick();
}

// ======= REVEALS =======
gsap.utils.toArray('.section-head, .featured-text, .about-inner').forEach((el) => {
  gsap.from(el, {
    y: 60, opacity: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 80%' }
  });
});

document.querySelectorAll('.cart-btn').forEach(b => {
  b.addEventListener('click', () => alert('Bag is empty. Add something beautiful.'));
});
