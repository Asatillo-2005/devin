import * as THREE from 'three';
import { createGarment, setupLighting, setupEnvironment } from './garment.js';

const grid = document.getElementById('shop-grid');
const filters = document.querySelectorAll('.filter');

function render(filter) {
  grid.innerHTML = '';
  const list = filter === 'all'
    ? window.ATELIER_PRODUCTS
    : window.ATELIER_PRODUCTS.filter(p => p.type === filter);

  list.forEach((p, idx) => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `product.html?id=${p.id}`;
    card.innerHTML = `
      <canvas class="card-canvas"></canvas>
      <div class="card-info">
        <div>
          <div class="card-cat">${p.category}</div>
          <div class="card-name">${p.name}</div>
        </div>
        <div class="card-price">$${p.price}</div>
      </div>
    `;
    grid.appendChild(card);

    const typeKey = p.id === 'jacket-leather' ? 'leather' : p.type;
    initCard(card.querySelector('canvas'), typeKey, p.defaultColor, idx);

    gsap.from(card, {
      y: 50, opacity: 0, duration: 0.9, delay: idx * 0.06,
      ease: 'power3.out'
    });
  });
}

function initCard(canvas, type, color, idx) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  setupEnvironment(renderer, scene);
  setupLighting(scene);

  const camera = new THREE.PerspectiveCamera(30, 3/4, 0.1, 100);
  camera.position.set(0, 0, 11);

  const g = createGarment(type, color);
  scene.add(g);

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
  const off = idx * 0.5;
  function tick() {
    if (visible) {
      const t = clock.getElapsedTime() + off;
      hover += (hoverTarget - hover) * 0.08;
      g.rotation.y = t * 0.35 + hover * 0.8;
      g.rotation.x = Math.sin(t * 0.5) * 0.08;
      g.scale.setScalar(1 + hover * 0.06);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(tick);
  }
  tick();
}

filters.forEach(btn => {
  btn.addEventListener('click', () => {
    filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    render(btn.dataset.filter);
  });
});

render('all');

document.querySelectorAll('.cart-btn').forEach(b => {
  b.addEventListener('click', () => alert('Bag is empty. Add something beautiful.'));
});
