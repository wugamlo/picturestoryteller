let chapters = [];

// Reset functionality
document.getElementById('reset-button').addEventListener('click', () => {
    document.getElementById('story-prompt').value = '';
    document.getElementById('output').innerHTML = '';
    document.getElementById('full-story').style.display = 'none';
    document.getElementById('full-story').innerHTML = '';
    document.getElementById('story-status').innerHTML = '';
    chapters = [];

    // Restore create story button
    const storyStatusDiv = document.getElementById('story-status');
    if (!document.getElementById('create-story')) {
        const createButton = document.createElement('button');
        createButton.id = 'create-story';
        createButton.textContent = 'Create Story';
        createButton.addEventListener('click', async () => {
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

            const textModel = document.getElementById('text-model').value;
            const imageModel = document.getElementById('image-model').value;

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
        document.getElementById('story-status').insertAdjacentElement('beforebegin', createButton);
    }
});

// Show full text functionality
document.getElementById('show-full-text').addEventListener('change', (e) => {
    const fullStoryDiv = document.getElementById('full-story');
    fullStoryDiv.style.display = e.target.checked ? 'block' : 'none';
});

// Create story logic
document.getElementById('create-story').addEventListener('click', async () => {
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

    const textModel = document.getElementById('text-model').value;
    const imageModel = document.getElementById('image-model').value;

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

// Initially hide the export button
document.getElementById('export-pdf').style.display = 'none';

// Export story as PDF functionality
document.getElementById('export-pdf').addEventListener('click', async () => {
    const outputDiv = document.getElementById('output');
    const chapters = outputDiv.querySelectorAll('.chapter');
    
    if (chapters.length === 0) {
        alert("No story available to export.");
        return;
    }

    const pdf = new jsPDF();
    let yOffset = 10;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 10;
    const textWidth = pageWidth - (2 * margin);

    for (const chapter of chapters) {
        const title = chapter.querySelector('h3').textContent;
        const content = chapter.querySelector('p').textContent;
        const img = chapter.querySelector('img');

        // Add chapter title
        pdf.setFontSize(14);
        pdf.text(title, margin, yOffset);
        yOffset += 10;

        // Add chapter content
        pdf.setFontSize(12);
        const splitText = pdf.splitTextToSize(content, textWidth);
        pdf.text(splitText, margin, yOffset);
        yOffset += (splitText.length * 7);

        // Add image if present
        if (img) {
            const imgData = img.src;
            try {
                pdf.addImage(imgData, 'PNG', margin, yOffset, 180, 100);
                yOffset += 110;
            } catch (error) {
                console.error('Error adding image:', error);
            }
        }

        // Add new page if not last chapter
        if (chapter !== chapters[chapters.length - 1]) {
            pdf.addPage();
            yOffset = 10;
        }
    }

    pdf.save('story.pdf');
});

// Show export button when story is complete
function createNextButton(isLast) {
    const nextButton = document.createElement('button');
    nextButton.id = 'next-chapter-btn';
    nextButton.style.marginTop = '20px';
    if (isLast) {
        nextButton.textContent = 'The End';
        nextButton.style.backgroundColor = '#888';
        nextButton.style.cursor = 'default';
        nextButton.disabled = true;
        // Show export button when story is complete
        document.getElementById('export-pdf').style.display = 'block';
    } else {
        nextButton.textContent = 'Next Chapter';
        nextButton.onclick = fetchChapter;
    }
    return nextButton;
}

// Fetch Chapter function
async function fetchChapter() {
    try {
        const nextButton = document.getElementById('next-chapter-btn');
        if (nextButton) {
            nextButton.innerHTML = 'Loading... <div class="spinner"></div>';
            nextButton.classList.add('loading');
        }
        const imageModel = document.getElementById('image-model').value;
        const stylePreset = document.getElementById('image-styles').value;
        const response = await fetch('/continue-story', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_model: imageModel, style_preset: stylePreset })
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
            storyStatus.innerHTML = '';
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
            const isLastChapter = nextButton.disabled;
            nextButton.innerHTML = isLastChapter ? 'The End' : 'Next Chapter';
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