let chapters = [];

// Reset functionality
document.getElementById('reset-button').addEventListener('click', () => {
    document.getElementById('story-prompt').value = '';
    document.getElementById('output').innerHTML = '';
    document.getElementById('full-story').style.display = 'none';
    document.getElementById('full-story').innerHTML = '';
    document.getElementById('story-status').innerHTML = '';
    document.getElementById('export-pdf').style.display = 'none';
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
                    document.getElementById('output').innerHTML = ''; // Clear any previous output
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
    let yOffset = 25;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 25;
    const textWidth = pageWidth - (2 * margin);

    for (const chapter of chapters) {
        const title = chapter.querySelector('h3').textContent;
        const content = chapter.querySelector('p').textContent;
        const img = chapter.querySelector('img');

        // Add chapter title
        pdf.setFontSize(16);
        pdf.text(title, margin, yOffset);
        yOffset += 10;

        // Add chapter content
        pdf.setFontSize(14);
        const splitText = pdf.splitTextToSize(content, textWidth);
        pdf.text(splitText, margin, yOffset);
        yOffset += (splitText.length * 7);

        // Add image if present
        if (img) {
            const imgData = img.src;
            try {
                pdf.addImage(imgData, 'PNG', margin, yOffset, 150, 75);
                yOffset += 85;
            } catch (error) {
                console.error('Error adding image:', error);
            }
        }

        // Add new page if not last chapter
        if (chapter !== chapters[chapters.length - 1]) {
            pdf.addPage();
            yOffset = 25;
        }
    }

    pdf.save('story.pdf');
});

// This function has been removed as it's no longer needed with the automatic chapter progression

// Fetch Chapter function
async function fetchChapter() {
    try {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.innerHTML = 'Loading next chapter... <div class="spinner"></div>';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.style.margin = '20px 0';
        
        // Remove existing loading indicator if present
        const existingIndicator = document.getElementById('loading-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Remove next chapter button if present
        const nextButton = document.getElementById('next-chapter-btn');
        if (nextButton) {
            nextButton.remove();
        }
        
        // Add loading indicator to the output
        document.getElementById('output').appendChild(loadingIndicator);
        
        const imageModel = document.getElementById('image-model').value;
        const stylePreset = document.getElementById('image-styles').value;
        const response = await fetch('/continue-story', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_model: imageModel, style_preset: stylePreset })
        });
        const data = await response.json();

        if (response.ok) {
            // Remove loading indicator
            loadingIndicator.remove();
            
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

            // Auto-scroll to the new chapter
            chapterDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // If this is the last chapter, show "The End" and export button
            if (data.is_last) {
                const endMessage = document.createElement('div');
                endMessage.className = 'end-message';
                endMessage.textContent = 'The End';
                endMessage.style.textAlign = 'center';
                endMessage.style.fontSize = '1.5em';
                endMessage.style.margin = '20px 0';
                document.getElementById('output').appendChild(endMessage);
                
                // Show export button
                document.getElementById('export-pdf').style.display = 'block';
            } else {
                // If not the last chapter, automatically fetch the next chapter after a delay
                // Adding a short delay to give the user time to read the current chapter
                setTimeout(() => {
                    fetchChapter();
                }, 1500); // 1.5 second delay before fetching next chapter
            }
        } else {
            // Remove loading indicator
            loadingIndicator.remove();
            
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = `Error: ${data.error}`;
            document.getElementById('output').appendChild(errorDiv);
        }
    } catch (error) {
        // Remove loading indicator if it exists
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = `Failed to load chapter: ${error.message}`;
        document.getElementById('output').appendChild(errorDiv);
    }
}

