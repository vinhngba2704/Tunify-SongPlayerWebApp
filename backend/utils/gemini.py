from google import genai
from typing import Optional
import os
from dotenv import load_dotenv
from backend.utils.prompts import generate_mamchan_prompt, MAMCHAN_FALLBACK_MESSAGE

load_dotenv()

# Khởi tạo Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Model mặc định
DEFAULT_MODEL = "gemini-2.0-flash"


def generate_robot_comment(song_title: Optional[str] = None, lyrics: Optional[str] = None) -> str:
    """
    Tạo comment hài hước/khịa từ robot Mắm Chan.
    
    Args:
        song_title: Tên bài hát đang phát (optional)
        lyrics: Toàn bộ lời bài hát (optional)
    
    Returns:
        Một câu comment ngắn gọn, hài hước
    """
    try:
        prompt = generate_mamchan_prompt(song_title, lyrics)

        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=prompt,
        )
        
        if response.text:
            return response.text.strip()
        return MAMCHAN_FALLBACK_MESSAGE
    
    except Exception as e:
        print(f"Error generating robot comment: {e}")
        # Fallback message nếu API lỗi
        return MAMCHAN_FALLBACK_MESSAGE


def generate_custom_response(prompt: str) -> Optional[str]:
    """
    Tạo response từ prompt tùy chỉnh.
    
    Args:
        prompt: Câu lệnh/prompt cho Gemini
    
    Returns:
        Response từ Gemini
    """
    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=prompt,
        )
        if response.text:
            return response.text.strip()
        return None
    
    except Exception as e:
        print(f"Error generating response: {e}")
        return None


# Test trực tiếp
if __name__ == "__main__":
    print("Testing robot comment:")
    print(generate_robot_comment("Cause I Love You"))
    print("\nTesting custom prompt:")
    print(generate_custom_response("Viết cho tôi 1 câu thơ ngắn về tình yêu."))