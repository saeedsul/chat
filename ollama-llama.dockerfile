FROM ollama/ollama:latest

COPY entrypoint-llama.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]