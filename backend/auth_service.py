# backend/auth_service/auth_service.py
import os
import couchdb
from flask import Flask, request, jsonify
import requests
from werkzeug.security import check_password_hash
from dotenv import load_dotenv
from flask_cors import CORS
import time
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

COUCHDB_URL = "http://admin:password@couchdb:5984/"
# Retry parameters
MAX_RETRIES = 5 # Increase from 3 for more tolerance during startup
RETRY_DELAY_SECONDS = 3 # Wait time between retries

couch_server = None
users_db = None

for attempt in range(MAX_RETRIES):
    try:
        print(f"Auth Service: Attempting CouchDB connection ({attempt + 1}/{MAX_RETRIES})...")
        # 1. Connect to the server
        couch_server = couchdb.Server(COUCHDB_URL)
        # Verify connection by getting server info (optional but good)
        couch_server.version()
        print("Auth Service: Connected to CouchDB server.")

        # 2. Try accessing the specific database
        if USERS_DB_NAME in couch_server:
            users_db = couch_server[USERS_DB_NAME]
            print(f"Auth Service: Successfully accessed database '{USERS_DB_NAME}'.")
            # Ensure the design doc is ready (optional but safer)
            # You might need a small delay or check if the view exists
            # time.sleep(1) # Small delay for view creation (less ideal)
            # A better way is to try using the view and handle errors later if needed
            break # Connection and database access successful, exit the loop
        else:
            # Server is up, but DB doesn't exist yet (init script might be running)
            print(f"Auth Service: Database '{USERS_DB_NAME}' not found yet.")
            # Raise an exception to trigger the retry logic below
            raise couchdb.ResourceNotFound(f"Database {USERS_DB_NAME} not found")

    except (requests.exceptions.ConnectionError, ConnectionRefusedError) as e:
        print(f"Auth Service: Connection Error (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Retrying in {RETRY_DELAY_SECONDS} seconds...")
            time.sleep(RETRY_DELAY_SECONDS)
        else:
            print("Auth Service: Max connection retries reached. Could not connect to CouchDB server.")
            # users_db remains None

    except couchdb.ResourceNotFound as e:
        # Specific handling for database not found after successful server connection
        print(f"Auth Service: Error accessing database (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Database might still be initializing. Retrying in {RETRY_DELAY_SECONDS} seconds...")
            time.sleep(RETRY_DELAY_SECONDS)
        else:
            print(f"Auth Service: Max retries reached. Database '{USERS_DB_NAME}' not found.")
            # users_db remains None

    except Exception as e:
        # Catch other potential errors during connection/access
        print(f"Auth Service: An unexpected error occurred during CouchDB setup (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Retrying in {RETRY_DELAY_SECONDS} seconds...")
            time.sleep(RETRY_DELAY_SECONDS)
        else:
            print("Auth Service: Max retries reached due to unexpected errors.")
            # users_db remains None

# Check if connection succeeded after retries
if not users_db:
    print("Auth Service: WARNING - Failed to connect to CouchDB database after all retries. Service might not function correctly.")
    # Depending on the service, you might want Flask to exit or keep running but log errors.
    # For now, it will continue, and endpoints will return 500 if users_db is None.


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