document.getElementById('send-button').addEventListener('click', async () => {
    const input = document.getElementById('user-input');
    const message = input.value.trim();

    if (message) {
        const outputDiv = document.getElementById('output');

        // Initialize or get existing chat history
        window.chatHistory = window.chatHistory || [];
        window.chatHistory.push({ role: 'user', content: message });

        outputDiv.innerHTML += `<div>User: ${message}</div>`;
        input.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    messages: window.chatHistory,
                    model: 'llama-3.3-70b' 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const lines = text.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ') && line.length > 6) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.content) {
                                let botDiv = outputDiv.querySelector('.bot-response:last-child');
                                if (!botDiv) {
                                    botDiv = document.createElement('div');
                                    botDiv.className = 'bot-response';
                                    botDiv.textContent = 'Bot: ';
                                    outputDiv.appendChild(botDiv);
                                }
                                botDiv.textContent += data.content;
                                // Store complete bot response
                                if (!window.tempBotResponse) {
                                    window.tempBotResponse = '';
                                }
                                window.tempBotResponse += data.content;
                            }
                            if (data.error) {
                                outputDiv.innerHTML += `<div class="error">Error: ${data.error}</div>`;
                            }
                        } catch (e) {
                            console.error('Parse error:', e);
                        }
                    }
                }
            }
            // Add complete bot response to history
            if (window.tempBotResponse) {
                window.chatHistory.push({ role: 'assistant', content: window.tempBotResponse });
                window.tempBotResponse = '';
            }
        } catch (error) {
            console.error('Error:', error);
            outputDiv.innerHTML += `<div class="error">Error: ${error.message}</div>`;
        }
    }
});

document.getElementById('generate-image-button').addEventListener('click', async () => {
    const promptInput = document.getElementById('image-prompt-input');
    const prompt = promptInput.value.trim();

    if (prompt) {
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML += `<div>User (Image): ${prompt}</div>`;
        promptInput.value = '';

        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    prompt: prompt,
                    model: 'stable-diffusion-3.5' 
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Invalid response format' }));
                throw new Error(`HTTP error! status: ${response.status}. ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            if (data.images) {
                data.images.forEach(image => {
                    outputDiv.innerHTML += `<img src="data:image/jpeg;base64,${image}" alt="Generated Image" style="max-width: 100%; height: auto;">`;
                });
            } else {
                outputDiv.innerHTML += `<div>No images generated.</div>`;
            }
        } catch (error) {
            console.error('Error:', error);
            outputDiv.innerHTML += `<div class="error">Error: ${error.message}</div>`;
        }
    }
});