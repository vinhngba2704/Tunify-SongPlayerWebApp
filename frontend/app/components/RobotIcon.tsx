'use client';

import { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import Image from 'next/image';
import { ROBOT_CONFIG } from './configs/robotConfig';
import { API_URL } from '../lib/config';

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const cornerPositions: Record<Corner, string> = {
  'top-left': 'top-20 left-4',
  'top-right': 'top-20 right-4',
  'bottom-left': 'bottom-28 left-4',
  'bottom-right': 'bottom-28 right-4',
};

// Dynamic tooltip positions based on corner
const tooltipPositions: Record<Corner, string> = {
  'top-left': 'left-full top-1/2 -translate-y-1/2 ml-2',
  'top-right': 'right-full top-1/2 -translate-y-1/2 mr-2',
  'bottom-left': 'left-full bottom-1/2 translate-y-1/2 ml-2',
  'bottom-right': 'right-full bottom-1/2 translate-y-1/2 mr-2',
};

// Dynamic chat bubble positions based on corner
const chatBubblePositions: Record<Corner, string> = {
  'top-left': 'left-full top-0 ml-3',
  'top-right': 'right-full top-0 mr-3',
  'bottom-left': 'left-full bottom-0 ml-3',
  'bottom-right': 'right-full bottom-0 mr-3',
};

// Chat bubble arrow/tail positions
const chatTailPositions: Record<Corner, string> = {
  'top-left': 'right-full top-4 border-r-white',
  'top-right': 'left-full top-4 border-l-white',
  'bottom-left': 'right-full bottom-4 border-r-white',
  'bottom-right': 'left-full bottom-4 border-l-white',
};

interface LyricLine {
  time: number;
  text: string;
}

interface RobotIconProps {
  currentTime: number;
  duration: number;
  songId?: string; // Để detect khi đổi bài
  songTitle?: string; // Để gửi lên API
  lyrics?: LyricLine[]; // Lời bài hát để gửi lên API
}

// Export handle type để parent có thể gọi showRobot
export interface RobotIconHandle {
  showRobot: () => void;
}

const RobotIcon = forwardRef<RobotIconHandle, RobotIconProps>(({ currentTime, duration, songId, songTitle, lyrics }, ref) => {
  const [corner, setCorner] = useState<Corner>('top-right');
  const [isVisible, setIsVisible] = useState(false);
  const [hasShownAtOneThird, setHasShownAtOneThird] = useState(false);
  const [hasShownAtTwoThirds, setHasShownAtTwoThirds] = useState(false);
  const [chatMessage, setChatMessage] = useState(ROBOT_CONFIG.chatMessage);
  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch comment từ Gemini API
  const fetchRobotComment = useCallback(async () => {
    if (!API_URL) {
      setChatMessage(ROBOT_CONFIG.chatMessage);
      return;
    }

    setIsLoadingMessage(true);
    try {
      // Chuyển lyrics array thành text
      const lyricsText = lyrics?.map(line => line.text).join('\n') || null;
      
      const response = await fetch(`${API_URL}/api/robot-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          song_title: songTitle || null,
          lyrics: lyricsText,
        }),
      });
      const data = await response.json();
      
      if (data.success && data.comment) {
        setChatMessage(data.comment);
      } else {
        setChatMessage(ROBOT_CONFIG.chatMessage);
      }
    } catch (error) {
      console.error('Failed to fetch robot comment:', error);
      setChatMessage(ROBOT_CONFIG.chatMessage);
    } finally {
      setIsLoadingMessage(false);
    }
  }, [songTitle, lyrics]);

  // Reset state khi đổi bài
  useEffect(() => {
    setHasShownAtOneThird(false);
    setHasShownAtTwoThirds(false);
    setIsVisible(false);
    setChatMessage(ROBOT_CONFIG.chatMessage); // Reset về message mặc định
    // Random góc mới khi đổi bài
    const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    setCorner(corners[Math.floor(Math.random() * corners.length)]);
  }, [songId]);

  // Logic hiển thị tại 1/3 và 2/3 thời gian bài hát
  useEffect(() => {
    if (duration <= 0) return;

    const oneThirdMark = duration / 3;
    const twoThirdsMark = (duration * 2) / 3;
    const tolerance = 1; // Sai số 1 giây

    // Kiểm tra mốc 1/3
    if (!hasShownAtOneThird && 
        currentTime >= oneThirdMark - tolerance && 
        currentTime <= oneThirdMark + tolerance) {
      setHasShownAtOneThird(true);
      showRobot(true); // Fetch comment mới khi xuất hiện tự động
    }

    // Kiểm tra mốc 2/3
    if (!hasShownAtTwoThirds && 
        currentTime >= twoThirdsMark - tolerance && 
        currentTime <= twoThirdsMark + tolerance) {
      setHasShownAtTwoThirds(true);
      // Random góc mới cho lần xuất hiện thứ 2
      const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      setCorner(corners[Math.floor(Math.random() * corners.length)]);
      showRobot(true); // Fetch comment mới khi xuất hiện tự động
    }
  }, [currentTime, duration, hasShownAtOneThird, hasShownAtTwoThirds]);

  const showRobot = useCallback((fetchNewComment: boolean = true) => {
    // Clear timer cũ nếu có
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Chỉ fetch comment mới nếu được yêu cầu
    if (fetchNewComment) {
      fetchRobotComment();
    }

    setIsVisible(true);

    // Ẩn sau DISPLAY_DURATION giây
    hideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, ROBOT_CONFIG.displayDuration * 1000);
  }, [fetchRobotComment]);

  // Cleanup timer khi unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  // Expose showRobot method to parent via ref
  useImperativeHandle(ref, () => ({
    showRobot: () => {
      // Random góc mới khi gọi từ bên ngoài (nút Mắm)
      const corners: Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
      setCorner(corners[Math.floor(Math.random() * corners.length)]);
      showRobot(true); // Fetch comment mới khi gọi từ nút Mắm
    }
  }));

  // Handler khi click vào robot - chỉ reset timer, không fetch comment mới
  const handleClick = () => {
    if (isVisible) {
      // Reset timer nếu đang hiển thị, KHÔNG fetch comment mới
      showRobot(false);
    }
  };

  return (
    <div
      className={`
        fixed z-40 ${cornerPositions[corner]}
        transition-all duration-700 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}
      `}
    >
      <div className="group cursor-pointer select-none" onClick={handleClick}>
        {/* Container chung cho Robot và Chat Bubble - cùng lơ lửng */}
        <div className={`relative robot-float flex items-center transition-transform duration-300 ${corner.includes('top') ? 'group-hover:-translate-y-3' : 'group-hover:translate-y-3'}`}>
          {/* Chat Bubble bên trái robot (cho góc phải) */}
          {corner.includes('right') && (
            <div 
              className={`
                mr-3
                transition-all duration-500 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
              `}
              style={{ fontFamily: '"Google Sans", "Product Sans", sans-serif' }}
            >
              <div className="relative bg-white rounded-2xl px-4 py-3 shadow-xl max-w-xs">
                {/* Chat tail/arrow - Chỉ về phía robot (bên phải) */}
                <div className="absolute w-0 h-0 top-1/2 -translate-y-1/2 -right-2 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[10px] border-l-white" />
                <p className="text-gray-800 text-sm font-medium leading-relaxed">
                  {isLoadingMessage ? (
                    <span className="text-gray-400 animate-pulse">Đang suy nghĩ...</span>
                  ) : (
                    chatMessage
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Robot Icon */}
          <div className="relative w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-lg flex items-center justify-center overflow-hidden border-2 border-white/50">
            <Image
              src="/CommentBot_Icon.png"
              alt="Mắm Chan Bot"
              width={48}
              height={48}
              className="transform group-hover:scale-110 transition-transform duration-300 object-contain"
            />
          </div>

          {/* Chat Bubble bên phải robot (cho góc trái) */}
          {corner.includes('left') && (
            <div 
              className={`
                ml-3
                transition-all duration-500 ease-out
                ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}
              `}
              style={{ fontFamily: '"Google Sans", "Product Sans", sans-serif' }}
            >
              <div className="relative bg-white rounded-2xl px-4 py-3 shadow-xl max-w-xs">
                {/* Chat tail/arrow - Chỉ về phía robot (bên trái) */}
                <div className="absolute w-0 h-0 top-1/2 -translate-y-1/2 -left-2 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[10px] border-r-white" />
                <p className="text-gray-800 text-sm font-medium leading-relaxed">
                  {isLoadingMessage ? (
                    <span className="text-gray-400 animate-pulse">Đang suy nghĩ...</span>
                  ) : (
                    chatMessage
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tooltip on hover - Vị trí dynamic theo góc */}
        <div className={`
          absolute left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-lg rounded-lg text-xs font-medium text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none border border-white/20 shadow-lg
          ${corner.includes('top') ? 'top-full mt-2' : 'bottom-full mb-2'}
        `}>
          {ROBOT_CONFIG.tooltipMessage}
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          
          .robot-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
});

RobotIcon.displayName = 'RobotIcon';

export default RobotIcon;