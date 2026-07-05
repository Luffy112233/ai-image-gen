"""Download and serve generated images."""

import os
import base64
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel

router = APIRouter()

class Base64DownloadRequest(BaseModel):
    b64_json: str
    filename: Optional[str] = None

class UrlDownloadRequest(BaseModel):
    url: str
    filename: Optional[str] = None

@router.post("/base64")
async def download_base64(req: Base64DownloadRequest):
    """Download image from base64."""
    try:
        img_bytes = base64.b64decode(req.b64_json)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64: {e}")
    
    fname = req.filename or f"image-{uuid.uuid4().hex[:8]}.png"
    return Response(content=img_bytes, media_type="image/png", headers={
        "Content-Disposition": f'attachment; filename="{fname}"'
    })

@router.post("/url")
async def download_url(req: UrlDownloadRequest):
    """Download image from URL and save locally."""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        async with session.get(req.url, timeout=aiohttp.ClientTimeout(total=60)) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {resp.status}")
            img_bytes = await resp.read()
    
    # Save to uploads directory
    UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "images")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    fname = req.filename or f"{uuid.uuid4().hex[:8]}.png"
    fpath = os.path.join(UPLOAD_DIR, fname)
    with open(fpath, "wb") as f:
        f.write(img_bytes)
    
    return {"filename": fname, "path": fpath, "size": len(img_bytes)}
