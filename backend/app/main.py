"""Main application file for the Audio Scribe API."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import transcribe

app = FastAPI(
    title="Audio Scribe API",
    description="API for transcribing audio files.",
    version="1.0.0"
)

# Configure CORS to allow frontend communication.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend's domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transcribe.router, prefix="/api")

@app.get("/", tags=["Root"])
async def read_root():
    """Confirms the API is running.

    Returns:
        A dictionary with a welcome message.
    """
    return {"message": "Welcome to the Audio Scribe API!"}

