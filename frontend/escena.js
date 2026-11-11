/* Escena 3D (Three.js): fondo de centro de datos + gráfica 3D de columnas.
   Se sirve en /static/escena.js. index.html le entrega los datos con Escena.datos(). */
const Escena = (() => {
  const T = THREE, reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const api = {alElegir: () => {}, alSalir: () => {}};
  let carga = .5, ptr = {x: 0, y: 0};
  const PASO = 3.2, N = 16;

  // ============ FONDO: pasillo de racks que avanza; los LED laten con la carga ============
  const bg = new T.WebGLRenderer({canvas: document.getElementById("fondo"), antialias: true, alpha: true});
  bg.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sb = new T.Scene(); sb.fog = new T.FogExp2(0x0c0e29, .055);
  const cb = new T.PerspectiveCamera(60, 1, .1, 120); cb.position.set(0, 2.6, 9);
  const pasillo = new T.Group(); sb.add(pasillo);
  const cajaG = new T.BoxGeometry(1.7, 5.2, 1.5), bordes = new T.EdgesGeometry(cajaG);
  const matCaja = new T.MeshBasicMaterial({color: 0x0e1033}), matLinea = new T.LineBasicMaterial({color: 0x6d63ff, transparent: true, opacity: .55});
  const pos = [], col = [], paleta = [[1, .36, .58], [1, .76, .35], [.43, .9, .66], [.73, .71, 1]];
  for (let k = 0; k < N; k++) for (const s of [-1, 1]) {
    const r = new T.Group(); r.position.set(s * 6, 2.6, -k * PASO);
    r.add(new T.Mesh(cajaG, matCaja), new T.LineSegments(bordes, matLinea)); pasillo.add(r);
    for (let j = 0; j < 22; j++) {
      pos.push(s * 6 - s * .88, 2.6 + (Math.random() - .5) * 4.6, -k * PASO + (Math.random() - .5) * 1.2);
      col.push(...paleta[Math.floor(Math.random() * 4)]);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(pos, 3));
  const colores = new T.Float32BufferAttribute(col, 3); g.setAttribute("color", colores);
  const leds = new T.Points(g, new T.PointsMaterial({size: .16, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending}));
  pasillo.add(leds);
  const suelo = new T.GridHelper(80, 40, 0xff5c93, 0x3a3590); suelo.position.set(0, 0, -20); suelo.material.transparent = true; suelo.material.opacity = .45;
  pasillo.add(suelo);

  // ============ GRÁFICA 3D ============
  const caja = document.getElementById("c3d");
  const r3 = new T.WebGLRenderer({antialias: true, alpha: true}); r3.setPixelRatio(Math.min(devicePixelRatio, 2)); caja.appendChild(r3.domElement);
  const s3 = new T.Scene(), c3 = new T.PerspectiveCamera(42, 1, .1, 200);
  s3.add(new T.AmbientLight(0xffffff, .7)); const sol = new T.DirectionalLight(0xffffff, .9); sol.position.set(6, 12, 8); s3.add(sol);
  const suelo3 = new T.GridHelper(26, 26, 0x6d63ff, 0x2a2870); s3.add(suelo3);
  const barras = new T.Group(); s3.add(barras);
  const unit = new T.BoxGeometry(1, 1, 1);
  let items = [], visible = false, az = .5, el = .5, arrastre = null, hoverI = null, t0 = 0;
  const ray = new T.Raycaster(), m = new T.Vector2();

  api.datos = (pts, nH, c) => {
    barras.children.slice().forEach(o => { barras.remove(o); o.material.dispose(); });
    items = [];
    let lo = Infinity, hi = -Infinity; pts.forEach(p => { lo = Math.min(lo, p.lo ?? p.v); hi = Math.max(hi, p.hi ?? p.v); });
    const alto = v => .15 + (v - lo) / ((hi - lo) || 1) * 7;
    const w = Math.min(.8, 22 / pts.length * .78), x0 = -11;
    const hist = pts.filter(p => p.real).map(p => p.v);
    carga = hist.length ? Math.min(1, Math.max(0, (pts[nH]?.v - lo) / ((hi - lo) || 1))) : .5;
    pts.forEach((p, i) => {
      const x = x0 + (22 * i) / Math.max(pts.length - 1, 1), h = alto(p.v);
      const color = p.real ? new T.Color(0xb9b4ff) : new T.Color(0xff5c93).lerp(new T.Color(0xffc15a), (i - nH) / Math.max(pts.length - nH - 1, 1));
      const b = new T.Mesh(unit, new T.MeshLambertMaterial({color, emissive: 0x000000}));
      b.position.set(x, 0, 0); b.scale.set(w, .001, w); b.userData = {i, h, base: color, x};
      barras.add(b); items.push(b);
      if (!p.real) {                                  // intervalo: caja translúcida de límite inferior a superior
        const a = alto(p.lo), z = alto(p.hi), iv = new T.Mesh(unit, new T.MeshBasicMaterial({color: 0xffc15a, transparent: true, opacity: .16, depthWrite: false}));
        iv.position.set(x, (a + z) / 2, 0); iv.scale.set(w * 1.5, z - a, w * 1.5); barras.add(iv);
      }
    });
    t0 = performance.now(); hoverI = null;
  };

  const lienzo3 = () => caja.parentElement;
  function elegir(ev) {
    const r = r3.domElement.getBoundingClientRect(); m.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(m, c3); const h = ray.intersectObjects(items)[0];
    const i = h ? h.object.userData.i : null;
    if (i !== hoverI) { hoverI = i; i === null ? api.alSalir() : api.alElegir(i); }
  }
  const d = r3.domElement; d.style.cursor = "grab"; d.style.touchAction = "none";
  d.addEventListener("pointerdown", e => { arrastre = {x: e.clientX, y: e.clientY, az, el}; d.setPointerCapture(e.pointerId); d.style.cursor = "grabbing"; });
  d.addEventListener("pointerup", () => { arrastre = null; d.style.cursor = "grab"; });
  d.addEventListener("pointermove", e => {
    if (arrastre) { az = arrastre.az - (e.clientX - arrastre.x) * .008; el = Math.max(.12, Math.min(1.3, arrastre.el + (e.clientY - arrastre.y) * .006)); }
    else elegir(e);
  });
  d.addEventListener("pointerleave", () => { if (hoverI !== null) { hoverI = null; api.alSalir(); } });

  // ============ bucle y tamaño ============
  function tamano() {
    bg.setSize(innerWidth, innerHeight, false); cb.aspect = innerWidth / innerHeight; cb.updateProjectionMatrix();
    const w = caja.clientWidth, h = caja.clientHeight; if (w && h) { r3.setSize(w, h, false); d.style.width = "100%"; d.style.height = "100%"; c3.aspect = w / h; c3.updateProjectionMatrix(); }
  }
  addEventListener("resize", tamano); addEventListener("pointermove", e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; });
  api.visible = v => { visible = v; tamano(); };
  const ease = k => 1 - Math.pow(1 - k, 3);

  function bucle(ms) {
    const t = ms / 1000, vel = reducido ? 0 : .35 + carga * 1.5;
    pasillo.position.z = (t * vel) % PASO;                       // avanzas por el pasillo; más carga = más rápido
    cb.position.x += (ptr.x * 1.3 - cb.position.x) * .03; cb.position.y += (2.6 - ptr.y * .6 - cb.position.y) * .03; cb.lookAt(0, 2.4, -14);
    leds.material.opacity = .5 + carga * .4 + (reducido ? 0 : Math.sin(t * (2 + carga * 6)) * .12);
    leds.material.size = .12 + carga * .12;
    if (!reducido) { for (let k = 0; k < 14; k++) { const i = Math.floor(Math.random() * colores.count), p = paleta[Math.floor(Math.random() * 4)], on = Math.random() < .35 ? .12 : 1;
      colores.setXYZ(i, p[0] * on, p[1] * on, p[2] * on); } colores.needsUpdate = true; }
    matLinea.color.setHSL(.68 - carga * .1, .9, .62);
    bg.render(sb, cb);

    if (visible) {
      const k = Math.min((performance.now() - t0) / 1100, 1);
      items.forEach((b, i) => { const q = ease(Math.max(0, Math.min(1, k * 1.6 - i / items.length * .6)));
        b.scale.y = Math.max(b.userData.h * q, .001); b.position.y = b.scale.y / 2;
        b.material.emissive.setHex(i === hoverI ? 0x777777 : 0x000000); });
      const a = az + (arrastre || reducido ? 0 : Math.sin(t * .25) * .22), R = 27;
      c3.position.set(Math.sin(a) * Math.cos(el) * R, Math.sin(el) * R * .85 + 2, Math.cos(a) * Math.cos(el) * R); c3.lookAt(0, 3, 0);
      r3.render(s3, c3);
    }
    requestAnimationFrame(bucle);
  }
  tamano(); requestAnimationFrame(bucle);
  return api;
})();
