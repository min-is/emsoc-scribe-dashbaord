// Global variable declarations
let pinnedPreferences = null;
let currentProviderId = null;
let preferencesPanel = null;
let panelOpen = false;
let currentlyPinnedProviderName = null;
let particlesArray = [];
const numberOfParticles = 110;
const connectDistance = 120;
const mouse = {
    x: null,
    y: null,
    radius: 150
};
let canvas, ctx, dpr;

function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultsDiv = document.getElementById('results');

    fetchAndDisplayProviders(); // This function should be in dom-manipulation.js

    // --- Canvas Setup ---
    const canvasData = setupCanvas();
    canvas = canvasData.canvas;
    ctx = canvasData.ctx;
    dpr = canvasData.dpr;
    particlesArray = initParticles(canvas, ctx, dpr, numberOfParticles);
    animateParticles();

    const handleResize = () => {
        const desiredWidth = window.innerWidth;
        const desiredHeight = window.innerHeight;
        canvas.width = desiredWidth * dpr;
        canvas.height = desiredHeight * dpr;
        canvas.style.width = `${desiredWidth}px`;
        canvas.style.height = `${desiredHeight}px`;
        ctx.scale(dpr, dpr);
        particlesArray = initParticles(canvas, ctx, dpr, numberOfParticles);
    };

    window.addEventListener('resize', debounce(handleResize, 100)); // Debounced listener

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update(canvas, mouse);
        }
        connectParticles(ctx, particlesArray, mouse, connectDistance);
        requestAnimationFrame(animateParticles);
    }

    // --- Medication Search Functionality ---
    if (searchInput && suggestionsDiv && resultsDiv) {
        searchInput.addEventListener('input', async () => {
            const query = searchInput.value.trim();
            suggestionsDiv.innerHTML = '';
            if (query) {
                try {
                    const response = await fetch(`/suggestions?q=${query}`);
                    const suggestions = await response.json();
                    if (suggestions.length > 0) {
                        suggestions.forEach(([name, matchedName]) => {
                            const suggestionItem = document.createElement('div');
                            suggestionItem.classList.add('suggestion-item');
                            let displayText = name;
                            if (name.toLowerCase() !== matchedName.toLowerCase()) {
                                const matchIndex = matchedName.toLowerCase().indexOf(query.toLowerCase());
                                if (matchIndex > -1) {
                                    const highlightedMatch = matchedName.substring(matchIndex, matchIndex + query.length);
                                    displayText = `${name} (<span class="highlight">${highlightedMatch}</span>)`;
                                }
                            }
                            suggestionItem.innerHTML = displayText;
                            suggestionItem.addEventListener('click', () => {
                                searchInput.value = name;
                                suggestionsDiv.innerHTML = '';
                                fetchMedicationDetails(name);
                            });
                            suggestionsDiv.appendChild(suggestionItem);
                        });
                        suggestionsDiv.classList.add('show');
                    } else {
                        suggestionsDiv.classList.remove('show');
                    }
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                }
            } else {
                suggestionsDiv.classList.remove('show');
                resultsDiv.classList.remove('show');
            }
        });
    } else {
        console.error("One or more medication search elements not found!");
    }

    async function fetchMedicationDetails(name) {
        try {
            const response = await fetch(`/medication/${name}`);
            if (response.ok) {
                const medication = await response.json();
                displayMedicationDetails(medication);
                resultsDiv.classList.add('show');
            } else {
                const errorData = await response.json();
                resultsDiv.innerHTML = `<p class="error">${errorData.error || 'Medication not found'}</p>`;
                resultsDiv.classList.add('show');
            }
        } catch (error) {
            console.error('Error fetching medication details:', error);
            resultsDiv.innerHTML = '<p class="error">Failed to fetch medication details.</p>';
            resultsDiv.classList.add('show');
        }
    }

    function displayMedicationDetails(medication) {
        resultsDiv.innerHTML = '';
        const title = document.createElement('h3');
        title.textContent = medication.name;
        resultsDiv.appendChild(title);
        const overviewHeadline = document.createElement('h4');
        overviewHeadline.textContent = 'Overview';
        resultsDiv.appendChild(overviewHeadline);
        const descriptionParagraph = document.createElement('p');
        descriptionParagraph.textContent = medication.description;
        resultsDiv.appendChild(descriptionParagraph);
        if (medication.alternate_names && medication.alternate_names.length > 0) {
            const alternateNamesParagraph = document.createElement('p');
            alternateNamesParagraph.innerHTML = `<strong>Also known as:</strong> <span class="detail-label">${medication.alternate_names.join(', ')}</span>`;
            resultsDiv.appendChild(alternateNamesParagraph);
        }
        const mechanismHeadline = document.createElement('h4');
        mechanismHeadline.textContent = 'Mechanism of Action';
        resultsDiv.appendChild(mechanismHeadline);
        if (medication.mechanism_of_action) {
            const mechanismParagraph = document.createElement('p');
            mechanismParagraph.innerHTML = `<span class="detail-label">${medication.mechanism_of_action}</span>`;
            resultsDiv.appendChild(mechanismParagraph);
        }
    }
});