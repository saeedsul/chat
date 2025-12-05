#!/bin/bash
# Start ollama in background
ollama serve &

# Wait for ollama to be ready
sleep 5

# Pull mistral model if not already present
if ! ollama list | grep -q "mistral"; then
    echo "Pulling mistral model..."
    ollama pull mistral
fi

# Keep container running
wait