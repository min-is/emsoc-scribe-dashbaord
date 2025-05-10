from flask import Flask, request, jsonify, send_from_directory
from fuzzywuzzy import fuzz
import os
import json
# If you plan to use the OpenAI library, you'd import it here later:
# import openai 

app = Flask(__name__, static_folder='.', static_url_path='')

try:
    with open('medications.json', 'r', encoding='utf-8') as f:
        medication_list = json.load(f)
except FileNotFoundError:
    medication_list = []
    print("Error: medications.json not found!")

try:
    with open('providers.json', 'r', encoding='utf-8') as f:
        provider_list = json.load(f)
except FileNotFoundError:
    provider_list = []
    print("Error: providers.json not found!")

medication_data = {item['name'].lower(): item for item in medication_list}
medication_names = list(medication_data.keys())
provider_data = {item['id']: item for item in provider_list}


def find_best_match(query, text):
    """Find the best fuzzy match of the query within the text."""
    best_match = ""
    best_ratio = 0
    for word in text.split():
        ratio = fuzz.partial_ratio(query.lower(), word.lower())
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = word
    return best_match, best_ratio


def starts_with_query(text, query):
    """Check if the text starts with the query."""
    return text.lower().startswith(query.lower())


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/suggestions')
def suggestions():
    query = request.args.get('q', '').lower()
    if not query:
        return jsonify([])

    suggestions_with_matches = []
    for name in medication_names:
        medication = medication_data[name]
        name_match, name_ratio = find_best_match(query, name)
        alt_names = medication.get('alternate_names', [])
        best_alt_match = ""
        best_alt_ratio = 0

        for alt in alt_names:
            alt_match_temp, alt_ratio = find_best_match(query, alt)
            if alt_ratio > best_alt_ratio:
                best_alt_ratio = alt_ratio
                best_alt_match = alt_match_temp


        if starts_with_query(name, query):
            name_ratio += 20
        if best_alt_ratio > 0 and starts_with_query(best_alt_match, query):
            best_alt_ratio += 20

        if best_alt_ratio > name_ratio:
            if best_alt_ratio > 50:
                for alt in alt_names:
                    if best_alt_match.lower() in alt.lower():
                        suggestions_with_matches.append((name, alt, best_alt_ratio))
                        break
        elif name_ratio > 50:
            suggestions_with_matches.append((name, name, name_ratio))

    suggestions_with_matches.sort(key=lambda item: item[2], reverse=True)
    top_suggestions = [(item[0], item[1]) for item in suggestions_with_matches[:5]]
    return jsonify(top_suggestions)


@app.route('/medication/<name>')
def get_medication_details(name):
    name_lower = name.lower()
    if name_lower in medication_data:
        med_info = medication_data[name_lower]
        details = {
            "name": med_info['name'],
            "description": med_info.get('description', ''),
            "alternate_names": med_info.get('alternate_names', []),
            "mechanism_of_action": med_info['mechanism_of_action']
        }
        return jsonify(details)
    else:
        return jsonify({"error": "Medication not found"}), 404

@app.route('/providers')
def get_providers():
    providers = [{"id": p['id'], "name": p['name']} for p in provider_list]
    return jsonify(providers)

@app.route('/provider/<provider_id>')
def get_provider_details(provider_id):
    if provider_id in provider_data:
        return jsonify(provider_data[provider_id]['preferences'])
    else:
        return jsonify({"error": "Provider not found"}), 404

@app.route('/generate-hpi', methods=['POST'])
def generate_hpi_route():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        chief_complaint = data.get('chiefComplaint', '')
        additional_symptoms = data.get('additionalSymptoms', '')
        onset = data.get('onset', '')
        other_notes = data.get('otherNotes', '')

        # **Placeholder for GPT Integration**
        # In a real implementation, you would:
        # 1. Retrieve your OpenAI API key securely (e.g., from environment variables)
        #    openai.api_key = os.getenv("OPENAI_API_KEY")
        # 2. Construct a detailed prompt using the input fields and your pre-defined structure.
        #    prompt_text = f"Generate a professional HPI based on the following details:\n" \
        #                  f"Chief Complaint: {chief_complaint}\n" \
        #                  f"Additional Symptoms: {additional_symptoms}\n" \
        #                  f"Onset: {onset}\n" \
        #                  f"Other Notes: {other_notes}\n\n" \
        #                  f"Please format the HPI clearly and professionally." 
        #    (This is a basic example; your actual prompt will be more tailored)
        # 3. Make the API call to OpenAI:
        #    response = openai.ChatCompletion.create(
        #        model="gpt-3.5-turbo", # Or your preferred model
        #        messages=[{"role": "user", "content": prompt_text}]
        #    )
        #    generated_hpi_text = response.choices[0].message.content.strip()
        
        # For now, we'll return a mock response:
        mock_hpi_text = f"Formatted HPI based on:\n" \
                        f"- Chief Complaint: {chief_complaint}\n" \
                        f"- Additional Symptoms: {additional_symptoms}\n" \
                        f"- Onset: {onset}\n" \
                        f"- Other Notes: {other_notes}\n\n" \
                        f"(This is a mock response from the server. GPT integration is pending.)"

        return jsonify({"generated_hpi": mock_hpi_text})

    except Exception as e:
        print(f"Error in /generate-hpi: {e}") # Log the error for debugging
        return jsonify({"error": "An internal server error occurred"}), 500


if __name__ == '__main__':
    app.run(debug=True)