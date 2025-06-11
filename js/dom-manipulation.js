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

function displayProviderPreferencesInPanel(preferences, providerName) {
    const panelDetailsDiv = document.querySelector('#preferencesPanel #panelProviderDetails');
    if (panelDetailsDiv) {
        panelDetailsDiv.innerHTML = generatePreferenceDetailsHTML(preferences);
    }
}

function pinCurrentPreferences(providerName, preferences) {
    const currentProviderId = window.currentProviderId;
    let pinnedPreferences = document.getElementById('pinnedPreferences');
    if (!pinnedPreferences) {
        pinnedPreferences = document.createElement('div');
        pinnedPreferences.id = 'pinnedPreferences';
        pinnedPreferences.classList.add('pinned-box');
        pinnedPreferences.dataset.providerId = currentProviderId;

        const headerContainer = document.createElement('div');
        headerContainer.classList.add('pinned-header');

        const titleElement = document.createElement('h3');
        titleElement.textContent = `${providerName}`;
        titleElement.style.fontSize = '1.0em';
        headerContainer.appendChild(titleElement);

        const unpinIcon = document.createElement('span');
        unpinIcon.id = 'unpinIcon';
        unpinIcon.textContent = ' \u2715 '; 
        unpinIcon.style.cursor = 'pointer';
        unpinIcon.style.marginLeft = '10px';
        headerContainer.appendChild(unpinIcon);

        pinnedPreferences.appendChild(headerContainer);

        const detailsContainer = document.createElement('div');
        detailsContainer.classList.add('pinned-details');
        pinnedPreferences.appendChild(detailsContainer);
        detailsContainer.innerHTML = generatePreferenceDetailsHTML(preferences);

        document.body.appendChild(pinnedPreferences);
        pinnedPreferences.style.display = 'block'; 
        makeDraggable(pinnedPreferences); 
        setupUnpinIcon(); 
        window.currentlyPinnedProviderName = providerName;

    } else if (pinnedPreferences && pinnedPreferences.dataset.providerId !== currentProviderId) {
        const titleElement = pinnedPreferences.querySelector('.pinned-header h3');
        if (titleElement) titleElement.textContent = `${providerName}`;
        const detailsContainer = pinnedPreferences.querySelector('.pinned-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = generatePreferenceDetailsHTML(preferences);
        }
        pinnedPreferences.dataset.providerId = currentProviderId;
        pinnedPreferences.style.display = 'block';
        window.currentlyPinnedProviderName = providerName;
    }
}

function setupUnpinIcon() {
    const unpinIcon = document.getElementById('unpinIcon');
    if (unpinIcon) {
        unpinIcon.onclick = () => { 
            let pinnedPreferencesElement = document.getElementById('pinnedPreferences');
            if (pinnedPreferencesElement) {
                pinnedPreferencesElement.remove();
                window.pinnedPreferences = null; 
                window.currentlyPinnedProviderName = null;
            }
        };
    }
}

function displayProviderPreferences(preferences, container) { 
    container.innerHTML = ''; 
    const displayOrder = ['note_pref', 'hpi_elements', 'physical_exam', 'mdm', 'other_pref', 'speed'];
    const displayedCategories = new Set();

    function displayCategoryLocal(categoryKey, preferenceData, targetContainer) {
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
        targetContainer.appendChild(categoryTitle);

        const data = preferenceData.hasOwnProperty(categoryKey) ? preferenceData[categoryKey] : null;

        if (Array.isArray(data) && data.length > 0) {
            data.forEach(preference => {
                const preferenceItem = document.createElement('p');
                preferenceItem.classList.add('preference-item-detail');
                preferenceItem.textContent = preference;
                targetContainer.appendChild(preferenceItem);
            });
        } else if (typeof data === 'string') {
            const preferenceItem = document.createElement('p');
            preferenceItem.classList.add('preference-item-detail');
            preferenceItem.textContent = data;
            targetContainer.appendChild(preferenceItem); 
        } else {
            const noPreference = document.createElement('p');
            noPreference.classList.add('preference-item-detail', 'no-preference');
            noPreference.textContent = `No specific preferences.`;
            targetContainer.appendChild(noPreference);
        }
    }

    displayOrder.forEach(categoryKey => {
        if (preferences.hasOwnProperty(categoryKey)) {
            displayCategoryLocal(categoryKey, preferences, container);
            displayedCategories.add(categoryKey);
        }
    });

    for (const categoryKey in preferences) {
        if (preferences.hasOwnProperty(categoryKey) && !displayedCategories.has(categoryKey)) {
            displayCategoryLocal(categoryKey, preferences, container);
        }
    }
}

function displayMedicationDetails(medication) {
    const resultsDiv = document.getElementById('results');
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
        alternateNamesParagraph.innerHTML = `<strong>Alternative names:</strong> <span class="detail-label">${medication.alternate_names.join(', ')}</span>`;
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

// UPDATED: Added a "Copy Text" button to the output column
function createHpiAssistantPanelHTML() {
    let html = `
        <div id="hpiAssistantPanel" class="draggable-panel">
            <div class="panel-header">
                <h3>HPI Assistant</h3>
                <span class="close-panel-btn" id="closeHpiPanelBtn">&times;</span>
            </div>
            <div class="panel-content hpi-columns-container">
                <div class="hpi-input-column">
                    <div class="hpi-input-group">
                        <label>1. Gender:</label>
                        <div class="gender-options-container">
                            <button type="button" class="gender-btn" data-value="Male">Male</button>
                            <button type="button" class="gender-btn" data-value="Female">Female</button>
                            <button type="button" class="gender-btn" data-value="Other">Other</button>
                            <input type="text" id="hpiGenderOtherText" name="hpiGenderOtherText" placeholder="Specify" style="display: none; width: 120px; margin-left: 5px; vertical-align: middle;">
                        </div>
                        <input type="hidden" id="hpiGender" name="hpiGender">
                    </div>
                    <div class="hpi-input-group">
                        <label for="hpiPastMedicalHistory">2. Past Medical History (PMH):</label>
                        <textarea id="hpiPastMedicalHistory" name="hpiPastMedicalHistory" rows="4" placeholder="e.g., hypertension, DM type 2, afib. Enter 'None' if none."></textarea>
                    </div>
                    <div class="hpi-input-group">
                        <label for="hpiContext">3. Context / Patient's Story:</label>
                        <textarea id="hpiContext" name="hpiContext" rows="10" placeholder="Enter all details here: chief complaint, onset, timing, symptoms, current medications, etc."></textarea>
                    </div>
                    <div class="hpi-action-buttons-container">
                        <button type="button" id="clearHpiFieldsBtn" class="panel-button clear-button">Clear Fields</button>
                        <button type="button" id="generateHpiBtn" class="panel-button generate-button">Generate HPI (Beta)</button>
                    </div>
                </div>
                <div class="hpi-output-column">
                    <div class="hpi-output-header">
                        <button type="button" id="copyHpiTextBtn" class="panel-button copy-button">Copy Text</button>
                    </div>
                    <div id="hpiAssistantResult" class="hpi-result-area">
                    </div>
                </div>
            </div>
        </div>
    `;
    return html;
}
