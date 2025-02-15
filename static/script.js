let chapters = [];

document.getElementById('create-story').addEventListener('click', async () => {
    const prompt = document.getElementById('story-prompt').value.trim();
    const chaptersInput = document.getElementById('chapters');
    const numChapters = parseInt(chaptersInput.value) || 5;

    if (!prompt || numChapters < 1) {
        alert('Please enter a valid story prompt and chapter count');
        return;
    }

    const textModel = document.getElementById('text-model').value; // Get selected text model
    const imageModel = document.getElementById('image-model').value; // Get selected image model

    const response = await fetch('/start-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, num_chapters: numChapters, text_model: textModel, image_model: imageModel })
    });

    const data = await response.json();
    if (response.ok) {
        document.getElementById('create-story').remove();
        const storyStatusDiv = document.getElementById('story-status');
        storyStatusDiv.innerHTML = `
            <button id="start-reading">Start Reading</button>
        `;
        document.getElementById('full-story').innerText = data.full_story || "The story was not returned.";

        document.getElementById('start-reading').addEventListener('click', () => {
            fetchChapter();
            document.getElementById('start-reading').remove();
        });
    } else {
        document.getElementById('output').innerHTML = `<div class="error">Error: ${data.error}</div>`;
    }
});

async function fetchChapter() {
    try {
        const imageModel = document.getElementById('image-model').value;
        const response = await fetch('/continue-story', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_model: imageModel })
        });
        const data = await response.json();

        if (response.ok) {
            const chapterParts = data.content.split(':');
            const header = chapterParts[0];
            const content = chapterParts.slice(1).join(':').trim();

            const chapterDiv = document.createElement('div');
            chapterDiv.className = 'chapter';
            chapterDiv.innerHTML = `
                <h3>${header}</h3>
                ${data.image ? `<div class="image-container"><img src="data:image/png;base64,${data.image}" class="centered-image" /></div>` : ''}
                <p>${content}</p>
            `;
            document.getElementById('output').appendChild(chapterDiv);

            document.getElementById('story-status').appendChild(createNextButton(data.is_last));
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

function createNextButton(isLast) {
    const nextButton = document.createElement('button');
    nextButton.id = 'next-chapter-btn';
    nextButton.style.marginTop = '20px';
    nextButton.textContent = isLast ? 'The End.' : 'Next Chapter';
    nextButton.onclick = isLast ? null : fetchChapter;
    return nextButton;
}