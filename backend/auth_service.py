# backend/auth_service/auth_service.py
import os
import couchdb
from flask import Flask, request, jsonify
from werkzeug.security import check_password_hash
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv() # Load .env file

app = Flask(__name__)
CORS(app) # Allow requests from any origin (adjust for production)

# --- CouchDB Connection ---
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
    print("Auth Service: Connected to CouchDB users database.")
except Exception as e:
    print(f"Auth Service: Error connecting to CouchDB: {e}")
    # In a real app, you might want to exit or have a retry mechanism
    users_db = None

# --- API Endpoints ---
@app.route('/login', methods=['POST'])
def login():
    if not users_db:
        return jsonify({"error": "Database connection failed"}), 500

    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        # Use the view to find the user by email
        results = users_db.view('users_view/by_email', key=email, include_docs=True)
        user_doc = None
        for row in results:
            user_doc = row.doc
            break # Email should be unique

        if user_doc and check_password_hash(user_doc.get('password_hash'), password):
            # Login successful
            # In a real app, generate a JWT token here and return it
            return jsonify({
                "message": "Login successful",
                "user": {"email": user_doc.get('email')} # Return non-sensitive info
            }), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    port = int(os.getenv('FLASK_RUN_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True) # debug=True for development