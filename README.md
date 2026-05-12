# answer-stack

answer-stack is a full-stack Retrieval-Augmented Generation (RAG) chatbot application that lets users upload documents and ask questions grounded in those files. It combines a React chat interface, an Express API, document parsing, chunking, vector retrieval, and LLM-based answering into one Dockerized project.

The project is designed to work in two modes: a local demo mode that runs without external API keys, and a managed mode that can use OpenAI for embeddings/answers and Pinecone for vector search. This makes it useful both as a portfolio-ready GitHub project and as a foundation for building document Q&A, internal knowledge base, support assistant, or research assistant workflows.

## Features
- RAG-based document Q&A with source snippets
- User authentication with JWT
- Multi-user document isolation
- PostgreSQL-backed user storage
- Persistent document metadata and chunks with a Docker volume
- File upload and text extraction for common document formats
- Document chunking and retrieval before answer generation
- Demo mode with in-memory indexing and local keyword search
- Managed mode support for OpenAI and Pinecone
- Redis + BullMQ ingestion queue support
- React frontend for upload and chat workflows
- WhatsApp webhook endpoint
- Dockerized frontend, backend, and Redis services

## Run Locally
```bash
docker compose up --build
```

Frontend: `http://localhost:5173`
Backend health check: `http://localhost:3000/health`

## Demo Mode
Set `DEMO_MODE=true` to run the full flow without any external secret. In demo mode:
- uploads are chunked and saved to a local JSON-backed document store
- retrieval is done with a local keyword scorer
- chat responses include grounded snippets from uploaded documents

Set `DEMO_MODE=false` and provide OpenAI + Pinecone credentials to use managed embeddings and LLM responses.

## Persistence
answer-stack stores registered users in PostgreSQL. New user passwords are saved as salted hashes.

Uploaded document records and chunks are stored in a JSON file controlled by `DOCUMENT_STORE_PATH`.

With Docker Compose, the backend mounts a named volume at `/app/data`, so the default path below survives container restarts and rebuilds:

```env
DOCUMENT_STORE_PATH=/app/data/documents.json
DATABASE_URL=postgres://answerstack:answerstack@postgres:5432/answerstack
```

With Docker Compose, Postgres uses a named `postgres-data` volume, so registered users survive container restarts and rebuilds.

When `DEMO_MODE=false`, vector search uses Pinecone while document records and chunk metadata remain persisted locally. For production deployments, you can move the document store into Postgres too.

## How It Works
1. A user registers or logs in with JWT authentication.
2. The user uploads a supported document.
3. The backend extracts readable text from the file.
4. The text is split into chunks and indexed.
5. When the user asks a question, answer-stack retrieves relevant chunks.
6. The chatbot returns an answer grounded in the retrieved document context.

## Supported Uploads
- `.txt`
- `.md`
- `.json`
- `.csv`
- `.pdf`
- `.docx`

The frontend now sends real files with multipart upload, and the backend extracts text for indexing.
The default backend upload limit is `50 MB`, configurable with `MAX_UPLOAD_SIZE_MB` in `.env`.

## APIs
- `POST /auth/register`
- `POST /auth/login`
- `POST /upload`
- `GET /upload`
- `POST /chat`
- `POST /whatsapp`

## Tech Stack
- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **Auth:** JWT, PostgreSQL
- **Queue:** Redis, BullMQ
- **AI/RAG:** OpenAI, Pinecone, local demo retrieval
- **Deployment:** Docker, Docker Compose

## Project Structure
```text
backend/   Express API, auth middleware, document upload, parsing, RAG services
frontend/  Vite + React chat UI
```

## Notes
- No real API key is bundled in source code.
- Use `.env` for your own keys, or stay in `DEMO_MODE=true` for a working local demo without secrets.
