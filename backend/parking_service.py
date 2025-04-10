# backend/parking_service/parking_service.py
import os
import json
import couchdb
from kafka import KafkaProducer
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from flask_cors import CORS
import time
import requests

load_dotenv()

app = Flask(__name__)
CORS(app)

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
parking_db = None

for attempt in range(MAX_RETRIES):
    try:
        print(f"Parking Service: Attempting CouchDB connection ({attempt + 1}/{MAX_RETRIES})...")
        # 1. Connect to the server
        couch_server = couchdb.Server(COUCHDB_URL)
        # Verify connection by getting server info (optional but good)
        couch_server.version()
        print("Parking Service: Connected to CouchDB server.")

        # 2. Try accessing the specific database
        if PARKING_LOTS_DB_NAME in couch_server:
            parking_db = couch_server[PARKING_LOTS_DB_NAME]
            print(f"Parking Service: Successfully accessed database '{PARKING_LOTS_DB_NAME}'.")

            break # Connection and database access successful, exit the loop
        else:
            # Server is up, but DB doesn't exist yet (init script might be running)
            print(f"Parking Service: Database '{PARKING_LOTS_DB_NAME}' not found yet.")
            # Raise an exception to trigger the retry logic below
            raise couchdb.ResourceNotFound(f"Database {PARKING_LOTS_DB_NAME} not found")

    except (requests.exceptions.ConnectionError, ConnectionRefusedError) as e:
        print(f"Parking Service: Connection Error (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Retrying in {RETRY_DELAY_SECONDS} seconds...")
            time.sleep(RETRY_DELAY_SECONDS)
        else:
            print("Parking Service: Max connection retries reached. Could not connect to CouchDB server.")
            # parking_db remains None

    except couchdb.ResourceNotFound as e:
        # Specific handling for database not found after successful server connection
        print(f"Parking Service: Error accessing database (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Database might still be initializing. Retrying in {RETRY_DELAY_SECONDS} seconds...")
            time.sleep(RETRY_DELAY_SECONDS)
        else:
            print(f"Parking Service: Max retries reached. Database '{PARKING_LOTS_DB_NAME}' not found.")
            # parking_db remains None

    except Exception as e:
        # Catch other potential errors during connection/access
        print(f"Parking Service: An unexpected error occurred during CouchDB setup (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
        if attempt < MAX_RETRIES - 1:
            print(f"Retrying in {RETRY_DELAY_SECONDS} seconds...")
            time.sleep(RETRY_DELAY_SECONDS)
        else:
            print("Parking Service: Max retries reached due to unexpected errors.")
            # parking_db remains None

# Check if connection succeeded after retries
if not parking_db:
    print("Parking Service: WARNING - Failed to connect to CouchDB database after all retries. Service might not function correctly.")
    # Depending on the service, you might want Flask to exit or keep running but log errors.
    # For now, it will continue, and endpoints will return 500 if parking_db is None.



# --- Kafka Connection ---
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'kafka:9092')
CHECKIN_TOPIC = os.getenv('CHECKIN_TOPIC',"checkin_requests")
CHECKOUT_TOPIC = os.getenv('CHECKOUT_TOPIC','checkout_requests') # Define checkout topic
kafka_producer = None

# Retry mechanism for Kafka connection
for i in range(5): # Retry 5 times
    try:
        kafka_producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKER,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks='all', # Ensure message is received by leader and replicas
            retries=3   # Retry sending message 3 times
        )
        print(f"Parking Service API: Connected to Kafka broker at {KAFKA_BROKER}")
        break # Exit loop if connection successful
    except Exception as e:
        print(f"Parking Service API: Kafka connection attempt {i+1} failed: {e}")
        if i < 4:
            time.sleep(5) # Wait before retrying
        else:
            print("Parking Service API: Could not connect to Kafka after multiple retries.")
            # Handle inability to connect (e.g., log error, disable endpoints)

# --- API Endpoints ---

@app.route('/checkin', methods=['POST'])
def request_checkin():
    if not kafka_producer:
        return jsonify({"error": "Kafka producer not available"}), 503 # Service Unavailable

    if not parking_db:
        return jsonify({"error": "Database connection failed"}), 500

    data = request.get_json()
    user_email = data.get('user_email') # Assuming frontend sends logged-in user's email
    location_id = data.get('location_id') # e.g., "lot_a", "lot_b", "lot_c"

    if not user_email or not location_id:
        return jsonify({"error": "User email and location ID are required"}), 400

    # Basic validation: Check if location_id is valid (optional but good)
    # valid_locations = ["lot_a", "lot_b", "lot_c"]
    # if location_id not in valid_locations:
    #    return jsonify({"error": "Invalid location ID"}), 400

    try:
        # --- Crucial Step: Send Check-in Request to Kafka ---
        # The actual booking logic happens in the Kafka Consumer
        message = {
            "user_email": user_email,
            "location_id": location_id,
            "timestamp": time.time() # Optional: for tracking/ordering
        }
        print(f"Sending check-in request to Kafka: {message}")
        kafka_producer.send(CHECKIN_TOPIC, value=message)
        kafka_producer.flush() # Ensure message is sent before responding

        # Respond immediately to the user - the booking is *requested*
        # The actual confirmation might come later (e.g., via WebSockets, polling, or just assuming success for now)
        return jsonify({
            "message": "Check-in request received. Processing...",
            # You could potentially return a request ID here for polling status
        }), 202 # 202 Accepted

    except Exception as e:
        print(f"Check-in request error: {e}")
        # Check for specific Kafka errors if needed
        return jsonify({"error": "Failed to send check-in request"}), 500

@app.route('/checkout', methods=['POST'])
def request_checkout():
    # Option 1: Send to Kafka topic (similar to check-in for consistency)
    if not kafka_producer:
        return jsonify({"error": "Kafka producer not available"}), 503

    data = request.get_json()
    user_email = data.get('user_email')

    if not user_email:
        return jsonify({"error": "User email is required for checkout"}), 400

    try:
        message = {"user_email": user_email, "timestamp": time.time()}
        print(f"Sending check-out request to Kafka: {message}")
        kafka_producer.send(CHECKOUT_TOPIC, value=message)
        kafka_producer.flush()
        return jsonify({"message": "Checkout request received. Processing..."}), 202

    except Exception as e:
        print(f"Check-out request error: {e}")
        return jsonify({"error": "Failed to send check-out request"}), 500

    # Option 2: Handle checkout directly here (simpler if concurrency isn't a major checkout issue)
    # if not parking_db:
    #     return jsonify({"error": "Database connection failed"}), 500
    #
    # data = request.get_json()
    # user_email = data.get('user_email')
    #
    # if not user_email:
    #     return jsonify({"error": "User email is required for checkout"}), 400
    #
    # try:
    #     # Find the slot booked by the user
    #     results = parking_db.view('parking_view/by_user', key=user_email, include_docs=True)
    #     slot_doc = None
    #     for row in results:
    #         slot_doc = row.doc
    #         break # Assuming a user can only book one slot at a time
    #
    #     if not slot_doc:
    #         return jsonify({"error": "No active booking found for this user"}), 404
    #
    #     # Make the slot vacant
    #     slot_doc['is_vacant'] = True
    #     slot_doc['booked_by_user'] = None
    #     parking_db.save(slot_doc) # Save the updated document
    #
    #     return jsonify({"message": f"Checkout successful. Slot {slot_doc['_id']} is now vacant."}), 200
    #
    # except couchdb.ResourceNotFound:
    #      return jsonify({"error": "Booking not found"}), 404
    # except Exception as e:
    #     print(f"Checkout error: {e}")
    #     return jsonify({"error": "An internal server error occurred during checkout"}), 500


# Endpoint to check booking status (optional, useful for frontend polling)
@app.route('/booking_status/<user_email>', methods=['GET'])
def get_booking_status(user_email):
    if not parking_db:
        return jsonify({"error": "Database connection failed"}), 500

    if not user_email:
        return jsonify({"error": "User email parameter is required"}), 400

    try:
        results = parking_db.view('parking_view/by_user', key=user_email, include_docs=True)
        slot_doc = None
        for row in results:
            slot_doc = row.doc
            break

        if slot_doc:
            return jsonify({
                "status": "booked",
                "location_id": slot_doc.get('location_id'),
                "slot_number": slot_doc.get('slot_number'),
                "slot_id": slot_doc.id
            }), 200
        else:
            return jsonify({"status": "not_booked"}), 404 # Or 200 with status "not_booked"

    except Exception as e:
        print(f"Booking status check error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


if __name__ == '__main__':
    port = int(os.getenv('FLASK_RUN_PORT', 5003))
    app.run(host='0.0.0.0', port=port, debug=True)