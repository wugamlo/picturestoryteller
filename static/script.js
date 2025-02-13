
document.getElementById('send-button').addEventListener('click', async () => {
    const input = document.getElementById('user-input');
    const message = input.value.trim();

    if (message) {
        const outputDiv = document.getElementById('output');
        outputDiv.innerHTML += `<div>User: ${message}</div>`;
        input.value = '';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    messages: [{ role: 'user', content: message }], 
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
        } catch (error) {
            console.error('Error:', error);
            outputDiv.innerHTML += `<div class="error">Error: ${error.message}</div>`;
        }
    }
});
