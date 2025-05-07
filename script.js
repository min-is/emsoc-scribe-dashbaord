const searchInput = document.getElementById('searchInput');
const suggestionsDiv = document.getElementById('suggestions');
const resultsDiv = document.getElementById('results');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');
const providerListDiv = document.getElementById('providerList');
const providerDetailsDiv = document.getElementById('providerDetails'); // Still used for content generation
let pinnedPreferences = null;
let currentProviderId = null;
let preferencesPanel = null; // New element for the sliding panel
let panelOpen = false; // Track if the preferences panel is open
let currentlyPinnedProviderId = null; // To track the ID of the pinned provider
let currentlyPinnedProviderName = null; // To track the name of the pinned provider

// Function to toggle the sidebar
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    // Control the visibility of the pinned area based on sidebar state
    if (pinnedPreferences) {
        pinnedPreferences.style.display = sidebar.classList.contains('open') ? 'none' : 'block';
    }
    if (preferencesPanel) {
        preferencesPanel.classList.remove('open');
        panelOpen = false;
    }
});

async function fetchAndDisplayProviders() {
    try {
        const response = await fetch('/providers');
        if (response.ok) {
            const providers = await response.json();

            providers.sort((a, b) => {
                const nameA = a.name.split(' ')[0].toLowerCase();
                const nameB = b.name.split(' ')[0].toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            providerListDiv.innerHTML = '';
            providers.forEach(provider => {
                const providerItem = document.createElement('div');
                providerItem.classList.add('provider-item');
                providerItem.textContent = provider.name;
                providerItem.dataset.providerId = provider.id;

                providerItem.addEventListener('mouseenter', function() {
                    const providerId = this.dataset.providerId;
                    const providerName = this.textContent;
                    currentProviderId = providerId;
                    fetchProviderPreferences(providerId, providerName);
                    if (preferencesPanel) {
                        preferencesPanel.classList.add('open');
                        panelOpen = true;
                    }
                });

                providerListDiv.appendChild(providerItem);
            });

            // Add a mouseleave listener to the sidebar to close the panel if the mouse moves out
            sidebar.addEventListener('mouseleave', (event) => {
                if (preferencesPanel && panelOpen && !event.relatedTarget?.closest('#preferencesPanel')) {
                    preferencesPanel.classList.remove('open');
                    panelOpen = false;
                }
            });

            // Add a mouseleave listener to the preferences panel to keep it open if the mouse is over it
            if (preferencesPanel) {
                preferencesPanel.addEventListener('mouseleave', (event) => {
                    if (!event.relatedTarget?.closest('#sidebar')) {
                        preferencesPanel.classList.remove('open');
                        panelOpen = false;
                    }
                });
            }

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

function displayProviderPreferences(preferences, providerName) {
    providerDetailsDiv.innerHTML = '';
    const preferenceDetailsContentDiv = document.createElement('div');
    preferenceDetailsContentDiv.id = 'preferenceDetailsContent';
    providerDetailsDiv.appendChild(preferenceDetailsContentDiv);

    const displayOrder = ['note_pref', 'hpi_elements', 'physical_exam', 'mdm', 'other_pref', 'speed'];
    const displayedCategories = new Set();

    displayOrder.forEach(categoryKey => {
        if (preferences.hasOwnProperty(categoryKey)) {
            displayCategory(categoryKey, preferences, preferenceDetailsContentDiv);
            displayedCategories.add(categoryKey);
        }
    });

    for (const categoryKey in preferences) {
        if (preferences.hasOwnProperty(categoryKey) && !displayedCategories.has(categoryKey)) {
            displayCategory(categoryKey, preferences, preferenceDetailsContentDiv);
        }
    }

    function displayCategory(categoryKey, preferenceData, container) {
        let formattedCategory = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (categoryKey === 'hpi_elements') formattedCategory = 'HPI Elements';
        else if (categoryKey === 'mdm') formattedCategory = 'Medical Decision Making';
        else if (categoryKey === 'note_pref') formattedCategory = 'Note Preferences';
        else if (categoryKey === 'other_pref') formattedCategory = 'Other Preferences';
        else if (categoryKey === 'physical_exam') formattedCategory = 'Physical Exam';
        else if (categoryKey === 'speed') formattedCategory = 'Speed';

        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = formattedCategory;
        container.appendChild(categoryTitle);

        const data = preferenceData.hasOwnProperty(categoryKey) ? preferenceData [categoryKey] : null;

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(preference => {
                const preferenceItem = document.createElement('p');
                preferenceItem.classList.add('preference-item');
                preferenceItem.textContent = preference;
                container.appendChild(preferenceItem);
            });
        } else if (typeof data === 'string') {
            const preferenceItem = document.createElement('p');
            preferenceItem.classList.add('preference-item');
            preferenceItem.textContent = data;
        } else {
            const noPreference = document.createElement('p');
            noPreference.classList.add('preference-item');
            noPreference.textContent = `No specific preferences.`;
            container.appendChild(noPreference);
        }
    }
}

async function fetchProviderPreferences(providerId, providerName) {
    try {
        const response = await fetch(`/provider/${providerId}`);
        if (response.ok) {
            const preferences = await response.json();
            displayProviderPreferences(preferences, providerName);

            if (!preferencesPanel) {
                preferencesPanel = document.createElement('div');
                preferencesPanel.id = 'preferencesPanel';
                document.body.appendChild(preferencesPanel);
                // Add initial mouseleave listener to the panel
                preferencesPanel.addEventListener('mouseleave', (event) => {
                    if (panelOpen && !event.relatedTarget?.closest('#sidebar')) {
                        preferencesPanel.classList.remove('open');
                        panelOpen = false;
                    }
                });
            }
            preferencesPanel.innerHTML = `<h3>${providerName} Preferences</h3><button id="pinPreferencesBtn" data-provider-id="${providerId}" data-provider-name="${providerName}">Pin Provider</button><div id="panelProviderDetails"></div>`;
            const panelDetailsDiv = preferencesPanel.querySelector('#panelProviderDetails');
            panelDetailsDiv.innerHTML = document.getElementById('preferenceDetailsContent').innerHTML;

            // Re-attach event listeners to the pin button
            const pinButton = preferencesPanel.querySelector('#pinPreferencesBtn');
            if (pinButton) {
                pinButton.addEventListener('click', function() {
                    const pinnedId = this.dataset.providerId;
                    const pinnedName = this.dataset.providerName;
                    pinProvider(pinnedId, pinnedName);
                    // Immediately close the hover panel after pinning
                    if (preferencesPanel) {
                        preferencesPanel.classList.remove('open');
                        panelOpen = false;
                    }
                });
            }

            currentProviderId = providerId;

        } else {
            console.error(`Error fetching preferences for provider ${providerId}:`, response.status);
            if (!preferencesPanel) {
                preferencesPanel = document.createElement('div');
                preferencesPanel.id = 'preferencesPanel';
                document.body.appendChild(preferencesPanel);
            }
            preferencesPanel.innerHTML = `<p class="error">Failed to load preferences for ${providerName}.</p>`;
            if (panelOpen) preferencesPanel.classList.remove('open');
            panelOpen = false;
        }
    } catch (error) {
        console.error(`Error fetching preferences for provider ${providerId}:`, error);
        if (!preferencesPanel) {
            preferencesPanel = document.createElement('div');
            preferencesPanel.id = 'preferencesPanel';
            document.body.appendChild(preferencesPanel);
        }
        preferencesPanel.innerHTML = `<p class="error">Failed to load preferences for ${providerName}.</p>`;
        if (panelOpen) preferencesPanel.classList.remove('open');
        panelOpen = false;
    }
}

function pinProvider(providerId, providerName) {
    currentlyPinnedProviderId = providerId;
    currentlyPinnedProviderName = providerName;
    displayPinnedProvider();
}

function displayPinnedProvider() {
    if (currentlyPinnedProviderId && currentlyPinnedProviderName) {
        const pinnedDetails = document.getElementById('preferenceDetailsContent').innerHTML; // Assuming this holds the last fetched preferences
        if (!pinnedPreferences) {
            pinnedPreferences = document.createElement('div');
            pinnedPreferences.id = 'pinnedPreferences';
            pinnedPreferences.classList.add('pinned-box');
            document.body.appendChild(pinnedPreferences);
            makeDraggable(pinnedPreferences);
        }
        pinnedPreferences.innerHTML = `<h3>${currentlyPinnedProviderName} Preferences</h3><div class="pinned-details">${pinnedDetails}</div><button id="unpinPreferencesBtn">Unpin</button>`;
        pinnedPreferences.style.display = sidebar.classList.contains('open') ? 'none' : 'block';
        setupUnpinButton();
    } else if (pinnedPreferences) {
        pinnedPreferences.remove();
        pinnedPreferences = null;
    }
}

function setupUnpinButton() {
    const unpinButton = document.getElementById('unpinPreferencesBtn');
    if (unpinButton) {
        unpinButton.addEventListener('click', () => {
            currentlyPinnedProviderId = null;
            currentlyPinnedProviderName = null;
            if (pinnedPreferences) {
                pinnedPreferences.remove();
                pinnedPreferences = null;
            }
        });
    }
}

// Check if a provider was pinned on a previous session (you'd need to implement local storage for this)
// For now, we just load the provider list
// Optionally, if you had a previously pinned provider ID in storage, you could call
// fetchProviderPreferences(storedProviderId, storedProviderName) here to initialize the pinned state.

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;
    function dragMouseDown(e) {
        e = e || window.event; e.preventDefault();
        pos3 = e.clientX; pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    function elementDrag(e) {
        e = e || window.event; e.preventDefault();
        pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
        pos3 = e.clientX; pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }
    function closeDragElement() {
        document.onmouseup = null; document.onmousemove = null;
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

// Initialize pinned provider on load if one was previously pinned (requires local storage)
// For now, we just ensure pinnedPreferences is initially hidden if it exists
if (pinnedPreferences) {
    pinnedPreferences.style.display = 'none';
}