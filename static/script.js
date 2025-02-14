let currentChapter = 0;
let chapters = [];

document.getElementById('create-story').addEventListener('click', async () => {
    const prompt = document.getElementById('story-prompt').value.trim();
    const chaptersInput = document.getElementById('chapters');
    const numChapters = parseInt(chaptersInput.value) || 5;

    if (!prompt || numChapters < 1) {
        alert('Please enter a valid story prompt and chapter count');
        return;
    }

    const response = await fetch('/start-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, num_chapters: numChapters })
    });

    const data = await response.json();
    if (response.ok) {
        document.getElementById('output').innerHTML = `
            <div class="story-status">
                <div>Story generated! Click to start reading.</div>
                <button id="continue-btn">Start Reading</button>
            </div>
        `;

        // Display the entire story
        document.getElementById('full-story').innerText = data.full_story || "The story was not returned.";

        document.getElementById('continue-btn').addEventListener('click', fetchChapter);
    } else {
        document.getElementById('output').innerHTML = `<div class="error">Error: ${data.error}</div>`;
    }
});

async function fetchChapter() {
    try {
        const response = await fetch('/continue-story', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            // Remove existing next chapter button if present
            const existingBtn = document.getElementById('next-chapter-btn');
            if (existingBtn) {
                existingBtn.remove();
            }

            const chapterParts = data.content.split(':');
            const header = chapterParts[0];
            const content = chapterParts.slice(1).join(':').trim();

            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter';
            chapterDiv.innerHTML = `
                <h3>${header}</h3>
                ${data.image ? `<img src="data:image/png;base64,${data.image}" style="max-width:100%;">` : ''}
                <p>${content}</p>
            `;
            document.getElementById('output').appendChild(chapterDiv);

            if (!data.is_last) {
                const nextButton = document.createElement('button');
                nextButton.id = 'next-chapter-btn';
                nextButton.style.marginTop = '20px';
                nextButton.textContent = 'Next Chapter';
                nextButton.onclick = fetchChapter;
                document.getElementById('output').appendChild(nextButton);
            } else {
                const endMessage = document.createElement('div');
                endMessage.className = 'end-message';
                endMessage.textContent = 'The End.';
                document.getElementById('output').appendChild(endMessage);
            }
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Error: ${data.error}`;
            document.getElementById('output').appendChild(errorDiv);
        }
    } catch (error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Failed to load chapter: ${error.message}`;
        document.getElementById('output').appendChild(errorDiv);
    }
}