"""Tests for the transcription API endpoints and Whisper service behavior."""
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from ..main import app
from ..services import transcription

client = TestClient(app)


# -------------------------- ROUTE TESTS -------------------------- #

def test_read_root():
    """Root endpoint should respond with a welcome message."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Audio Scribe API!"}


@pytest.mark.asyncio
async def test_transcribe_audio_success():
    """Successful transcription route should return the filename and text."""
    mock_audio_content = b"fake-audio-data"
    mock_file_name = "test.mp3"
    expected_transcription = "This is a test transcription."

    with patch("backend.app.routes.transcribe.transcribe_audio_file") as mock_transcribe:
        mock_transcribe.return_value = expected_transcription

        response = client.post(
            "/api/transcribe",
            files={"file": (mock_file_name, mock_audio_content, "audio/mpeg")}
        )

        assert response.status_code == 200
        assert response.json() == {
            "filename": mock_file_name,
            "transcription": expected_transcription
        }
        mock_transcribe.assert_called_once()
        assert mock_transcribe.call_args[0][0].endswith(mock_file_name)


@pytest.mark.asyncio
async def test_transcribe_audio_service_failure():
    """When service returns None, the route should return 500."""
    mock_audio_content = b"fake-audio-data"
    mock_file_name = "fail.mp3"

    with patch("backend.app.routes.transcribe.transcribe_audio_file") as mock_transcribe:
        mock_transcribe.return_value = None

        response = client.post(
            "/api/transcribe",
            files={"file": (mock_file_name, mock_audio_content, "audio/mpeg")}
        )

        assert response.status_code == 500
        assert "Transcription service failed" in response.json()["detail"]


def test_transcribe_no_file():
    """Posting without a file should return 422 Unprocessable Entity."""
    response = client.post("/api/transcribe")
    assert response.status_code == 422


# ---------------------- WHISPER SERVICE TESTS ---------------------- #

def test_run_whisper_transcription_model_not_loaded(monkeypatch):
    """If WHISPER_MODEL is None, should return error string."""
    monkeypatch.setattr(transcription, "WHISPER_MODEL", None)
    result = transcription._run_whisper_transcription("fake.mp3")
    assert "Whisper model failed to load" in result


def test_run_whisper_transcription_audio_conversion_error(monkeypatch):
    """If AudioSegment.from_file raises, should return None."""
    class FakeAudioSegment:
        @staticmethod
        def from_file(_):
            raise Exception("conversion error")

    monkeypatch.setattr(transcription, "AudioSegment", FakeAudioSegment)
    monkeypatch.setattr(transcription, "WHISPER_MODEL", MagicMock())
    result = transcription._run_whisper_transcription("fake.mp3")
    assert result is None


def test_run_whisper_transcription_transcription_error(monkeypatch):
    """If WHISPER_MODEL.transcribe raises, should return None."""
    class FakeAudio:
        def export(self, *_, **__):
            pass

    monkeypatch.setattr(
        transcription, "AudioSegment",
        MagicMock(from_file=lambda _: FakeAudio())
    )
    monkeypatch.setattr(
        transcription, "WHISPER_MODEL",
        MagicMock(transcribe=MagicMock(side_effect=Exception("fail")))
    )
    result = transcription._run_whisper_transcription("fake.mp3")
    assert result is None