# Build context: backend/ when Railway Root Directory is configured as /backend.
# For the default repository-root deployment, use backend/Dockerfile.root instead.
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
