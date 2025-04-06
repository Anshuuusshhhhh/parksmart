# backend/init_db/setup_couchdb.py
import couchdb
import os
import time
from dotenv import load_dotenv

load_dotenv(dotenv_path='../.env') # Load .env from parent directory

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

NUM_LOTS_PER_LOCATION = 10
PARKING_LOCATIONS = ["lot_a", "lot_b", "lot_c"] # Corresponds to user choices

# --- Connection Function ---
def connect_to_couchdb(max_retries=3, delay=5):
    """Attempts to connect to CouchDB with retries."""
    for attempt in range(max_retries):
        try:
            print(f"Attempting to connect to CouchDB at {COUCHDB_URL}...")
            server = couchdb.Server(COUCHDB_URL)
            # Try listing databases to confirm connection
            server.version()
            print("Successfully connected to CouchDB.")
            return server
        except Exception as e:
            print(f"Connection failed (Attempt {attempt + 1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                print(f"Retrying in {delay} seconds...")
                time.sleep(delay)
            else:
                print("Max retries reached. Could not connect to CouchDB.")
                raise
    return None # Should not be reached if exception is raised

# --- Database Initialization ---
def initialize_database(server):
    """Creates databases and populates parking lot data."""
    print("Initializing databases...")

    # Create users database
    try:
        if USERS_DB_NAME not in server:
            users_db = server.create(USERS_DB_NAME)
            print(f"Database '{USERS_DB_NAME}' created.")
             # Optional: Create a design document for querying by email later
            design_doc = {
                "_id": "_design/users_view",
                "views": {
                    "by_email": {
                        "map": "function(doc) { if(doc.email) { emit(doc.email, doc); } }"
                    }
                }
            }
            users_db.save(design_doc)
            print(f"Design document 'users_view' created in '{USERS_DB_NAME}'.")
        else:
            users_db = server[USERS_DB_NAME]
            print(f"Database '{USERS_DB_NAME}' already exists.")
    except Exception as e:
        print(f"Error creating/accessing users database: {e}")
        return

    # Create parking lots database
    try:
        if PARKING_LOTS_DB_NAME not in server:
            parking_db = server.create(PARKING_LOTS_DB_NAME)
            print(f"Database '{PARKING_LOTS_DB_NAME}' created.")

            # Populate parking slots
            print("Populating parking slots...")
            slot_id_counter = 1
            for location in PARKING_LOCATIONS:
                for i in range(NUM_LOTS_PER_LOCATION):
                    slot_doc = {
                        "_id": f"{location}_slot_{slot_id_counter}", # Unique ID for each slot
                        "location_id": location,
                        "slot_number": i + 1,
                        "is_vacant": True,
                        "booked_by_user": None # Stores user email when booked
                    }
                    parking_db.save(slot_doc)
                    slot_id_counter += 1
            print(f"Populated {slot_id_counter - 1} slots across {len(PARKING_LOCATIONS)} locations.")

            # Optional: Create design doc for finding vacant slots
            design_doc_parking = {
                "_id": "_design/parking_view",
                "views": {
                    "vacant_by_location": {
                        "map": "function(doc) { if(doc.location_id && doc.is_vacant === true) { emit(doc.location_id, doc); } }"
                    },
                    "by_user": {
                         "map": "function(doc) { if(doc.booked_by_user) { emit(doc.booked_by_user, doc); } }"
                    }
                }
            }
            parking_db.save(design_doc_parking)
            print(f"Design document 'parking_view' created in '{PARKING_LOTS_DB_NAME}'.")

        else:
            parking_db = server[PARKING_LOTS_DB_NAME]
            print(f"Database '{PARKING_LOTS_DB_NAME}' already exists.")
            # You might add logic here to check if slots exist and add if missing
    except Exception as e:
        print(f"Error creating/accessing parking lots database: {e}")


# --- Main Execution ---
if __name__ == "__main__":
    couchdb_server = connect_to_couchdb()
    if couchdb_server:
        initialize_database(couchdb_server)
    else:
        print("Exiting due to CouchDB connection failure.")