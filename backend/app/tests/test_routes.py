
import pytest
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import patch

from ..main import app

client = TestClient(app)

def test_transcribe_no_file():
    response = client.post("/api/transcribe")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert response.json() == {"detail": [{"type": "missing", "loc": ["body", "file"], "msg": "Field required", "input": None}]}

def test_fix_grammar_route_success():
    with patch("backend.app.routes.transcribe.fix_grammar") as mock_fix_grammar:
        mock_fix_grammar.return_value = "This is a corrected test."
        response = client.post("/api/fix-grammar", json={"text": "this is a test."})
    assert response.status_code == status.HTTP_200_OK
    assert "corrected_text" in response.json()


def test_fix_grammar_route_too_short():
    response = client.post("/api/fix-grammar", json={"text": "short"})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json() == {"detail": "Text provided is too short for grammar correction."}


def test_fix_grammar_route_no_text():
    response = client.post("/api/fix-grammar", json={})
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT


def test_fix_grammar_route_service_failure():
    with patch("backend.app.routes.transcribe.fix_grammar") as mock_fix_grammar:
        mock_fix_grammar.return_value = None
        response = client.post("/api/fix-grammar", json={"text": "this is a test."})
    assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert "Grammar correction failed" in response.json()["detail"]

