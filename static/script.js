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
        // Remove the Create Story button
        document.getElementById('create-story').remove();

        // Show Start Reading button
        const storyStatusDiv = document.getElementById('story-status');
        storyStatusDiv.innerHTML = `
            <button id="start-reading">Start Reading</button>
        `;

        // Display the entire story
        document.getElementById('full-story').innerText = data.full_story || "The story was not returned.";

        document.getElementById('start-reading').addEventListener('click', () => {
            fetchChapter();
            // Remove the Start Reading button after click
            document.getElementById('start-reading').remove();
        });
    } else {
        document.getElementById('output').innerHTML = `<div class="error">Error: ${data.error}</div>`;
    }
});

async function fetchChapter() {
    try {
        const response = await fetch('/continue-story', { method: 'POST' });
        const data = await response.json();

        if (response.ok) {
            // Remove existing Next Chapter button if present
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
                ${data.image ? `<div class="image-container"><img src="data:image/png;base64,${data.image}" class="centered-image" /></div>` : ''}
                <p>${content}</p>
            `;
            document.getElementById('output').appendChild(chapterDiv);

            // Scroll to the bottom of the output area
            const outputDiv = document.getElementById('output');
            outputDiv.scrollTop = outputDiv.scrollHeight; // Scroll to the end

            // Create the Next Chapter button at the same position
            if (!data.is_last) {
                const nextButton = document.createElement('button');
                nextButton.id = 'next-chapter-btn';
                nextButton.style.marginTop = '20px';
                nextButton.textContent = 'Next Chapter';
                nextButton.onclick = fetchChapter;

                // Position it in the same place as the Start Reading button
                document.getElementById('story-status').appendChild(nextButton);
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