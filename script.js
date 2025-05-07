const searchInput = document.getElementById('searchInput');
const suggestionsDiv = document.getElementById('suggestions');
const resultsDiv = document.getElementById('results');
const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
const sidebar = document.getElementById('sidebar');
const providerListDiv = document.getElementById('providerList');
const providerDetailsDiv = document.getElementById('providerDetails'); // Still used for content generation
const providerSearchInput = document.getElementById('providerSearchInput');
let pinnedPreferences = null;
let currentProviderId = null;
let preferencesPanel = null; // New element for the sliding panel
let panelOpen = false; // Track if the preferences panel is open
let currentlyPinnedProviderName = null; // To store the name of the pinned provider

// Function to toggle the sidebar
toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
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
            const allProviders = await response.json(); // Store the original list

            allProviders.sort((a, b) => {
                const nameA = a.name.split(' ')[0].toLowerCase();
                const nameB = b.name.split(' ')[0].toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            let currentProviders = [...allProviders]; // Start with all providers

            const renderProviderList = (providersToRender) => {
                providerListDiv.innerHTML = '';
                providersToRender.forEach(provider => {
                    const providerItem = document.createElement('div');
                    providerItem.classList.add('provider-item');
                    providerItem.textContent = provider.name; // We still set this for event listeners
                    providerItem.dataset.label = provider.name; // Set the data-label attribute
                    providerItem.dataset.providerId = provider.id;
            
                    providerItem.addEventListener('mouseenter', function() {
                        const providerId = this.dataset.providerId;
                        const providerName = this.textContent;
                        currentProviderId = providerId;
                        fetchProviderPreferencesForPreview(providerId, providerName);
                        if (preferencesPanel) {
                            preferencesPanel.classList.add('open');
                            panelOpen = true;
                        }
                    });
            
                    providerItem.addEventListener('click', function() {
                        const providerId = this.dataset.providerId;
                        const providerName = this.textContent;
                        currentProviderId = providerId;
                        fetchProviderPreferencesAndPin(providerId, providerName);
                        this.classList.add('pinned');
                        sidebar.classList.remove('open');
                    });
            
                    providerListDiv.appendChild(providerItem);
                });
            };
            
                    providerItem.addEventListener('click', function() {
                        const providerId = this.dataset.providerId;
                        const providerName = this.textContent;
                        currentProviderId = providerId;
                        fetchProviderPreferencesAndPin(providerId, providerName);
                        this.classList.add('pinned');
                        sidebar.classList.remove('open');
                    });
            
                    providerListDiv.appendChild(providerItem);
                });
            };

            renderProviderList(currentProviders); // Initial rendering

            providerSearchInput.addEventListener('input', () => {
                const query = providerSearchInput.value.trim().toLowerCase();
                if (query) {
                    const filteredProviders = currentProviders.filter(provider => {
                        // Simple fuzzy matching: check if the query is a substring of the name
                        return provider.name.toLowerCase().includes(query);
                        // For more advanced fuzzy matching, you could use a library like Fuse.js
                    });
                    renderProviderList(filteredProviders);
                } else {
                    renderProviderList(currentProviders); // Show all providers if the query is empty
                }
            });

            // Add mouseleave listener to the sidebar (remains the same)
            sidebar.addEventListener('mouseleave', (event) => {
                if (preferencesPanel && panelOpen && !event.relatedTarget?.closest('#preferencesPanel')) {
                    preferencesPanel.classList.remove('open');
                    panelOpen = false;
                }
            });

            // Add mouseleave listener to the preferences panel (remains the same)
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

async function fetchProviderPreferencesForPreview(providerId, providerName) {
    console.log(`Fetching preview preferences for provider ID: ${providerId}`);
    try {
        const response = await fetch(`/provider/${providerId}`);
        console.log(`Preview preferences response status: ${response.status}`);
        if (response.ok) {
            const preferences = await response.json();
            console.log('Preview preferences data:', preferences);
            displayProviderPreferencesInPanel(preferences, providerName);

            if (!preferencesPanel) {
                preferencesPanel = document.createElement('div');
                preferencesPanel.id = 'preferencesPanel';
                document.body.appendChild(preferencesPanel);
                preferencesPanel.addEventListener('mouseleave', (event) => {
                    if (panelOpen && !event.relatedTarget?.closest('#sidebar')) {
                        preferencesPanel.classList.remove('open');
                        panelOpen = false;
                    }
                });
            }
            preferencesPanel.innerHTML = `<h3>${providerName} Preferences</h3><div id="panelProviderDetails"></div>`; // Removed the pin button here
            const panelDetailsDiv = preferencesPanel.querySelector('#panelProviderDetails');
            panelDetailsDiv.innerHTML = generatePreferenceDetailsHTML(preferences); // Helper function for HTML
        } else {
            console.error(`Error fetching preview preferences for provider ${providerId}:`, response.status);
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
        console.error(`Error fetching preview preferences for provider ${providerId}:`, error);
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

function generatePreferenceDetailsHTML(preferences) {
    let html = '';
    const displayOrder = ['note_pref', 'hpi_elements', 'physical_exam', 'mdm', 'other_pref', 'speed'];
    const displayedCategories = new Set();

    const displayCategory = (categoryKey, preferenceData) => {
        let formattedCategory = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (categoryKey === 'hpi_elements') formattedCategory = 'HPI Elements';
        else if (categoryKey === 'mdm') formattedCategory = 'MDM/ED Course';
        else if (categoryKey === 'note_pref') formattedCategory = 'General Preferences';
        else if (categoryKey === 'other_pref') formattedCategory = 'Other Preferences';
        else if (categoryKey === 'physical_exam') formattedCategory = 'Physical Exam';
        else if (categoryKey === 'speed') formattedCategory = 'Speed/Difficulty';

        html += `<h4 class="preference-subcategory">${formattedCategory}</h4>`;
        const data = preferenceData.hasOwnProperty(categoryKey) ? preferenceData[categoryKey] : null;

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(preference => {
                html += `<p class="preference-item-detail">${preference}</p>`;
            });
        } else if (typeof data === 'string') {
            html += `<p class="preference-item-detail">${data}</p>`;
        } else {
            html += `<p class="preference-item-detail no-preference">No specific preferences.</p>`;
        }
    };

    displayOrder.forEach(categoryKey => {
        if (preferences.hasOwnProperty(categoryKey)) {
            displayCategory(categoryKey, preferences);
            displayedCategories.add(categoryKey);
        }
    });

    for (const categoryKey in preferences) {
        if (preferences.hasOwnProperty(categoryKey) && !displayedCategories.has(categoryKey)) {
            displayCategory(categoryKey, preferences);
        }
    }
    return html;
}

async function fetchProviderPreferencesAndPin(providerId, providerName) {
    console.log(`Fetching pin preferences for provider ID: ${providerId}`);
    try {
        const response = await fetch(`/provider/${providerId}`);
        console.log(`Pin preferences response status: ${response.status}`);
        if (response.ok) {
            const preferences = await response.json();
            console.log('Pin preferences data:', preferences);
            pinCurrentPreferences(providerName, preferences); // Modify pin function to accept preferences
        } else {
            console.error(`Error fetching pin preferences for provider ${providerId}:`, response.status);
            // Optionally handle error display
        }
    } catch (error) {
        console.error(`Error fetching pin preferences for provider ${providerId}:`, error);
        // Optionally handle error display
    }
}

function displayProviderPreferencesInPanel(preferences, providerName) {
    const panelDetailsDiv = document.querySelector('#preferencesPanel #panelProviderDetails');
    if (panelDetailsDiv) {
        panelDetailsDiv.innerHTML = generatePreferenceDetailsHTML(preferences);
    }
}

function pinCurrentPreferences(providerName, preferences) {
    if (!pinnedPreferences) {
        pinnedPreferences = document.createElement('div');
        pinnedPreferences.id = 'pinnedPreferences';
        pinnedPreferences.classList.add('pinned-box');
        pinnedPreferences.dataset.providerId = currentProviderId;
        pinnedPreferences.innerHTML = `<h3>${providerName} Preferences</h3><div class="pinned-details"></div><button id="unpinPreferencesBtn">Unpin</button>`;
        document.body.appendChild(pinnedPreferences);
        pinnedPreferences.style.display = 'block';
        makeDraggable(pinnedPreferences);
        setupUnpinButton();
        currentlyPinnedProviderName = providerName;
        const detailsContainer = pinnedPreferences.querySelector('.pinned-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = generatePreferenceDetailsHTML(preferences);
        }
    } else if (pinnedPreferences && pinnedPreferences.dataset.providerId !== currentProviderId) {
        const titleElement = pinnedPreferences.querySelector('h3');
        if (titleElement) titleElement.textContent = `${providerName} Preferences`;
        const detailsContainer = pinnedPreferences.querySelector('.pinned-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = generatePreferenceDetailsHTML(preferences);
        }
        pinnedPreferences.dataset.providerId = currentProviderId;
        pinnedPreferences.style.display = 'block';
        setupUnpinButton();
        makeDraggable(pinnedPreferences);
        currentlyPinnedProviderName = providerName;
    }
}

function displayProviderPreferences(preferences, container) {
    container.innerHTML = ''; // Clear the container before adding new preferences
    const displayOrder = ['note_pref', 'hpi_elements', 'physical_exam', 'mdm', 'other_pref', 'speed'];
    const displayedCategories = new Set();

    displayOrder.forEach(categoryKey => {
        if (preferences.hasOwnProperty(categoryKey)) {
            displayCategory(categoryKey, preferences, container);
            displayedCategories.add(categoryKey);
        }
    });

    for (const categoryKey in preferences) {
        if (preferences.hasOwnProperty(categoryKey) && !displayedCategories.has(categoryKey)) {
            displayCategory(categoryKey, preferences, container);
        }
    }

    function displayCategory(categoryKey, preferenceData, container) {
        let formattedCategory = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (categoryKey === 'hpi_elements') formattedCategory = 'HPI Elements';
        else if (categoryKey === 'mdm') formattedCategory = 'MDM/ED Course';
        else if (categoryKey === 'note_pref') formattedCategory = 'General Preferences';
        else if (categoryKey === 'other_pref') formattedCategory = 'Other Preferences';
        else if (categoryKey === 'physical_exam') formattedCategory = 'Physical Exam';
        else if (categoryKey === 'speed') formattedCategory = 'Speed/Difficulty';

        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = formattedCategory;
        categoryTitle.classList.add('preference-subcategory');
        container.appendChild(categoryTitle);

        const data = preferenceData.hasOwnProperty(categoryKey) ? preferenceData[categoryKey] : null;

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(preference => {
                const preferenceItem = document.createElement('p');
                preferenceItem.classList.add('preference-item-detail');
                preferenceItem.textContent = preference;
                container.appendChild(preferenceItem);
            });
        } else if (typeof data === 'string') {
            const preferenceItem = document.createElement('p');
            preferenceItem.classList.add('preference-item-detail');
            preferenceItem.textContent = data;
        } else {
            const noPreference = document.createElement('p');
            noPreference.classList.add('preference-item-detail', 'no-preference');
            noPreference.textContent = `No specific preferences.`;
            container.appendChild(noPreference);
        }
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
        else if (categoryKey === 'mdm') formattedCategory = 'MDM/ED Course';
        else if (categoryKey === 'note_pref') formattedCategory = 'General Preferences';
        else if (categoryKey === 'other_pref') formattedCategory = 'Other Preferences';
        else if (categoryKey === 'physical_exam') formattedCategory = 'Physical Exam';
        else if (categoryKey === 'speed') formattedCategory = 'Speed/Difficulty';

        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = formattedCategory;
        categoryTitle.classList.add('preference-subcategory'); // Add a class for styling
        container.appendChild(categoryTitle);

        const data = preferenceData.hasOwnProperty(categoryKey) ? preferenceData [categoryKey] : null;

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(preference => {
                const preferenceItem = document.createElement('p');
                preferenceItem.classList.add('preference-item-detail'); // Add a class for styling
                preferenceItem.textContent = preference;
                container.appendChild(preferenceItem);
            });
        } else if (typeof data === 'string') {
            const preferenceItem = document.createElement('p');
            preferenceItem.classList.add('preference-item-detail'); // Add a class for styling
            preferenceItem.textContent = data;
        } else {
            const noPreference = document.createElement('p');
            noPreference.classList.add('preference-item-detail', 'no-preference'); // Add classes for styling
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
            preferencesPanel.innerHTML = `<h3>${providerName} Preferences</h3><button id="pinPreferencesBtn">Pin Provider</button><div id="panelProviderDetails"></div>`;
            const panelDetailsDiv = preferencesPanel.querySelector('#panelProviderDetails');
            panelDetailsDiv.innerHTML = document.getElementById('preferenceDetailsContent').innerHTML;

            // Re-attach event listeners to the pin button AND pass the preferences
            const pinButton = preferencesPanel.querySelector('#pinPreferencesBtn');
            if (pinButton) {
                pinButton.addEventListener('click', () => {
                    pinCurrentPreferences(providerName, preferences); // Pass the preferences here
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

function setupUnpinButton() {
    const unpinButton = document.getElementById('unpinPreferencesBtn');
    if (unpinButton) {
        unpinButton.addEventListener('click', () => {
            if (pinnedPreferences) {
                pinnedPreferences.remove();
                pinnedPreferences = null;
                currentlyPinnedProviderName = null; // Clear the stored pinned provider name
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