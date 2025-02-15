let chapters = [];

// Add event listener using the stored handler
document.getElementById('create-story').addEventListener('click', window.createStoryHandler);

// Store the handler function for reuse
window.createStoryHandler = async () => {
    const createButton = document.getElementById('create-story');
    const prompt = document.getElementById('story-prompt').value.trim();
    const chaptersInput = document.getElementById('chapters');
    const numChapters = parseInt(chaptersInput.value) || 5;

    if (!prompt || numChapters < 1) {
        alert('Please enter a valid story prompt and chapter count');
        return;
    }

    createButton.innerHTML = 'Creating Story... <div class="spinner"></div>';
    createButton.classList.add('loading');

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

        document.getElementById('start-reading').addEventListener('click', async () => {
            const startButton = document.getElementById('start-reading');
            startButton.innerHTML = 'Loading... <div class="spinner"></div>';
            startButton.classList.add('loading');
            await fetchChapter();
            startButton.remove();
        });
    } else {
        document.getElementById('output').innerHTML = `<div class="error">Error: ${data.error}</div>`;
    }
});

async function fetchChapter() {
    try {
        const nextButton = document.getElementById('next-chapter-btn');
        if (nextButton) {
            nextButton.innerHTML = 'Loading... <div class="spinner"></div>';
            nextButton.classList.add('loading');
        }
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

            const storyStatus = document.getElementById('story-status');
            // Clear any existing buttons
            storyStatus.innerHTML = '';
            // Add new button
            storyStatus.appendChild(createNextButton(data.is_last));
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
    } finally {
        const nextButton = document.getElementById('next-chapter-btn');
        if (nextButton) {
            nextButton.classList.remove('loading');
            nextButton.innerHTML = isLast ? 'The End' : 'Next Chapter';
        }
    }
}

function createNextButton(isLast) {
    const nextButton = document.createElement('button');
    nextButton.id = 'next-chapter-btn';
    nextButton.style.marginTop = '20px';
    if (isLast) {
        nextButton.textContent = 'The End';
        nextButton.style.backgroundColor = '#888';
        nextButton.style.cursor = 'default';
        nextButton.disabled = true;
    } else {
        nextButton.textContent = 'Next Chapter';
        nextButton.onclick = fetchChapter;
    }
    return nextButton;
}