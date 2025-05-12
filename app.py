from flask import Flask, request, jsonify, send_from_directory
from fuzzywuzzy import fuzz
import os
import json
from openai import OpenAI, APIError, AuthenticationError, RateLimitError, BadRequestError

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

        gender = data.get('gender', '')
        pmh = data.get('pastMedicalHistory', '').strip()
        chief_complaint = data.get('chiefComplaint', '')
        onset_timing = data.get('onsetTiming', '')
        accompanied_by = data.get('accompaniedBy', '')
        other_symptoms = data.get('additionalSymptoms', '') 
        context = data.get('otherNotes', '') 
        pertinent_negatives = data.get('pertinentNegatives', '') 
        current_medications = data.get('currentMedications', '')

        system_message_content = (
            "You are an expert medical scribe assistant tasked with writing a perfect medical HPI "
            "for an adult emergency department in Southern California. Follow the provided format, syntax, "
            "and style meticulously. Convert times to 24-hour format. Format Tmax in parentheses if provided "
            "(e.g., fever (Tmax = 102F)). When NBNB is mentioned for vomiting, use 'NBNB' directly. "
            "When a user types 's/p' it stands for 'status post,' and 'r/o' stands for 'rule(d) out.'"
            "If a user writes that the patient has someone assisting them with their history, introduce them by "
            "saying 'Per (accompanant) providing additional history at bedside...'."
            "If the patient has a history of serious mental disability or is coming in for any altered mental condition and unable to give a history"
            "Write: Patient history is limited secondary to developmental delay/altered mental status/clinical condition/etc.. (choose the best one).)"
            "Correct grammatical errors, spelling, and improve terminology for clarity and professionalism, "
            "aiming for the quality of HPIs from esteemed institutions. Ensure the narrative is smooth and effective. "
            "Avoid awkward third-person phrasing like 'The patient states that...' where possible, instead "
            "favoring sentence starters like 'Patient reports that', 'States that', 'Endorses that', 'He/She notes that', etc. "
            "Again, it is IMPERATIVE that you do not start sentences with 'The patient'"
            "After the HPI, provide a new line titled 'Differential diagnoses includes: ' followed by a list of 4-5 "
            "differential diagnoses from an Emergency Medicine perspective with brief (1 sentence) explanations. "
            "Acceptable ways to display differential diagnoses are using the title (e.g., 'Viral gastroenteritis') or statements "
            "like 'Also consider,' 'Doubt,' 'Considered but ruled out.' Keep it concise."
            "The first letter of your reponse should always be lowercase (w)."
        )

        user_prompt_instructions = (
            "Format and write HPIs in the same syntax and method as the sample. "
            "Begin every HPI with 'with no significant past medical history' (if past medical history is empty/none/similar) "
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
            "complaining of one week of generalized weakness, worse since yesterday evening. Per wife, who is providing additional history at bedside, " # Matched your example
            "states that she has noticed that patient has been more fatigued and lethargic over the past week, and worse since last night, and looked very " # Matched your example
            "pale today morning. Patient states that he has also been having subjective fevers, chills, and a mild itchy rash to the left elbow. He denies any " # Matched your example (subjective fevers)
            "recent nausea, vomiting, diarrhea, urinary symptoms, or focal neuro deficits. Patient is currently taking Eliquis.\n\n"
            "Differential diagnoses includes:\n"
            "- Sepsis: Given fever, chills, weakness, and lethargy, infection leading to sepsis is a concern.\n"
            "- Anemia: Pallor and fatigue could indicate anemia, possibly secondary to CKD or another cause.\n"
            "- Adverse drug reaction (Eliquis): While Eliquis is an anticoagulant, rash and systemic symptoms could warrant considering a drug reaction or interaction.\n"
            "- Viral Syndrome: Fever, chills, fatigue, and rash can be seen with various viral illnesses.\"\n\n"
            "--- Now, generate an HPI for the following patient ---\n"
        )
        
        patient_data_for_prompt = (
            f"1. Gender: {gender}\n"
            f"2. Past medical history: {pmh if pmh and pmh.lower().strip() not in ['none', 'no significant past medical history', 'no significant pmh', 'n/a', ''] else 'None'}\n" # Improved check for 'None' PMH
            f"3. Chief complaint: {chief_complaint}\n"
            f"4. Onset/timing: {onset_timing}\n"
            f"5. Accompanied by/history by: {accompanied_by}\n"
            f"6. Other symptoms: {other_symptoms}\n"
            f"7. Context: {context}\n"
            f"8. Pertinent negatives: {pertinent_negatives}\n"
            f"9. Current medications: {current_medications}\n"
        )
        
        full_prompt_for_gpt = user_prompt_instructions + patient_data_for_prompt

        # --- Actual GPT API Call (Updated for OpenAI library v1.0.0+) ---
        try:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                print("Error: OPENAI_API_KEY environment variable not found.")
                return jsonify({"error": "OpenAI API key not configured on the server"}), 500

            client = OpenAI(api_key=api_key) # Initialize client with the API key

            completion = client.chat.completions.create(
                model="o4-mini",
                messages=[
                    {"role": "system", "content": system_message_content},
                    {"role": "user", "content": full_prompt_for_gpt}
                ],
                temperature = 0.3
            )
            generated_text = completion.choices[0].message.content.strip()
            return jsonify({"generated_hpi": generated_text})

        except AuthenticationError as e:
            print(f"OpenAI Authentication Error: {e}")
            return jsonify({"error": f"OpenAI Authentication Error: Please check your API key and account status. ({str(e)})"}), 500
        except RateLimitError as e:
            print(f"OpenAI Rate Limit Error: {e}")
            return jsonify({"error": f"OpenAI Rate Limit Exceeded: Please try again later or check your plan. ({str(e)})"}), 500
        except BadRequestError as e: # Often for issues with the request itself (e.g. prompt too long, bad model name)
            print(f"OpenAI Bad Request Error: {e}")
            return jsonify({"error": f"OpenAI Bad Request: {str(e)}"}), 400 # Return 400 for bad client request
        except APIError as e: # Catch other OpenAI API errors
            print(f"OpenAI API Error: {e}")
            return jsonify({"error": f"Error communicating with AI model: {str(e)}"}), 500
        except Exception as e: # Catch other unexpected errors during the API call phase
            print(f"Unexpected error during AI call: {e}")
            return jsonify({"error": "An unexpected error occurred while generating HPI."}), 500

    except Exception as e:
        print(f"Error in /generate-hpi route: {e}")
        return jsonify({"error": "An internal server error occurred in /generate-hpi"}), 500

if __name__ == '__main__':
    app.run(debug=True)