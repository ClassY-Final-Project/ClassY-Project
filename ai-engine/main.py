"""FastAPI backend for ClassY AI Engine"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import uuid
import shutil
from typing import Optional, cast

from config import API_HOST, API_PORT, COURSES_DIR
from services.llama_service import llama_service

# Initialize FastAPI app
app = FastAPI(
    title="ClassY AI Engine",
    description="PDF processing with LlamaIndex and Ollama",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response models
class IndexFolderRequest(BaseModel):
    """Request to create index from folder"""
    course_id: str
    folder_path: Optional[str] = None


class SemanticSearchRequest(BaseModel):
    """Request for semantic search"""
    query: str
    course_id: str
    limit: int = 3


class QuizGenerateRequest(BaseModel):
    """Request to generate quiz"""
    course_id: str
    topic: Optional[str] = None
    count: int = 10


class SummaryRequest(BaseModel):
    """Request for summary"""
    course_id: str
    max_length: int = 500


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ClassY AI Engine",
    }


# PDF Upload endpoint
@app.post("/api/pdf/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    course_id: str = Form("default"),
    replace_existing: bool = Form(True),
):
    """Upload PDF and create/update index"""
    try:
        # Validate file exists and get filename
        file_name = file.filename  # type: ignore
        if file_name is None or len(file_name) == 0:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate PDF format
        if not str(file_name).endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files allowed")
        
        # Create course folder if not exists
        course_folder: Path = Path(COURSES_DIR) / str(course_id)  # type: ignore
        course_folder.mkdir(parents=True, exist_ok=True)

        # Keep active source deterministic: remove old PDFs in the same course when requested.
        if replace_existing:
            for old_pdf in course_folder.glob("*.pdf"):
                try:
                    old_pdf.unlink()
                except Exception as unlink_error:
                    print(f"⚠️ Could not remove old PDF {old_pdf}: {unlink_error}")
        
        # Save PDF
        file_path: Path = course_folder / str(file_name)  # type: ignore
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Create/update index for this course
        result = llama_service.create_index_from_folder(
            str(course_folder),
            course_id,
        )
        
        return {
            "success": True,
            "filename": file.filename,
            "course_id": course_id,
            "indexed": result.get("success", False),
            "doc_count": result.get("doc_count", 0),
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Semantic search endpoint
@app.post("/api/search")
async def semantic_search(request: SemanticSearchRequest):
    """Perform semantic search on indexed course"""
    try:
        results = llama_service.semantic_search(
            query=request.query,
            course_id=request.course_id,
            limit=request.limit,
        )
        
        return {
            "success": True,
            "query": request.query,
            "results": results,
            "count": len(results),
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Quiz generation endpoint
@app.post("/api/quiz/generate")
async def generate_quiz(request: QuizGenerateRequest):
    """Generate quiz questions from course"""
    try:
        result = llama_service.generate_quiz(
            course_id=request.course_id,
            topic=request.topic,
            count=request.count,
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "success": True,
            "course_id": request.course_id,
            "questions": result.get("questions", []),
            "count": len(result.get("questions", [])),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Summary endpoint
@app.post("/api/summary")
async def get_summary(request: SummaryRequest):
    """Get summary of indexed course"""
    try:
        result = llama_service.get_summary(
            course_id=request.course_id,
            max_length=request.max_length,
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return {
            "success": True,
            "course_id": request.course_id,
            "summary": result.get("summary"),
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Index folder endpoint (for batch indexing)
@app.post("/api/index/folder")
async def index_folder(request: IndexFolderRequest):
    """Create index from existing folder"""
    try:
        folder_path = request.folder_path or str(Path(COURSES_DIR) / request.course_id)
        
        if not Path(folder_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Folder not found: {folder_path}",
            )
        
        result = llama_service.create_index_from_folder(
            folder_path,
            request.course_id,
        )
        
        if not result.get("success", False):
            raise HTTPException(status_code=400, detail=result.get("error"))
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# List indexed courses
@app.get("/api/courses")
async def list_courses():
    """List all indexed courses"""
    try:
        courses = list(llama_service.indices.keys())
        return {
            "success": True,
            "courses": courses,
            "count": len(courses),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    
    print(f"🚀 AI Engine starting on {API_HOST}:{API_PORT}")
    print(f"📚 Courses folder: {COURSES_DIR}")
    print(f"🔌 Ollama URL: http://localhost:11434")
    
    uvicorn.run(
        app,
        host=API_HOST,
        port=API_PORT,
    )