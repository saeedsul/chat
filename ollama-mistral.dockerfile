FROM ollama/ollama:latest

COPY entrypoint-mistral.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]