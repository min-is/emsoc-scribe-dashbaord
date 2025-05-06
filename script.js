const searchInput = document.getElementById('searchInput');
const suggestionsDiv = document.getElementById('suggestions');
const resultsDiv = document.getElementById('results');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');
const providerListDiv = document.getElementById('providerList');
const providerPreferencesSection = document.getElementById('providerPreferencesSection');
const providerDetailsDiv = document.getElementById('providerDetails');
const pinPreferencesBtn = document.getElementById('pinPreferencesBtn'); // Get the new pin button

let pinnedPreferences = null; // To store the pinned preferences element
let currentProviderId = null; // To store the ID of the currently viewed provider

// Function to toggle the sidebar
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (pinnedPreferences) {
        pinnedPreferences.style.display = sidebar.classList.contains('open') ? 'none' : 'block';
    }
    providerPreferencesSection.style.display = 'none'; // Hide preferences when toggling provider list
});

async function fetchAndDisplayProviders() {
    try {
        const response = await fetch('/providers');
        if (response.ok) {
            const providers = await response.json();

            // Sort the providers array alphabetically by first name
            providers.sort((a, b) => {
                const nameA = a.name.split(' ')[0].toLowerCase(); // Get first name and lowercase it
                const nameB = b.name.split(' ')[0].toLowerCase(); // Get first name and lowercase it
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });

            providerListDiv.innerHTML = ''; 
            providers.forEach(provider => {
                const providerItem = document.createElement('div');
                providerItem.classList.add('provider-item');
                providerItem.textContent = provider.name;
                providerItem.dataset.providerId = provider.id;
                providerItem.addEventListener('click', function() { 
                    const providerId = this.dataset.providerId;
                    const providerName = this.textContent; 
                    currentProviderId = providerId;
                    fetchProviderPreferences(providerId, providerName); // pass
                });
                providerListDiv.appendChild(providerItem);
            });
        } else {
            console.error('Error fetching providers:', response.status);
            providerListDiv.innerHTML = '<p class="error">Failed to load providers.</p>';
        }
    } catch (error) {
        console.error('Error fetching providers:', error);
        providerListDiv.innerHTML = '<p class="error">Failed to load providers.</p>';
    }
}
// Fetch provider list when the script loads
fetchAndDisplayProviders();

// Function to fetch and display the preferences for a specific provider
async function fetchProviderPreferences(providerId, providerName) { // Accept providerName
    try {
        const response = await fetch(`/provider/${providerId}`);
        if (response.ok) {
            const preferences = await response.json();
            displayProviderPreferences(preferences, providerName); // Pass providerName
            providerPreferencesSection.style.display = 'block';
            // If preferences are pinned for a different provider, update the content
            if (pinnedPreferences && pinnedPreferences.dataset.providerId !== providerId) {
                const titleElement = pinnedPreferences.querySelector('h3');
                if (titleElement) {
                    titleElement.textContent = `${providerName} Preferences`;
                }
                const detailsContainer = pinnedPreferences.querySelector('.pinned-details');
                if (detailsContainer) {
                    detailsContainer.innerHTML = document.getElementById('preferenceDetailsContent').innerHTML;
                }
                pinnedPreferences.dataset.providerId = providerId;
                setupUnpinButton();
                makeDraggable(pinnedPreferences);
            }
        } else {
            console.error(`Error fetching preferences for provider ${providerId}:`, response.status);
            providerDetailsDiv.innerHTML = '<p class="error">Failed to load preferences.</p>';
            providerPreferencesSection.style.display = 'block';
        }
    } catch (error) {
        console.error(`Error fetching preferences for provider ${providerId}:`, error);
        providerDetailsDiv.innerHTML = '<p class="error">Failed to load preferences.</p>';
        providerPreferencesSection.style.display = 'block';
    }
}

// Function to display the provider's preferences
function displayProviderPreferences(preferences, providerName) { // Accept providerName
    providerDetailsDiv.innerHTML = ''; // Clear previous preferences

    // Create the pin button dynamically
    const pinButton = document.createElement('button');
    pinButton.id = 'pinPreferencesBtn';
    pinButton.textContent = 'Pin Preferences';
    pinButton.addEventListener('click', () => {
        if (!pinnedPreferences) {
            // Create the pinned preferences box
            pinnedPreferences = document.createElement('div');
            pinnedPreferences.id = 'pinnedPreferences';
            pinnedPreferences.classList.add('pinned-box');
            pinnedPreferences.dataset.providerId = currentProviderId; // Store the current provider ID

            // Set the dynamic title
            const titleElement = document.createElement('h3');
            titleElement.textContent = `${providerName} Preferences`;
            pinnedPreferences.appendChild(titleElement);

            // Get only the preference details content
            const preferenceDetailsContent = document.getElementById('preferenceDetailsContent').innerHTML;
            const detailsContainer = document.createElement('div');
            detailsContainer.classList.add('pinned-details');
            detailsContainer.innerHTML = preferenceDetailsContent;
            pinnedPreferences.appendChild(detailsContainer);

            const unpinButton = document.createElement('button');
            unpinButton.id = 'unpinPreferencesBtn';
            unpinButton.textContent = 'Unpin';
            pinnedPreferences.appendChild(unpinButton);

            document.body.appendChild(pinnedPreferences);
            makeDraggable(pinnedPreferences);
            setupUnpinButton();
        } else if (pinnedPreferences && pinnedPreferences.dataset.providerId !== currentProviderId) {
            // Update the title if pinning a different provider
            const titleElement = pinnedPreferences.querySelector('h3');
            if (titleElement) {
                titleElement.textContent = `${providerName} Preferences`;
            }
            pinnedPreferences.dataset.providerId = currentProviderId;
            const preferenceDetailsContent = document.getElementById('preferenceDetailsContent').innerHTML;
            const detailsContainer = pinnedPreferences.querySelector('.pinned-details');
            if (detailsContainer) {
                detailsContainer.innerHTML = preferenceDetailsContent;
            }
        }
        providerPreferencesSection.style.display = 'none';
        sidebar.classList.remove('open'); // Close the sidebar after pinning
        pinnedPreferences.style.display = 'block';
    });

    providerDetailsDiv.appendChild(pinButton); // Add the pin button at the top

    // Create a container for the actual preference details
    const preferenceDetailsContentDiv = document.createElement('div');
    preferenceDetailsContentDiv.id = 'preferenceDetailsContent';
    providerDetailsDiv.appendChild(preferenceDetailsContentDiv);

    const displayOrder = ['note_pref', 'hpi_elements', 'physical_exam', 'mdm', 'other_pref', 'speed'];
    const displayedCategories = new Set();

    // Display categories in the specified order within the new container
    displayOrder.forEach(categoryKey => {
        if (preferences.hasOwnProperty(categoryKey)) {
            displayCategory(categoryKey, preferences[categoryKey], preferenceDetailsContentDiv); // Pass the new container
            displayedCategories.add(categoryKey);
        }
    });

    // Display any remaining categories within the new container
    for (const categoryKey in preferences) {
        if (preferences.hasOwnProperty(categoryKey) && !displayedCategories.has(categoryKey)) {
            displayCategory(categoryKey, preferences[categoryKey], preferenceDetailsContentDiv); // Pass the new container
        }
    }

    function displayCategory(categoryKey, preferenceData, container) { // Accept the container
        let formattedCategory = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        if (categoryKey === 'hpi_elements') {
            formattedCategory = 'HPI Elements';
        } else if (categoryKey === 'mdm') {
            formattedCategory = 'Medical Decision Making';
        } else if (categoryKey === 'note_pref') {
            formattedCategory = 'Note Preferences';
        } else if (categoryKey === 'other_pref') {
            formattedCategory = 'Other Preferences';
        } else if (categoryKey === 'physical_exam') {
            formattedCategory = 'Physical Exam';
        } else if (categoryKey === 'speed') {
            formattedCategory = 'Speed';
        }

        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = formattedCategory;
        container.appendChild(categoryTitle); // Append to the container

        if (Array.isArray(preferenceData) && preferenceData.length > 0) {
            preferenceData.forEach(preference => {
                const preferenceItem = document.createElement('p');
                preferenceItem.classList.add('preference-item');
                preferenceItem.textContent = preference;
                container.appendChild(preferenceItem); // Append to the container
            });
        } else if (typeof preferenceData === 'string') {
            const preferenceItem = document.createElement('p');
            preferenceItem.classList.add('preference-item');
            preferenceItem.textContent = preferenceData;
            container.appendChild(preferenceItem); // Append to the container
        } else {
            const noPreference = document.createElement('p');
            noPreference.classList.add('preference-item');
            noPreference.textContent = `No specific preferences.`;
            container.appendChild(noPreference); // Append to the container
        }
    }
}

// Event listener for the "Pin Preferences" button (This one is no longer needed here)
// pinPreferencesBtn.addEventListener('click', () => {
//     if (!pinnedPreferences) {
//         // Create the pinned preferences box
//         pinnedPreferences = document.createElement('div');
//         pinnedPreferences.id = 'pinnedPreferences';
//         pinnedPreferences.classList.add('pinned-box');
//         pinnedPreferences.dataset.providerId = currentProviderId; // Store the current provider ID
//         pinnedPreferences.innerHTML = `<h3>Pinned Preferences</h3><div class="pinned-details">${providerDetailsDiv.innerHTML}</div><button id="unpinPreferencesBtn">Unpin</button>`;
//         document.body.appendChild(pinnedPreferences);
//         makeDraggable(pinnedPreferences);
//         setupUnpinButton();
//     }
//     providerPreferencesSection.style.display = 'none';
//     sidebar.classList.remove('open'); // Close the sidebar after pinning
//     pinnedPreferences.style.display = 'block';
// });

// Function to make an element draggable
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        // set the element's new position:
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        /* stop moving when mouse button is released:*/
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

function setupUnpinButton() {
    const unpinButton = document.getElementById('unpinPreferencesBtn');
    if (unpinButton) {
        unpinButton.addEventListener('click', () => {
            if (pinnedPreferences) {
                pinnedPreferences.remove();
                pinnedPreferences = null;
            }
        });
    }
}

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