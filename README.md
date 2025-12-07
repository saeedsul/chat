# AI Chat Application

## Prerequisites

- Docker Desktop installed and running
- Windows 10/11

## First Time Setup

1. Clone this repository:

```powershell
   git clone YOUR_REPO_URL
   cd your-project-folder
```

2. Start the application:

```powershell
   docker-compose up -d --build
```

3. Wait 5-10 minutes for AI models to download (first time only)

4. Open your browser: http://localhost:3000

## Daily Usage

### Option 1: easy and quick way to run:

double click on start.bat to start
double click on stop.bat to stop

### Option 2:

### Start the app:

```powershell
docker-compose up -d
```

### Stop the app:

```powershell
docker-compose down
```

### Update to latest version:

```powershell
git pull
docker-compose up -d --build
```

### View logs (troubleshooting):

```powershell
docker-compose logs -f
```

## Available Models

- **Mistral** (7.2B parameters) - Fast and efficient
- **LLaMA 3.2** (3.2B parameters) - Open source powerhouse

## System Requirements

- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Docker Desktop running

## Troubleshooting

**Problem: Port 3000 already in use**

```powershell
# Stop the containers
docker-compose down

# Or change port in docker-compose.yml
# Change "3000:80" to "8080:80"
```

**Problem: Models not responding**

```powershell
# Check if models are loaded
docker-compose exec mistral ollama list
docker-compose exec llama ollama list

# If empty, pull models manually
docker-compose exec mistral ollama pull mistral
docker-compose exec llama ollama pull llama3.2
```

**Problem: Containers won't start**

```powershell
# Check logs
docker-compose logs

# Clean restart
docker-compose down -v
docker-compose up -d --build
```

using iTextSharp.text;
using iTextSharp.text.pdf;

// Load the PDF document from disk
PdfDocument pdf = new PdfDocument(new FileStream("document.pdf", Document.MODE_READ));

// Get a page object for the first page of the document
PdfPage page = pdf.getPage(0);

// Get information about the margins and font size on the page
MarginClass margin = page.getMargins();
float left = margin.getLeftMargin();
float right = margin.getRightMargin();
float top = margin.getTopMargin();
float bottom = margin.getBottomMargin();
FontClass font = page.getFont();
int fontSize = font.getSize();
string fontFamily = font.getFontName();

// Print out the margins and font size information
Console.WriteLine("Left Margin: {0}", left);
Console.WriteLine("Right Margin: {0}", right);
Console.WriteLine("Top Margin: {0}", top);
Console.WriteLine("Bottom Margin: {0}", bottom);
Console.WriteLine("Font Size: {0}", fontSize);
Console.WriteLine("Font Family: {0}", fontFamily);
