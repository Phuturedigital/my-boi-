const orb = document.getElementById("orb");
const statusEl = document.getElementById("status");
const transcriptEl = document.getElementById("transcript");

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) {
  setStatus("Browser doesn't support speech recognition. Try Chrome.", "error");
}

const history = [];
let state = "idle"; // idle | listening | thinking | speaking

function setState(next) {
  state = next;
  orb.classList.remove("listening", "thinking", "speaking");
  if (next !== "idle") orb.classList.add(next);
}

function setStatus(text, cls = "") {
  statusEl.textContent = text;
  statusEl.className = "status" + (cls ? " " + cls : "");
}

function setTranscript(text) {
  transcriptEl.textContent = text;
  transcriptEl.classList.toggle("show", Boolean(text));
}

async function listenOnce() {
  return new Promise((resolve, reject) => {
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e) => resolve(e.results[0][0].transcript);
    recognition.onerror = (e) => reject(new Error(e.error));
    recognition.onend = () => {
      if (state === "listening") reject(new Error("no-speech"));
    };
    recognition.start();
  });
}

async function chat(userText) {
  history.push({ role: "user", content: userText });

  const res = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: history }),
  });

  if (!res.ok) throw new Error(`chat failed: ${res.status}`);
  const { text } = await res.json();
  history.push({ role: "assistant", content: text });
  return text;
}

async function speak(text) {
  const res = await fetch("/.netlify/functions/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`tts failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);

  return new Promise((resolve) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.play();
  });
}

async function runTurn() {
  if (state !== "idle") return;

  try {
    setState("listening");
    setStatus("Listening...", "active");
    setTranscript("");

    const userText = await listenOnce();
    setTranscript(`"${userText}"`);

    setState("thinking");
    setStatus("Thinking...", "active");
    const reply = await chat(userText);
    setTranscript(reply);

    setState("speaking");
    setStatus("Speaking...", "active");
    await speak(reply);

    setState("idle");
    setStatus("Tap to talk");
  } catch (err) {
    setState("idle");
    if (err.message === "no-speech") {
      setStatus("Didn't catch that. Tap to try again.");
    } else {
      setStatus(err.message || "Something went wrong", "error");
    }
  }
}

orb.addEventListener("click", runTurn);
