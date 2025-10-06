"""Service for transcribing audio files using OpenAI Whisper."""
import asyncio
import os
import time
import whisper
from pydub import AudioSegment

# --- WHISPER MODEL SETUP ---
print("--- WHISPER/PYDUB SETUP ---")
MODEL_NAME = "base"
WHISPER_MODEL = None

try:
    WHISPER_MODEL = whisper.load_model(MODEL_NAME)
    print(f"✅ Whisper model '{MODEL_NAME}' loaded successfully.")
except Exception as e:
    print(f"❌ ERROR: Failed to load Whisper model '{MODEL_NAME}'. Transcription will fail. Error: {e}")

# --- SYNCHRONOUS TRANSCRIPTION FUNCTION ---
def _run_whisper_transcription(audio_filepath: str) -> str | None:
    """
    Converts audio to WAV, transcribes it, and cleans up temporary files.
    """
    if not WHISPER_MODEL:
        return "Whisper model failed to load at startup. Cannot transcribe."

    temp_dir = os.path.dirname(audio_filepath)
    base_name = os.path.basename(audio_filepath)
    wav_filename = os.path.join(temp_dir, f"temp_wav_{os.getpid()}_{os.path.splitext(base_name)[0]}.wav")

    # 1. Conversion to WAV with Padding
    try:
        audio = AudioSegment.from_file(audio_filepath)
        silence = AudioSegment.silent(duration=500)
        (silence + audio).export(wav_filename, format="wav")
    except Exception as e:
        print(f"ERROR during audio conversion: {e}")
        if os.path.exists(wav_filename):
            os.remove(wav_filename)
        return None

    # 2. Transcription
    try:
        result = WHISPER_MODEL.transcribe(wav_filename, fp16=False)
        transcribed_text = result["text"].strip() if result["text"] else ""
        print(f"✨ Transcribed Text: '{transcribed_text}'")
        return transcribed_text
    except Exception as e:
        print(f"ERROR during transcription: {e}")
        return None
    finally:
        # 3. Cleanup
        if os.path.exists(wav_filename):
            os.remove(wav_filename)

async def transcribe_audio_file(file_path: str) -> str | None:
    """
    Runs the blocking transcription function in a separate thread.
    """
    try:
        loop = asyncio.get_running_loop()
        transcription = await loop.run_in_executor(
            None,
            _run_whisper_transcription,
            file_path
        )
        return transcription if isinstance(transcription, str) else None
    except Exception as e:
        print(f"An error occurred in transcribe_audio_file: {e}")
        return None