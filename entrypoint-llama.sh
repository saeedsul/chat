#!/bin/bash
# Start ollama in background
ollama serve &

# Wait for ollama to be ready
sleep 5

# Pull llama model if not already present
if ! ollama list | grep -q "llama3.2"; then
    echo "Pulling llama3.2 model..."
    ollama pull llama3.2
fi

# Keep container running
wait