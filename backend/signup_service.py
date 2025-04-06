# backend/signup_service/signup_service.py
import os
import couchdb
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Configuration ---
COUCHDB_USER = os.getenv('COUCHDB_USER', 'admin')
COUCHDB_PASSWORD = os.getenv('COUCHDB_PASSWORD', 'password')
COUCHDB_PROTO = os.getenv('COUCHDB_PROTO', 'http')
COUCHDB_HOST = os.getenv('COUCHDB_HOST', 'localhost') # Use localhost if running script directly
COUCHDB_PORT = os.getenv('COUCHDB_PORT', '5984')
USERS_DB_NAME = os.getenv('USERS_DB_NAME','users')
PARKING_LOTS_DB_NAME = os.getenv('PARKING_LOTS_DB_NAME','parking_lots')

# COUCHDB_URL = f"{COUCHDB_PROTO}://{COUCHDB_USER}:{COUCHDB_PASSWORD}@{COUCHDB_HOST}:{COUCHDB_PORT}/"

COUCHDB_URL = "http://admin:password@localhost:5984/"
try:
    couch = couchdb.Server(COUCHDB_URL)
    users_db = couch[USERS_DB_NAME]
    print("Signup Service: Connected to CouchDB users database.")
except Exception as e:
    print(f"Signup Service: Error connecting to CouchDB: {e}")
    users_db = None

# --- API Endpoints ---
@app.route('/signup', methods=['POST'])
def signup():
    if not users_db:
        return jsonify({"error": "Database connection failed"}), 500

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Basic validation (add more as needed)
    if "@" not in email:
         return jsonify({"error": "Invalid email format"}), 400
    if len(password) < 6:
         return jsonify({"error": "Password must be at least 6 characters"}), 400

    try:
        # Check if user already exists using the view
        results = users_db.view('users_view/by_email', key=email)
        if len(results) > 0:
            return jsonify({"error": "Email already registered"}), 409 # 409 Conflict

        # Hash the password
        password_hash = generate_password_hash(password)

        # Create user document
        user_doc = {
            "email": email,
            "password_hash": password_hash,
            # Add other user fields if needed (e.g., name, signup_date)
            "type": "user" # Good practice for distinguishing document types
        }
        # Let CouchDB generate the _id
        doc_id, doc_rev = users_db.save(user_doc)

        return jsonify({
            "message": "Signup successful",
            "user_id": doc_id # You might not expose CouchDB IDs directly
        }), 201 # 201 Created

    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_RUN_PORT', 5002))
    app.run(host='0.0.0.0', port=port, debug=True)