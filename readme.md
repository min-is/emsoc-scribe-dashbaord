
## Medication Lookup Application

### Overview

This project is a web-based **medication lookup tool** designed to help healthcare providers and patients identify medications, even when the exact spelling or full name is unknown.

---

### Background

Medication errors and confusion often come from misspelled or partially remembered drug names. This tool was built to allow both clinicians and patients to look up medications quickly, including those with complex names or common misspellings.

---

## Features

- **Fuzzy Search \& Suggestions**
    - Supports partial matches and misspellings using advanced string matching (fuzzywuzzy).
    - Returns top suggestions in real-time as the user types.
    - Matches against both primary and alternate medication names.
- **Detailed Medication Information**
    - Displays a clear overview, alternate names, and mechanism of action for each medication.
    - Data was sourced from various sources and cross referenced to ensure all data was accurate and up-to-date.
- **RESTful API**
    - `/suggestions`: Returns a list of matching medication names based on user input.
    - `/medication/:name`: Returns detailed information for a selected medication.
- **Cross-Stack Implementation**
    - Includes both a Node.js (Express) and Python (Flask) backend

---

## Getting Started

### 2. Heroku (Online)
You can check out the **live version** hosted on Heroku [here](https://medication-lookup-0746b427ba35.herokuapp.com/)

### Local (Offline)

- **Node.js** (for Express backend) or **Python 3** (for Flask backend)
- `medications.json` file in the project directory.


### Install \& Run (Node.js)

```bash
npm install
npm start
```


### Install \& Run (Python)

```bash
pip install flask fuzzywuzzy
python app.py
```


### Usage

1. Open `index.html` in your browser.
2. Start typing a medication name. Suggestions will appear instantly.
3. Click a suggestion to view detailed information.

---

## Made with ❤️ using:

- Full-stack web development (Node.js, Python, HTML, CSS, JS)
- Advanced fuzzy search and string matching
- RESTful API design

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
