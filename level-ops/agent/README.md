# VAULTS RAG Agent Service

FastAPI service for document processing, chunking, embedding, and hybrid search.

## Quick Start

### Run from level-ops directory (Recommended)

```powershell
# Make sure you're in the level-ops directory
cd D:\Dropbox\GitHub\GIT Local\level_app_v1\level-ops

# Option 1: Use the PowerShell script
.\start-agent.ps1

# Option 2: Run uvicorn directly
uvicorn agent.main:app --reload --port 8000
```

The agent will start on `http://127.0.0.1:8000`

### Verify it's running

Open `http://127.0.0.1:8000/docs` in your browser to see the FastAPI interactive docs.

## Common Issues

### Error: "ModuleNotFoundError: No module named 'agent'"

**Cause:** You're running uvicorn from inside the `agent` directory.

**Solution:** Run from the parent `level-ops` directory:

```powershell
# ❌ Wrong - running from agent directory
cd level-ops\agent
uvicorn agent.main:app --reload  # This will fail

# ✅ Correct - running from level-ops directory
cd level-ops
uvicorn agent.main:app --reload  # This works
```

**Why?** The Python import system looks for the `agent` module relative to the directory where uvicorn is started. When you're inside the `agent` directory, Python can't find a module named `agent` because it's looking for `agent/agent/...`.

### Error: Import errors within main.py

If you see errors like `cannot import name 'settings' from 'agent.config'`, make sure:

1. You have a virtual environment activated (if using one)
2. All dependencies are installed: `pip install -r requirements.txt`
3. You're running from the `level-ops` directory

## Environment Variables

The agent reads configuration from environment variables. See `.env.example` in the parent directory:

- `OPENAI_API_KEY` — Required for embeddings
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

## Development

```powershell
# Install dependencies (from level-ops directory)
pip install -r agent/requirements.txt

# Run with auto-reload
.\start-agent.ps1

# Or with custom port
uvicorn agent.main:app --reload --port 8080
```

## Project Structure

```
agent/
├── main.py              # FastAPI app entry point
├── config.py            # Configuration and settings
├── models/              # Pydantic request/response models
│   ├── requests.py
│   └── responses.py
├── services/            # Business logic
│   ├── embedder.py
│   ├── pdf_extractor.py
│   └── document_processor.py
└── README.md            # This file
```

## API Endpoints

- `POST /ingest` — Ingest a document (chunk + embed)
- `POST /delete-chunks` — Delete chunks for a document
- `GET /health` — Health check

See `/docs` for interactive API documentation.
