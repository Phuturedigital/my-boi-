"""Two-way voice bot: you speak, Claude answers, OpenAI TTS speaks back."""

import os
import sys
import tempfile
from pathlib import Path

import anthropic
import speech_recognition as sr
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

SYSTEM_PROMPT = (
    "You are a friendly voice assistant. Keep replies short and conversational "
    "(1-3 sentences) since they will be spoken aloud. Avoid lists, markdown, "
    "or code blocks."
)

TTS_VOICE = "alloy"
TTS_MODEL = "gpt-4o-mini-tts"


def listen(recognizer: sr.Recognizer, mic: sr.Microphone) -> str | None:
    with mic as source:
        recognizer.adjust_for_ambient_noise(source, duration=0.3)
        print("Listening... (speak now)")
        try:
            audio = recognizer.listen(source, timeout=8, phrase_time_limit=20)
        except sr.WaitTimeoutError:
            print("(heard nothing)")
            return None

    try:
        text = recognizer.recognize_google(audio)
        print(f"You: {text}")
        return text
    except sr.UnknownValueError:
        print("(couldn't understand that)")
        return None
    except sr.RequestError as e:
        print(f"Speech recognition error: {e}")
        return None


def speak(openai_client: OpenAI, text: str) -> None:
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
        tmp_path = Path(f.name)

    try:
        with openai_client.audio.speech.with_streaming_response.create(
            model=TTS_MODEL,
            voice=TTS_VOICE,
            input=text,
        ) as response:
            response.stream_to_file(tmp_path)

        # Try a few common audio players; fall back to printing a warning.
        for player in ("mpg123 -q", "ffplay -nodisp -autoexit -loglevel quiet", "afplay"):
            if os.system(f"{player} {tmp_path} 2>/dev/null") == 0:
                return
        print("(no audio player found - install mpg123, ffplay, or afplay)")
    finally:
        tmp_path.unlink(missing_ok=True)


def main() -> None:
    if not os.getenv("ANTHROPIC_API_KEY"):
        sys.exit("Missing ANTHROPIC_API_KEY in .env")
    if not os.getenv("OPENAI_API_KEY"):
        sys.exit("Missing OPENAI_API_KEY in .env")

    claude = anthropic.Anthropic()
    openai_client = OpenAI()
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    messages: list[anthropic.types.MessageParam] = []

    print("Voice bot ready. Say 'goodbye' to quit.\n")

    while True:
        user_text = listen(recognizer, mic)
        if not user_text:
            continue
        if user_text.strip().lower() in {"goodbye", "good bye", "quit", "exit"}:
            speak(openai_client, "Goodbye!")
            break

        messages.append({"role": "user", "content": user_text})

        response = claude.messages.create(
            model="claude-opus-4-7",
            max_tokens=500,
            system=SYSTEM_PROMPT,
            messages=messages,
        )

        reply = next(
            (block.text for block in response.content if block.type == "text"),
            "",
        ).strip()

        if not reply:
            print("(no reply)")
            continue

        print(f"Bot: {reply}")
        messages.append({"role": "assistant", "content": reply})
        speak(openai_client, reply)


if __name__ == "__main__":
    main()
