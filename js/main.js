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

// --- START: Auto-Save Functionality ---
const HPI_ASSISTANT_STORAGE_KEY = 'hpiAssistantState';

function saveHpiPanelState() {
    if (!hpiPanelElement || !hpiPanelElement.classList.contains('active')) {
        // console.log("HPI Panel not active or doesn't exist, not saving.");
        return; 
    }

    const state = {
        gender: hpiPanelElement.querySelector('#hpiGender').value,
        genderOtherText: hpiPanelElement.querySelector('#hpiGenderOtherText').value,
        selectedGenderButtonValue: null,
        pastMedicalHistory: hpiPanelElement.querySelector('#hpiPastMedicalHistory').value,
        chiefComplaint: hpiPanelElement.querySelector('#hpiChiefComplaint').value,
        onsetTiming: hpiPanelElement.querySelector('#hpiOnsetTiming').value,
        additionalSymptoms: hpiPanelElement.querySelector('#hpiAdditionalSymptoms').value,
        context: hpiPanelElement.querySelector('#hpiContext').value,
        currentMedications: hpiPanelElement.querySelector('#hpiCurrentMedications').value,
        hpiResultHTML: hpiPanelElement.querySelector('#hpiAssistantResult').innerHTML
    };

    const selectedGenderBtn = hpiPanelElement.querySelector('.gender-btn.selected');
    if (selectedGenderBtn) {
        state.selectedGenderButtonValue = selectedGenderBtn.dataset.value;
    }
    
    try {
        localStorage.setItem(HPI_ASSISTANT_STORAGE_KEY, JSON.stringify(state));
        // console.log('HPI state saved:', state); 
    } catch (e) {
        console.error('Error saving HPI state to localStorage:', e);
    }
}

function restoreHpiPanelState() {
    if (!hpiPanelElement) return;

    try {
        const savedStateJSON = localStorage.getItem(HPI_ASSISTANT_STORAGE_KEY);
        if (savedStateJSON) {
            const state = JSON.parse(savedStateJSON);
            // console.log('HPI state restoring:', state);

            hpiPanelElement.querySelector('#hpiPastMedicalHistory').value = state.pastMedicalHistory || '';
            hpiPanelElement.querySelector('#hpiChiefComplaint').value = state.chiefComplaint || '';
            hpiPanelElement.querySelector('#hpiOnsetTiming').value = state.onsetTiming || '';
            hpiPanelElement.querySelector('#hpiAdditionalSymptoms').value = state.additionalSymptoms || '';
            hpiPanelElement.querySelector('#hpiContext').value = state.context || '';
            hpiPanelElement.querySelector('#hpiCurrentMedications').value = state.currentMedications || '';
            
            const resultArea = hpiPanelElement.querySelector('#hpiAssistantResult');
            if (state.hpiResultHTML) {
                resultArea.innerHTML = state.hpiResultHTML;
            }

            const hpiGenderHiddenInput = hpiPanelElement.querySelector('#hpiGender');
            const hpiGenderOtherTextInput = hpiPanelElement.querySelector('#hpiGenderOtherText');
            const genderBtns = hpiPanelElement.querySelectorAll('.gender-btn');

            hpiGenderHiddenInput.value = state.gender || '';
            genderBtns.forEach(btn => btn.classList.remove('selected'));

            if (state.selectedGenderButtonValue) {
                const btnToSelect = hpiPanelElement.querySelector(`.gender-btn[data-value="${state.selectedGenderButtonValue}"]`);
                if (btnToSelect) {
                    btnToSelect.classList.add('selected');
                    if (state.selectedGenderButtonValue === 'Other') {
                        hpiGenderOtherTextInput.style.display = 'inline-block';
                        hpiGenderOtherTextInput.value = state.genderOtherText || '';
                    } else {
                        hpiGenderOtherTextInput.style.display = 'none';
                    }
                }
            } else {
                 hpiGenderOtherTextInput.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('Error restoring HPI state from localStorage:', e);
    }
}
// --- END: Auto-Save Functionality ---

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
    const toggleHpiAssistantBtn = document.getElementById('toggleHpiAssistantBtn');
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const resultsDiv = document.getElementById('results');

    fetchAndDisplayProviders();

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

    window.addEventListener('resize', debounce(handleResize, 100));
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

    if (toggleHpiAssistantBtn) {
        toggleHpiAssistantBtn.addEventListener('click', () => {
            if (!hpiPanelElement) {
                const panelHTML = createHpiAssistantPanelHTML(); 
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = panelHTML;
                hpiPanelElement = tempDiv.children[0]; 
                
                if (hpiPanelElement) {
                    document.body.appendChild(hpiPanelElement);
                    makeDraggable(hpiPanelElement); 
                    
                    restoreHpiPanelState(); 

                    const closeHpiPanelBtn = hpiPanelElement.querySelector('#closeHpiPanelBtn');
                    if (closeHpiPanelBtn) {
                        closeHpiPanelBtn.addEventListener('click', () => {
                            saveHpiPanelState();
                            hpiPanelElement.classList.remove('active');
                        });
                    }

                    const inputsToSaveOnChange = [
                        '#hpiPastMedicalHistory', '#hpiChiefComplaint', '#hpiOnsetTiming',
                        '#hpiAdditionalSymptoms', '#hpiContext', '#hpiCurrentMedications',
                        '#hpiGenderOtherText'
                    ];
                    inputsToSaveOnChange.forEach(selector => {
                        const inputElement = hpiPanelElement.querySelector(selector);
                        if (inputElement) {
                            inputElement.addEventListener('input', debounce(saveHpiPanelState, 500));
                        }
                    });
                    
                    const genderBtns = hpiPanelElement.querySelectorAll('.gender-btn');
                    const hpiGenderHiddenInput = hpiPanelElement.querySelector('#hpiGender');
                    const hpiGenderOtherTextInput = hpiPanelElement.querySelector('#hpiGenderOtherText');

                    genderBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            genderBtns.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            const selectedGenderValue = btn.dataset.value;
                            if (selectedGenderValue === 'Other') {
                                hpiGenderOtherTextInput.style.display = 'inline-block';
                                hpiGenderOtherTextInput.focus();
                                hpiGenderHiddenInput.value = hpiGenderOtherTextInput.value.trim();
                            } else {
                                hpiGenderOtherTextInput.style.display = 'none';
                                hpiGenderHiddenInput.value = selectedGenderValue; 
                            }
                            saveHpiPanelState(); 
                        });
                    });
                    
                    hpiGenderOtherTextInput.addEventListener('input', () => {
                        const otherButton = hpiPanelElement.querySelector('.gender-btn[data-value="Other"]');
                        if (otherButton && otherButton.classList.contains('selected')) {
                            hpiGenderHiddenInput.value = hpiGenderOtherTextInput.value.trim();
                            // Debounced save is already attached to this input by inputsToSaveOnChange
                        }
                    });

                    const generateHpiBtn = hpiPanelElement.querySelector('#generateHpiBtn');
                    const resultArea = hpiPanelElement.querySelector('#hpiAssistantResult'); 

                    if (generateHpiBtn) {
                        generateHpiBtn.addEventListener('click', async () => { 
                            let finalGenderValue = hpiGenderHiddenInput.value;
                            const otherButtonSelected = hpiPanelElement.querySelector('.gender-btn[data-value="Other"].selected');
                            if (otherButtonSelected && !hpiGenderOtherTextInput.value.trim()) {
                                finalGenderValue = "Other"; 
                            } else if (otherButtonSelected) {
                                finalGenderValue = hpiGenderOtherTextInput.value.trim();
                            }

                            const pastMedicalHistory = hpiPanelElement.querySelector('#hpiPastMedicalHistory').value;
                            const chiefComplaint = hpiPanelElement.querySelector('#hpiChiefComplaint').value;
                            const onsetTiming = hpiPanelElement.querySelector('#hpiOnsetTiming').value;
                            const additionalSymptoms = hpiPanelElement.querySelector('#hpiAdditionalSymptoms').value;
                            const context = hpiPanelElement.querySelector('#hpiContext').value;
                            const currentMedications = hpiPanelElement.querySelector('#hpiCurrentMedications').value;
                            
                            if (!chiefComplaint.trim() || !context.trim()) {
                                resultArea.innerHTML = '';
                                resultArea.textContent = 'Error: Please enter both a "Chief Complaint" and "Context / Patient\'s Story" before generating the HPI.';
                                if (!chiefComplaint.trim()) {
                                    hpiPanelElement.querySelector('#hpiChiefComplaint').classList.add('input-error-highlight');
                                    setTimeout(() => hpiPanelElement.querySelector('#hpiChiefComplaint').classList.remove('input-error-highlight'), 2000);
                                }
                                if (!context.trim()) {
                                    hpiPanelElement.querySelector('#hpiContext').classList.add('input-error-highlight');
                                    setTimeout(() => hpiPanelElement.querySelector('#hpiContext').classList.remove('input-error-highlight'), 2000);
                                }
                                return;
                            }
                            
                            resultArea.innerHTML = ''; 
                            resultArea.textContent = 'Generating HPI...'; 
                            
                            generateHpiBtn.disabled = true;
                            generateHpiBtn.textContent = 'Generating...';

                            const hpiData = {
                                gender: finalGenderValue,
                                pastMedicalHistory: pastMedicalHistory,
                                chiefComplaint: chiefComplaint,
                                onsetTiming: onsetTiming,
                                otherSymptoms: additionalSymptoms, 
                                context: context,                 
                                currentMedications: currentMedications
                            };

                            // --- ADDED CONSOLE LOGS FOR DEBUGGING FETCH ---
                            console.log("HPI Data to send to /generate-hpi:", hpiData);
                            const fetchOptions = {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(hpiData)
                            };
                            console.log("Fetch options for /generate-hpi:", fetchOptions);
                            // --- END ADDED CONSOLE LOGS ---

                            try {
                                const response = await fetch('/generate-hpi', fetchOptions); // Use fetchOptions

                                if (response.ok) {
                                    const responseData = await response.json();
                                    if (responseData.debug_prompt_sent) {
                                        console.log("DEBUG - Data sent to and prompt constructed by server:\n", responseData.debug_prompt_sent);
                                    }
                                    
                                    if (responseData.generated_hpi) {
                                        resultArea.innerHTML = responseData.generated_hpi.replace(/\n/g, '<br>');
                                        saveHpiPanelState();
                                        displayTextWithTypewriterEffect(resultArea, responseData.generated_hpi, 15); 
                                    } else {
                                        resultArea.textContent = "No HPI generated.";
                                        saveHpiPanelState(); 
                                    }
                                } else {
                                    const errorData = await response.json(); // This might fail if response is not JSON (e.g. HTML 404 page)
                                    console.error('Error from server (status not OK):', response.status, response.statusText, errorData);
                                    resultArea.innerHTML = ''; 
                                    resultArea.textContent = `Error: ${errorData.error || 'Failed to generate HPI. Status: ' + response.status}`;
                                    saveHpiPanelState(); 
                                }
                            } catch (error) { // This catch block will handle network errors and JSON parsing errors
                                console.error('Network or other error fetching HPI (e.g., JSON parse error if server sent HTML 404):', error);
                                resultArea.innerHTML = ''; 
                                resultArea.textContent = 'Error: Could not connect to the server or received an invalid response.'; // Updated message
                                saveHpiPanelState(); 
                            } finally {
                                generateHpiBtn.disabled = false;
                                generateHpiBtn.textContent = 'Generate HPI';
                            }
                        });
                    }

                    const clearHpiFieldsBtn = hpiPanelElement.querySelector('#clearHpiFieldsBtn');
                    if (clearHpiFieldsBtn) {
                        clearHpiFieldsBtn.addEventListener('click', () => {
                            hpiPanelElement.querySelector('#hpiPastMedicalHistory').value = '';
                            hpiPanelElement.querySelector('#hpiChiefComplaint').value = '';
                            hpiPanelElement.querySelector('#hpiOnsetTiming').value = '';
                            hpiPanelElement.querySelector('#hpiAdditionalSymptoms').value = '';
                            hpiPanelElement.querySelector('#hpiContext').value = '';
                            hpiPanelElement.querySelector('#hpiCurrentMedications').value = '';
                            
                            genderBtns.forEach(btn => btn.classList.remove('selected'));
                            hpiGenderOtherTextInput.style.display = 'none';
                            hpiGenderOtherTextInput.value = '';
                            hpiGenderHiddenInput.value = ''; 
                            
                            hpiPanelElement.querySelector('#hpiAssistantResult').innerHTML = '';

                            saveHpiPanelState(); 
                            hpiPanelElement.querySelector('#hpiChiefComplaint').focus();
                        });
                    }
                } else {
                    console.error("Failed to create HPI panel element from HTML string.");
                }
            }

            if (hpiPanelElement) {
                if (hpiPanelElement.classList.contains('active')) {
                    hpiPanelElement.classList.remove('active');
                } else {
                    hpiPanelElement.classList.add('active');
                }
            }
        });
    } else {
        console.error("HPI Assistant button (#toggleHpiAssistantBtn) not found. Check ID in HTML and ensure it's correct.");
    }
});