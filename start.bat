@echo off
echo Starting AI Chat Application...
echo.
docker-compose up -d --build
echo.
echo Waiting for services to start...
timeout /t 10
echo.
echo Application is starting!
echo Open your browser to: http://localhost:3000
echo.
echo Press any key to view logs...
pause
docker-compose logs -f ollama