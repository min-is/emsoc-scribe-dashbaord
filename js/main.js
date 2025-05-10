// Global variable declarations
let pinnedPreferences = null;
let currentProviderId = null;
let preferencesPanel = null;
let panelOpen = false;
let currentlyPinnedProviderName = null;
let particlesArray = [];
let hpiPanelElement = null; // To keep track of the HPI panel element
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
    // Get button elements AFTER the DOM is fully loaded
    const toggleHpiAssistantBtn = document.getElementById('toggleHpiAssistantBtn');

    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultsDiv = document.getElementById('results');

    fetchAndDisplayProviders(); // This function is in api-service.js

    // --- Canvas Setup ---
    const canvasData = setupCanvas(); // from utils.js
    canvas = canvasData.canvas;
    ctx = canvasData.ctx;
    dpr = canvasData.dpr;
    particlesArray = initParticles(canvas, ctx, dpr, numberOfParticles); // from utils.js
    animateParticles();

    const handleResize = () => {
        const desiredWidth = window.innerWidth;
        const desiredHeight = window.innerHeight;
        canvas.width = desiredWidth * dpr;
        canvas.height = desiredHeight * dpr;
        canvas.style.width = `${desiredWidth}px`;
        canvas.style.height = `${desiredHeight}px`;
        ctx.scale(dpr, dpr);
        particlesArray = initParticles(canvas, ctx, dpr, numberOfParticles); // from utils.js
    };

    window.addEventListener('resize', debounce(handleResize, 100)); // Debounced listener

    window.addEventListener('mousemove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
    });

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update(canvas, mouse); // from utils.js (Particle class method)
        }
        connectParticles(ctx, particlesArray, mouse, connectDistance); // from utils.js
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
                displayMedicationDetails(medication); // This will call the function from dom-manipulation.js
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

    // --- HPI Assistant Button Logic ---
    if (toggleHpiAssistantBtn) {
        toggleHpiAssistantBtn.addEventListener('click', () => {
            if (!hpiPanelElement) {
                // Create panel if it doesn't exist
                const panelHTML = createHpiAssistantPanelHTML(); // From dom-manipulation.js
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = panelHTML;
                hpiPanelElement = tempDiv.children[0]; // Corrected assignment
                
                if (hpiPanelElement) {
                    document.body.appendChild(hpiPanelElement);
                    makeDraggable(hpiPanelElement); // From utils.js

                    // Add event listener for the close button on this specific panel
                    const closeHpiPanelBtn = hpiPanelElement.querySelector('#closeHpiPanelBtn');
                    if (closeHpiPanelBtn) {
                        closeHpiPanelBtn.addEventListener('click', () => {
                            hpiPanelElement.classList.remove('active');
                        });
                    }

                    // Event listener for the "Generate HPI" button
                    const generateHpiBtn = hpiPanelElement.querySelector('#generateHpiBtn');
                    if (generateHpiBtn) {
                        generateHpiBtn.addEventListener('click', async () => { // Make this async
                            const chiefComplaint = hpiPanelElement.querySelector('#hpiChiefComplaint').value;
                            const additionalSymptoms = hpiPanelElement.querySelector('#hpiAdditionalSymptoms').value;
                            const onset = hpiPanelElement.querySelector('#hpiOnset').value;
                            const otherNotes = hpiPanelElement.querySelector('#hpiOtherNotes').value;
                            const resultArea = hpiPanelElement.querySelector('#hpiAssistantResult');

                            // 1. Indicate loading state
                            resultArea.textContent = 'Generating HPI...';
                            generateHpiBtn.disabled = true;
                            generateHpiBtn.textContent = 'Generating...';

                            const hpiData = {
                                chiefComplaint: chiefComplaint,
                                additionalSymptoms: additionalSymptoms,
                                onset: onset,
                                otherNotes: otherNotes
                            };

                            try {
                                const response = await fetch('/generate-hpi', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(hpiData),
                                });

                                if (response.ok) {
                                    const responseData = await response.json();
                                    resultArea.textContent = responseData.generated_hpi || "No HPI generated.";
                                } else {
                                    const errorData = await response.json();
                                    console.error('Error from server:', errorData);
                                    resultArea.textContent = `Error: ${errorData.error || 'Failed to generate HPI. Status: ' + response.status}`;
                                }
                            } catch (error) {
                                console.error('Network or other error fetching HPI:', error);
                                resultArea.textContent = 'Error: Could not connect to the server to generate HPI.';
                            } finally {
                                // 3. Revert loading state
                                generateHpiBtn.disabled = false;
                                generateHpiBtn.textContent = 'Generate HPI';
                            }
                        });
                    }
                } else {
                    console.error("Failed to create HPI panel element from HTML string.");
                }
            }
            // Toggle visibility
            if (hpiPanelElement && hpiPanelElement.classList.contains('active')) {
                hpiPanelElement.classList.remove('active');
            } else if (hpiPanelElement) { 
                hpiPanelElement.classList.add('active');
            }
        });
    } else {
        console.error("HPI Assistant button (#toggleHpiAssistantBtn) not found. Check ID in HTML and ensure it's correct.");
    }
});