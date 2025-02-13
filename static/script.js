ddocument.getElementById('send-button').addEventListener('click', async () => {
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
                    body: JSON.stringify({ messages: [{ role: 'user', content: message }], model: 'llama-3.3-70b' }) // Replace with your chosen model ID
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                let result = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    result += decoder.decode(value, { stream: true });
                    const data = JSON.parse(result);
                    if (data.content) {
                        outputDiv.innerHTML += `<div>Bot: ${data.content}</div>`;
                    }
                    // Optionally handle errors if present
                }
            } catch (error) {
                console.error('Error:', error);
                outputDiv.innerHTML += `<div>Bot: An error occurred: ${error.message}</div>`;
            }
        }
    });