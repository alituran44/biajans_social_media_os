FROM python:3.11-slim

WORKDIR /app

# Copy dependencies first to leverage Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project source files
COPY . .

# Expose port 8080 (BaseHTTPRequestHandler server port)
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

CMD ["python", "-u", "app.py"]
