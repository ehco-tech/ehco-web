import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
import os

def setup_firebase():
    """Initialize Firebase with environment variables"""
    load_dotenv()
    
    try:
        config_path = os.getenv('FIREBASE_CONFIG_PATH')
        database_url = os.getenv('FIREBASE_DEFAULT_DATABASE_URL')
        
        if not config_path:
            raise ValueError("FIREBASE_CONFIG_PATH not found in environment variables")
        if not database_url:
            raise ValueError("FIREBASE_DATABASE_URL not found in environment variables")
        if not os.path.exists(config_path):
            raise FileNotFoundError(f"Service account key not found at: {config_path}")
        
        try:
            cred = credentials.Certificate(config_path)
            firebase_admin.initialize_app(cred, {
                'databaseURL': database_url
            })
            print("✓ Firebase initialized successfully")
        except ValueError as e:
            if "The default Firebase app already exists" in str(e):
                print("✓ Using existing Firebase app")
            else:
                raise e
        
        db = firestore.client()
        print("✓ Firestore client connected successfully")
        return db
        
    except Exception as e:
        print(f"Failed to initialize Firebase: {e}")
        raise

def copy_subcollection(source_ref, dest_ref, subcollection_name):
    """Recursively copy a subcollection from source to destination"""
    print(f"  - Copying subcollection: {subcollection_name}")
    
    source_subcol = source_ref.collection(subcollection_name)
    dest_subcol = dest_ref.collection(subcollection_name)
    
    docs = source_subcol.stream()
    doc_count = 0
    
    for doc in docs:
        doc_data = doc.to_dict()
        # Copy the document to the new location
        dest_subcol.document(doc.id).set(doc_data)
        doc_count += 1
        
        # Check if this document has any subcollections
        subcollections = doc.reference.collections()
        for subcol in subcollections:
            copy_subcollection(doc.reference, dest_subcol.document(doc.id), subcol.id)
    
    print(f"    ✓ Copied {doc_count} documents from {subcollection_name}")

def copy_figure_document(db, source_id="imsiwan", dest_id="yimsiwan"):
    """Copy a figure document with all its fields and subcollections"""
    print(f"\n--- Starting copy from '{source_id}' to '{dest_id}' ---\n")
    
    try:
        # Get reference to the collections
        figures_ref = db.collection('selected-figures')
        
        # Get the source document
        source_doc_ref = figures_ref.document(source_id)
        source_doc = source_doc_ref.get()
        
        if not source_doc.exists:
            print(f"❌ Error: Source document '{source_id}' does not exist!")
            return False
        
        # Check if destination already exists
        dest_doc_ref = figures_ref.document(dest_id)
        dest_doc = dest_doc_ref.get()
        
        if dest_doc.exists:
            print(f"⚠️  Warning: Destination document '{dest_id}' already exists!")
            response = input("Do you want to overwrite it? (yes/no): ")
            if response.lower() != 'yes':
                print("Operation cancelled.")
                return False
        
        # Copy the main document fields
        print(f"1. Copying main document fields...")
        source_data = source_doc.to_dict()
        dest_doc_ref.set(source_data)
        print(f"   ✓ Copied {len(source_data)} fields")
        
        # Get all subcollections from the source document
        print(f"\n2. Copying subcollections...")
        subcollections = source_doc_ref.collections()
        
        for subcol in subcollections:
            copy_subcollection(source_doc_ref, dest_doc_ref, subcol.id)
        
        print(f"\n✅ Successfully copied all data from '{source_id}' to '{dest_id}'!")
        print(f"\nNote: The original '{source_id}' document still exists.")
        print(f"If you want to delete it, you can do so manually or run a separate deletion script.")
        
        return True
        
    except Exception as e:
        print(f"\n❌ An error occurred during the copy operation: {e}")
        raise

def main():
    """Main function to run the copy operation"""
    db = setup_firebase()
    
    # You can change these IDs if needed
    source_id = "xianjun"
    dest_id = "xiaojun"
    
    success = copy_figure_document(db, source_id, dest_id)
    
    if success:
        print("\n" + "="*60)
        print("COPY OPERATION COMPLETED SUCCESSFULLY")
        print("="*60)
        print(f"\nOld document ID: {source_id}")
        print(f"New document ID: {dest_id}")
        print("\nNext steps:")
        print(f"1. Verify the data in '{dest_id}' is correct")
        print(f"2. Update any references to '{source_id}' in your application")
        print(f"3. Optionally delete '{source_id}' once you're sure everything works")

if __name__ == "__main__":
    main()