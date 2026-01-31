'use client';

import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronUp,
  ChevronDown,
  Timer,
  Shuffle
} from 'lucide-react';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentSongIndex: number;
  totalSongs: number;
  offset: number;
  currentTime: number;
  duration: number;
  isShuffleOn: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onOffsetUp: () => void;
  onOffsetDown: () => void;
  onSeek: (time: number) => void;
  onShuffleToggle: () => void;
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function PlayerControls({
  isPlaying,
  currentSongIndex,
  totalSongs,
  offset,
  currentTime,
  duration,
  isShuffleOn,
  onPlayPause,
  onPrevious,
  onNext,
  onOffsetUp,
  onOffsetDown,
  onSeek,
  onShuffleToggle
}: PlayerControlsProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progressBarRef = useRef<HTMLDivElement>(null);

  const visualProgress = useMemo(() => {
    if (isDragging) return dragProgress * 100;
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  }, [isDragging, dragProgress, currentTime, duration]);

  const getProgressFromEvent = useCallback((clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return x / rect.width;
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const progress = getProgressFromEvent(e.clientX);
    setDragProgress(progress);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const progress = getProgressFromEvent(e.clientX);
      setDragProgress(progress);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        const progress = getProgressFromEvent(e.clientX);
        onSeek(progress * duration);
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, duration, onSeek, getProgressFromEvent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        onPlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlayPause]);

  return (
    <div className="w-full select-none h-[72px] bg-[#020617] rounded-[32px] border border-white/10 relative overflow-hidden group shadow-2xl flex items-center px-6 transition-all duration-300 hover:border-white/20">

      {/* 1. HIỆU ỨNG DẢI SỢI CHỈ (Silk threads) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none transform scale-125">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="controlThreadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[...Array(6)].map((_, i) => (
            <path
              key={i}
              className="animate-silk-thread"
              stroke="url(#controlThreadGradient)"
              strokeWidth="1"
              fill="none"
              d={`M-100,${200 + i * 150} Q300,${100 + i * 50} 500,${500} T1100,${800 - i * 100}`}
              style={{ animationDelay: `${i * -3}s`, animationDuration: '40s' }}
            />
          ))}
        </svg>
      </div>

      {/* 2. CONTENT */}
      <div className="relative z-10 w-full">
        {/* Layout ngang gọn gàng - tất cả trên 1 dòng */}
        <div className="flex items-center gap-6">

          {/* LEFT: Offset control */}
          <div className="hidden sm:flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <Timer className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-400 font-mono text-[10px] min-w-[32px]">
              {offset > 0 ? `+${offset.toFixed(1)}` : offset.toFixed(1)}s
            </span>
            <div className="flex flex-col -space-y-1">
              <button onClick={onOffsetUp} className="p-0 hover:text-white text-zinc-600 transition">
                <ChevronUp className="w-3 h-3" />
              </button>
              <button onClick={onOffsetDown} className="p-0 hover:text-white text-zinc-600 transition">
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* CENTER: Controls + Progress Bar */}
          <div className="flex-1 flex items-center gap-4">

            {/* Play Controls */}
            <div className="flex items-center gap-4">
              {/* Shuffle Button */}
              <button
                onClick={onShuffleToggle}
                className={`transition-all active:scale-90 ${isShuffleOn
                  ? 'text-blue-400 hover:text-blue-300'
                  : 'text-zinc-500 hover:text-white'
                  }`}
                title={isShuffleOn ? 'Shuffle: On' : 'Shuffle: Off'}
              >
                <Shuffle className="w-4 h-4" strokeWidth={2} />
              </button>

              {/* Previous Track */}
              <button
                onClick={onPrevious}
                disabled={currentSongIndex === 0}
                className={`transition-all ${currentSongIndex === 0 ? 'text-zinc-700' : 'text-zinc-400 hover:text-white active:scale-90'}`}
                title="Previous track"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>

              {/* Play/Pause */}
              <button
                onClick={onPlayPause}
                className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg shadow-white/10 active:scale-95 group/play"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-black fill-current" />
                ) : (
                  <Play className="w-5 h-5 text-black fill-current ml-0.5" />
                )}
              </button>

              {/* Next Track */}
              <button
                onClick={onNext}
                disabled={currentSongIndex === totalSongs - 1 && !isShuffleOn}
                className={`transition-all ${(currentSongIndex === totalSongs - 1 && !isShuffleOn)
                  ? 'text-zinc-700'
                  : 'text-zinc-400 hover:text-white active:scale-90'
                  }`}
                title="Next track"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>

            {/* Time + Progress Bar */}
            <div className="flex-1 flex items-center gap-3">
              <span className="text-zinc-400 text-[11px] font-mono min-w-[36px] text-right">
                {formatTime(isDragging ? dragProgress * duration : currentTime)}
              </span>

              <div className="flex-1 relative h-6 flex items-center group/bar">
                {/* Tooltip */}
                {hoverTime !== null && !isDragging && (
                  <div
                    className="absolute -top-8 bg-white text-black text-[10px] font-bold px-2 py-1 rounded shadow-xl pointer-events-none -translate-x-1/2 z-20"
                    style={{ left: `${(hoverTime / duration) * 100}%` }}
                  >
                    {formatTime(hoverTime)}
                  </div>
                )}

                {/* Progress Track */}
                <div
                  ref={progressBarRef}
                  className="w-full h-1 bg-white/10 rounded-full cursor-pointer relative group-hover/bar:h-1.5 transition-all duration-300"
                  onMouseDown={handleMouseDown}
                  onMouseMove={(e) => {
                    const time = getProgressFromEvent(e.clientX) * duration;
                    setHoverTime(time);
                  }}
                  onMouseLeave={() => setHoverTime(null)}
                >
                  {/* Click area padding */}
                  <div className="absolute -inset-y-3 w-full" />

                  {/* Progress Fill */}
                  <div
                    className={`h-full rounded-full relative transition-all duration-150 ${isDragging ? 'bg-blue-400' : 'bg-white/60 group-hover/bar:bg-blue-400'}`}
                    style={{ width: `${visualProgress}%` }}
                  >
                    {/* Handle */}
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300 ${isDragging ? 'scale-110 opacity-100' : 'opacity-0 group-hover/bar:opacity-100 scale-100'
                      }`} />
                  </div>
                </div>
              </div>

              <span className="text-zinc-600 text-[11px] font-mono min-w-[36px]">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* RIGHT: Track number + Shuffle indicator */}
          <div className="hidden sm:flex items-center gap-3 text-zinc-500 border-l border-white/5 pl-6">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">Track</span>
              <span className="font-mono text-sm text-zinc-300">
                {String(currentSongIndex + 1).padStart(2, '0')}<span className="text-zinc-700 mx-1">/</span>{String(totalSongs).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes silk-thread {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-silk-thread {
          stroke-dasharray: 500 1500;
          animation: silk-thread 40s linear infinite;
        }
      `}</style>
    </div>
  );
}