/* Kings Lighting Design: shared light-effects engine, used by the console (index) and the Effects page. */
(function () {
  const TAU = Math.PI * 2;
  const FORMS = {
    sine: p => 0.5 - 0.5 * Math.cos(p * TAU),
    square: p => ((p % 1) + 1) % 1 < 0.5 ? 1 : 0,
    saw: p => ((p % 1) + 1) % 1,
    ramp: p => 1 - (((p % 1) + 1) % 1),
    pulse: p => ((p % 1) + 1) % 1 < 0.18 ? 1 : 0
  };
  const KINDS = {
    dimmer: { label: 'Dimmer', forms: [['sine', 'Smooth wave'], ['square', 'On / off chase'], ['saw', 'Fade in, snap off'], ['ramp', 'Snap on, fade out'], ['pulse', 'Short pulse'], ['sparkle', 'Random sparkle']], sizeLabel: 'Level', sizeUnit: '%', sizeMax: 100 },
    position: { label: 'Movement', forms: [['circle', 'Circle (ballyhoo)'], ['pan', 'Side-to-side sweep'], ['tilt', 'Up-and-down wave'], ['eight', 'Figure of eight']], sizeLabel: 'Size', sizeUnit: '°', sizeMax: 60 },
    color: { label: 'Colour', forms: [['rainbow', 'Rainbow'], ['ab', 'Bounce between two colours']], sizeLabel: 'Saturation', sizeUnit: '%', sizeMax: 100 },
    zoom: { label: 'Beam size', forms: [['sine', 'Breathe'], ['square', 'Snap wide / narrow']], sizeLabel: 'Depth', sizeUnit: '%', sizeMax: 100 }
  };
  const DIRS = [['ltr', 'Left to right'], ['rtl', 'Right to left'], ['out', 'Centre out'], ['in', 'Outside in'], ['random', 'Random order']];
  const TARGETS = [
    ['all', 'All lights'],
    ['type:spot', 'Moving spots'], ['type:wash', 'Moving washes'], ['type:beam', 'Moving beams'],
    ['type:profile', 'Profiles'], ['type:fresnel', 'Fresnels'], ['type:par', 'LED PARs'],
    ['type:strobe', 'Strobes'], ['type:laser', 'Lasers'], ['type:blinder', 'Blinders'],
    ['truss:foh', 'FOH truss'], ['truss:e1', '1st electric'], ['truss:e2', '2nd electric'],
    ['truss:e3', '3rd electric'], ['truss:e4', '4th electric'], ['truss:e5', '5th electric'],
    ['truss:e6', '6th electric'], ['truss:e7', '7th electric'], ['truss:e8', '8th electric'],
    ['truss:floor', 'Upstage floor']
  ];
  const DEFAULTS = [
    { id: 'fx-chase', name: 'Dimmer chase', kind: 'dimmer', form: 'square', target: 'type:par', speed: 1, size: 100, spread: 360, dir: 'ltr', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-wave', name: 'Slow wave', kind: 'dimmer', form: 'sine', target: 'type:wash', speed: 0.3, size: 85, spread: 360, dir: 'ltr', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-rainbow', name: 'Rainbow', kind: 'color', form: 'rainbow', target: 'type:wash', speed: 0.15, size: 100, spread: 360, dir: 'ltr', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-circle', name: 'Ballyhoo circle', kind: 'position', form: 'circle', target: 'type:spot', speed: 0.4, size: 20, spread: 90, dir: 'ltr', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-sweep', name: 'Beam sweep', kind: 'position', form: 'pan', target: 'type:beam', speed: 0.25, size: 35, spread: 180, dir: 'out', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-bounce', name: 'Colour bounce', kind: 'color', form: 'ab', target: 'all', speed: 0.5, size: 100, spread: 180, dir: 'ltr', a: '#ff3c9a', b: '#00a8a8' },
    { id: 'fx-sparkle', name: 'Sparkle', kind: 'dimmer', form: 'sparkle', target: 'type:par', speed: 2, size: 100, spread: 360, dir: 'random', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-breathe', name: 'Zoom breathe', kind: 'zoom', form: 'sine', target: 'type:spot', speed: 0.3, size: 60, spread: 0, dir: 'ltr', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-rave-colour', name: 'Rave rainbow', kind: 'color', form: 'rainbow', target: 'type:wash', speed: 0.6, size: 100, spread: 360, dir: 'out', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-rave-tilt', name: 'Rave beam wave', kind: 'position', form: 'eight', target: 'type:beam', speed: 0.45, size: 28, spread: 360, dir: 'ltr', a: '#ffffff', b: '#2b5cff' },
    { id: 'fx-rave-chase', name: 'Blinder chase', kind: 'dimmer', form: 'pulse', target: 'truss:e8', speed: 2.5, size: 100, spread: 360, dir: 'random', a: '#ffffff', b: '#2b5cff' }
  ];
  // Dimmer flashing is capped at 3 cycles a second so the preview never flashes faster than is safe.
  const SAFE_HZ = 3;
  const KEY = 'kld-fx-v1';

  function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function hexRgb(h) { return [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255); }
  function hsv(hh, s) {
    const i = Math.floor(hh * 6), f = hh * 6 - i, q = 1 - f * s, t = 1 - (1 - f) * s, p = 1 - s;
    return [[1, t, p], [q, 1, p], [p, 1, t], [p, q, 1], [t, p, 1], [1, p, q]][((i % 6) + 6) % 6];
  }
  function order(dir, i, n) {
    if (n <= 1) return 0;
    if (dir === 'rtl') return (n - 1 - i) / n;
    if (dir === 'out') return Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) * (n - 1) / n;
    if (dir === 'in') return (1 - Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)) * (n - 1) / n;
    if (dir === 'random') return hash(i, 17);
    return i / n;
  }
  /* i = this light's place in the effect's lights (left to right), n = how many, t = seconds.
     Returns what the effect does to the light: { dim } 0–100, { pan, tilt } degrees added, { r, g, b } 0–1, or { zoomT } 0–1. */
  function evalFx(def, i, n, t) {
    const off = (def.spread / 360) * order(def.dir, i, n);
    let speed = +def.speed || 0;
    if (def.kind === 'dimmer' && def.form !== 'sine') speed = Math.min(speed, SAFE_HZ);
    const p = t * speed + off;
    const size = +def.size || 0;
    if (def.kind === 'dimmer') {
      if (def.form === 'sparkle') {
        const cyc = Math.floor(t * speed + hash(i, 5)), fr = (t * speed + hash(i, 5)) % 1;
        return { dim: hash(cyc, i + 31) > 0.55 && fr < 0.3 ? size : 0 };
      }
      return { dim: size * (FORMS[def.form] || FORMS.sine)(p) };
    }
    if (def.kind === 'position') {
      const a = p * TAU;
      if (def.form === 'pan') return { pan: size * Math.sin(a), tilt: 0 };
      if (def.form === 'tilt') return { pan: 0, tilt: size * Math.sin(a) };
      if (def.form === 'eight') return { pan: size * Math.sin(a), tilt: size * 0.5 * Math.sin(2 * a) };
      return { pan: size * Math.sin(a), tilt: size * 0.6 * Math.cos(a) };
    }
    if (def.kind === 'color') {
      const s = size / 100;
      if (def.form === 'ab') {
        const w = FORMS.sine(p), A = hexRgb(def.a || '#ffffff'), B = hexRgb(def.b || '#2b5cff');
        const c = A.map((v, k) => v + (B[k] - v) * w);
        return { r: 1 - s + s * c[0], g: 1 - s + s * c[1], b: 1 - s + s * c[2] };
      }
      const c = hsv(((p % 1) + 1) % 1, s);
      return { r: c[0], g: c[1], b: c[2] };
    }
    if (def.kind === 'zoom') return { zoomT: (size / 100) * (FORMS[def.form] || FORMS.sine)(p) };
    return {};
  }
  function matches(def, f) {
    if (!def.target || def.target === 'all') return true;
    const [k, v] = def.target.split(':');
    return k === 'type' ? f.type === v : f.truss === v;
  }
  const SEEN = 'kld-fx-seen-v1';
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(d) && d.every(x => x && x.id && x.kind)) {
        // Starter effects added in a later version join a saved library once; ones you deleted stay deleted.
        const seen = JSON.parse(localStorage.getItem(SEEN) || '["fx-chase","fx-wave","fx-rainbow","fx-circle","fx-sweep","fx-bounce","fx-sparkle","fx-breathe"]');
        const add = DEFAULTS.filter(x => !seen.includes(x.id) && !d.some(y => y.id === x.id));
        if (add.length) { d.push(...JSON.parse(JSON.stringify(add))); localStorage.setItem(KEY, JSON.stringify(d)); }
        localStorage.setItem(SEEN, JSON.stringify(DEFAULTS.map(x => x.id)));
        return d;
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); localStorage.setItem(SEEN, JSON.stringify(DEFAULTS.map(x => x.id))); return true; } catch (e) { return false; } }
  function targetLabel(t) { const x = TARGETS.find(y => y[0] === t); return x ? x[1] : t; }
  function formLabel(def) { const k = KINDS[def.kind]; const x = k && k.forms.find(y => y[0] === def.form); return x ? x[1] : def.form; }

  // Admin sign-in shared by the console and the Effects page (a convenience lock; the check runs in the browser).
  const ADMIN_HASH = '552172236d355551c44d06b7dfd19873e250a895f5fa1940dde8b2800afbb52e';
  const ADMIN_KEY = 'kld-admin-v1';
  async function digest(email, pass) {
    const data = new TextEncoder().encode('kld-admin|' + email.trim().toLowerCase() + '|' + pass);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.KLD_FX = { KINDS, DIRS, TARGETS, DEFAULTS, KEY, SAFE_HZ, evalFx, matches, load, save, targetLabel, formLabel, hexRgb, ADMIN_HASH, ADMIN_KEY, digest };
})();
