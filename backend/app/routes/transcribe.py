"""API routes for transcription and grammar correction."""
import os
import shutil
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from pydantic import BaseModel
from ..services.transcription import transcribe_audio_file
from ..services.grammar_fixer import fix_grammar

router = APIRouter()

class GrammarFixRequest(BaseModel):
    """Request model for the grammar fix endpoint."""
    text: str

@router.post(
    "/transcribe",
    summary="Transcribe an audio file",
    description="Upload an audio file (e.g., MP3, WAV, M4A, OGG) to get its transcription.",
)
async def create_transcription_route(file: UploadFile = File(...)):
    """Handles audio file upload and transcription.

    Args:
        file: The audio file to be transcribed.

    Returns:
        A dictionary containing the filename and its transcription.

    Raises:
        HTTPException: If no file is uploaded or an error occurs during transcription.
    """
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file was uploaded.",
        )

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}")
    temp_file_path = temp_file.name

    try:
        with temp_file:
            shutil.copyfileobj(file.file, temp_file)

        transcribed_text = await transcribe_audio_file(temp_file_path)

        if transcribed_text is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Transcription service failed to process the audio.",
            )

        return {"filename": file.filename, "transcription": transcribed_text}

    except Exception as e:
        print(f"FATAL ERROR in transcription route: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during transcription: {str(e)}",
        )
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.post(
    "/fix-grammar",
    summary="Corrects grammar using Gemini API",
    description="Accepts a text string and returns a grammatically corrected version.",
)
async def fix_grammar_route(request: GrammarFixRequest):
    """Corrects the grammar of a given text.

    Args:
        request: A request object containing the text to be corrected.

    Returns:
        A dictionary containing the corrected text.

    Raises:
        HTTPException: If the provided text is too short or grammar correction fails.
    """
    if not request.text or len(request.text) < 10:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text provided is too short for grammar correction.",
        )

    corrected_text = await fix_grammar(request.text)

    if corrected_text is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Grammar correction failed to return a result.",
        )

    return {"corrected_text": corrected_text}
