# 🎙️ Audio Scribe

> A full-stack web application that transcribes audio files and corrects the grammar of the resulting text using AI.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---
## Audio Scribe demo screens

### Home Page
![Home Page](docs/screenshots/home.png)

### Transcription Flow
![Transcription Flow](docs/screenshots/transcription.png)

### Grammar Correction
![Grammar Correction](docs/screenshots/grammar.png)
---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** FastAPI (Python)
- **AI:**
  - **Transcription:** `openai-whisper` (local model)
  - **Grammar Correction:** Google Gemini API
- **Infrastructure:** Docker, Docker Compose, Nginx

---

## Features

- **Seamless Audio Upload:** Drag-and-drop or browse for audio files (MP3, WAV, M4A, etc.).
- **Accurate Transcription:** Utilizes OpenAI's Whisper model for fast and accurate speech-to-text conversion.
- **AI-Powered Grammar Correction:** One-click grammar and fluency correction using the Gemini API.
- **Dark Mode:** Sleek, user-friendly interface with a dark mode toggle.
- **Containerized:** Fully containerized with Docker for consistent, cross-platform deployment.
- **Automated CI Pipeline:** GitHub Actions for automated testing, linting, and build verification.

---

## Architecture

The application is composed of two main services orchestrated by Docker Compose: a frontend container and a backend container.

```mermaid
graph TB
    %% ================= USER =================
    User["User"]

    %% ================= FRONTEND =================
    subgraph Frontend["Frontend"]
        direction TB
        Nginx["Nginx Reverse Proxy"]
        ReactApp["React UI (Vite + Tailwind)"]
        Nginx -.-> ReactApp
    end

    %% ================= BACKEND =================
    subgraph Backend["Backend"]
        direction TB
        FastAPI["FastAPI Application"]
        
        subgraph Services["Services Layer"]
            direction LR
            TranscriptionService["Transcription Service"]
            GrammarService["Grammar Fixer Service"]
        end
        
        WhisperModel["Whisper Model<br/><small>Local inference (in container)</small>"]
    end

    %% ================= EXTERNAL =================
    subgraph External["External Services"]
        GeminiAPI["Gemini API<br/><small>External HTTP API</small>"]
    end

    %% =============== FLOWS =================
    linkStyle default stroke:#000,stroke-width:2.5px,fill:none




    User -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>1. HTTP Request</span> "| Nginx
    Nginx -->|" <span style='background:#333;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>2. Serve Static</span> "| ReactApp
    ReactApp -->|" <span style='background:#555;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>3. API Calls</span> "| Nginx
    Nginx -->|" <span style='background:#777;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>4. Proxy</span> "| FastAPI

    FastAPI -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>5a. /transcribe</span> "| TranscriptionService
    TranscriptionService -->|" <span style='background:#222;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>6. Process</span> "| WhisperModel
    WhisperModel -.->|" <span style='background:#444;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>7. Text</span> "| TranscriptionService

    FastAPI -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>5b. /fix-grammar</span> "| GrammarService
    GrammarService -->|" <span style='background:#222;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>8. HTTP</span> "| GeminiAPI
    GeminiAPI -.->|" <span style='background:#444;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>9. Corrected</span> "| GrammarService

    TranscriptionService -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>Response</span> "| FastAPI
    GrammarService -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>Response</span> "| FastAPI
    FastAPI -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>Response</span> "| Nginx
    Nginx -->|" <span style='background:#000;color:#fff;padding:4px 8px;border-radius:12px;font-size:14px;'>Response</span> "| User

    %% =============== STYLES =================
    classDef userStyle fill:#ffffff,stroke:#000,stroke-width:2px,color:#000,rx:10,ry:10
    classDef nodeStyle fill:#fdfdfd,stroke:#000,stroke-width:1.5px,color:#000,rx:8,ry:8
    classDef modelStyle fill:#f2f2f2,stroke:#000,stroke-width:1.5px,stroke-dasharray: 4 3,color:#000,rx:8,ry:8
    classDef containerStyle fill:#e9ecef,stroke:#000,stroke-width:1px,color:#000,font-weight:bold,rx:12,ry:12


    class User userStyle
    class Nginx,ReactApp,FastAPI,TranscriptionService,GrammarService nodeStyle
    class WhisperModel,GeminiAPI modelStyle
    class Frontend,Backend,Services,External containerStyle
```

---

## CI Status

[![CI](https://github.com/romanvlad95/audio-scribe/actions/workflows/ci.yml/badge.svg)](https://github.com/romanvlad95/audio-scribe/actions/workflows/ci.yml)

---


## Getting Started

### Prerequisites

- [Docker & Docker Compose](https://www.docker.com/products/docker-desktop)
- A **Google Gemini API Key** — used for grammar correction. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).
- An **OpenAI API Key** — (optional but not necessary) if you want to use OpenAI Whisper API for transcription.
### ⚙️ Installation

1.  **Clone the repository:**
    > **Note:** Remember to replace `your-username/your-repo` with your actual repository details.
    ```bash
    git clone https://github.com/romanvlad95/audio-scribe
    cd audio-scribe
    ```

2.  **Create the environment file:**
    Create a file named `.env` in the project root and add your Gemini API key. The transcription uses a local model and does not require a key.
    ```text
    # .env
    GEMINI_API_KEY="your-gemini-api-key"
    ```

3.  **Build and run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```
    The application will become available at `http://localhost:3000`.

---

## Usage

1.  Open your web browser and navigate to `http://localhost:3000`.
2.  Drag and drop an audio file or use the "Browse Files" button to select one.
3.  Click "Transcribe Audio".
4.  Once transcription is complete, you can click "Fix Grammar" to get a corrected version of the text.

---

## License

This project is licensed under the MIT License.
