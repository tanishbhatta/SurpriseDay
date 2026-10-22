(() => {
  const C = window.CONTENT;
  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  // Placeholder shown when a photo file is missing
  const placeholder = (label) =>
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe3e8"/><stop offset="1" stop-color="#e9a9b8"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><text x="200" y="190" font-size="70" text-anchor="middle">📷</text><text x="200" y="250" font-family="sans-serif" font-size="18" fill="#8a1538" text-anchor="middle">${esc(label)}</text></svg>`
    );
  const setImg = (img, src) => {
    img.onerror = () => { img.onerror = null; img.src = placeholder("add " + src); };
    img.src = src;
  };

  // ---------- Text ----------
  document.querySelectorAll("[data-name]").forEach((el) => (el.textContent = C.name));
  $("heroLine").textContent = C.heroLine;

  // ---------- Gate + music ----------
  const audio = $("audio");
  const musicBtn = $("musicBtn");
  if (C.music) {
    audio.src = C.music;
    audio.addEventListener("canplay", () => musicBtn.classList.remove("hidden"), { once: true });
    audio.addEventListener("play", () => musicBtn.classList.add("playing"));
    audio.addEventListener("pause", () => musicBtn.classList.remove("playing"));
    musicBtn.onclick = () => (audio.paused ? audio.play() : audio.pause());
  }
  document.body.classList.add("locked");
  $("gateBtn").onclick = () => {
    $("gate").classList.add("gone");
    document.body.classList.remove("locked");
    if (C.music) { audio.load(); audio.play().catch(() => {}); }
    confetti(160);
  };

  // ---------- Floating hearts ----------
  const hearts = $("hearts");
  setInterval(() => {
    if (document.hidden) return;
    const h = document.createElement("span");
    h.className = "fh";
    h.textContent = Math.random() < 0.8 ? "❤" : "♡";
    h.style.left = rand(0, 100) + "vw";
    h.style.fontSize = rand(10, 26) + "px";
    h.style.setProperty("--dx", rand(-60, 60) + "px");
    h.style.setProperty("--rot", rand(-90, 90) + "deg");
    h.style.animationDuration = rand(8, 15) + "s";
    hearts.appendChild(h);
    setTimeout(() => h.remove(), 16000);
  }, 700);

  // ---------- Reveal on scroll ----------
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      if (e.target.classList.contains("finale")) confetti(220);
      io.unobserve(e.target);
    }),
    { threshold: 0.15 }
  );
  document.querySelectorAll(".card, .finale").forEach((el) => io.observe(el));

  // ---------- 2. Scratch card ----------
  $("scratchTitle").textContent = C.scratch.title;
  $("scratchSub").textContent = C.scratch.subtitle;
  setImg($("scratchImg"), C.scratch.photo);
  (() => {
    const wrap = $("scratchWrap"), cv = $("scratchCanvas"), ctx = cv.getContext("2d");
    let done = false, drawing = false, moves = 0;
    function paint() {
      const r = wrap.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      cv.width = r.width * dpr; cv.height = r.height * dpr;
      ctx.scale(dpr, dpr);
      const g = ctx.createLinearGradient(0, 0, r.width, r.height);
      g.addColorStop(0, "#c77b8c"); g.addColorStop(0.45, "#dba0ad"); g.addColorStop(1, "#b9566f");
      ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);
      ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.font = "14px sans-serif";
      for (let y = 20; y < r.height; y += 34)
        for (let x = (y / 34) % 2 ? 10 : 27; x < r.width; x += 34) ctx.fillText("♥", x, y);
      ctx.strokeStyle = "rgba(255,255,255,.45)"; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 10, r.width - 20, r.height - 20);
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = ctx.lineJoin = "round"; ctx.setLineDash([]);
      ctx.lineWidth = Math.max(36, r.width / 9);
    }
    paint();
    let last = null;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    function scratch(e) {
      if (!drawing || done) return;
      const p = pos(e);
      ctx.beginPath(); ctx.moveTo(...(last || p)); ctx.lineTo(...p); ctx.stroke();
      last = p;
      if (++moves % 12 === 0) check();
    }
    function check() {
      const d = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, n = 0;
      for (let i = 3; i < d.length; i += 4 * 40) { n++; if (d[i] === 0) clear++; }
      if (clear / n > 0.5) finish();
    }
    function finish() {
      done = true; cv.style.opacity = 0; cv.style.pointerEvents = "none";
      $("scratchCaption").textContent = C.scratch.caption;
      $("scratchCaption").classList.remove("hidden");
      confetti(120);
    }
    cv.addEventListener("pointerdown", (e) => { drawing = true; last = null; $("scratchHint").style.opacity = 0; cv.setPointerCapture(e.pointerId); scratch(e); });
    cv.addEventListener("pointermove", scratch);
    ["pointerup", "pointercancel"].forEach((t) => cv.addEventListener(t, () => { drawing = false; if (!done) check(); }));
  })();

  // ---------- 3. Letter ----------
  $("sealLetter").textContent = C.letter.sealLetter;
  $("letterTo").textContent = C.letter.to;
  $("letterBody").innerHTML = C.letter.body.split(/\n\s*\n/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  $("letterFrom").textContent = C.letter.from;
  const env = $("envelope"), modal = $("letterModal");
  function openLetter() {
    env.classList.add("open");
    $("envBtn").textContent = "💌 Read it again";
    setTimeout(() => modal.classList.add("show"), env.dataset.opened ? 0 : 1100);
    env.dataset.opened = 1;
  }
  env.onclick = openLetter; $("envBtn").onclick = openLetter;
  env.onkeydown = (e) => (e.key === "Enter" || e.key === " ") && openLetter();
  $("closeLetter").onclick = () => modal.classList.remove("show");
  modal.onclick = (e) => e.target === modal && modal.classList.remove("show");

  // ---------- 4. Reasons ----------
  $("reasonsChip").textContent = `💗 ${C.reasons.length} reasons`;
  $("reasons").innerHTML = C.reasons.map(([emo, txt], i) =>
    `<li style="--r:${(i % 2 ? 1 : -1) * rand(0.3, 1.1)}deg"><span class="emo">${emo}</span><span class="txt">${esc(txt)}</span><span class="num">${i + 1}</span></li>`
  ).join("");

  // ---------- 5. Wheel ----------
  (() => {
    const W = C.wheel, opts = W.options, n = opts.length;
    $("wheelTitle").textContent = W.title;
    $("wheelSub").textContent = W.subtitle;
    const cv = $("wheel"), ctx = cv.getContext("2d"), R = 300, seg = (Math.PI * 2) / n;
    const colors = ["#c4566f", "#a01f45", "#d4708a", "#8a1538", "#e08ba0", "#b33a5c", "#7a0f30", "#cc6680"];
    opts.forEach((o, i) => {
      const a0 = -Math.PI / 2 + i * seg, a1 = a0 + seg;
      ctx.beginPath(); ctx.moveTo(R, R); ctx.arc(R, R, R - 4, a0, a1); ctx.closePath();
      const g = ctx.createRadialGradient(R, R, 40, R, R, R);
      g.addColorStop(0, colors[i % colors.length]); g.addColorStop(1, shade(colors[i % colors.length], -18));
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = "#fbe3e8"; ctx.lineWidth = 4; ctx.stroke();
      const mid = a0 + seg / 2, flip = Math.cos(mid) < -0.01; // keep left-side labels upright
      ctx.save(); ctx.translate(R, R); ctx.rotate(flip ? mid + Math.PI : mid);
      ctx.fillStyle = "#fff"; ctx.textAlign = flip ? "left" : "right"; ctx.textBaseline = "middle";
      let size = 30; ctx.font = `800 ${size}px Nunito, sans-serif`;
      while (ctx.measureText(o.label).width > R - 90 && size > 14) ctx.font = `800 ${--size}px Nunito, sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 4;
      ctx.fillText(o.label, flip ? -(R - 26) : R - 26, 0);
      ctx.restore();
    });
    function shade(hex, p) {
      const v = parseInt(hex.slice(1), 16), f = (c) => Math.max(0, Math.min(255, c + p));
      return `rgb(${f(v >> 16)},${f((v >> 8) & 255)},${f(v & 255)})`;
    }

    const key = "jebi-spins";
    const history = JSON.parse(store.get(key) || "[]");
    const btn = $("spinBtn"), out = $("spinResult");
    let rot = 0;
    const left = () => W.spinsAllowed - history.length;
    function showResult(label, fresh) {
      out.innerHTML = `${fresh ? "You won" : "You already won"}<b>${esc(label)}</b>Screenshot this. It's officially yours, birthday girl. 💝`;
      out.classList.remove("hidden");
    }
    if (history.length) showResult(history[history.length - 1], false);
    if (left() <= 0) { btn.disabled = true; btn.textContent = "Gift claimed 💝"; }

    btn.onclick = () => {
      if (left() <= 0) return;
      btn.disabled = true; out.classList.add("hidden");
      const total = opts.reduce((s, o) => s + (o.weight ?? 1), 0);
      let r = Math.random() * total, idx = 0;
      while ((r -= opts[idx].weight ?? 1) > 0) idx++;
      const segDeg = 360 / n, target = idx * segDeg + segDeg / 2 + rand(-0.35, 0.35) * segDeg;
      rot += 360 * 6 + ((360 - target - (rot % 360)) % 360 + 360) % 360;
      cv.style.transform = `rotate(${rot}deg)`;
      const label = opts[idx].label;
      setTimeout(() => {
        history.push(label); store.set(key, JSON.stringify(history));
        showResult(label, true); confetti(260);
        fetch("api/spin", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: label, spin: history.length, at: new Date().toISOString() }),
        }).catch(() => {});
        if (left() > 0) { btn.disabled = false; btn.textContent = `Spin again (${left()} left)`; }
        else btn.textContent = "Gift claimed 💝";
      }, 6200);
    };
  })();

  // ---------- 6. Songs ----------
  $("songs").innerHTML = C.songs.map((s) =>
    `<a class="song" href="${esc(s.link || "#")}" target="_blank" rel="noopener"><span class="vinyl"></span><span class="meta"><div class="t">${esc(s.title)}</div><div class="a">${esc(s.artist)}</div>${s.note ? `<div class="n">${esc(s.note)}</div>` : ""}</span><span class="play">▶</span></a>`
  ).join("");

  // ---------- 7. Favourites ----------
  const pol = $("polaroids");
  C.favourites.forEach((f) => {
    const fig = document.createElement("figure");
    fig.className = "polaroid";
    fig.style.setProperty("--r", rand(-5, 5) + "deg");
    fig.innerHTML = `<img alt="" loading="lazy"><figcaption>${esc(f.caption)}</figcaption>`;
    const img = fig.querySelector("img");
    setImg(img, f.photo);
    fig.onclick = () => { $("lbImg").src = img.src; $("lbCap").textContent = f.caption; $("lightbox").classList.add("show"); };
    pol.appendChild(fig);
  });
  $("lightbox").onclick = () => $("lightbox").classList.remove("show");

  // ---------- 8. Moon ----------
  (() => {
    const [y, m, d] = C.birthDate.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    const SYN = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
    const age = ((((date - ref) / 864e5) % SYN) + SYN) % SYN;
    const f = age / SYN;
    const illum = Math.round(((1 - Math.cos(2 * Math.PI * f)) / 2) * 100);
    const names = [
      [0.0339, "New Moon"], [0.216, "Waxing Crescent"], [0.284, "First Quarter"], [0.466, "Waxing Gibbous"],
      [0.534, "Full Moon"], [0.716, "Waning Gibbous"], [0.784, "Last Quarter"], [0.966, "Waning Crescent"], [1, "New Moon"],
    ];
    const name = names.find(([lim]) => f < lim)[1];
    const cx = 110, cy = 110, r = 96, rx = Math.abs(Math.cos(2 * Math.PI * f)) * r;
    const waxing = f < 0.5;
    const outer = waxing ? 1 : 0;
    const term = waxing ? (f < 0.25 ? 0 : 1) : (f < 0.75 ? 0 : 1);
    const lit = `M${cx},${cy - r} A${r},${r} 0 0 ${outer} ${cx},${cy + r} A${rx},${r} 0 0 ${term} ${cx},${cy - r}Z`;
    $("moon").innerHTML = `
      <defs>
        <radialGradient id="mg" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffaf0"/><stop offset=".7" stop-color="#f1e6d2"/><stop offset="1" stop-color="#d9c9ad"/></radialGradient>
        <clipPath id="lit"><path d="${lit}"/></clipPath>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="#2a1d33"/>
      <g clip-path="url(#lit)">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#mg)"/>
        <g fill="#cdbb9c" opacity=".55">
          <circle cx="80" cy="80" r="16"/><circle cx="140" cy="70" r="9"/><circle cx="125" cy="135" r="20"/>
          <circle cx="70" cy="145" r="10"/><circle cx="155" cy="115" r="7"/><circle cx="100" cy="110" r="6"/><circle cx="95" cy="175" r="8"/>
        </g>
      </g>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,240,220,.18)" stroke-width="1.5"/>`;
    const nice = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    $("moonDate").textContent = nice + (C.birthPlace ? " · " + C.birthPlace : "");
    $("moonName").textContent = name;
    const why = illum < 5
      ? "The moon stepped aside that night so you could be the brightest thing in the sky."
      : illum > 95
        ? "A full moon, lighting the whole sky up just for your arrival."
        : "The sky was already showing off for you.";
    $("moonNote").textContent = `${illum}% lit, ${Math.round(age)} days into its cycle. ${why}`;
    const stars = $("stars");
    for (let i = 0; i < 70; i++) {
      const s = document.createElement("span");
      s.className = "star";
      s.style.left = rand(0, 100) + "%"; s.style.top = rand(0, 100) + "%";
      const z = rand(1, 3); s.style.width = s.style.height = z + "px";
      s.style.animationDuration = rand(2, 5) + "s"; s.style.animationDelay = rand(0, 4) + "s";
      stars.appendChild(s);
    }
  })();

  // ---------- 9. Finale ----------
  $("finaleHead").textContent = C.finale.headline;
  $("finaleNames").innerHTML = C.finale.names.map((n, i) =>
    `<span style="--d:${0.3 + i * 0.18}s;--r:${rand(-6, 6)}deg">${esc(n)}</span>`
  ).join("");
  $("finaleClosing").textContent = C.finale.closing;
  $("confettiBtn").onclick = () => confetti(300);

  // ---------- Confetti ----------
  const cc = $("confetti"), cx2 = cc.getContext("2d");
  let parts = [], running = false;
  function confetti(count) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    cc.width = innerWidth; cc.height = innerHeight;
    const cols = ["#e0405e", "#ff8fa8", "#8a1538", "#ffd1dc", "#ffc857", "#fff"];
    for (let i = 0; i < count; i++) parts.push({
      x: rand(0, cc.width), y: rand(-cc.height * 0.5, -10), vx: rand(-2, 2), vy: rand(2, 6),
      s: rand(6, 12), a: rand(0, 6.28), va: rand(-0.2, 0.2), c: cols[i % cols.length], heart: Math.random() < 0.3,
    });
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    cx2.clearRect(0, 0, cc.width, cc.height);
    parts = parts.filter((p) => p.y < cc.height + 20);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.a += p.va;
      cx2.save(); cx2.translate(p.x, p.y); cx2.rotate(p.a); cx2.fillStyle = p.c;
      if (p.heart) { cx2.font = `${p.s * 1.6}px sans-serif`; cx2.fillText("♥", 0, 0); }
      else cx2.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx2.restore();
    }
    if (parts.length) requestAnimationFrame(tick);
    else { running = false; cx2.clearRect(0, 0, cc.width, cc.height); }
  }
})();
