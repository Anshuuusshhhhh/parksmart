# backend/Dockerfile
FROM python:3.9-slim

# # Set working directory
# WORKDIR /app
COPY . /

RUN pip install --no-cache-dir -r requirements.txt

# Install common dependencies (if any - often just in service requirements)
# RUN pip install -r requirements.txt

# Expose a default port (services can override if needed)
EXPOSE 5000 5001 5002

# Default command (can be overridden by services)
# CMD ["python", "your_service_script.py"]a