# Build stage - install dependencies only
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools for any compiled dependencies (grpcio, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY packages/llm-service/pyproject.toml .
# Extract and install only the runtime dependencies (no need to build the package itself)
RUN pip install --no-cache-dir \
    "fastapi>=0.115.0" \
    "uvicorn>=0.30.0" \
    "logfire[fastapi]>=2.0.0" \
    "httpx>=0.27.0"

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn
COPY packages/llm-service/src ./src

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
