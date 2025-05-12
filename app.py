from flask import Flask, request, jsonify, send_from_directory
from fuzzywuzzy import fuzz
import os
import json

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

        # Extracting all the expected fields
        gender = data.get('gender', '')
        pmh = data.get('pastMedicalHistory', '').strip()
        chief_complaint = data.get('chiefComplaint', '')
        onset_timing = data.get('onsetTiming', '') # Matched to your new list
        accompanied_by = data.get('accompaniedBy', '')
        # 'additionalSymptoms' from frontend can map to 'otherSymptoms' here
        other_symptoms = data.get('additionalSymptoms', '') 
        context = data.get('otherNotes', '') # 'otherNotes' from frontend maps to 'context'
        pertinent_negatives = data.get('pertinentNegatives', '')
        current_medications = data.get('currentMedications', '')

        # --- Construct the detailed prompt for the GPT model ---
        
        # System message (optional, but can help set the stage for the AI)
        system_message_content = (
            "You are an expert medical scribe assistant tasked with writing a perfect medical HPI "
            "for an adult emergency department in Southern California. Follow the provided format, syntax, "
            "and style meticulously. Convert times to 24-hour format. Format Tmax in parentheses if provided. "
            "Correct grammatical errors, spelling, and improve terminology for clarity and professionalism, "
            "aiming for the quality of HPIs from esteemed institutions. Ensure the narrative is smooth and effective. "
            "Avoid awkward third-person phrasing like 'The patient states that...' where possible, instead "
            "favoring sentence starters like 'Patient reports that', 'States that', 'Endorses that', 'He/She notes that', etc. "
            "Whenever a temperature is given in context of a fever complaint (e.g., 102F), you are to format it as (Tmax = 102F)."
            "A sentence that looks like 'he complains of one day of fever' should look like 'he complains of one day of fever (Tmax = 102F)."
            "Whenever NBNB comes up in the context of vomiting, do not write 'non-bilious, non-bloody.' Just keep it as 'NBNB.'"
            "After the HPI, provide a list of 4-5 differential diagnoses from an Emergency Medicine perspective with brief explanations."
            "The only acceptable ways to display the differential diagnoses are just using the title of the diagnosis like 'Viral gastroenteritis'."
            "However, you may also only use statements such as 'Also consider,' 'Doubt,' 'Considered but ruled out.' Keep it concise here."
        )

        # User message part 1
        user_prompt_instructions = (
            "Format and write HPIs in the same syntax and method as the sample. "
            "Begin every HPI with 'with no significant past medical history' (if past medical history is empty/none) "
            "or 'with a past medical history of {pertinent PMH}'.\n\n"
            "Sample Input Data Format:\n"
            "1. Gender: male\n"
            "2. Past medical history: hypertension, hyperlipidemia, CKD stage III, afib\n"
            "3. Chief complaint: generalized weakness\n"
            "4. Onset/timing: for the past week but worse since last night\n"
            "5. Accompanied by: wife\n"
            "6. Additional symptoms: fever, chills, mild itchy rash to the left elbow\n"
            "7. Context: pt's wife noticed pt being more fatigued and lethargic over the past week but significantly worse since last night.\n"
            "8. Denies: nausea, vomiting, diarrhea, urinary symptoms\n"
            "9. Currently on eliquis\n\n"
            "Sample Output for the data above:\n"
            "\"with a past medical history of hypertension, hyperlipidemia, and chronic kidney disease stage III who presents to the Emergency Department "
            "complaining of one week of generalized weakness, worse since yesterday evening. Per wife, who is providing additional history at bedside, "
            "states that she has noticed that patient has been more fatigued and lethargic over the past week, and worse since last night, and looked very "
            "pale today morning. Patient states that he has also been having subjective fevers, chills, and a mild itchy rash to the left elbow. He denies any "
            "recent nausea, vomiting, diarrhea, urinary symptoms, or focal neuro deficits. Patient is currently taking Eliquis.\n\n"
            "Differential diagnoses includes:\n"
            "- Sepsis: Given fever, chills, weakness, and lethargy, infection leading to sepsis is a concern.\n"
            "- Anemia: Pallor and fatigue could indicate anemia, possibly secondary to CKD or another cause.\n"
            "- Adverse drug reaction (Eliquis): While Eliquis is an anticoagulant, rash and systemic symptoms could warrant considering a drug reaction or interaction.\n"
            "- Viral Syndrome: Fever, chills, fatigue, and rash can be seen with various viral illnesses.\"\n\n"
            "--- Now, generate an HPI for the following patient ---\n"
        )

        # User message part 2
        patient_data_for_prompt = (
            f"1. Gender: {gender}\n"
            f"2. Past medical history: {pmh if pmh else 'None'}\n"
            f"3. Chief complaint: {chief_complaint}\n"
            f"4. Onset/timing: {onset_timing}\n"
            f"5. Accompanied by/history by: {accompanied_by}\n"
            f"6. Other symptoms: {other_symptoms}\n"
            f"7. Context: {context}\n"
            f"8. Pertinent negatives: {pertinent_negatives}\n"
            f"9. Current medications: {current_medications}\n"
        )
        
        full_prompt_for_gpt = user_prompt_instructions + patient_data_for_prompt

        # **Placeholder for Actual GPT API Call**
        # When ready, replace this mock response with the actual OpenAI API call:
        #
        # try:
        #     openai.api_key = os.getenv("OPENAI_API_KEY")
        #     if not openai.api_key:
        #         return jsonify({"error": "OpenAI API key not configured"}), 500
        #
        #     completion = openai.ChatCompletion.create(
        #         model="gpt-3.5-turbo", # Or your preferred model, e.g., "gpt-4"
        #         messages=[
        #             {"role": "system", "content": system_message_content},
        #             {"role": "user", "content": full_prompt_for_gpt}
        #         ]
        #     )
        #     generated_text = completion.choices[0].message.content.strip()
        #     return jsonify({"generated_hpi": generated_text})
        #
        # except Exception as e:
        #     print(f"OpenAI API call error: {e}")
        #     return jsonify({"error": f"Error calling GPT API: {str(e)}"}), 500

        mock_hpi_construct = (
            f"Prompt that would be sent to GPT:\n"
            f"System Message: {system_message_content}\n\n"
            f"User Message:\n{full_prompt_for_gpt}\n\n"
            f"--- Mock HPI & Diagnoses (Server-side placeholder) ---\n"
        )

        pmh_intro = "with no significant past medical history"
        if pmh and pmh.lower() not in ['none', 'no significant pmh', 'n/a', '']:
            pmh_intro = f"with a past medical history of {pmh}"

        mock_generated_hpi = (
            f"{pmh_intro} who presents to the ED complaining of {chief_complaint}. "
            f"The symptoms reportedly started {onset_timing}. "
            f"Additional history provided by {accompanied_by if accompanied_by else 'patient'}. "
            f"Patient endorses other symptoms including: {other_symptoms}. "
            f"Context: {context}. "
            f"Patient denies {pertinent_negatives if pertinent_negatives else 'any other acute complaints'}. "
            f"Current medications include: {current_medications if current_medications else 'none stated'}.\n\n"
            "Differential diagnoses includes:\n"
            "- Diagnosis 1: Based on chief complaint and onset.\n"
            "- Diagnosis 2: Considering other symptoms noted.\n"
            "- Diagnosis 3: Contextual factors may suggest this.\n"
            "- Diagnosis 4: Pertinent negatives might point away from alternatives, making this more likely."
        )
        
        # To see the full prompt being constructed for debugging:
        # print(mock_hpi_construct + mock_generated_hpi) 

        return jsonify({"generated_hpi": mock_generated_hpi, "debug_prompt_sent": mock_hpi_construct + mock_generated_hpi}) # Sending the debug prompt too for now

    except Exception as e:
        print(f"Error in /generate-hpi: {e}") # Log the error for debugging
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__': # This line was the issue
    app.run(debug=True)