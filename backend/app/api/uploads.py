"""Upload API routes — single and batch image upload."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import List
import uuid
import os
import shutil

from app.core.config import get_settings

settings = get_settings()
router = APIRouter()

# Upload directory
UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "images")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB


@router.post("/image")
async def upload_single_image(file: UploadFile = File(...)):
    """Upload a single image file."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported type: {file.content_type}")
    
    file_bytes = await file.read()
    if len(file_bytes) > MAX_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large: {len(file_bytes)} bytes")
    
    file_id = str(uuid.uuid4())[:8]
    ext = os.path.splitext(file.filename)[1] or ".png"
    save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
    
    with open(save_path, "wb") as f:
        f.write(file_bytes)
    
    return {
        "file_id": file_id,
        "filename": file.filename,
        "size": len(file_bytes),
        "url": f"/uploads/{file_id}{ext}",
    }


@router.post("/images")
async def upload_multiple_images(files: List[UploadFile] = File(...)):
    """Upload multiple image files at once."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Max 10 files per upload")
    
    results = []
    for file in files:
        if file.content_type not in ALLOWED_TYPES:
            continue
        
        file_bytes = await file.read()
        if len(file_bytes) > MAX_SIZE:
            continue
        
        file_id = str(uuid.uuid4())[:8]
        ext = os.path.splitext(file.filename)[1] or ".png"
        save_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        
        with open(save_path, "wb") as f:
            f.write(file_bytes)
        
        results.append({
            "file_id": file_id,
            "filename": file.filename,
            "size": len(file_bytes),
            "url": f"/uploads/{file_id}{ext}",
        })
    
    return results


@router.get("/{file_id}")
async def get_uploaded_image(file_id: str):
    """Serve an uploaded image."""
    # Try common extensions
    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
        path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(path):
            return FileResponse(path, media_type="image/png")
    
    raise HTTPException(status_code=404, detail="Image not found")


@router.delete("/{file_id}")
async def delete_uploaded_image(file_id: str):
    """Delete an uploaded image."""
    for ext in [".png", ".jpg", ".jpeg", ".webp"]:
        path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(path):
            os.remove(path)
            return {"deleted": True}
    raise HTTPException(status_code=404, detail="Image not found")
