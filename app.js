/* Particle cloud that morphs between a wobbling blob and a face. */

const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const micBtn = document.getElementById("mic");

const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0, CX = 0, CY = 0, R = 0;

function resize() {
  W = canvas.width = window.innerWidth * DPR;
  H = canvas.height = window.innerHeight * DPR;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  CX = W / 2;
  CY = H / 2;
  R = Math.min(W, H) * 0.26;
}
resize();
window.addEventListener("resize", resize);

/* ---------- Particle targets ---------- */

const N = 2200;

function fibSphere(n) {
  const pts = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const t = phi * i;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r]);
  }
  return pts;
}

const base = fibSphere(N);

function faceTargets(n) {
  const pts = [];
  // left eye
  const eye1 = Math.floor(n * 0.12);
  for (let i = 0; i < eye1; i++) {
    const a = (i / eye1) * Math.PI * 2;
    const rr = 0.06 + Math.random() * 0.04;
    pts.push([-0.32 + rr * Math.cos(a), -0.22 + rr * Math.sin(a), 0]);
  }
  // right eye
  const eye2 = Math.floor(n * 0.12);
  for (let i = 0; i < eye2; i++) {
    const a = (i / eye2) * Math.PI * 2;
    const rr = 0.06 + Math.random() * 0.04;
    pts.push([0.32 + rr * Math.cos(a), -0.22 + rr * Math.sin(a), 0]);
  }
  // mouth arc
  const mouth = Math.floor(n * 0.22);
  for (let i = 0; i < mouth; i++) {
    const t = i / (mouth - 1);
    const x = -0.35 + t * 0.7;
    const y = 0.3 + 0.12 * Math.sin(t * Math.PI);
    const jitter = (Math.random() - 0.5) * 0.03;
    pts.push([x + jitter, y + jitter, 0]);
  }
  // face outline (elliptical)
  const outline = n - pts.length;
  for (let i = 0; i < outline; i++) {
    const a = (i / outline) * Math.PI * 2;
    const jitter = 1 + (Math.random() - 0.5) * 0.06;
    pts.push([0.82 * Math.cos(a) * jitter, 0.95 * Math.sin(a) * jitter, 0]);
  }
  // shuffle so morphing looks organic
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
}

const face = faceTargets(N);

function heartTargets(n) {
  const raw = [];
  const gap = 0.045;
  let tries = 0;
  while (raw.length < n && tries < n * 40) {
    tries++;
    const x = (Math.random() - 0.5) * 2.4;
    const y = (Math.random() - 0.5) * 2.4;
    const ym = -y; // math-convention y (up)
    const v = Math.pow(x * x + ym * ym - 1, 3) - x * x * ym * ym * ym;
    if (v <= 0) {
      const isLeft = x < 0;
      const xOff = isLeft ? -gap : gap;
      raw.push({
        x: (x + xOff) * 0.6,
        y: y * 0.6,
        z: 0,
        side: isLeft ? "left" : "right",
      });
    }
  }
  while (raw.length < n) raw.push(raw[raw.length - 1]);
  // shuffle for smoother morph
  for (let i = raw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [raw[i], raw[j]] = [raw[j], raw[i]];
  }
  return raw.slice(0, n);
}

const heart = heartTargets(N);

/* ---------- Particles ---------- */

const particles = [];
for (let i = 0; i < N; i++) {
  const [x, y, z] = base[i];
  particles.push({
    bx: x, by: y, bz: z,
    x, y, z,
    tx: x, ty: y, tz: z,
    jitter: Math.random() * Math.PI * 2,
  });
}

/* ---------- State ---------- */

let mode = "blob";      // "blob" | "face" | "happy"
let intensity = 0.15;   // blob wobble amount
let rotSpeed = 0.004;
let angle = 0;
let t = 0;

function setMode(next) {
  mode = next;
  document.body.classList.toggle("happy", next === "happy");
}

/* ---------- Render ---------- */

function render() {
  t += 0.016;
  angle += rotSpeed;

  // slight trail; clear color matches body background
  ctx.fillStyle =
    mode === "happy" ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.22)";
  ctx.fillRect(0, 0, W, H);

  const sa = Math.sin(angle);
  const ca = Math.cos(angle);

  for (let i = 0; i < N; i++) {
    const p = particles[i];

    // compute target position
    if (mode === "blob") {
      const wob =
        1 +
        intensity *
          (Math.sin(p.bx * 3 + t * 1.2 + p.jitter) *
           Math.cos(p.by * 3 + t * 0.9) +
           Math.sin(p.bz * 4 + t * 0.7) * 0.4);
      p.tx = p.bx * wob;
      p.ty = p.by * wob;
      p.tz = p.bz * wob;
    } else if (mode === "face") {
      const f = face[i];
      const breathe = 1 + 0.02 * Math.sin(t * 2 + p.jitter);
      p.tx = f[0] * breathe;
      p.ty = f[1] * breathe;
      p.tz = f[2];
    } else {
      // happy: heart shape, gentle pulse
      const h = heart[i];
      const pulse = 1 + 0.035 * Math.sin(t * 2.4 + p.jitter);
      p.tx = h.x * pulse;
      p.ty = h.y * pulse;
      p.tz = h.z;
    }

    // ease toward target
    const k = mode === "blob" ? 0.08 : 0.07;
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;
    p.z += (p.tz - p.z) * k;

    // rotate around Y axis
    const rx = p.x * ca - p.z * sa;
    const rz = p.x * sa + p.z * ca;

    // perspective project
    const persp = 2.2 / (2.2 + rz);
    const sx = CX + rx * R * persp;
    const sy = CY + p.y * R * persp;

    const depth = (rz + 1) / 2;             // 0 back, 1 front
    let hue, sat, light, alpha;
    if (mode === "happy") {
      const side = heart[i].side;
      if (side === "left") {       // navy
        hue = 212; sat = 62; light = 28 + depth * 12;
      } else {                     // red
        hue = 4;   sat = 75; light = 46 + depth * 10;
      }
      alpha = 0.75 + depth * 0.2;
    } else {
      // cyan front → purple back
      hue = 260 - depth * 70;
      sat = 85;
      light = 55 + depth * 15;
      alpha = 0.35 + depth * 0.5;
    }

    const size = 1.2 * persp * DPR;
    ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(render);
}
render();

/* ---------- Voice flow ---------- */

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const history = [];
let busy = false;

function setBusy(v) {
  busy = v;
  micBtn.classList.toggle("busy", v);
}

function setListening(v) {
  micBtn.classList.toggle("listening", v);
}

async function listenOnce(onInterim) {
  return new Promise((resolve, reject) => {
    if (!SR) return reject(new Error("speech-not-supported"));
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (onInterim) onInterim((finalText + interim).trim());
    };
    rec.onerror = (e) => reject(new Error(e.error));
    rec.onend = () => {
      if (finalText.trim()) resolve(finalText.trim());
      else reject(new Error("no-speech"));
    };
    rec.start();
  });
}

/* ---------- Caption / talking bubble ---------- */

const captionEl = document.getElementById("caption");

function setCaption(who, text) {
  if (!who || !text) {
    captionEl.classList.remove("show", "user", "bot");
    return;
  }
  captionEl.textContent = text;
  captionEl.classList.remove("user", "bot");
  captionEl.classList.add("show", who);
}

async function chat(text) {
  history.push({ role: "user", content: text });
  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  const { text: reply, mood } = await res.json();
  history.push({ role: "assistant", content: reply });
  return { reply, mood };
}

// OpenAI TTS — realistic voice with SA-accent instructions.
async function speak(text) {
  if (!text) return;
  const res = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise((resolve) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play();
  });
}

async function runTurn() {
  if (busy) return;
  try {
    setBusy(true);
    setListening(true);
    setMode("blob");
    intensity = 0.28;
    rotSpeed = 0.008;

    setCaption("user", "Listening...");
    const userText = await listenOnce((live) => {
      setCaption("user", live || "Listening...");
    });
    setListening(false);

    intensity = 0.18;
    rotSpeed = 0.012;

    const { reply, mood } = await chat(userText);

    // morph to face, or heart if mood is happy; show the reply text
    setMode(mood === "happy" ? "happy" : "face");
    rotSpeed = 0;
    setCaption("bot", reply);
    await speak(reply);

    // linger briefly, then fade
    setTimeout(() => setCaption(null), 600);

    // return to blob
    setMode("blob");
    intensity = 0.15;
    rotSpeed = 0.004;
  } catch (e) {
    setListening(false);
    setMode("blob");
    intensity = 0.15;
    rotSpeed = 0.004;
    setCaption(null);
    console.warn(e);
  } finally {
    setBusy(false);
  }
}

micBtn.addEventListener("click", runTurn);
