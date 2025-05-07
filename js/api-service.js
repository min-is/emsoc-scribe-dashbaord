async function fetchAndDisplayProviders() {
    try {
        const response = await fetch('/providers');
        if (response.ok) {
            const allProviders = await response.json();

            allProviders.sort((a, b) => {
                const nameA = a.name.split(' ')[0].toLowerCase();
                const nameB = b.name.split(' ')[0].toLowerCase();
                if (nameA < nameB) return -1;
                if (nameA > nameB) return 1;
                return 0;
            });

            let currentProviders = [...allProviders]; // start with all providers

            const renderProviderList = (providersToRender) => {
                const providerListDiv = document.getElementById('providerList');
                providerListDiv.innerHTML = '';
                providersToRender.forEach(provider => {
                    const providerItem = document.createElement('div');
                    providerItem.classList.add('provider-item');
                    providerItem.textContent = provider.name;
                    providerItem.dataset.label = provider.name;
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
                        const sidebar = document.getElementById('sidebar');
                        sidebar.classList.remove('open');


                        if (preferencesPanel && preferencesPanel.classList.contains('open')) {
                            preferencesPanel.classList.remove('open');
                            panelOpen = false;
                            const titleElement = preferencesPanel.querySelector('h3');
                            if (titleElement) {
                                titleElement.classList.remove('iridescent-effect');
                            }
                        }
                    });

                    providerListDiv.appendChild(providerItem);
                });
            };

            renderProviderList(currentProviders); // Initial rendering

            const providerSearchInput = document.getElementById('providerSearchInput');
            providerSearchInput.addEventListener('input', () => {
                const query = providerSearchInput.value.trim().toLowerCase();
                if (query) {
                    const filteredProviders = currentProviders.filter(provider => {
                        return provider.name.toLowerCase().includes(query);
                    });
                    renderProviderList(filteredProviders);
                } else {
                    renderProviderList(currentProviders); // Show all providers if the query is empty
                }
            });

        } else {
            console.error('Error fetching providers:', response.status);
            const providerListDiv = document.getElementById('providerList');
            providerListDiv.innerHTML = '<p class="error">Failed to load providers.</p>';
        }
    } catch (error) {
        console.error('Error fetching providers:', error);
        const providerListDiv = document.getElementById('providerList');
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
                        const titleElement = preferencesPanel.querySelector('h3');
                        if (titleElement) {
                            titleElement.classList.remove('iridescent-effect');
                        }
                    }
                });
            }
            preferencesPanel.innerHTML = `<h3>${providerName} Preferences</h3><div id="panelProviderDetails"></div>`;
            const panelDetailsDiv = preferencesPanel.querySelector('#panelProviderDetails');
            panelDetailsDiv.innerHTML = generatePreferenceDetailsHTML(preferences);

            const titleElement = preferencesPanel.querySelector('h3');
            if (titleElement) {
                titleElement.classList.add('iridescent-effect');
            }

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
            const titleElement = preferencesPanel.querySelector('h3');
            if (titleElement) {
                titleElement.classList.remove('iridescent-effect');
            }
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
        const titleElement = preferencesPanel.querySelector('h3');
        if (titleElement) {
            titleElement.classList.remove('iridescent-effect');
        }
    }
}

async function fetchProviderPreferencesAndPin(providerId, providerName) {
    console.log(`Fetching pin preferences for provider ID: ${providerId}`);
    try {
        const response = await fetch(`/provider/${providerId}`);
        console.log(`Pin preferences response status: ${response.status}`);
        if (response.ok) {
            const preferences = await response.json();
            console.log('Pin preferences data:', preferences);
            pinCurrentPreferences(providerName, preferences);
        } else {
            console.error(`Error fetching pin preferences for provider ${providerId}:`, response.status);
        }
    } catch (error) {
        console.error(`Error fetching pin preferences for provider ${providerId}:`, error);
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

async function fetchMedicationDetails(name) {
    try {
        const response = await fetch(`/medication/${name}`);
        if (response.ok) {
            const medication = await response.json();
            displayMedicationDetails(medication);
            const resultsDiv = document.getElementById('results');
            resultsDiv.classList.add('show');
        } else {
            const errorData = await response.json();
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML = `<p class="error">${errorData.error || 'Medication not found'}</p>`;
            resultsDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Error fetching medication details:', error);
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '<p class="error">Failed to fetch medication details.</p>';
        resultsDiv.classList.add('show');
    }
}

const searchInput = document.getElementById('searchInput');
const suggestionsDiv = document.getElementById('suggestions');
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
        const resultsDiv = document.getElementById('results');
        resultsDiv.classList.remove('show');
    }
});