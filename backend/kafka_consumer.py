# backend/parking_service/kafka_consumer.py
import os
import json
import time
import couchdb
from kafka import KafkaConsumer, KafkaProducer # Also need producer if sending confirmation/error events
from dotenv import load_dotenv

load_dotenv()

# --- CouchDB Connection ---
COUCHDB_USER = os.getenv('COUCHDB_USER')
COUCHDB_PASSWORD = os.getenv('COUCHDB_PASSWORD')
COUCHDB_PROTO = os.getenv('COUCHDB_PROTO', 'http')
COUCHDB_HOST = os.getenv('COUCHDB_HOST', 'localhost')
COUCHDB_PORT = os.getenv('COUCHDB_PORT', '5984')
PARKING_LOTS_DB_NAME = os.getenv('PARKING_LOTS_DB_NAME')
COUCHDB_URL = f"{COUCHDB_PROTO}://{COUCHDB_USER}:{COUCHDB_PASSWORD}@{COUCHDB_HOST}:{COUCHDB_PORT}/"

# --- Kafka Connection ---
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')
CHECKIN_TOPIC = os.getenv('CHECKIN_TOPIC')
CHECKOUT_TOPIC = os.getenv('CHECKOUT_TOPIC')
CONSUMER_GROUP_ID = 'parking-service-group' # Consumer group ID

# Retry database connection
parking_db = None
for i in range(10): # More retries for essential service
    try:
        couch_server = couchdb.Server(COUCHDB_URL)
        parking_db = couch_server[PARKING_LOTS_DB_NAME]
        print(f"Kafka Consumer: Connected to CouchDB database '{PARKING_LOTS_DB_NAME}'.")
        break
    except Exception as e:
        print(f"Kafka Consumer: CouchDB connection attempt {i+1} failed: {e}")
        if i < 9:
            time.sleep(5)
        else:
            print("Kafka Consumer: Could not connect to CouchDB after multiple retries. Exiting.")
            exit(1) # Exit if DB connection fails persistently

# Function to connect Kafka Consumer with retries
def create_kafka_consumer(topic, group_id):
    consumer = None
    for i in range(10):
        try:
            consumer = KafkaConsumer(
                topic,
                bootstrap_servers=KAFKA_BROKER,
                group_id=group_id,
                value_deserializer=lambda v: json.loads(v.decode('utf-8')),
                auto_offset_reset='earliest', # Start reading from the beginning if no offset found
                enable_auto_commit=False # Disable auto commit for manual control
            )
            print(f"Kafka Consumer: Successfully connected to Kafka for topic '{topic}'.")
            return consumer
        except Exception as e:
            print(f"Kafka Consumer: Kafka connection attempt {i+1} failed for topic '{topic}': {e}")
            if i < 9:
                time.sleep(5)
            else:
                print(f"Kafka Consumer: Could not connect to Kafka for topic '{topic}' after multiple retries.")
                return None

# --- Core Logic ---
def process_checkin_message(message_data):
    """Handles a single check-in request."""
    if not parking_db:
        print("Error: parking_db not initialized.")
        return # Or raise an exception / requeue logic

    user_email = message_data.get('user_email')
    location_id = message_data.get('location_id')
    print(f"Processing check-in for user '{user_email}' at location '{location_id}'")

    try:
        # 1. Find the first available slot for the location
        # Use the CouchDB view 'vacant_by_location'
        view_result = parking_db.view(
            'parking_view/vacant_by_location',
            key=location_id,
            limit=1, # We only need one
            include_docs=True
        )

        vacant_slot_doc = None
        for row in view_result:
            vacant_slot_doc = row.doc
            break # Found one

        if vacant_slot_doc:
            slot_id = vacant_slot_doc.id
            print(f"Found vacant slot: {slot_id}")

            # 2. Attempt to book the slot (Atomic Update - Best Effort with CouchDB revisions)
            try:
                # Re-fetch the document just before update to get latest _rev
                # This helps prevent update conflicts, though not perfectly atomic across processes
                current_doc = parking_db.get(slot_id)
                if current_doc and current_doc.get('is_vacant'):
                    current_doc['is_vacant'] = False
                    current_doc['booked_by_user'] = user_email
                    parking_db.save(current_doc) # This might fail if another process updated it first
                    print(f"Successfully booked slot {slot_id} for user {user_email}")
                    # Optional: Send confirmation event back to Kafka/WebSocket etc.
                else:
                    # Slot was taken between view query and update attempt OR doc deleted
                    print(f"Slot {slot_id} was no longer vacant or found when trying to book.")
                    # This request effectively fails for this slot. Kafka will deliver the next message.
                    # For higher guarantees, you might implement retry logic or dead-letter queues.
            except couchdb.http.ResourceConflict:
                # This means another consumer/process updated the document (_rev mismatch)
                print(f"Conflict updating slot {slot_id}. Another process likely booked it.")
                # Treat as booking failure for this attempt. The user might need to retry.
            except Exception as update_e:
                print(f"Error updating slot {slot_id} in CouchDB: {update_e}")
                # Handle database update error (e.g., log, potentially retry later?)

        else:
            print(f"No vacant slots found for location '{location_id}' for user '{user_email}'.")
            # Optional: Send a "booking failed - no slots" event

    except Exception as e:
        print(f"Error processing check-in message {message_data}: {e}")
        # Log the error, decide if the message should be retried or skipped


def process_checkout_message(message_data):
    """Handles a single check-out request."""
    if not parking_db:
        print("Error: parking_db not initialized.")
        return

    user_email = message_data.get('user_email')
    print(f"Processing check-out for user '{user_email}'")

    try:
        # Find the slot booked by the user
        results = parking_db.view('parking_view/by_user', key=user_email, include_docs=True)
        slot_doc = None
        for row in results:
            slot_doc = row.doc
            break # Assuming one booking per user

        if not slot_doc:
            print(f"No active booking found for user '{user_email}' during checkout processing.")
            # Log this? Maybe the booking was already checked out or never completed.
            return # Nothing to do

        slot_id = slot_doc.id
        # Make the slot vacant
        # Fetch latest revision first to reduce conflict chance (though less critical than check-in)
        try:
            current_doc = parking_db.get(slot_id)
            # Check if it's still booked by the *same* user before making vacant
            if current_doc and current_doc.get('booked_by_user') == user_email:
                 current_doc['is_vacant'] = True
                 current_doc['booked_by_user'] = None
                 parking_db.save(current_doc)
                 print(f"Successfully checked out slot {slot_id} for user {user_email}.")
            elif current_doc:
                 print(f"Slot {slot_id} found but not booked by {user_email} (currently: {current_doc.get('booked_by_user')}). No action taken.")
            else:
                 print(f"Slot {slot_id} not found during checkout save attempt.")

        except couchdb.http.ResourceConflict:
             print(f"Conflict updating slot {slot_id} during checkout. Retrying might be needed or indicates concurrent modification.")
             # Implement retry or specific handling if needed
        except Exception as update_e:
             print(f"Error updating slot {slot_id} during checkout: {update_e}")


    except Exception as e:
        print(f"Error processing check-out message {message_data}: {e}")
        # Log error

def consume_messages():
    """Creates consumers and runs the consumption loop."""
    checkin_consumer = create_kafka_consumer(CHECKIN_TOPIC, f"{CONSUMER_GROUP_ID}-checkin")
    checkout_consumer = create_kafka_consumer(CHECKOUT_TOPIC, f"{CONSUMER_GROUP_ID}-checkout")

    if not checkin_consumer and not checkout_consumer:
        print("Kafka Consumer: Failed to create any consumers. Exiting.")
        exit(1)

    print("Kafka Consumer: Starting message consumption loop...")
    while True: # Keep running indefinitely
        try:
            # Poll both consumers (adjust timeout as needed)
            # Using a simple alternating poll here. For high throughput, consider asyncio or threading.
            if checkin_consumer:
                checkin_msgs = checkin_consumer.poll(timeout_ms=100, max_records=5) # Poll for check-in messages
                if checkin_msgs:
                    for topic_partition, messages in checkin_msgs.items():
                        for message in messages:
                            print(f"\nReceived Check-in Message: Partition={message.partition}, Offset={message.offset}")
                            process_checkin_message(message.value)
                            checkin_consumer.commit() # Commit offset after successful processing
                            print("Committed check-in offset.")

            if checkout_consumer:
                checkout_msgs = checkout_consumer.poll(timeout_ms=100, max_records=5) # Poll for check-out messages
                if checkout_msgs:
                     for topic_partition, messages in checkout_msgs.items():
                        for message in messages:
                            print(f"\nReceived Check-out Message: Partition={message.partition}, Offset={message.offset}")
                            process_checkout_message(message.value)
                            checkout_consumer.commit() # Commit offset
                            print("Committed check-out offset.")

            # Optional: Add a small sleep if no messages are received to prevent busy-waiting
            if not checkin_msgs and not checkout_msgs:
                time.sleep(0.5)

        except KeyboardInterrupt:
            print("Kafka Consumer: KeyboardInterrupt received. Shutting down.")
            break
        except Exception as e:
            print(f"Kafka Consumer: An error occurred in the main loop: {e}")
            # Consider more robust error handling, maybe recreate consumer?
            time.sleep(5) # Wait before retrying loop

    # Close consumers on exit
    if checkin_consumer:
        checkin_consumer.close()
        print("Kafka check-in consumer closed.")
    if checkout_consumer:
        checkout_consumer.close()
        print("Kafka check-out consumer closed.")


if __name__ == "__main__":
    if parking_db: # Only start consuming if DB connection was successful
        consume_messages()
    else:
        print("Kafka Consumer: Exiting because database connection failed during startup.")