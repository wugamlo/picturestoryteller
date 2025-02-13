from flask import Flask, render_template, request, jsonify, Response
import os
import requests
import json
import time
import logging
import base64

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-123')

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Venice API configuration
VENICE_API_KEY = os.environ.get("VENICE_API_KEY")
VENICE_API_BASE = "https://api.venice.ai/api/v1"

def get_available_models():
    try:
        logger.debug(f"Fetching models with key: {'*' * 4}{VENICE_API_KEY[-4:] if VENICE_API_KEY else 'None'}")

        session = requests.Session()
        session.verify = False

        headers = {
            "Authorization": f"Bearer {VENICE_API_KEY}",
            "Content-Type": "application/json"
        }

        response = session.get(
            f"{VENICE_API_BASE}/models",
            headers=headers
        )

        if response.status_code == 401:
            logger.error("Authentication failed. Check your API key.")
            return []
        if response.status_code == 404:
            logger.error("API endpoint not found.")
            return []

        response.raise_for_status()

        models_response = response.json()
        models = models_response.get('data', [])

        return [{
            'id': model['id'],
            'traits': ', '.join(model.get('model_spec', {}).get('traits', ['No traits available']))
        } for model in models if model['type'] == 'text']

    except Exception as e:
        logger.error(f"Error fetching models: {str(e)}")
        return []

def generate_chat_response(messages, model_id):
    try:
        session = requests.Session()
        session.verify = False
        response = session.post(
            f"{VENICE_API_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {VENICE_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_id,
                "messages": messages,
                "stream": True,
                "max_tokens": 4000
            },
            stream=True
        )
        response.raise_for_status()
        for line in response.iter_lines():
            if line and (decoded_line := line.decode('utf-8')).startswith('data: '):
                try:
                    data = json.loads(decoded_line[6:])
                    if 'choices' in data and data['choices']:
                        content = data['choices'][0].get('delta', {}).get('content')
                        if content:
                            yield f"data: {json.dumps({'content': content})}\n\n"
                except json.JSONDecodeError:
                    pass
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/models')
def get_models():
    models = get_available_models()
    return jsonify(models)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    messages = data.get('messages', [])
    model_id = data.get('model', 'llama-3.3-70b')
    return Response(generate_chat_response(messages, model_id), mimetype='text/event-stream')

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST')
    return response

@app.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.get_json()
    prompt = data.get('prompt', '')
    model_id = data.get('model', 'flux-dev')  # Specify the default model ID
    try:
        image_response = requests.post(
            f"{VENICE_API_BASE}/image/generate",
            headers={
                "Authorization": f"Bearer {VENICE_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": model_id,
                "prompt": prompt,
                "width": 1024,
                "height": 1024,
                "steps": 30,
                "hide_watermark": False,
                "return_binary": True,
                "seed": 123,
                "cfg_scale": 7,
                "style_preset": "Pixel Art",
                "negative_prompt": "",
                "safe_mode": False
            }
        )
        image_response.raise_for_status()
        content_type = image_response.headers.get('content-type', '')
        
        if 'image/png' in content_type:
            image_data = image_response.content
            encoded_image = base64.b64encode(image_data).decode('utf-8')
            return jsonify({"images": [encoded_image]})
        else:
            return jsonify({"error": f"Unexpected response type: {content_type}"}), 500
    except requests.RequestException as e:
        error_message = f"Error generating image: {str(e)}"
        logger.error(f"Full error response: {e.response.text if hasattr(e, 'response') else 'No response'}")
        return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)