const express = require('express');
const path = require('path');
const fs = require('fs'); // fs might still be needed if you plan other file operations, otherwise it can be removed if not used.

const app = express();
const port = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS, fonts)
app.use(express.static(path.join(__dirname)));

// --- Medication Data Loading and API Endpoints Removed ---
// The following sections have been removed as this functionality
// is handled by app.py (Flask backend):
// - Loading medications.json
// - /suggestions endpoint
// - /medication/:name endpoint

// Redirect all other routes to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});