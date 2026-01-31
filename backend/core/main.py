from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, Response
from pydantic import BaseModel
from typing import List, Optional
import os
import tempfile
import httpx
from dotenv import load_dotenv
load_dotenv()

# import sys

# # Add parent directory to path for imports
# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# try:
#     from utils.utils import normalize_song_name, parse_lrc, parse_lrc_content
# except ImportError:
#     from utils.utils import normalize_song_name, parse_lrc, parse_lrc_content

try:
    from backend.utils.mongodb import get_all_songs, get_song_by_id, update_song_metadata, delete_song_by_id
    from backend.utils.gcs import generate_signed_url, GCS_BUCKET_NAME, delete_file
    from backend.utils.utils import normalize_song_name, parse_lrc, parse_lrc_content
    from backend.utils.gemini import generate_robot_comment
except ImportError:
    pass

app = FastAPI(title="Music Player API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

# Import password - should be set via environment variable in production
IMPORT_PASSWORD = os.getenv("IMPORT_PASSWORD", "Bavinh2704!@#")

# 1. Cấu hình CORS: Cho phép Frontend (Next.js) truy cập API này
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Music Player API is running", "version": "1.0.0"}

@app.get("/api/debug/songs")
async def debug_songs():
    """Debug endpoint to check raw MongoDB data"""
    try:
        songs_from_db = get_all_songs()
        return {"songs": songs_from_db, "total": len(songs_from_db)}
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/songs")
async def get_songs():
    """Lấy danh sách tất cả bài hát từ MongoDB"""
    try:
        songs_from_db = get_all_songs()
        songs = []
        
        # Use BACKEND_URL for production, fallback to constructed URL for local
        backend_url = os.getenv('BACKEND_URL')
        if not backend_url:
            host = os.getenv('BACKEND_HOST', '127.0.0.1')
            port = os.getenv('BACKEND_PORT', '8000')
            backend_url = f"http://{host}:{port}"
        
        for song in songs_from_db:
            song_id = song["_id"]
            songs.append({
                "id": song_id,
                "title": song.get("title", "Unknown"),
                # Trỏ tới backend API thay vì GCS signed URL trực tiếp
                "audioUrl": f"{backend_url}/api/audio/{song_id}",
                "hasLyrics": song.get("has_lyrics", False)
            })
        
        return {"songs": songs, "total": len(songs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get songs: {str(e)}")

async def get_valid_signed_url(song_id: str, url_field: str, blob_field: str):
    """
    Helper function to get a valid signed URL.
    If the current URL is expired (non-200 response), generate a new one and update MongoDB.
    
    Args:
        song_id: The song document ID
        url_field: The field name for signed URL in MongoDB (gcs_mp3_path or gcs_lrc_path)
        blob_field: The field name for blob path in MongoDB (gcs_mp3_blob or gcs_lrc_blob)
    
    Returns:
        A tuple of (valid_url, song_document) or raises HTTPException
    """
    song = get_song_by_id(song_id)
    
    if not song:
        raise HTTPException(status_code=404, detail="Không tìm thấy bài hát")
    
    current_url = song.get(url_field)
    blob_path = song.get(blob_field)
    
    # If blob_path doesn't exist, try to extract it from the signed URL
    if not blob_path and current_url:
        # Extract blob path from signed URL
        # URL format: https://storage.googleapis.com/bucket-name/blob/path?query...
        try:
            from urllib.parse import urlparse, unquote
            parsed = urlparse(current_url)
            # Path is /bucket-name/blob/path, we need blob/path
            path_parts = parsed.path.split('/', 2)  # ['', 'bucket-name', 'blob/path']
            if len(path_parts) >= 3:
                blob_path = unquote(path_parts[2])
                # Save blob_path to MongoDB for future use
                update_song_metadata(song_id, {blob_field: blob_path})
        except Exception:
            pass
    
    if not blob_path:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy blob path cho {blob_field}")
    
    # Check if URL exists and is still valid
    if current_url:
        async with httpx.AsyncClient() as client:
            try:
                response = await client.head(current_url, follow_redirects=True, timeout=10.0)
                
                if response.status_code == 200:
                    return current_url, song
            except Exception:
                pass  # URL check failed, regenerate below
    
    # URL expired or doesn't exist, generate new one using blob_path
    try:
        new_url = generate_signed_url(GCS_BUCKET_NAME, blob_path)
        
        # Update MongoDB with new URL
        update_song_metadata(song_id, {url_field: new_url})
        
        return new_url, song
        
    except Exception as gen_error:
        raise HTTPException(status_code=500, detail=f"Failed to get valid URL: {str(gen_error)}")


@app.get("/api/lyrics/{song_id}")
async def get_lyrics(song_id: str):
    """Lấy lời bài hát từ GCS và parse sang JSON"""
    try:
        valid_url, song = await get_valid_signed_url(
            song_id, 
            "gcs_lrc_path", 
            "gcs_lrc_blob"
        )
        
        # Fetch lyrics content from GCS
        async with httpx.AsyncClient() as client:
            response = await client.get(valid_url, timeout=30.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Không thể tải file lời bài hát")
            
            lrc_content = response.text
            
            # Parse LRC content
            lyrics_data = parse_lrc_content(lrc_content)
            return {"songId": song_id, "lyrics": lyrics_data}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi lấy lyrics: {str(e)}")


@app.get("/api/audio/{song_id}")
async def get_audio(song_id: str):
    """Stream audio từ GCS signed URL"""
    try:
        valid_url, song = await get_valid_signed_url(
            song_id,
            "gcs_mp3_path",
            "gcs_mp3_blob"
        )
        
        # Redirect to the signed URL instead of proxying
        # This is more efficient for large audio files
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url=valid_url, status_code=302)
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi stream audio: {str(e)}")


# Pydantic model for password verification request
class PasswordVerifyRequest(BaseModel):
    password: str


@app.post("/api/verify-import-password")
async def verify_import_password(request: PasswordVerifyRequest):
    """Xác thực mật khẩu để import track"""
    if request.password == IMPORT_PASSWORD:
        return {"success": True, "message": "Password verified successfully"}
    else:
        raise HTTPException(status_code=401, detail="Incorrect password")


@app.delete("/api/track/{song_id}")
async def delete_track(song_id: str):
    """Delete a track from GCS and MongoDB"""
    try:
        # Step 1: Get song metadata to find GCS blob paths
        song = get_song_by_id(song_id)
        if not song:
            raise HTTPException(status_code=404, detail="Track not found")
        
        gcs_mp3_blob = song.get("gcs_mp3_blob")
        gcs_lrc_blob = song.get("gcs_lrc_blob")
        
        # Step 2: Delete MP3 file from GCS
        if gcs_mp3_blob:
            mp3_deleted = delete_file(GCS_BUCKET_NAME, gcs_mp3_blob)
            if not mp3_deleted:
                print(f"Warning: Could not delete MP3 file: {gcs_mp3_blob}")
        
        # Step 3: Delete LRC file from GCS (if exists)
        if gcs_lrc_blob:
            lrc_deleted = delete_file(GCS_BUCKET_NAME, gcs_lrc_blob)
            if not lrc_deleted:
                print(f"Warning: Could not delete LRC file: {gcs_lrc_blob}")
        
        # Step 4: Delete song document from MongoDB
        deleted = delete_song_by_id(song_id)
        if not deleted:
            raise HTTPException(status_code=500, detail="Failed to delete track from database")
        
        return {
            "success": True,
            "message": "Track deleted successfully",
            "deleted_song_id": song_id,
            "deleted_mp3": gcs_mp3_blob,
            "deleted_lrc": gcs_lrc_blob
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")


@app.post("/api/import-track")
async def import_track(
    title: str = Form(...),
    sound_file: UploadFile = File(...),
    lyrics_file: UploadFile = File(default=None)
):
    """Upload track files to Google Cloud Storage and save metadata to MongoDB"""
    try:
        from backend.utils.gcs import upload_file, generate_signed_url, GCS_BUCKET_NAME
        from backend.utils.mongodb import insert_song_metadata, update_song_metadata, SongMetadata
        
        uploaded_sound = None
        uploaded_lyrics = None
        sound_blob_path = None
        lyrics_blob_path = None
        
        # Determine has_lyrics based on whether lyrics file exists
        has_lyrics = lyrics_file is not None and lyrics_file.filename is not None and lyrics_file.filename != ""
        
        # Step 1: Create document with empty paths first
        song_metadata = SongMetadata(
            title=title,
            gcs_mp3_blob=None,
            gcs_lrc_blob=None,
            gcs_mp3_path=None,
            gcs_lrc_path=None,
            has_lyrics=has_lyrics
        )
        inserted_id = insert_song_metadata(song_metadata)
        
        # Step 2: Upload sound file to sounds/ folder
        if sound_file and sound_file.filename:
            # Create a temporary file to save the upload
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                content = await sound_file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                # Upload to GCS
                sound_blob_path = f"sounds/{sound_file.filename}"
                upload_file(GCS_BUCKET_NAME, tmp_path, sound_blob_path)
                uploaded_sound = sound_file.filename
            finally:
                # Clean up temp file
                os.unlink(tmp_path)
        
        # Step 3: Upload lyrics file to lyrics/ folder (optional)
        if lyrics_file and lyrics_file.filename:
            # Create a temporary file to save the upload
            with tempfile.NamedTemporaryFile(delete=False, suffix=".lrc") as tmp:
                content = await lyrics_file.read()
                tmp.write(content)
                tmp_path = tmp.name
            
            try:
                # Upload to GCS
                lyrics_blob_path = f"lyrics/{lyrics_file.filename}"
                upload_file(GCS_BUCKET_NAME, tmp_path, lyrics_blob_path)
                uploaded_lyrics = lyrics_file.filename
            finally:
                # Clean up temp file
                os.unlink(tmp_path)
        
        # Step 4: Generate signed URLs and update document with both blob paths and signed URLs
        update_fields = {}
        
        if sound_blob_path:
            mp3_signed_url = generate_signed_url(GCS_BUCKET_NAME, sound_blob_path)
            update_fields["gcs_mp3_blob"] = sound_blob_path
            update_fields["gcs_mp3_path"] = mp3_signed_url
        
        if lyrics_blob_path:
            lrc_signed_url = generate_signed_url(GCS_BUCKET_NAME, lyrics_blob_path)
            update_fields["gcs_lrc_blob"] = lyrics_blob_path
            update_fields["gcs_lrc_path"] = lrc_signed_url
        
        if update_fields:
            update_song_metadata(inserted_id, update_fields)
        
        return {
            "success": True,
            "message": "Track imported successfully",
            "title": title,
            "uploaded_sound": uploaded_sound,
            "uploaded_lyrics": uploaded_lyrics,
            "has_lyrics": has_lyrics,
            "mongodb_id": str(inserted_id),
            "gcs_mp3_url": update_fields.get("gcs_mp3_path"),
            "gcs_lrc_url": update_fields.get("gcs_lrc_path")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


class RobotCommentRequest(BaseModel):
    song_title: Optional[str] = None
    lyrics: Optional[str] = None


@app.post("/api/robot-comment")
async def get_robot_comment(request: RobotCommentRequest):
    """Lấy comment từ Gemini AI cho robot Mắm Chan"""
    try:
        comment = generate_robot_comment(request.song_title, request.lyrics)
        return {"success": True, "comment": comment}
    except Exception as e:
        # Fallback message nếu có lỗi
        return {
            "success": False,
            "comment": "Bài hát có hay không, bạn thấy thế nào? 🎵",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    # PORT is used by Render, BACKEND_PORT is for local development
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8000")))
    uvicorn.run(app, host=host, port=port)

# if __name__ == "__main__":
#     import os
#     print(os.path.dirname(os.path.abspath(__file__)))