function generatePreferenceDetailsHTML(preferences) {
    let html = '';
    const displayOrder = ['note_pref', 'hpi_elements', 'physical_exam', 'mdm', 'other_pref', 'speed'];
    const displayedCategories = new Set();

    const displayCategory = (categoryKey, preferenceData) => {
        let formattedCategory = categoryKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        if (categoryKey === 'hpi_elements') formattedCategory = 'HPI';
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

        // container for unpin
        const headerContainer = document.createElement('div');
        headerContainer.classList.add('pinned-header');

        const titleElement = document.createElement('h3');
        titleElement.textContent = `${providerName}`;
        titleElement.style.fontSize = '1.0em';
        headerContainer.appendChild(titleElement);

        // unpin icon
        const unpinIcon = document.createElement('span');
        unpinIcon.id = 'unpinIcon';
        unpinIcon.textContent = ' ✕ ';
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
        setupUnpinIcon(); // unpin iconclick
        window.currentlyPinnedProviderName = providerName;

    } else if (pinnedPreferences && pinnedPreferences.dataset.providerId !== currentProviderId) {
        const titleElement = pinnedPreferences.querySelector('.pinned-header h3');
        if (titleElement) titleElement.textContent = `${providerName} Preferences`;
        const detailsContainer = pinnedPreferences.querySelector('.pinned-details');
        if (detailsContainer) {
            detailsContainer.innerHTML = generatePreferenceDetailsHTML(preferences);
        }
        const unpinIcon = pinnedPreferences.querySelector('#unpinIcon');
        if (unpinIcon) {
            setupUnpinIcon();
        }
        pinnedPreferences.dataset.providerId = currentProviderId;
        pinnedPreferences.style.display = 'block';
        makeDraggable(pinnedPreferences);
        window.currentlyPinnedProviderName = providerName;
    }
}

function setupUnpinIcon() {
    const unpinIcon = document.getElementById('unpinIcon');
    if (unpinIcon) {
        unpinIcon.addEventListener('click', () => {
            let pinnedPreferences = document.getElementById('pinnedPreferences');
            if (pinnedPreferences) {
                pinnedPreferences.remove();
                window.pinnedPreferences = null;
                window.currentlyPinnedProviderName = null;
            }
        });
    }
}

function displayProviderPreferences(preferences, container) {
    container.innerHTML = '';
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
        if (categoryKey === 'hpi_elements') formattedCategory = 'HPI';
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
        const alternateNamesParagraph = document.createElement('palt');
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

// Add this function to dom-manipulation.js
function createHpiAssistantPanelHTML() {
    let html = `
        <div id="hpiAssistantPanel" class="draggable-panel">
            <div class="panel-header">
                <h3>HPI Assistant</h3>
                <span class="close-panel-btn" id="closeHpiPanelBtn">&times;</span>
            </div>
            <div class="panel-content">
                <div class="hpi-input-group">
                    <label for="hpiChiefComplaint">Chief Complaint:</label>
                    <input type="text" id="hpiChiefComplaint" name="hpiChiefComplaint" placeholder="e.g., Chest pain">
                </div>
                <div class="hpi-input-group">
                    <label for="hpiAdditionalSymptoms">Additional Symptoms:</label>
                    <input type="text" id="hpiAdditionalSymptoms" name="hpiAdditionalSymptoms" placeholder="e.g., Shortness of breath, nausea">
                </div>
                <div class="hpi-input-group">
                    <label for="hpiOnset">Onset:</label>
                    <input type="text" id="hpiOnset" name="hpiOnset" placeholder="e.g., 2 hours ago, Yesterday morning">
                </div>
                <div class="hpi-input-group">
                    <label for="hpiOtherNotes">Other Notes / Details:</label>
                    <textarea id="hpiOtherNotes" name="hpiOtherNotes" rows="4" placeholder="Enter any other relevant details, context, or 'word vomit' here..."></textarea>
                </div>
                <button id="generateHpiBtn" class="panel-button">Generate HPI</button>
                <div id="hpiAssistantResult" class="hpi-result-area">
                    </div>
            </div>
        </div>
    `;
    return html;
}