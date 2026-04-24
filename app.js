/* Ambient AI voice surface.
 *
 * One orb of particles reacts to mic input and conversation state:
 * IDLE → LISTENING → USER_SPEAKING → PROCESSING → AI_SPEAKING → LISTENING.
 * Continuous conversation via browser SpeechRecognition + Web Audio VAD;
 * mic button is a mute toggle. If the user speaks while the bot is speaking,
 * TTS pauses and recognition resumes.
 */

// ---------- Canvas ----------
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0, CX = 0, CY = 0, R = 0;

function resize() {
  W = canvas.width = window.innerWidth * DPR;
  H = canvas.height = window.innerHeight * DPR;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  CX = W / 2;
  CY = H / 2;
  R = Math.min(W, H) * 0.22;
}
resize();
window.addEventListener("resize", resize);

// ---------- Orb particles ----------
const N = 2400;

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

// Normalize a point cloud so its widest extent sits within [-1, 1].
function normalizeCloud(pts) {
  let maxR = 0;
  for (const [x, y, z] of pts) {
    const r = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    if (r > maxR) maxR = r;
  }
  if (maxR === 0) return pts;
  return pts.map(([x, y, z]) => [x / maxR, y / maxR, z / maxR]);
}

// Deterministic pseudo-random so shapes render identically each reload.
function seededRand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

// Classic parametric heart — point at bottom, cusp at top.
// Screen-space y goes down so we flip the traditional equation.
function heartShape(n) {
  const rng = seededRand(7);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const shell = i % 4;
    const scale = 1 - shell * 0.12;
    const x = 16 * Math.pow(Math.sin(t), 3) * scale;
    const yv =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    const y = -yv * scale;
    const z = (rng() - 0.5) * 6 * (1 - shell * 0.2);
    pts.push([x, y, z]);
  }
  return normalizeCloud(pts);
}

// Rocket pointing up: nose cone at top, body, tail fins, flame below.
function rocketShape(n) {
  const rng = seededRand(11);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const sect = rng();
    let x, y, z;
    if (sect < 0.5) {
      // cylindrical body
      y = -0.5 + rng() * 1.0;
      const theta = rng() * Math.PI * 2;
      const rad = 0.22 + rng() * 0.02;
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    } else if (sect < 0.72) {
      // nose cone up top (negative y)
      const tt = rng();
      y = -0.5 - tt * 0.5;
      const theta = rng() * Math.PI * 2;
      const rad = 0.24 * (1 - tt);
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    } else if (sect < 0.9) {
      // four fins flared at the base
      const finIdx = Math.floor(rng() * 4);
      const theta = (finIdx / 4) * Math.PI * 2;
      const tY = rng();
      y = 0.3 + tY * 0.25;
      const rad = 0.22 + (1 - tY) * 0.28 * rng();
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    } else {
      // flame exhaust
      const tt = rng();
      y = 0.55 + tt * 0.4;
      const theta = rng() * Math.PI * 2;
      const rad = 0.16 * (1 - tt) * rng();
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    }
    pts.push([x, y, z]);
  }
  return normalizeCloud(pts);
}

// Trophy: cup on top, two side handles, stem, plinth base.
function trophyShape(n) {
  const rng = seededRand(19);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const sect = rng();
    let x, y, z;
    if (sect < 0.42) {
      // cup — tapered bowl, widest at top rim
      const tt = rng();
      y = -1 + tt * 0.7;
      const rad = 0.3 + tt * 0.3;
      const theta = rng() * Math.PI * 2;
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    } else if (sect < 0.62) {
      // two side handles — vertical arcs on left/right
      const side = rng() < 0.5 ? 1 : -1;
      const phi = (rng() - 0.5) * Math.PI * 1.1;
      const cx = side * 0.55;
      const cy = -0.6;
      x = cx + side * 0.22 * Math.cos(phi);
      y = cy + 0.32 * Math.sin(phi);
      z = (rng() - 0.5) * 0.08;
    } else if (sect < 0.82) {
      // stem
      y = -0.3 + rng() * 0.7;
      const theta = rng() * Math.PI * 2;
      const rad = 0.08;
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    } else {
      // base plinth
      const tt = rng();
      y = 0.4 + tt * 0.3;
      const theta = rng() * Math.PI * 2;
      const rad = 0.42 - tt * 0.05;
      x = Math.cos(theta) * rad;
      z = Math.sin(theta) * rad;
    }
    pts.push([x, y, z]);
  }
  return normalizeCloud(pts);
}

const shapes = {
  sphere: fibSphere(N),
  heart: heartShape(N),
  rocket: rocketShape(N),
  trophy: trophyShape(N),
};

// Per-shape palette overrides while morphed.
const SHAPE_STYLE = {
  heart: { hue: 342, spread: 28 },
  rocket: { hue: 28, spread: 48 },
  trophy: { hue: 48, spread: 26 },
};

let shapeTarget = "sphere";
let shapeHoldUntil = 0;

function morphTo(shape, hold = 2400) {
  if (!shapes[shape] || shape === "sphere") return;
  shapeTarget = shape;
  shapeHoldUntil = performance.now() + hold;
}

const base = shapes.sphere;
const particles = [];
for (let i = 0; i < N; i++) {
  const [x, y, z] = base[i];
  particles.push({
    bx: x, by: y, bz: z,
    x, y, z,
    tx: x, ty: y, tz: z,
    jitter: Math.random() * Math.PI * 2,
    phase: Math.random(),
  });
}

// ---------- State ----------
const STATE = {
  IDLE: "idle",
  DORMANT: "dormant",
  LISTENING: "listening",
  USER_SPEAKING: "user",
  PROCESSING: "processing",
  AI_SPEAKING: "ai",
  MUTED: "muted",
};

// Wake-word matcher. Chrome often transcribes "boi" as "boy"; "my" sometimes
// arrives as "mai". We accept a small cluster of hot variants so the demo
// isn't fragile to one misheard phoneme.
const WAKE_RE = /\b(?:hey|hi|ok|okay)?\s*(?:my|mai)\s*(?:boi|boy|boys)\b/i;

let state = STATE.IDLE;
let stateEnteredAt = performance.now();
let muted = false;
let amplitude = 0;      // 0..1 smoothed RMS from mic
let micStarted = false;
const history = [];

const statusEl = document.getElementById("status");
const captionEl = document.getElementById("caption");
const hintEl = document.getElementById("hint");
const micBtn = document.getElementById("mic");

function setState(next) {
  if (state === next) return;
  state = next;
  stateEnteredAt = performance.now();
  renderStatus();
}

function renderStatus() {
  const labels = {
    [STATE.IDLE]: "",
    [STATE.DORMANT]: "Say “my boi”",
    [STATE.LISTENING]: "Listening",
    [STATE.USER_SPEAKING]: "",
    [STATE.PROCESSING]: "Thinking",
    [STATE.AI_SPEAKING]: "Speaking",
    [STATE.MUTED]: "Muted",
  };
  const label = labels[state];
  if (label) {
    statusEl.textContent = label;
    statusEl.classList.add("show");
    statusEl.classList.toggle(
      "accent",
      state === STATE.LISTENING || state === STATE.USER_SPEAKING,
    );
  } else {
    statusEl.classList.remove("show");
  }
}

function setCaption(kind, text) {
  if (!text) {
    captionEl.classList.remove("show", "user", "bot", "error");
    return;
  }
  captionEl.textContent = text;
  captionEl.classList.remove("user", "bot", "error");
  captionEl.classList.add("show", kind);
}

// ---------- Render loop ----------
let t = 0;
let angle = 0;
let rotSpeed = 0.003;
let lastTime = performance.now();

function render(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  t += dt;

  ctx.fillStyle = "rgba(5, 6, 8, 0.24)";
  ctx.fillRect(0, 0, W, H);

  // State-driven visual params.
  let scale = 1;
  let wobbleAmp = 0.08;
  let pulseAmp = 0;
  let chaos = 0;
  let brightness = 0.55;
  let baseHue = 218;
  let hueSpread = 40;

  switch (state) {
    case STATE.IDLE:
      scale = 1 + Math.sin(t * 0.7) * 0.015;
      wobbleAmp = 0.07;
      brightness = 0.45;
      rotSpeed = 0.0025;
      break;
    case STATE.DORMANT:
      // Quiet-but-alive: dimmer than IDLE, a hair cooler in hue, slow
      // breathing rotation so it reads as "waiting for its name".
      scale = 0.94 + Math.sin(t * 0.6) * 0.012;
      wobbleAmp = 0.045;
      brightness = 0.3;
      baseHue = 215;
      hueSpread = 18;
      rotSpeed = 0.0022;
      break;
    case STATE.LISTENING:
      scale = 0.96 + Math.sin(t * 1.2) * 0.02;
      wobbleAmp = 0.06;
      brightness = 0.65;
      baseHue = 205;
      rotSpeed = 0.004;
      break;
    case STATE.USER_SPEAKING: {
      const a = Math.min(1, amplitude * 3);
      scale = 1.02 + a * 0.22 + Math.sin(t * 1.6) * 0.015;
      wobbleAmp = 0.18 + a * 0.6;
      chaos = 0.4 + a * 0.9;
      brightness = 0.85;
      baseHue = 196;
      hueSpread = 60;
      rotSpeed = 0.008 + a * 0.012;
      break;
    }
    case STATE.PROCESSING: {
      // Ramp intensity the longer we sit in PROCESSING so a short think
      // stays calm and a long think visibly "works harder".
      const dwell = (now - stateEnteredAt) / 1000;
      const intensity = Math.min(1, Math.max(0, (dwell - 0.3) / 1.5));
      scale = 0.78 + Math.sin(t * (3 + intensity * 2.5)) * (0.04 + intensity * 0.03);
      wobbleAmp = 0.05 + intensity * 0.05;
      brightness = 0.7 + intensity * 0.18;
      baseHue = 258 - intensity * 14;
      hueSpread = 40 + intensity * 20;
      rotSpeed = 0.05 + intensity * 0.08;
      break;
    }
    case STATE.AI_SPEAKING: {
      const pulse = Math.sin(t * 3.4) * 0.5 + 0.5;
      const a = Math.min(1, amplitude * 3);
      scale = 1.05 + pulse * 0.18 + a * 0.08;
      pulseAmp = pulse * 0.22;
      wobbleAmp = 0.12 + a * 0.18;
      brightness = 0.9;
      baseHue = 222;
      hueSpread = 50;
      rotSpeed = 0.005;
      break;
    }
    case STATE.MUTED:
      scale = 0.9 + Math.sin(t * 0.5) * 0.01;
      wobbleAmp = 0.04;
      brightness = 0.18;
      baseHue = 230;
      hueSpread = 10;
      rotSpeed = 0.002;
      break;
  }

  // Drone-show morph: migrate each particle's base position toward the
  // target shape's slot. When the hold elapses we ease back to sphere.
  if (now >= shapeHoldUntil && shapeTarget !== "sphere") {
    shapeTarget = "sphere";
  }
  const shapeActive = shapeTarget !== "sphere";
  const targetCloud = shapes[shapeTarget];
  const kMigrate = shapeActive ? 0.065 : 0.045;
  for (let i = 0; i < N; i++) {
    const p = particles[i];
    p.bx += (targetCloud[i][0] - p.bx) * kMigrate;
    p.by += (targetCloud[i][1] - p.by) * kMigrate;
    p.bz += (targetCloud[i][2] - p.bz) * kMigrate;
  }
  if (shapeActive) {
    // Quieten the motion so the shape reads cleanly.
    wobbleAmp *= 0.35;
    chaos *= 0.15;
    pulseAmp *= 0.45;
    rotSpeed *= 0.35;
    const style = SHAPE_STYLE[shapeTarget];
    if (style) {
      baseHue = style.hue;
      hueSpread = style.spread;
    }
    brightness = Math.max(brightness, 0.85);
  }

  angle += rotSpeed;
  const sa = Math.sin(angle);
  const ca = Math.cos(angle);

  for (let i = 0; i < N; i++) {
    const p = particles[i];
    const wob =
      1 +
      wobbleAmp *
        (Math.sin(p.bx * 2.6 + t * 1.2 + p.jitter) *
           Math.cos(p.by * 2.6 + t * 0.9) +
          Math.sin(p.bz * 3 + t * 0.7) * 0.45) +
      pulseAmp * Math.sin(t * 3 + p.phase * Math.PI * 2);

    const ch = chaos > 0
      ? chaos * Math.sin(p.bx * 7 + t * 5 + p.jitter * 3) * 0.06
      : 0;

    p.tx = p.bx * (wob + ch) * scale;
    p.ty = p.by * (wob + ch) * scale;
    p.tz = p.bz * (wob + ch) * scale;

    const k = 0.08;
    p.x += (p.tx - p.x) * k;
    p.y += (p.ty - p.y) * k;
    p.z += (p.tz - p.z) * k;

    const rx = p.x * ca - p.z * sa;
    const rz = p.x * sa + p.z * ca;
    const persp = 2.4 / (2.4 + rz);
    const sx = CX + rx * R * persp;
    const sy = CY + p.y * R * persp;
    const depth = (rz + 1) / 2;

    const hue = baseHue - depth * hueSpread;
    const light = 45 + depth * 20;
    const alpha = (0.25 + depth * 0.6) * brightness;
    const size = (1.05 + depth * 0.3) * persp * DPR;

    ctx.fillStyle = `hsla(${hue}, 70%, ${light}%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill();
  }

  requestAnimationFrame(render);
}
requestAnimationFrame(render);

// ---------- Speech recognition ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;
let recRunning = false;
let partialTranscript = "";
let finalTranscript = "";
let silenceTimer = null;
const SILENCE_MS = 450;

function createRecognition() {
  if (!SR) return null;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-US";

  r.onresult = (e) => {
    if (state === STATE.AI_SPEAKING || state === STATE.MUTED) return;
    let interim = "";
    let finals = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) finals += res[0].transcript;
      else interim += res[0].transcript;
    }
    if (finals) finalTranscript += finals;
    partialTranscript = interim;

    const full = (finalTranscript + " " + partialTranscript).trim();
    if (!full) return;

    // Wake-word gate: while dormant, we transcribe but stay silent until
    // the hotword hits. Anything the user says after "my boi" in the same
    // utterance becomes the actual turn, so "my boi how's the academy?"
    // wakes us and asks in one breath.
    if (state === STATE.DORMANT) {
      const m = full.match(WAKE_RE);
      if (m) {
        const after = full.slice(m.index + m[0].length).trim();
        finalTranscript = after;
        partialTranscript = "";
        if (after) {
          setState(STATE.USER_SPEAKING);
          setCaption("user", after);
          resetSilenceTimer();
        } else {
          setState(STATE.LISTENING);
        }
      } else if (finalTranscript.length > 160) {
        // Keep the pre-wake buffer small so stale finals don't drown the
        // hotword scan on long dormant stretches.
        finalTranscript = finalTranscript.slice(-80);
      }
      return;
    }

    if (state !== STATE.USER_SPEAKING) setState(STATE.USER_SPEAKING);
    setCaption("user", full);
    resetSilenceTimer();
  };

  r.onerror = (e) => {
    if (e.error !== "no-speech" && e.error !== "aborted") {
      console.warn("speech error", e.error);
    }
  };

  r.onend = () => {
    recRunning = false;
    if (!muted && state !== STATE.AI_SPEAKING && state !== STATE.PROCESSING) {
      try { r.start(); recRunning = true; } catch {}
    }
  };

  return r;
}

function startRec() {
  if (!rec) rec = createRecognition();
  if (!rec || recRunning) return;
  try { rec.start(); recRunning = true; } catch {}
}

function stopRec() {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  if (rec && recRunning) {
    try { rec.stop(); } catch {}
    recRunning = false;
  }
}

function resetSilenceTimer() {
  if (silenceTimer) clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    const text = (finalTranscript + " " + partialTranscript).trim();
    if (text && state === STATE.USER_SPEAKING) sendTurn(text);
  }, SILENCE_MS);
}

// ---------- Audio / VAD ----------
let audioCtx = null;
let analyser = null;
let dataArray = null;
let micStream = null;
let interruptCount = 0;

async function initMic() {
  if (micStarted) return true;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  } catch (err) {
    setCaption("error", "Microphone access denied. Allow mic and reload.");
    return false;
  }

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = audioCtx.createMediaStreamSource(micStream);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  src.connect(analyser);
  dataArray = new Uint8Array(analyser.fftSize);

  micStarted = true;
  hintEl.classList.add("hidden");
  pollAmplitude();
  return true;
}

function pollAmplitude() {
  if (!analyser) return;
  analyser.getByteTimeDomainData(dataArray);
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const v = (dataArray[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / dataArray.length);
  amplitude = amplitude * 0.75 + rms * 0.25;

  // Interruption: require a sustained spike while bot is speaking.
  if (state === STATE.AI_SPEAKING) {
    if (amplitude > 0.14) interruptCount++;
    else interruptCount = Math.max(0, interruptCount - 1);
    if (interruptCount > 8) {
      interruptCount = 0;
      interruptAI();
    }
  } else {
    interruptCount = 0;
  }

  requestAnimationFrame(pollAmplitude);
}

// ---------- Conversation turn ----------
let currentAudio = null;
let currentSpeakResolve = null;
let turnInFlight = false;

// Tear down any in-flight TTS so a new one can start cleanly. Without this,
// an interrupted audio.pause() never fires onended, the old speak() promise
// hangs, and two TTS streams can overlap on the next turn.
function killCurrentSpeech() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio.onended = null;
    currentAudio.onerror = null;
    currentAudio.ontimeupdate = null;
    currentAudio.onplaying = null;
    currentAudio = null;
  }
  if (currentSpeakResolve) {
    const r = currentSpeakResolve;
    currentSpeakResolve = null;
    r();
  }
}

async function sendTurn(text) {
  if (turnInFlight) return;
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  const userText = text.trim();
  if (!userText) return;

  turnInFlight = true;
  stopRec();
  finalTranscript = "";
  partialTranscript = "";
  setState(STATE.PROCESSING);
  setCaption("user", userText);

  try {
    const { reply } = await chat(userText);
    if (!reply) {
      setState(STATE.DORMANT);
      startRec();
      return;
    }
    // speak() flips state to AI_SPEAKING when audio actually starts and
    // reveals the caption word-by-word in sync with playback.
    await speak(reply);
  } catch (err) {
    console.warn(err);
    setCaption("error", `Error: ${err.message || err}`);
    setTimeout(() => setCaption(null), 4000);
  } finally {
    turnInFlight = false;
    currentAudio = null;
    if (!muted) {
      // After a turn finishes we drop back to DORMANT so the mic doesn't
      // pick up ambient chatter as the next question. User has to say
      // "my boi" again to reopen.
      setState(STATE.DORMANT);
      startRec();
    }
  }
}

function interruptAI() {
  killCurrentSpeech();
  setCaption(null);
  setState(STATE.DORMANT);
  finalTranscript = "";
  partialTranscript = "";
  startRec();
}

async function chat(text) {
  history.push({ role: "user", content: text });
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });
  if (!res.ok || !res.body) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch {}
    throw new Error(`chat ${res.status}${detail ? ": " + detail : ""}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let reply = "";
  let mood = "neutral";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.type === "text") reply += msg.delta;
      else if (msg.type === "done") { reply = msg.text; mood = msg.mood; }
      else if (msg.type === "error") throw new Error(msg.error);
    }
  }

  history.push({ role: "assistant", content: reply });
  return { reply, mood };
}

async function speak(text) {
  if (!text) return;
  // Ensure no prior TTS is still in-flight.
  killCurrentSpeech();

  // Pull shape cues out of the reply and remember roughly where each sits
  // in the spoken word stream, so we can fire the morph in time with the
  // voice. The cleaned text (tags removed) is what we display and play.
  const cues = [];
  const cleanWords = [];
  const tokens = text.split(/(<shape\s+type="[^"]*"\s*\/>)/g);
  for (const tok of tokens) {
    if (!tok) continue;
    const m = tok.match(/^<shape\s+type="([^"]*)"\s*\/>$/);
    if (m) {
      cues.push({ shape: m[1], atWord: cleanWords.length });
    } else {
      for (const w of tok.split(/\s+/)) {
        if (w) cleanWords.push(w);
      }
    }
  }
  const cleanText = cleanWords.join(" ");
  if (!cleanText) return;

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: cleanText }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  // Rolling subtitle: the caption only ever shows the last few words the
  // bot is actively speaking. Older words fall off the left, new ones
  // slide in on the right, and the whole thing fades out when audio ends.
  const WINDOW = 3;
  let lastShown = -1;
  let cueIdx = 0;

  const pulseCaption = () => {
    captionEl.classList.remove("pulse");
    // Force reflow so the animation restarts on every word change.
    void captionEl.offsetWidth;
    captionEl.classList.add("pulse");
  };

  return new Promise((resolve) => {
    currentSpeakResolve = resolve;
    const finish = () => {
      if (currentSpeakResolve === resolve) currentSpeakResolve = null;
      if (currentAudio === audio) currentAudio = null;
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onplaying = () => {
      setState(STATE.AI_SPEAKING);
    };
    audio.ontimeupdate = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      const frac = Math.min(1, audio.currentTime / audio.duration);
      const n = Math.max(1, Math.ceil(frac * cleanWords.length));
      if (n !== lastShown) {
        lastShown = n;
        const start = Math.max(0, n - WINDOW);
        setCaption("bot", cleanWords.slice(start, n).join(" "));
        pulseCaption();
      }
      while (cueIdx < cues.length && n >= cues[cueIdx].atWord) {
        morphTo(cues[cueIdx].shape);
        cueIdx++;
      }
    };
    audio.onended = () => { setCaption(null); finish(); };
    audio.onerror = () => { finish(); };
    audio.play().catch(() => finish());
  });
}

// ---------- UI wiring ----------
async function start() {
  const ok = await initMic();
  if (!ok) return;
  muted = false;
  micBtn.setAttribute("aria-pressed", "true");
  micBtn.classList.add("active");
  setState(STATE.DORMANT);
  startRec();
}

function toggleMute() {
  muted = !muted;
  if (muted) {
    micBtn.setAttribute("aria-pressed", "false");
    micBtn.classList.remove("active");
    stopRec();
    killCurrentSpeech();
    setState(STATE.MUTED);
    setCaption(null);
  } else {
    micBtn.setAttribute("aria-pressed", "true");
    micBtn.classList.add("active");
    if (!micStarted) { start(); return; }
    setState(STATE.DORMANT);
    startRec();
  }
}

micBtn.addEventListener("click", () => {
  if (!micStarted) start();
  else toggleMute();
});

canvas.addEventListener("click", () => {
  if (!micStarted) start();
});

if (!SR) {
  setCaption("error", "SpeechRecognition not supported in this browser. Try Chrome or Edge.");
}

renderStatus();
