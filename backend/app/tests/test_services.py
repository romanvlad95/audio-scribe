import pytest
from unittest.mock import patch, MagicMock
import os
import httpx

from ..services.transcription import transcribe_audio_file


@pytest.mark.asyncio
async def test_transcribe_audio_file_success():
    with patch("backend.app.services.transcription._run_whisper_transcription") as mock_run:
        mock_run.return_value = "This is a test transcription."
        transcription = await transcribe_audio_file("fake_path.mp3")
        assert transcription == "This is a test transcription."


@pytest.mark.asyncio
async def test_transcribe_audio_file_returns_none():
    with patch("backend.app.services.transcription._run_whisper_transcription") as mock_run:
        mock_run.return_value = None
        transcription = await transcribe_audio_file("fake_path.mp3")
        assert transcription is None


@pytest.mark.asyncio
async def test_transcribe_audio_file_exception():
    with patch("backend.app.services.transcription._run_whisper_transcription") as mock_run:
        mock_run.side_effect = Exception("Test Exception")
        transcription = await transcribe_audio_file("fake_path.mp3")
        assert transcription is None


from ..services.grammar_fixer import fix_grammar


@pytest.mark.asyncio
async def test_fix_grammar_success():
    with patch("httpx.AsyncClient.post") as mock_post, patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "candidates": [
                {
                    "content": {
                        "parts": [
                            {"text": "This is the corrected text."}
                        ]
                    }
                }
            ]
        }
        mock_post.return_value = mock_response
        corrected_text = await fix_grammar("This is the original text.")
        assert corrected_text == "This is the corrected text."


@pytest.mark.asyncio
async def test_fix_grammar_empty_text():
    corrected_text = await fix_grammar("")
    assert corrected_text is None


@pytest.mark.asyncio
async def test_fix_grammar_no_api_key():
    with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
        corrected_text = await fix_grammar("This is the original text.")
        assert corrected_text is None


@pytest.mark.asyncio
async def test_fix_grammar_api_error():
    with patch("httpx.AsyncClient.post") as mock_post, patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
        mock_post.side_effect = httpx.HTTPStatusError("API Error", request=MagicMock(), response=MagicMock())
        corrected_text = await fix_grammar("This is the original text.")
        assert corrected_text is None


@pytest.mark.asyncio
async def test_fix_grammar_no_corrected_text():
    with patch("httpx.AsyncClient.post") as mock_post, patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"candidates": []}
        mock_post.return_value = mock_response
        corrected_text = await fix_grammar("This is the original text.")
        assert corrected_text is None


@pytest.mark.asyncio
async def test_fix_grammar_unexpected_exception():
    with patch("httpx.AsyncClient.post") as mock_post, patch.dict(os.environ, {"GEMINI_API_KEY": "test_key"}):
        mock_post.side_effect = Exception("Unexpected Error")
        corrected_text = await fix_grammar("This is the original text.")
        assert corrected_text is None