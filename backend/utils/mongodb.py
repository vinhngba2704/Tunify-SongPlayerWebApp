from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

user = os.getenv("MONGODB_USER", "")
password = os.getenv("MONGODB_PASSWORD", "")
uri = f"mongodb+srv://{user}:{password}@vinhnb-tunify.jqvxg7t.mongodb.net/?appName=vinhnb-tunify"

# Create a new client and connect to the server
client = MongoClient(uri, server_api=ServerApi('1'))

# Database and Collection
db = client["tunify"]
collection = db["song_playlist_metadata"]


class SongMetadata(BaseModel):
    """Pydantic model for song metadata document."""
    title: str  # Bắt buộc
    gcs_mp3_blob: Optional[str] = None  # Blob path in GCS (sounds/filename.mp3)
    gcs_lrc_blob: Optional[str] = None  # Blob path in GCS (lyrics/filename.lrc)
    gcs_mp3_path: Optional[str] = None  # Signed URL for MP3
    gcs_lrc_path: Optional[str] = None  # Signed URL for LRC
    has_lyrics: bool = False  # Mặc định là False


def insert_song_metadata(song: SongMetadata):
    """
    Insert a song metadata document into the collection.
    
    Args:
        song: SongMetadata object containing song information
    
    Returns:
        The inserted document's ID
    """
    document = song.model_dump()
    
    result = collection.insert_one(document)
    print(f"Inserted document with ID: {result.inserted_id}")
    return result.inserted_id


def insert_many_song_metadata(songs: list[SongMetadata]):
    """
    Insert multiple song metadata documents into the collection.
    
    Args:
        songs: List of SongMetadata objects
    
    Returns:
        List of inserted document IDs
    """
    documents = [song.model_dump() for song in songs]
    result = collection.insert_many(documents)
    print(f"Inserted {len(result.inserted_ids)} documents")
    return result.inserted_ids


def update_song_metadata(document_id, update_fields: dict):
    """
    Update a song metadata document by ID.
    
    Args:
        document_id: The ObjectId of the document to update
        update_fields: Dictionary of fields to update
    
    Returns:
        The number of modified documents
    """
    from bson import ObjectId
    
    result = collection.update_one(
        {"_id": ObjectId(document_id) if isinstance(document_id, str) else document_id},
        {"$set": update_fields}
    )
    print(f"Updated {result.modified_count} document(s)")
    return result.modified_count


def get_all_songs():
    """
    Get all songs from the collection.
    
    Returns:
        List of song documents
    """
    songs = list(collection.find({}))
    # Convert ObjectId to string for JSON serialization
    for song in songs:
        song["_id"] = str(song["_id"])
    return songs


def get_song_by_id(document_id):
    """
    Get a song by its ID.
    
    Args:
        document_id: The ObjectId or string ID of the document
    
    Returns:
        The song document or None if not found
    """
    from bson import ObjectId
    
    song = collection.find_one(
        {"_id": ObjectId(document_id) if isinstance(document_id, str) else document_id}
    )
    if song:
        song["_id"] = str(song["_id"])
    return song


def get_song_by_title(title: str):
    """
    Get a song by its title.
    
    Args:
        title: The title of the song
    
    Returns:
        The song document or None if not found
    """
    song = collection.find_one({"title": title})
    if song:
        song["_id"] = str(song["_id"])
    return song


def delete_song_by_id(document_id):
    """
    Delete a song by its ID.
    
    Args:
        document_id: The ObjectId or string ID of the document
    
    Returns:
        True if document was deleted, False otherwise
    """
    from bson import ObjectId
    
    result = collection.delete_one(
        {"_id": ObjectId(document_id) if isinstance(document_id, str) else document_id}
    )
    print(f"Deleted {result.deleted_count} document(s)")
    return result.deleted_count > 0


# Example usage
if __name__ == "__main__":
    # Test connection
    try:
        client.admin.command('ping')
        print("Pinged your deployment. You successfully connected to MongoDB!")
    except Exception as e:
        print(e)
    
    # Example: Insert a single song (chỉ cần title)
    song1 = SongMetadata(title="Cause I Love You")
    insert_song_metadata(song1)
    
    # Example: Insert với đầy đủ thông tin
    song2 = SongMetadata(
        title="Con Mưa Tình Yêu",
        gcs_mp3_path="gs://bucket-name/songs/ConMuaTinhYeu.mp3",
        gcs_lrc_path="gs://bucket-name/lyrics/ConMuaTinhYeu.lrc",
        has_lyrics=True
    )
    insert_song_metadata(song2)
    
    # Example: Insert multiple songs
    # songs = [
    #     SongMetadata(title="Dành Cho Em"),
    #     SongMetadata(
    #         title="Em Không Quay Về",
    #         gcs_mp3_path="gs://bucket-name/songs/EmKhongQuayVe.mp3",
    #         has_lyrics=False
    #     )
    # ]
    # insert_many_song_metadata(songs)