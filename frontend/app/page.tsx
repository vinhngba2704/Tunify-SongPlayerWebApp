'use client';

import { useState, useEffect, useRef } from 'react';
import SearchBar from './components/SearchBar';
import LyricsViewer from './components/LyricsViewer';
import PlaylistPanel from './components/PlaylistPanel';
import PlayerControls from './components/PlayerControls';
import SongHeader from './components/SongHeader';
import RobotIcon, { RobotIconHandle } from './components/RobotIcon';
import { ROBOT_CONFIG } from './components/configs/robotConfig';
import { API_URL } from './lib/config';

interface Song {
  id: string;
  title: string;
  audioUrl: string;
  hasLyrics: boolean;
}

interface Lyric {
  time: number;
  text: string;
}

export default function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState<number>(0);
  const [lyricProgress, setLyricProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [offset, setOffset] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isShuffleOn, setIsShuffleOn] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const robotRef = useRef<RobotIconHandle>(null);
  const requestRef = useRef<number>(null);
  const isFirstSongInitialized = useRef<boolean>(false);

  // Hàm fetch danh sách bài hát (tách riêng để có thể gọi lại)
  const fetchSongs = () => {
    fetch(`${API_URL}/api/songs`)
      .then(res => res.json())
      .then(data => setSongs(data.songs || []))
      .catch(err => console.error('Error fetching songs:', err));
  };

  // 1. Fetch danh sách bài hát lần đầu
  useEffect(() => {
    fetchSongs();
  }, []);

  // 2. Load lyrics khi đổi bài
  useEffect(() => {
    if (songs.length > 0 && songs[currentSongIndex]) {
      const songId = songs[currentSongIndex].id;
      fetch(`${API_URL}/api/lyrics/${songId}`)
        .then(res => res.json())
        .then(data => {
          setLyrics(data.lyrics || []);
          setCurrentLyricIndex(0);
          setLyricProgress(0);
        })
        .catch(() => setLyrics([]));
    }
  }, [currentSongIndex, songs]);

  // 3. Logic đồng bộ hóa 60fps (Mượt như Spotify)
  useEffect(() => {
    const sync = () => {
      if (audioRef.current && isPlaying) {
        const time = audioRef.current.currentTime + offset;
        setCurrentTime(audioRef.current.currentTime);

        // Tìm lyric hiện tại
        let foundIndex = 0;
        for (let i = 0; i < lyrics.length; i++) {
          if (lyrics[i].time <= time) foundIndex = i;
          else break;
        }
        setCurrentLyricIndex(foundIndex);

        // Tính progress mượt mà giữa 2 dòng
        if (lyrics[foundIndex] && lyrics[foundIndex + 1]) {
          const start = lyrics[foundIndex].time;
          const end = lyrics[foundIndex + 1].time;
          const progress = Math.max(0, Math.min((time - start) / (end - start), 1));
          setLyricProgress(progress);
        } else {
          setLyricProgress(0);
        }
      }
      requestRef.current = requestAnimationFrame(sync);
    };

    if (isPlaying) requestRef.current = requestAnimationFrame(sync);
    else if (requestRef.current) cancelAnimationFrame(requestRef.current);

    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [isPlaying, lyrics, offset]);

  // Cập nhật duration khi audio load - thêm currentSong để effect chạy khi audio element được tạo lần đầu
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleCanPlay = () => {
      // Khi audio sẵn sàng phát, cập nhật duration nếu chưa có
      if (duration === 0 && audio.duration) {
        setDuration(audio.duration);
      }
    };

    // Nếu audio đã có metadata (readyState >= 1), set duration ngay lập tức
    if (audio.readyState >= 1) {
      setDuration(audio.duration);
    }

    // Khởi tạo audio cho bài hát đầu tiên
    if (songs.length > 0 && !isFirstSongInitialized.current) {
      isFirstSongInitialized.current = true;
      // Gọi load() để đảm bảo audio được khởi tạo đúng cách
      audio.load();
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentSongIndex, songs, duration]);

  // Điều khiển
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleSongSelect = (index: number) => {
    setCurrentSongIndex(index);
    setCurrentLyricIndex(0);
    setLyricProgress(0);
    setCurrentTime(0);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, 150);
  };

  const handleSeek = (time: number) => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    // Nếu audio chưa sẵn sàng để seek (readyState < 1), phải đợi
    if (audio.readyState < 1) {
      // Đợi loadedmetadata rồi mới seek
      const onReady = () => {
        audio.currentTime = time;
        setCurrentTime(time);
        audio.removeEventListener('loadedmetadata', onReady);
      };
      audio.addEventListener('loadedmetadata', onReady);
      audio.load(); // Trigger load nếu chưa load
    } else {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Hàm lấy index bài hát ngẫu nhiên (khác bài hiện tại)
  const getRandomSongIndex = () => {
    if (songs.length <= 1) return 0;
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * songs.length);
    } while (randomIndex === currentSongIndex);
    return randomIndex;
  };

  // Xử lý chuyển bài tiếp theo (có shuffle)
  const handleNext = () => {
    if (isShuffleOn) {
      handleSongSelect(getRandomSongIndex());
    } else if (currentSongIndex < songs.length - 1) {
      handleSongSelect(currentSongIndex + 1);
    }
  };

  // Xử lý khi bài hát kết thúc
  const handleSongEnded = () => {
    if (isShuffleOn) {
      handleSongSelect(getRandomSongIndex());
    } else if (currentSongIndex < songs.length - 1) {
      handleSongSelect(currentSongIndex + 1);
    }
  };

  const currentSong = songs[currentSongIndex];
  const filteredSongs = songs.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    /* THAY ĐỔI: bg-[#121212] (Đen Spotify) và thêm gradient mờ ảo ở góc */
    /* Sử dụng h-dvh cho mobile, fallback h-screen cho desktop */
    <div className="h-screen h-[100dvh] w-full bg-[#121212] text-white flex flex-col overflow-hidden relative">

      {/* Background Decor: Tạo các đốm màu mờ ảo phía sau để nhìn chuyên nghiệp hơn */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-purple-900/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 1. Header: Trong suốt và gọn gàng hơn */}
      <header className="relative z-10 flex-none py-6 px-8 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
            <span className="text-black text-xl font-bold">T</span>
          </div>
          <h1 className="text-2xl font-black tracking-tighter">
            Tunify<span className="text-blue-500">.</span>
          </h1>
        </div>

        {currentSong && (
          <div className="hidden md:flex items-center gap-3">
            {/* Now Playing / Paused Status */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-3">
              <div className="flex items-end gap-1 h-3">
                <div className={`w-1 bg-blue-500 rounded-full ${isPlaying ? 'animate-[music-bar_0.8s_ease-in-out_infinite_100ms]' : 'h-1'}`} />
                <div className={`w-1 bg-blue-400 rounded-full ${isPlaying ? 'animate-[music-bar_0.8s_ease-in-out_infinite_300ms]' : 'h-2'}`} />
                <div className={`w-1 bg-blue-600 rounded-full ${isPlaying ? 'animate-[music-bar_0.8s_ease-in-out_infinite_500ms]' : 'h-1.5'}`} />
              </div>
              <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">
                {isPlaying ? 'Now Playing' : 'Paused'}
              </span>
            </div>

            {/* Robot Call Button */}
            <button
              onClick={() => robotRef.current?.showRobot()}
              className="bg-white/5 border border-white/10 backdrop-blur-xl px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/10 transition-all duration-300"
              title={ROBOT_CONFIG.tooltipMessage}
            >
              <span className="text-white/80 text-[10px] font-bold uppercase tracking-[0.15em]">
                Mắm
              </span>
            </button>
          </div>
        )}
      </header>

      {/* 2. Search Bar Section */}
      <div className="relative z-10 flex-none px-8 pb-6">
        <div className="max-w-4xl mx-auto">
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
        </div>
      </div>

      {/* 3. Main Content: Grid Layout - pb-24 để chừa chỗ cho fixed footer */}
      <main className="relative z-10 flex-1 min-h-0 px-8 pb-24">
        <div className="max-w-[1920px] mx-auto h-full grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Cột trái: Song Header + Lyrics - Chiếm 2/3 */}
          <div className="lg:col-span-3 h-full min-h-0 flex flex-col gap-4">
            {/* Song Header */}
            <SongHeader songTitle={currentSong?.title} isPlaying={isPlaying} />

            {/* Lyrics Viewer */}
            <div className="flex-1 min-h-0">
              <LyricsViewer
                lyrics={lyrics}
                currentLyricIndex={currentLyricIndex}
                currentSongTitle={currentSong?.title}
                progress={lyricProgress}
              />
            </div>
          </div>

          {/* Cột phải: Playlist - CHỈ GIỮ LẠI layout, bỏ khung viền */}
          <div className="h-full min-h-0"> {/* Xóa rounded-3xl, overflow-hidden, border ở đây */}
            <PlaylistPanel
              songs={filteredSongs}
              currentSongIndex={currentSongIndex}
              onSongSelect={(i) => handleSongSelect(songs.findIndex(s => s.id === filteredSongs[i].id))}
              onRefresh={fetchSongs}
            />
          </div>
        </div>
      </main>

      {/* 4. Footer: Control Bar - Fixed position để luôn hiển thị trên mobile */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-[#181818] backdrop-blur-2xl border-t border-white/5 py-3 px-6 safe-area-pb">
        <div className="max-w-7xl mx-auto">
          <PlayerControls
            isPlaying={isPlaying}
            currentSongIndex={currentSongIndex}
            totalSongs={songs.length}
            offset={offset}
            currentTime={currentTime}
            duration={duration}
            isShuffleOn={isShuffleOn}
            onPlayPause={handlePlayPause}
            onPrevious={() => handleSongSelect(currentSongIndex - 1)}
            onNext={handleNext}
            onOffsetUp={() => setOffset(o => o + 0.1)}
            onOffsetDown={() => setOffset(o => o - 0.1)}
            onSeek={handleSeek}
            onShuffleToggle={() => setIsShuffleOn(prev => !prev)}
          />
        </div>
      </footer>

      {currentSong && <audio ref={audioRef} key={currentSong.id} src={currentSong.audioUrl} preload="metadata" onEnded={handleSongEnded} />}

      {/* Robot Icon - xuất hiện tại 1/3 và 2/3 thời gian bài hát */}
      <RobotIcon 
        ref={robotRef}
        currentTime={currentTime} 
        duration={duration} 
        songId={currentSong?.id}
        songTitle={currentSong?.title}
        lyrics={lyrics}
      />

      {/* CSS Animation cho cột nhạc (Thêm vào global.css hoặc dùng style tag) */}
      <style jsx global>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
      `}</style>
    </div>
  );
}