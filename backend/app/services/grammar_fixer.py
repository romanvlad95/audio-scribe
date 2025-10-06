"""Service for correcting grammar using the Gemini API."""
import os
import httpx
import json
import asyncio


MODEL_NAME = "gemini-2.5-flash"

SYSTEM_INSTRUCTION = (
    "You are an expert copy editor and language corrector. Your sole task is to "
    "correct all grammatical errors, spelling mistakes, punctuation issues, "
    "and improve fluency in the user-provided Russian transcription. "
    "Do not add any introductory, conversational, or explanatory text. "
    "Respond only with the corrected text."
)

async def fix_grammar(text: str) -> str | None:
    """Calls the Gemini API to correct grammar in the provided text.

    Args:
        text: The text to be corrected.

    Returns:
        The corrected text, or None if an error occurred.
    """
    if not text:
        return None

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        print("FATAL ERROR: GEMINI_API_KEY environment variable not set or empty.")
        return None

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={api_key}"

    payload = {
        "contents": [
            {"parts": [{"text": text}]}
        ],
        "systemInstruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        }
    }

    headers = {
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            for attempt in range(4):
                try:
                    response = await client.post(
                        api_url,
                        headers=headers,
                        json=payload
                    )
                    response.raise_for_status()
                    break
                except httpx.HTTPStatusError as e:
                    if e.response.status_code in [429, 503] and attempt < 3:
                        delay = 2 ** attempt
                        await asyncio.sleep(delay)
                    else:
                        raise e

            result = response.json()
            candidate = result.get('candidates', [{}])[0]
            content = candidate.get('content', {})
            parts = content.get('parts', [{}])
            corrected_text = parts[0].get('text')

            if corrected_text:
                return corrected_text.strip()

            print(f"API returned response, but no text found: {json.dumps(result, indent=2)}")
            return None

        except (httpx.HTTPStatusError, IndexError) as e:
            if isinstance(e, httpx.HTTPStatusError):
                print(f"HTTP Error: {e.response.status_code} during Gemini API call.")
                print(f"Full response text: {e.response.text}")
            else:
                print(f"IndexError: The API response was not in the expected format. Result: {result}")
            return None
        except Exception as e:
            print(f"Unexpected Fatal Error during Gemini API call: {type(e).__name__}: {e}")
            return None