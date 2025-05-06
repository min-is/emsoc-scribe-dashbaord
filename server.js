const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files (HTML, CSS, JS, fonts)
app.use(express.static(path.join(__dirname)));

// Path to your JSON data file
const dataFilePath = path.join(__dirname, 'medications.json'); // Assuming your JSON file is named 'medications.json' and in the same directory

let medications = {}; // Store medication data

// Load medication data from the JSON file
try {
    const data = fs.readFileSync(dataFilePath, 'utf8');
    medications = JSON.parse(data);
} catch (error) {
    console.error('Error reading medication data:', error);
    // Handle the error appropriately, e.g., send an error response, use default data, or exit the application
    // For this example, we'll just log the error and continue with an empty object, but you should handle this in a production environment.
    medications = {};
}

// Prepare suggestions list
let suggestionsList = [];
function updateSuggestionsList() {
    suggestionsList = Object.keys(medications).map(name => [name, name]);
}
updateSuggestionsList(); // Initialize the suggestions list

// Suggestions endpoint
app.get('/suggestions', (req, res) => {
    const query = req.query.q.toLowerCase();
    const filteredSuggestions = suggestionsList.filter(([name]) =>
        name.toLowerCase().includes(query)
    );
    res.json(filteredSuggestions);
});

// Medication details endpoint
app.get('/medication/:name', (req, res) => {
    const name = req.params.name;
    const medication = medications[name];
    if (medication) {
        res.json(medication);
    } else {
        res.status(404).json({ error: 'Medication not found' });
    }
});

// Redirect all other routes to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
