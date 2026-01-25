# 🎵 Tunify - Music Player Web Application

Ứng dụng phát nhạc web với giao diện hiện đại, hỗ trợ hiển thị lời bài hát đồng bộ với animation mượt mà (karaoke style). Sử dụng **MongoDB Atlas** để lưu metadata và **Google Cloud Storage (GCS)** để stream audio/lyrics.

## ✨ Tính năng

### 🎧 Phát nhạc
- Stream nhạc trực tiếp từ Google Cloud Storage qua signed URLs
- Điều khiển phát/dừng, next/previous track
- Seek bar tương tác với preview thời gian khi hover
- Tự động chuyển bài khi kết thúc
- Auto-refresh signed URLs khi hết hạn (15 phút)

### 🎤 Lyrics Đồng bộ
- Hiển thị lời bài hát theo thời gian thực (karaoke style)
- Animation mượt mà 60fps với progress bar cho từng dòng
- Điều chỉnh offset để đồng bộ chính xác
- Tự động scroll theo dòng đang phát

### 📤 Import Track
- Upload bài hát mới trực tiếp từ giao diện web
- Tự động upload lên GCS và lưu metadata vào MongoDB
- Hỗ trợ upload cả file MP3 và LRC (lyrics)
- Bảo vệ bằng mật khẩu

### 🎨 Giao diện
- Dark theme theo phong cách Spotify (#121212)
- Gradient background mờ ảo tạo chiều sâu
- Hiệu ứng glassmorphism (backdrop blur)
- Music bar animation khi đang phát
- Responsive design

### 🔍 Tính năng khác
- Tìm kiếm bài hát realtime
- Playlist management
- Environment variables configuration
- CORS configuration linh hoạt

## 🛠️ Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **MongoDB Atlas** - Cloud database để lưu song metadata
- **Google Cloud Storage** - Cloud storage cho audio/lyrics files
- **Uvicorn** - ASGI server
- **httpx** - Async HTTP client
- **Python 3.12+**

### Frontend
- **Next.js 16** - React framework với App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Utility-first CSS
- **Lucide React** - Icon library

### Deployment
- **Render** - Backend hosting
- **Vercel** - Frontend hosting

## 📂 Cấu trúc Project

```
Song_Player/
├── backend/
│   ├── core/
│   │   ├── main.py           # FastAPI server với API endpoints
│   │   └── utils.py          # Parse LRC & normalize song names
│   ├── utils/
│   │   ├── gcs.py            # Google Cloud Storage utilities
│   │   ├── mongodb.py        # MongoDB connection & queries
│   │   └── utils.py          # Shared utilities
│   ├── sounds/               # Local sounds (development only)
│   ├── lyrics/               # Local lyrics (development only)
│   └── test/                 # Test scripts
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Main music player component
│   │   ├── layout.tsx        # Root layout
│   │   ├── globals.css       # Global styles & animations
│   │   ├── components/
│   │   │   ├── LyricsViewer.tsx      # Lyrics display với animation
│   │   │   ├── PlayerControls.tsx    # Play/pause, seek, offset controls
│   │   │   ├── PlaylistPanel.tsx     # Song list + import feature
│   │   │   ├── SearchBar.tsx         # Search input
│   │   │   └── SongHeader.tsx        # Current song display
│   │   └── lib/
│   │       └── config.ts     # API URL configuration
│   ├── .env.local            # Frontend environment variables
│   └── package.json
├── .env                      # Backend environment variables (gitignored)
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── start_app.bat             # Windows launcher script
├── pyproject.toml            # Python dependencies (uv)
└── README.md
```

## ⚙️ Environment Variables

### Backend (.env)

```bash
# === Backend Configuration ===
# BACKEND_HOST=127.0.0.1        # Local development
# BACKEND_PORT=8000             # Local port

# Production: Set BACKEND_URL for correct audioUrl generation
# BACKEND_URL=https://your-backend-url.onrender.com

# === CORS Settings ===
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app

# === MongoDB Configuration (Required) ===
MONGODB_USER=your_mongodb_username
MONGODB_PASSWORD=your_mongodb_password

# === Google Cloud Storage (Required) ===
GCS_BUCKET_NAME=your-gcs-bucket-name
GCS_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "...", ...}

# === Import Password (Optional) ===
# IMPORT_PASSWORD=your_secure_password
```

### Frontend (frontend/.env.local)

```bash
# API URL for the backend
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
```

## 🚀 Cài đặt và Chạy (Local Development)

### Yêu cầu
- **Python 3.12+**
- **Node.js 18+**
- **uv** (Python package manager)
- **MongoDB Atlas** account
- **Google Cloud** account với GCS bucket

### 1️⃣ Cài đặt uv

**Windows:**
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**Linux/macOS:**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2️⃣ Cấu hình Environment Variables

```bash
cp .env.example .env
# Điền các giá trị MongoDB và GCS vào file .env
```

### 3️⃣ Cài đặt Dependencies

**Backend:**
```bash
cd Song_Player
uv sync
```

**Frontend:**
```bash
cd frontend
npm install
```

### 4️⃣ Chạy ứng dụng

#### Cách 1: Sử dụng launcher script (Windows)
```bash
start_app.bat
```

#### Cách 2: Chạy thủ công

**Terminal 1 - Backend:**
```bash
uv run backend/core/main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5️⃣ Truy cập ứng dụng

- **Music Player:** http://localhost:3000
- **Backend API:** http://127.0.0.1:8000
- **API Documentation:** http://127.0.0.1:8000/docs

## 🌍 Deployment

### Backend - Render

1. Tạo **Web Service** mới trên Render
2. Connect GitHub repository
3. Cấu hình:
   - **Build Command:** `pip install uv && uv sync`
   - **Start Command:** `uv run backend/core/main.py`
4. Thêm Environment Variables:
   ```
   BACKEND_URL=https://your-app.onrender.com
   ALLOWED_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000
   MONGODB_USER=...
   MONGODB_PASSWORD=...
   GCS_BUCKET_NAME=...
   GCS_SERVICE_ACCOUNT_JSON=...
   IMPORT_PASSWORD=...
   ```

### Frontend - Vercel

1. Import project từ GitHub
2. Chọn **Framework Preset:** Next.js
3. **Root Directory:** `frontend`
4. Thêm Environment Variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   ```

## 📝 API Endpoints

### `GET /`
Health check endpoint.

### `GET /api/songs`
Lấy danh sách tất cả bài hát từ MongoDB.

**Response:**
```json
{
  "songs": [
    {
      "id": "6799abc123def456",
      "title": "Cause I Love You",
      "audioUrl": "https://backend-url/api/audio/6799abc123def456",
      "hasLyrics": true
    }
  ],
  "total": 1
}
```

### `GET /api/audio/{song_id}`
Redirect (302) tới GCS signed URL để stream audio.

### `GET /api/lyrics/{song_id}`
Lấy và parse lời bài hát từ GCS.

**Response:**
```json
{
  "songId": "6799abc123def456",
  "lyrics": [
    { "time": 0.0, "text": "First line" },
    { "time": 5.5, "text": "Second line" }
  ]
}
```

### `POST /api/verify-import-password`
Xác thực mật khẩu để import track.

**Request:**
```json
{ "password": "your_password" }
```

### `POST /api/import-track`
Upload track mới lên GCS và lưu metadata vào MongoDB.

**Form Data:**
- `title`: Tên bài hát
- `sound_file`: File MP3
- `lyrics_file`: File LRC (optional)

## 📌 Thêm bài hát mới

### Cách 1: Qua giao diện web (Khuyến nghị)
1. Mở ứng dụng và click vào nút **Import Track** trong playlist panel
2. Nhập mật khẩu (nếu có cấu hình)
3. Điền tên bài hát, chọn file MP3 và LRC (optional)
4. Click **Import** và đợi upload hoàn tất
5. Bài hát mới sẽ tự động xuất hiện trong playlist

### Cách 2: Upload trực tiếp lên GCS + MongoDB
1. Upload file MP3 lên GCS bucket: `sounds/TenBaiHat.mp3`
2. Upload file LRC lên GCS bucket: `lyrics/TenBaiHat.lrc`
3. Thêm document vào MongoDB collection `song_playlist_metadata`:
   ```json
   {
     "title": "Tên Bài Hát",
     "gcs_mp3_blob": "sounds/TenBaiHat.mp3",
     "gcs_lrc_blob": "lyrics/TenBaiHat.lrc",
     "has_lyrics": true
   }
   ```

### Format file .lrc
```
[00:12.50]Dòng lời đầu tiên
[00:18.20]Dòng lời thứ hai
[00:24.80]Dòng lời thứ ba
```

Format: `[mm:ss.xx]Text`

## 🎮 Hướng dẫn sử dụng

### Điều khiển cơ bản
| Action | Mouse | Keyboard |
|--------|-------|----------|
| Phát/Dừng | Click Play button | `Space` |
| Previous | Click ⏮ | `←` |
| Next | Click ⏭ | `→` |
| Seek | Click/Drag progress bar | - |
| Tìm kiếm | Gõ vào search bar | - |

### Điều khiển Lyrics Offset
- **▲ (Up):** Tăng offset +0.1s (lyrics nhanh hơn)
- **▼ (Down):** Giảm offset -0.1s (lyrics chậm hơn)

## 📊 Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Browser   │────▶│   Vercel    │     │  MongoDB Atlas   │
│  (Next.js)  │     │  (Frontend) │     │   (Metadata)     │
└─────────────┘     └─────────────┘     └──────────────────┘
       │                   │                      ▲
       │                   │                      │
       ▼                   ▼                      │
┌─────────────────────────────────────┐          │
│           Render (Backend)          │──────────┘
│             FastAPI                 │
└─────────────────────────────────────┘
       │
       │ Signed URLs (302 redirect)
       ▼
┌──────────────────┐
│  Google Cloud    │
│  Storage (GCS)   │
│  - Audio files   │
│  - Lyrics files  │
└──────────────────┘
```

### Flow khi phát nhạc:
1. Frontend gọi `/api/songs` → Backend query MongoDB → Trả về danh sách bài hát với `audioUrl`
2. User chọn bài → Browser request `audioUrl` (`/api/audio/{id}`)
3. Backend kiểm tra signed URL còn hạn không:
   - Còn hạn → Redirect 302 tới GCS signed URL
   - Hết hạn → Generate URL mới, update MongoDB, redirect
4. Browser stream audio trực tiếp từ GCS

## 📊 Performance

- **60 FPS** lyrics sync với `requestAnimationFrame`
- **Auto-refresh** signed URLs khi expired (15 phút)
- **302 Redirect** thay vì proxy để giảm bandwidth backend
- **Optimized re-renders** với React hooks

---

## 🐍 Legacy Python Version (Terminal-based)

Phiên bản terminal cho phát nhạc offline.

### Chạy:
```bash
uv run runalone.py
```

### Điều khiển:
- `Space`: Pause/Resume
- `↑↓`: Adjust lyrics offset
- `←→`: Previous/Next song

---

## 📄 License

Made with ❤️ by **vinhngba2704** 🎵

---

**Enjoy your music! 🎧✨**
