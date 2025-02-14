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
            const chapterParts = data.content.split(':');
            const header = chapterParts[0];
            const content = chapterParts.slice(1).join(':').trim();

            document.getElementById('output').innerHTML += `
                <div class="chapter">
                    <h3>${header}</h3>
                    ${data.image ? `<img src="data:image/png;base64,${data.image}" style="max-width:100%;">` : ''}
                    <p>${content}</p>
                </div>
            `;

            if (!data.is_last) {
                document.getElementById('output').innerHTML += `
                    <button id="next-chapter-btn" style="margin-top:20px;">Next Chapter</button>
                `;
                document.getElementById('next-chapter-btn').addEventListener('click', fetchChapter);
            } else {
                document.getElementById('output').innerHTML += '<div class="end-message">The End.</div>';
            }
        } else {
            document.getElementById('output').innerHTML += `
                <div class="error">Error: ${data.error}</div>
            `;
        }
    } catch (error) {
        document.getElementById('output').innerHTML += `
            <div class="error">Failed to load chapter: ${error.message}</div>
        `;
    }
}