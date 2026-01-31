'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic2, PlayCircle, ListMusic, Plus, X, Upload, Music, FileText, Lock, Eye, EyeOff, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { API_URL } from '../lib/config';

interface Song {
  id: string;
  title: string;
  audioUrl: string;
  hasLyrics: boolean;
}

interface PlaylistPanelProps {
  songs: Song[];
  currentSongIndex: number;
  onSongSelect: (index: number) => void;
  onRefresh?: () => void;
}

interface ImportFormData {
  title: string;
  soundFile: File | null;
  lyricsFile: File | null;
}

export default function PlaylistPanel({ songs, currentSongIndex, onSongSelect, onRefresh }: PlaylistPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [passwordAction, setPasswordAction] = useState<'import' | 'delete'>('import');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [formData, setFormData] = useState<ImportFormData>({
    title: '',
    soundFile: null,
    lyricsFile: null,
  });

  const soundInputRef = useRef<HTMLInputElement>(null);
  const lyricsInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };

    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const handleImportButtonClick = () => {
    setPasswordAction('import');
    setIsPasswordModalOpen(true);
    setPassword('');
    setPasswordError('');
    setShowPassword(false);
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) return;

    setIsVerifying(true);
    setPasswordError('');

    try {
      const response = await fetch(`${API_URL}/api/verify-import-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsPasswordModalOpen(false);
        setPassword('');
        setPasswordError('');

        if (passwordAction === 'import') {
          setIsModalOpen(true);
        } else if (passwordAction === 'delete' && deleteTrackId) {
          // Proceed with delete
          handleDeleteConfirmed();
        }
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch (error) {
      setPasswordError('Connection error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTrackId) return;

    setIsDeleting(true);
    setDeleteError('');

    try {
      const response = await fetch(`${API_URL}/api/track/${deleteTrackId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteSuccess(true);
        // Refresh playlist after deletion
        if (onRefresh) {
          onRefresh();
        }
        setTimeout(() => {
          setDeleteTrackId(null);
          setDeleteSuccess(false);
        }, 1500);
      } else {
        const error = await response.json();
        setDeleteError(error.detail || 'Delete failed. Please try again.');
      }
    } catch (error) {
      setDeleteError('Connection error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handlePasswordSubmit();
    }
  };

  const handleClosePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPassword('');
    setPasswordError('');
    setShowPassword(false);
    setDeleteTrackId(null);
  };

  const handleTrackMenuClick = (e: React.MouseEvent, songId: string) => {
    e.stopPropagation(); // Prevent song selection
    setMenuOpenId(menuOpenId === songId ? null : songId);
  };

  const handleUpdateTrack = (songId: string) => {
    // TODO: Implement update track logic later
    console.log('Update track:', songId);
    setMenuOpenId(null);
  };

  const handleDeleteTrack = (songId: string) => {
    setMenuOpenId(null);
    setDeleteTrackId(songId);
    setPasswordAction('delete');
    setIsPasswordModalOpen(true);
    setPassword('');
    setPasswordError('');
    setShowPassword(false);
  };

  const handleOpenModal = () => setIsModalOpen(true);
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({ title: '', soundFile: null, lyricsFile: null });
    setImportError('');
    setImportSuccess(false);
    // Reset input values
    if (soundInputRef.current) {
      soundInputRef.current.value = '';
    }
    if (lyricsInputRef.current) {
      lyricsInputRef.current.value = '';
    }
  };

  const handleSoundFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        soundFile: e.target.files![0]
      }));
    }
  };

  const handleLyricsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({
        ...prev,
        lyricsFile: e.target.files![0]
      }));
    }
  };

  const removeSoundFile = () => {
    setFormData(prev => ({
      ...prev,
      soundFile: null
    }));
    // Reset input value to allow re-selecting the same file
    if (soundInputRef.current) {
      soundInputRef.current.value = '';
    }
  };

  const removeLyricsFile = () => {
    setFormData(prev => ({
      ...prev,
      lyricsFile: null
    }));
    // Reset input value to allow re-selecting the same file
    if (lyricsInputRef.current) {
      lyricsInputRef.current.value = '';
    }
  };

  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const handleImport = async () => {
    if (!formData.title.trim() || !formData.soundFile) return;

    setIsImporting(true);
    setImportError('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);

      // Append sound file
      formDataToSend.append('sound_file', formData.soundFile);

      // Append lyrics file if exists
      if (formData.lyricsFile) {
        formDataToSend.append('lyrics_file', formData.lyricsFile);
      }

      const response = await fetch(`${API_URL}/api/import-track`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Import successful:', result);
        setImportSuccess(true);
        // Refresh playlist sau khi import thành công
        if (onRefresh) {
          onRefresh();
        }
        setTimeout(() => {
          handleCloseModal();
          setImportSuccess(false);
        }, 1500);
      } else {
        const error = await response.json();
        setImportError(error.detail || 'Import failed. Please try again.');
      }
    } catch (error) {
      setImportError('Connection error. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="h-full w-full bg-[#020617] rounded-[32px] border border-white/10 flex flex-col relative overflow-hidden shadow-2xl">
      {/* GIẢI THÍCH:
        - rounded-[32px] & border: Đặt chung trên 1 div để góc bo và viền khớp tuyệt đối.
        - overflow-hidden: Cắt bỏ các phần nội dung (như SVG sợi chỉ) thò ra ngoài góc bo.
        - relative: Để làm gốc tọa độ cho các sợi chỉ absolute bên dưới.
      */}

      {/* 1. HIỆU ỨNG DẢI SỢI CHỈ (Silk threads) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="w-full h-full">
          <defs>
            <linearGradient id="threadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
              <stop offset="50%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[...Array(5)].map((_, i) => (
            <path
              key={i}
              className="animate-silk-thread"
              stroke="url(#threadGradient)"
              strokeWidth="1.5"
              fill="none"
              d={`M-100,${150 + i * 200} Q250,${50 + i * 100} 500,${500} T1100,${850 - i * 150}`}
              style={{ animationDelay: `${i * -2.5}s` }}
            />
          ))}
        </svg>
      </div>

      {/* 2. HEADER - relative z-10 để nằm trên lớp sợi chỉ */}
      <div className="flex-none flex items-center justify-between p-6 pb-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/10 rounded-xl ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <ListMusic className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white text-base font-black tracking-tight uppercase">Library</h3>
            <p className="text-[10px] text-blue-400/50 font-bold tracking-[0.2em]">PLAYLIST</p>
          </div>
        </div>

        {/* Import Track Button */}
        <button
          onClick={handleImportButtonClick}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl ring-1 ring-blue-500/20 hover:ring-blue-500/40 transition-all duration-300 group"
        >
          <Plus className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
          <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300">Import track</span>
        </button>
      </div>

      {/* PASSWORD MODAL */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClosePasswordModal}
          />

          {/* Modal Content */}
          <div className="relative bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ring-1 ${passwordAction === 'delete'
                  ? 'bg-red-500/10 ring-red-500/20'
                  : 'bg-amber-500/10 ring-amber-500/20'
                  }`}>
                  <Lock className={`w-5 h-5 ${passwordAction === 'delete' ? 'text-red-400' : 'text-amber-400'}`} />
                </div>
                <h2 className="text-white text-lg font-bold">
                  {passwordAction === 'delete' ? 'Confirm Delete' : 'Enter Password'}
                </h2>
              </div>
              <button
                onClick={handleClosePasswordModal}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <p className="text-sm text-slate-400 mb-4">
                {passwordAction === 'delete'
                  ? 'Please enter password to delete this track. This action cannot be undone.'
                  : 'Please enter the password to access import feature.'}
              </p>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  onKeyDown={handlePasswordKeyDown}
                  placeholder="Enter password..."
                  autoFocus
                  className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" />
                  ) : (
                    <EyeOff className="w-5 h-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-2 text-sm text-red-400">{passwordError}</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={handleClosePasswordModal}
                disabled={isVerifying}
                className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!password.trim() || isVerifying}
                className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${passwordAction === 'delete'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-amber-500 hover:bg-amber-600'
                  }`}
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {passwordAction === 'delete' ? 'Deleting...' : 'Verifying...'}
                  </>
                ) : (
                  passwordAction === 'delete' ? 'Delete' : 'Unlock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal Content */}
          <div className="relative bg-[#0f172a] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl ring-1 ring-blue-500/20">
                  <Upload className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-white text-lg font-bold">Import Track</h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Title Field */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter track title..."
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>

              {/* Sounds Field */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  <Music className="w-4 h-4 inline mr-2" />
                  Sounds (.mp3) <span className="text-red-400">*</span>
                </label>
                <input
                  ref={soundInputRef}
                  type="file"
                  accept=".mp3,audio/mpeg"
                  onChange={handleSoundFileChange}
                  className="hidden"
                />
                {formData.soundFile ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 rounded-lg">
                    <span className="text-sm text-blue-300 truncate flex-1">{formData.soundFile.name}</span>
                    <button
                      onClick={removeSoundFile}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-2"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => soundInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-slate-400 hover:bg-white/10 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Click to upload MP3 file</span>
                  </button>
                )}
              </div>

              {/* Lyrics Field */}
              <div>
                <label className="block text-sm font-bold text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Lyrics (.lrc)
                </label>
                <input
                  ref={lyricsInputRef}
                  type="file"
                  accept=".lrc"
                  onChange={handleLyricsFileChange}
                  className="hidden"
                />
                {formData.lyricsFile ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 rounded-lg">
                    <span className="text-sm text-green-300 truncate flex-1">{formData.lyricsFile.name}</span>
                    <button
                      onClick={removeLyricsFile}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-2"
                    >
                      <X className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => lyricsInputRef.current?.click()}
                    className="w-full px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl text-slate-400 hover:bg-white/10 hover:border-blue-500/50 transition-all flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Click to upload LRC file</span>
                  </button>
                )}
              </div>
            </div>

            {/* Import Status Messages */}
            {importError && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-sm text-red-400">{importError}</p>
                </div>
              </div>
            )}

            {importSuccess && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-sm text-green-400">✅ Track imported successfully!</p>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={handleCloseModal}
                disabled={isImporting}
                className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!formData.title.trim() || !formData.soundFile || isImporting}
                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Import'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DANH SÁCH BÀI HÁT */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative z-10 px-5 mt-4">
        <div className="space-y-2 pb-8">
          {songs.map((song, index) => {
            const isActive = index === currentSongIndex;
            const isMenuOpen = menuOpenId === song.id;
            return (
              <div key={song.id} className="relative">
                <button
                  onClick={() => onSongSelect(index)}
                  /* ring-inset giúp viền của item active vẽ vào bên trong, 
                     không bao giờ chạm vào viền của khung PlaylistPanel ngoài cùng 
                  */
                  className={`w-full text-left px-5 py-4 rounded-2xl transition-all duration-300 group relative outline-none ${isActive
                    ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-400/30 shadow-lg z-20'
                    : 'hover:bg-white/5 text-slate-400 hover:text-white z-10'
                    }`}
                >
                  <div className="flex items-center gap-5 relative z-30">
                    {/* Số thứ tự hoặc Music Bar */}
                    <div className="w-10 flex justify-center items-center">
                      {isActive ? (
                        <div className="flex gap-1 items-end h-4">
                          <div className="w-1 bg-blue-400 animate-[music-bar_0.8s_ease-in-out_infinite]" />
                          <div className="w-1 bg-blue-400 animate-[music-bar_1.2s_ease-in-out_infinite]" />
                          <div className="w-1 bg-blue-400 animate-[music-bar_1.0s_ease-in-out_infinite]" />
                        </div>
                      ) : (
                        <span className="text-xl font-black font-mono text-slate-600 group-hover:opacity-0 transition-opacity">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                      )}
                      {!isActive && (
                        <PlayCircle className="absolute w-7 h-7 text-blue-400 opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100" />
                      )}
                    </div>

                    {/* Thông tin bài hát */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-base font-bold truncate transition-colors ${isActive ? 'text-white' : 'text-slate-300'
                        }`}>
                        {song.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-blue-400' : 'text-slate-600'}`}>
                          ARTIST
                        </span>
                        {song.hasLyrics && (
                          <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md ring-1 ring-inset ${isActive ? 'bg-blue-500/20 ring-blue-500/30 text-blue-300' : 'bg-white/5 ring-white/10 text-slate-600'
                            }`}>
                            <Mic2 className="w-2.5 h-2.5" /> LYRICS
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* 3-dot Menu Button */}
                <div
                  ref={isMenuOpen ? menuRef : null}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-40"
                >
                  <button
                    onClick={(e) => handleTrackMenuClick(e, song.id)}
                    className={`p-2 rounded-lg transition-all duration-200 ${isMenuOpen
                      ? 'bg-white/10 text-white'
                      : 'text-slate-500 hover:text-white hover:bg-white/10'
                      }`}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                      <button
                        onClick={() => handleUpdateTrack(song.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                      >
                        <Pencil className="w-4 h-4 flex-shrink-0" />
                        Update track
                      </button>
                      <button
                        onClick={() => handleDeleteTrack(song.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4 flex-shrink-0" />
                        Delete track
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes music-bar {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        @keyframes silk-thread {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-silk-thread {
          stroke-dasharray: 400 600;
          animation: silk-thread 30s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}