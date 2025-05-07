// Global variable declarations
let pinnedPreferences = null;
let currentProviderId = null;
let preferencesPanel = null;
let panelOpen = false;
let currentlyPinnedProviderName = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchAndDisplayProviders();
    setupCanvas();
});