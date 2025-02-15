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

def get_available_models(model_type='text'):
    try:
        response = requests.get(f"{VENICE_API_BASE}/{model_type}/models", headers={
            "Authorization": f"Bearer {VENICE_API_KEY}",
            "Content-Type": "application/json"
        })
        response.raise_for_status()
        data = response.json()
        models = [model["id"] for model in data.get("data", [])]
        return models if models else ["llama-3.3-70b" if model_type == "text" else "fluently-xl"]
    except Exception as e:
        logger.error(f"Failed to fetch {model_type} models: {e}")
        return []

@app.route('/')
def index():
    text_models = get_available_models('text')  # Fetch text models
    image_models = get_available_models('image')  # Fetch image models
    return render_template('index.html', text_models=text_models, image_models=image_models)

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
                "height": 288,
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

@app.route('/start-story', methods=['POST'])
def start_story():
    data = request.get_json()
    prompt = data.get('prompt', '').strip()
    num_chapters = data.get('num_chapters', 1)
    text_model_id = data.get('text_model')
    image_model_id = data.get('image_model')

    if not prompt:
        return jsonify({"error": "No story prompt provided"}), 400

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
    if not full_story or "Error:" in full_story or "No content generated" in full_story:
        return jsonify({"error": "Failed to generate story"}), 500

    split_result = re.split(r'(CHAPTER\s+[IVXLCDM]+):\s*', full_story)
    chapters = []
    for i in range(1, len(split_result), 2):
        if i + 1 < len(split_result):
            header = split_result[i]
            content = split_result[i + 1].strip()
            chapters.append(f"{header}: {content}")

    chapters = chapters[:num_chapters]
    if len(chapters) < num_chapters:
        return jsonify({"error": "Generated story does not meet chapter count requirements"}), 400

    flask_session['chapters'] = chapters
    flask_session['current_chapter'] = 0  
    return jsonify({"status": "Story generated successfully", "full_story": full_story})

@app.route('/continue-story', methods=['POST'])
def continue_story():
    chapters = flask_session.get('chapters', [])
    current_chapter_idx = flask_session.get('current_chapter', 0)

    if current_chapter_idx >= len(chapters) or not chapters:
        return jsonify({"error": "No more chapters available"}), 400

    chapter = chapters[current_chapter_idx]
    chapter_number = current_chapter_idx + 1

    image_data = generate_image(chapter)
    image_url = image_data.get('images', [None])[0]

    flask_session['current_chapter'] = current_chapter_idx + 1

    return jsonify({
        "chapter": chapter_number,
        "content": chapter,
        "image": image_url,
        "is_last": current_chapter_idx + 1 >= len(chapters)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)