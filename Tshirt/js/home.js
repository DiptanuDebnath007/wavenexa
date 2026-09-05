/* =============================================
   WAVENEXA — Three.js Home Animation
   ============================================= */

window.addEventListener('load', function () {
  (function () {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvas.offsetWidth, canvas.offsetHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.offsetWidth / canvas.offsetHeight, 0.1, 100);
    camera.position.set(0, 0, 5);

    // ── Lights ─────────────────────────────────
    const ambientLight = new THREE.AmbientLight(0x6C63FF, 0.4);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x6C63FF, 2, 20);
    light1.position.set(5, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xFF6584, 1.5, 20);
    light2.position.set(-5, -3, 3);
    scene.add(light2);

    const light3 = new THREE.PointLight(0xFFFFFF, 0.8, 15);
    light3.position.set(0, 8, -2);
    scene.add(light3);

    // ── Particle Field ──────────────────────────
    const PARTICLE_COUNT = 1800;
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);

    const col1 = new THREE.Color(0x6C63FF);
    const col2 = new THREE.Color(0xFF6584);
    const col3 = new THREE.Color(0xFFFFFF);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;

      const t = Math.random();
      const c = t < 0.4 ? col1 : (t < 0.7 ? col2 : col3);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      scales[i] = Math.random();
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Waving Cloth Mesh ───────────────────────
    const clothGeo = new THREE.PlaneGeometry(14, 9, 40, 30);
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x6C63FF,
      metalness: 0.1,
      roughness: 0.8,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      wireframe: false
    });
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.z = -3;
    scene.add(cloth);

    // ── Floating Rings ───────────────────────────
    const rings = [];
    const ringData = [
      { radius: 1.2, tube: 0.015, color: 0x6C63FF, x: 3.5, y: 1.5, z: -1, rx: 0.5, ry: 0.3 },
      { radius: 0.8, tube: 0.012, color: 0xFF6584, x: -3.8, y: -1.2, z: -0.5, rx: 1.2, ry: 0.8 },
      { radius: 0.6, tube: 0.01, color: 0xFFFFFF, x: 3, y: -2.5, z: -1.5, rx: 0.2, ry: 1.5 },
      { radius: 1.5, tube: 0.018, color: 0x8B6FFF, x: -4, y: 2.5, z: -2, rx: 0.8, ry: 0.5 },
      { radius: 0.5, tube: 0.008, color: 0xFF8FA3, x: 1.5, y: 3, z: -0.8, rx: 1, ry: 1 },
    ];
    ringData.forEach(d => {
      const geo = new THREE.TorusGeometry(d.radius, d.tube, 16, 100);
      const mat = new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.7 });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(d.x, d.y, d.z);
      ring.rotation.set(d.rx, d.ry, 0);
      scene.add(ring);
      rings.push({ mesh: ring, speed: 0.004 + Math.random() * 0.006 });
    });

    // ── Floating Spheres ─────────────────────────
    const spheres = [];
    const sphereData = [
      { r: 0.18, col: 0x6C63FF, x: 4, y: 2, z: 0.5 },
      { r: 0.12, col: 0xFF6584, x: -4.2, y: -1.5, z: 0.3 },
      { r: 0.22, col: 0x8B6FFF, x: 3.8, y: -2.8, z: -0.5 },
      { r: 0.14, col: 0xFFD700, x: -3.5, y: 2.8, z: 0.2 },
      { r: 0.1, col: 0xFF8FA3, x: 0.5, y: 3.5, z: 1 },
      { r: 0.16, col: 0x6C63FF, x: -1, y: -3.5, z: 0.8 },
    ];
    sphereData.forEach((d, i) => {
      const geo = new THREE.SphereGeometry(d.r, 32, 32);
      const mat = new THREE.MeshStandardMaterial({
        color: d.col,
        emissive: d.col,
        emissiveIntensity: 0.6,
        metalness: 0.5,
        roughness: 0.3
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(d.x, d.y, d.z);
      scene.add(mesh);
      spheres.push({ mesh, initY: d.y, phase: i * (Math.PI * 2 / sphereData.length), speed: 0.6 + Math.random() * 0.4 });
    });

    // ── Mouse Interaction ─────────────────────────
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    document.addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    // ── Animation Loop ───────────────────────────
    let clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth mouse follow
      target.x += (mouse.x - target.x) * 0.05;
      target.y += (mouse.y - target.y) * 0.05;

      // Camera gentle drift
      camera.position.x = target.x * 0.5;
      camera.position.y = target.y * 0.3;
      camera.lookAt(scene.position);

      // Rotate particles
      particles.rotation.y = elapsed * 0.04;
      particles.rotation.x = elapsed * 0.01;

      // Animate cloth vertices
      const posAttr = clothGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        posAttr.setZ(i,
          Math.sin(x * 0.5 + elapsed * 0.7) * 0.25 +
          Math.cos(y * 0.4 + elapsed * 0.5) * 0.2 +
          Math.sin((x + y) * 0.3 + elapsed * 0.3) * 0.15
        );
      }
      posAttr.needsUpdate = true;
      clothGeo.computeVertexNormals();

      // Animate rings
      rings.forEach((r, i) => {
        r.mesh.rotation.x += r.speed;
        r.mesh.rotation.y += r.speed * 0.6;
        r.mesh.rotation.z += r.speed * 0.4;
      });

      // Animate spheres (float)
      spheres.forEach(s => {
        s.mesh.position.y = s.initY + Math.sin(elapsed * s.speed + s.phase) * 0.3;
        s.mesh.rotation.y += 0.01;
      });

      // Animate lights
      light1.position.x = Math.sin(elapsed * 0.4) * 6;
      light1.position.y = Math.cos(elapsed * 0.3) * 4;
      light2.position.x = Math.cos(elapsed * 0.35) * 5;
      light2.position.y = Math.sin(elapsed * 0.25) * 3;

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ───────────────────────────────────
    function onResize() {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', onResize);

    // ── Render Featured Products ─────────────────
    function renderFeaturedProducts() {
      const grid = document.getElementById('featuredGrid');
      if (!grid) return;
      const products = Store.getFeaturedProducts().slice(0, 4);
      grid.innerHTML = products.map(p => `
      <div class="product-card reveal" onclick="location.href='product.html?id=${p.id}'">
        <div class="product-card-img">
          <img src="${p.images[0]}" alt="${p.title}" loading="lazy">
          ${getBadgeHTML(p.badge)}
          <div class="product-card-wishlist">♡</div>
        </div>
        <div class="product-card-body">
          <div class="product-card-cat">${p.category}</div>
          <div class="product-card-name">${p.title}</div>
          <div class="product-card-price">
            <span class="price-current">${formatPrice(p.price)}</span>
            ${p.originalPrice ? `<span class="price-original">${formatPrice(p.originalPrice)}</span>` : ''}
            ${p.originalPrice ? `<span class="price-discount">${getDiscount(p.price, p.originalPrice)}</span>` : ''}
          </div>
        </div>
        <div class="product-card-actions">
          <button class="product-card-quick-add" onclick="event.stopPropagation(); quickAdd('${p.id}')">+ Quick Add</button>
        </div>
      </div>
    `).join('');
      initReveal();
    }

    window.quickAdd = function (id) {
      const product = Store.getProduct(id);
      if (!product) return;
      const size = product.sizes[Math.floor(product.sizes.length / 2)];
      const color = product.colors[0];
      Store.addToCart(id, size, color, 1);
      showToast(`${product.title} added to cart!`, 'cart');
      updateCartBadge();
    };

    renderFeaturedProducts();
  })();
}); // end window load

/* ── Promo Banner: Countdown Timer + Dismiss ── */
(function () {
  // Set sale end date: 2 days, 14 hrs, 48 min from now
  const saleEnd = new Date();
  saleEnd.setDate(saleEnd.getDate() + 2);
  saleEnd.setHours(saleEnd.getHours() + 14);
  saleEnd.setMinutes(saleEnd.getMinutes() + 48);

  function pad(n) { return String(n).padStart(2, '0'); }

  function updateCountdown() {
    const diff = saleEnd - Date.now();
    if (diff <= 0) {
      document.getElementById('promoCountdown') && (document.getElementById('promoCountdown').style.display = 'none');
      return;
    }
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const sec = Math.floor((diff % 60000) / 1000);
    const d = document.getElementById('cdDays');
    const h = document.getElementById('cdHrs');
    const m = document.getElementById('cdMin');
    const s = document.getElementById('cdSec');
    if (d) d.textContent = pad(days);
    if (h) h.textContent = pad(hrs);
    if (m) m.textContent = pad(min);
    if (s) {
      if (s.textContent !== pad(sec)) {
        s.classList.add('tick');
        setTimeout(() => s.classList.remove('tick'), 300);
      }
      s.textContent = pad(sec);
    }
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Close button
  const closeBtn = document.getElementById('promoClose');
  const banner = document.getElementById('promoBanner');
  const hero = document.getElementById('hero');
  const NAV_H = 72; // matches --nav-h CSS variable

  function applyHeroOffset() {
    if (!hero) return;
    if (window.innerWidth <= 768) {
      // On mobile, banner is in natural flow after navbar, hero needs standard compact padding
      hero.style.paddingTop = '24px';
      return;
    }
    const bannerH = (banner && !banner.classList.contains('promo-ad-hiding'))
      ? banner.offsetHeight : 0;
    hero.style.paddingTop = (NAV_H + bannerH) + 'px';
  }

  applyHeroOffset();
  window.addEventListener('resize', applyHeroOffset);

  if (closeBtn && banner) {
    closeBtn.addEventListener('click', function () {
      banner.classList.add('promo-ad-hiding');
      // Smoothly shrink hero padding as banner collapses
      if (hero && window.innerWidth > 768) {
        hero.style.transition = 'padding-top 0.5s cubic-bezier(0.4,0,0.2,1)';
        hero.style.paddingTop = NAV_H + 'px';
      }
      setTimeout(() => {
        banner.style.display = 'none';
        if (hero) hero.style.transition = '';
      }, 500);
    });
  }
})();
