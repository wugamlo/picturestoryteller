from flask import Flask, render_template, request, jsonify, session
import os
import requests
import json
import logging
import base64
import re
from flask import session as flask_session

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-123')

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Venice AI API configuration
VENICE_API_KEY = os.environ.get("VENICE_API_KEY", "your_venice_api_key_here")
VENICE_API_BASE = "https://api.venice.ai/api/v1"

def generate_chat_response_non_streaming(messages, model_id="llama-3.3-70b", max_tokens=4000):
    try:
        response = requests.post(
            f"{VENICE_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {VENICE_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens
            },
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        if data.get("choices"):
            return data["choices"][0]["message"]["content"].strip()
        else:
            return "No content generated"
    except Exception as e:
        logger.error(f"Failed to generate response: {e}")
        return f"Error: {str(e)}"

def generate_image(prompt, model_id="fluently-xl"):
    try:
        response = requests.post(
            f"{VENICE_API_BASE}/image/generate",
            headers={
                "Authorization": f"Bearer {VENICE_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_id,
                "prompt": prompt,
                "width": 512,
                "height": 512,
                "steps": 30,
                "hide_watermark": True,
                "return_binary": True
            },
            timeout=45
        )
        response.raise_for_status()
        if 'image/png' in response.headers.get('content-type', ''):
            encoded_image = base64.b64encode(response.content).decode('utf-8')
            return {"images": [encoded_image]}
        else:
            return {"error": "Unexpected response type"}
    except Exception as e:
        return {"error": str(e)}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start-story', methods=['POST'])
def start_story():
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    num_chapters = data.get('num_chapters', 1)
    if not prompt:
        return jsonify({"error": "No story prompt provided"}), 400
    # Generate the full story with specified chapters
    initial_prompt = (
        f"Compose a story based on: '{prompt}' divided into exactly {num_chapters} chapters. "
        "Each chapter MUST start with 'CHAPTER X:' where X is the chapter number in Roman numerals, "
        "followed by a colon and space. The content of each chapter should be concise and end with a cliffhanger or conclusion. "
        "Avoid combining chapters or exceeding the requested count."
    )
    max_tokens = num_chapters * 800  
    full_story = generate_chat_response_non_streaming(
        messages=[{"role": "user", "content": initial_prompt}],
        max_tokens=max_tokens
    )
    # Validate story generation
    if not full_story or "Error:" in full_story or "No content generated" in full_story:
        return jsonify({"error": "Failed to generate story"}), 500
    # Split chapters using regex
    split_result = re.split(r'(CHAPTER\s+[IVXLCDM]+):\s*', full_story)
    chapters = []
    for i in range(1, len(split_result), 2):
        if i + 1 < len(split_result):
            header = split_result[i]
            content = split_result[i + 1].strip()
            chapters.append(f"{header}: {content}")
    chapters = chapters[:num_chapters]  # Truncate to requested chapters
    # Ensure the correct number of chapters
    if len(chapters) < num_chapters:
        return jsonify({"error": "Generated story does not meet chapter count requirements"}), 400
    # Store chapters in session
    flask_session['chapters'] = chapters
    flask_session['current_chapter'] = 0  # Start with 0-based index

    # Generate image for first chapter
    if chapters:
        image_data = generate_image(chapters[0])
        image_url = image_data.get('images', [None])[0]
        flask_session['chapter_image_0'] = image_url

    return jsonify({"status": "Story generated successfully", "full_story": full_story})

@app.route('/continue-story', methods=['POST'])
def continue_story():
    chapters = flask_session.get('chapters', [])
    current_chapter_idx = flask_session.get('current_chapter', 0)

    if current_chapter_idx >= len(chapters) or not chapters:
        return jsonify({"error": "No more chapters available"}), 400

    # Get the current chapter
    chapter = chapters[current_chapter_idx]
    chapter_number = current_chapter_idx + 1

    # Get the current chapter's image from session or generate it
    current_image = flask_session.get(f'chapter_image_{current_chapter_idx}')
    if not current_image:
        image_data = generate_image(chapter)
        current_image = image_data.get('images', [None])[0]

    # Generate image for next chapter if it exists
    next_chapter_idx = current_chapter_idx + 1
    if next_chapter_idx < len(chapters) and not flask_session.get(f'chapter_image_{next_chapter_idx}'):
        next_chapter = chapters[next_chapter_idx]
        next_image_data = generate_image(next_chapter)
        next_image = next_image_data.get('images', [None])[0]
        flask_session[f'chapter_image_{next_chapter_idx}'] = next_image

    # Update current chapter index
    flask_session['current_chapter'] = current_chapter_idx + 1

    return jsonify({
        "chapter": chapter_number,
        "content": chapter,
        "image": current_image,
        "is_last": current_chapter_idx + 1 >= len(chapters)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)