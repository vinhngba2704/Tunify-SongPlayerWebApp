import datetime
import os
import json
from google.cloud import storage
from google.oauth2 import service_account
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from environment
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "vinhnb-tunify")
GCS_SERVICE_ACCOUNT_JSON = os.getenv("GCS_SERVICE_ACCOUNT_JSON", "{}")

def get_credentials():
    """Get service account credentials from environment variable JSON."""
    service_account_info = json.loads(GCS_SERVICE_ACCOUNT_JSON)
    credentials = service_account.Credentials.from_service_account_info(service_account_info)
    return credentials, service_account_info.get("project_id")

def get_storage_client():
    """Create a GCS storage client from environment variable JSON."""
    credentials, project_id = get_credentials()
    return storage.Client(credentials=credentials, project=project_id)

def upload_file(bucket_name, source_file_path, destination_blob_name):
    """
    Upload một file từ máy local lên Google Cloud Storage.
    """
    # Khởi tạo client từ environment variable
    storage_client = get_storage_client()
    
    # Lấy bucket và tạo một đối tượng blob mới
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Tự động xác định loại nội dung (ví dụ: audio/mpeg cho file mp3)
    # Điều này giúp việc streaming nhạc sau này mượt mà hơn
    content_type = None
    if destination_blob_name.endswith('.mp3'):
        content_type = 'audio/mpeg'
    elif destination_blob_name.endswith('.lrc'):
        content_type = 'text/plain'

    print(f"Đang upload file {source_file_path} lên GCS với tên {destination_blob_name}...")
    
    # Thực hiện upload
    blob.upload_from_filename(source_file_path, content_type=content_type)

    print(f"✅ Upload thành công!")
    return blob.name

def delete_file(bucket_name, blob_name):
    """
    Xóa một file khỏi Google Cloud Storage.
    """
    # 1. Khởi tạo client (giống như việc bạn cầm chìa khóa vào kho)
    storage_client = get_storage_client()
    
    # 2. Xác định cái thùng (bucket) chứa file
    bucket = storage_client.bucket(bucket_name)
    
    # 3. Xác định đúng file (blob) cần xóa thông qua tên của nó
    blob = bucket.blob(blob_name)

    print(f"Đang tiến hành xóa file {blob_name} khỏi bucket {bucket_name}...")

    # 4. Thực hiện lệnh xóa
    try:
        blob.delete()
        print(f"✅ Xóa file thành công!")
        return True
    except Exception as e:
        print(f"❌ Có lỗi xảy ra khi xóa file: {e}")
        return False

def generate_signed_url(bucket_name, blob_name):
    """Tạo một Signed URL để truy cập file riêng tư trong thời gian ngắn."""
    
    # Get credentials and storage client
    credentials, project_id = get_credentials()
    storage_client = storage.Client(credentials=credentials, project=project_id)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Tạo Signed URL (V4)
    url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="GET",
        credentials=credentials,
    )

    return url


if __name__ == "__main__":
    # --- CẤU HÌNH TEST ---
    FILE_NAME = "sounds/MatKetNoi.mp3"  # Tên file trên GCS sau khi upload

    # Đường dẫn file nhạc thật trên máy của bạn để test upload
    LOCAL_FILE_PATH = r"D:\NBV\Music\MatKetNoi_Full.mp3" 

    try:
        # --- PHẦN 1: TEST UPLOAD ---
        # Nếu bạn muốn test upload, hãy bỏ comment dòng dưới đây
        # upload_file(GCS_BUCKET_NAME, LOCAL_FILE_PATH, FILE_NAME)

        # --- PHẦN 2: TEST LẤY URL ---
        print(f"Đang tạo URL cho file: {FILE_NAME}...")
        signed_url = generate_signed_url(GCS_BUCKET_NAME, FILE_NAME)
        
        print("\n--- KẾT QUẢ TEST ---")
        print(f"Signed URL của bạn (hết hạn sau 15 phút):\n")
        print(signed_url)
        print("\n--------------------")
        print("Bạn có thể copy link trên dán vào trình duyệt để nghe thử bài hát.")

    except Exception as e:
        print(f"Có lỗi xảy ra: {e}")