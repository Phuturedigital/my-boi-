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

const base = fibSphere(N);
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
  LISTENING: "listening",
  USER_SPEAKING: "user",
  PROCESSING: "processing",
  AI_SPEAKING: "ai",
  MUTED: "muted",
};

let state = STATE.IDLE;
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
  renderStatus();
}

function renderStatus() {
  const labels = {
    [STATE.IDLE]: "",
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
    case STATE.PROCESSING:
      scale = 0.78 + Math.sin(t * 3) * 0.04;
      wobbleAmp = 0.05;
      brightness = 0.7;
      baseHue = 258;
      rotSpeed = 0.05;
      break;
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
const SILENCE_MS = 900;

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
    if (full) {
      if (state !== STATE.USER_SPEAKING) setState(STATE.USER_SPEAKING);
      setCaption("user", full);
      resetSilenceTimer();
    }
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

async function sendTurn(text) {
  if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  const userText = text.trim();
  if (!userText) return;

  stopRec();
  finalTranscript = "";
  partialTranscript = "";
  setState(STATE.PROCESSING);
  setCaption("user", userText);

  try {
    const { reply } = await chat(userText);
    if (!reply) {
      setState(STATE.LISTENING);
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
    currentAudio = null;
    if (!muted) {
      setState(STATE.LISTENING);
      startRec();
    }
  }
}

function interruptAI() {
  if (currentAudio) {
    try { currentAudio.pause(); } catch {}
    currentAudio = null;
  }
  setCaption(null);
  setState(STATE.USER_SPEAKING);
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
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`tts ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  // Reveal caption word-by-word in sync with playback. Proportional by
  // elapsed / duration — not per-word timestamps, but close enough and
  // feels right against OpenAI's ~steady speaking rate.
  const words = text.split(/\s+/).filter(Boolean);
  let lastShown = -1;

  return new Promise((resolve) => {
    audio.onplaying = () => {
      setState(STATE.AI_SPEAKING);
    };
    audio.ontimeupdate = () => {
      if (!audio.duration || !isFinite(audio.duration)) return;
      const frac = Math.min(1, audio.currentTime / audio.duration);
      const n = Math.max(1, Math.ceil(frac * words.length));
      if (n !== lastShown) {
        lastShown = n;
        setCaption("bot", words.slice(0, n).join(" "));
      }
    };
    audio.onended = () => {
      setCaption("bot", text);
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
    audio.play().catch(() => resolve());
  });
}

// ---------- UI wiring ----------
async function start() {
  const ok = await initMic();
  if (!ok) return;
  muted = false;
  micBtn.setAttribute("aria-pressed", "true");
  micBtn.classList.add("active");
  setState(STATE.LISTENING);
  startRec();
}

function toggleMute() {
  muted = !muted;
  if (muted) {
    micBtn.setAttribute("aria-pressed", "false");
    micBtn.classList.remove("active");
    stopRec();
    if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
    setState(STATE.MUTED);
    setCaption(null);
  } else {
    micBtn.setAttribute("aria-pressed", "true");
    micBtn.classList.add("active");
    if (!micStarted) { start(); return; }
    setState(STATE.LISTENING);
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
