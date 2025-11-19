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

def delete_subcollection(doc_ref, subcol_name, batch_size=100):
    """Delete all documents in a subcollection"""
    subcol_ref = doc_ref.collection(subcol_name)
    docs = subcol_ref.limit(batch_size).stream()
    deleted = 0
    
    for doc in docs:
        # First, recursively delete any nested subcollections
        nested_subcols = doc.reference.collections()
        for nested_subcol in nested_subcols:
            nested_deleted = delete_subcollection(doc.reference, nested_subcol.id, batch_size)
            deleted += nested_deleted
        
        # Then delete the document itself
        doc.reference.delete()
        deleted += 1
    
    if deleted >= batch_size:
        # If we deleted a full batch, there might be more documents
        return deleted + delete_subcollection(doc_ref, subcol_name, batch_size)
    
    return deleted

def delete_figure_document(db, figure_id, dry_run=True):
    """Delete a figure document and all its subcollections"""
    print(f"\n{'='*70}")
    print(f"{'DRY RUN MODE - NO DELETION WILL OCCUR' if dry_run else 'LIVE DELETION MODE'}")
    print(f"{'='*70}")
    print(f"Target document: {figure_id}")
    print(f"{'='*70}\n")
    
    try:
        # Get the figure document reference
        figure_ref = db.collection('selected-figures').document(figure_id)
        figure_doc = figure_ref.get()
        
        if not figure_doc.exists:
            print(f"❌ Error: Document '{figure_id}' does not exist!")
            return False
        
        # Get all subcollections
        subcollections = list(figure_ref.collections())
        
        print(f"Found document '{figure_id}' with {len(subcollections)} subcollection(s):")
        for subcol in subcollections:
            print(f"  - {subcol.id}")
        
        if dry_run:
            print(f"\n⚠️  DRY RUN MODE - Counting documents but not deleting...")
            
            total_docs = 0
            for subcol in subcollections:
                # Count documents in this subcollection
                docs = list(subcol.stream())
                doc_count = len(docs)
                total_docs += doc_count
                print(f"  - {subcol.id}: {doc_count} document(s)")
                
                # Check for nested subcollections
                for doc in docs:
                    nested_subcols = list(doc.reference.collections())
                    if nested_subcols:
                        print(f"    - Document '{doc.id}' has {len(nested_subcols)} nested subcollection(s)")
            
            print(f"\n{'='*70}")
            print(f"SUMMARY (DRY RUN)")
            print(f"{'='*70}")
            print(f"Main document: 1")
            print(f"Documents in subcollections: {total_docs}")
            print(f"Total to be deleted: {total_docs + 1}")
            print(f"\n⚠️  No actual deletion occurred - this was a preview")
            
        else:
            print(f"\n🗑️  Starting deletion process...")
            
            total_deleted = 0
            
            # Delete all subcollections first
            for subcol in subcollections:
                print(f"\n  Deleting subcollection: {subcol.id}")
                deleted = delete_subcollection(figure_ref, subcol.id)
                total_deleted += deleted
                print(f"    ✓ Deleted {deleted} document(s)")
            
            # Finally, delete the main document
            print(f"\n  Deleting main document: {figure_id}")
            figure_ref.delete()
            total_deleted += 1
            
            print(f"\n{'='*70}")
            print(f"DELETION COMPLETE")
            print(f"{'='*70}")
            print(f"Total documents deleted: {total_deleted}")
            print(f"✅ Document '{figure_id}' and all its subcollections have been deleted")
        
        return True
        
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        raise

def main():
    """Main function"""
    db = setup_firebase()
    
    figure_id = "xianjun"
    
    print("\n" + "="*70)
    print("FIGURE DOCUMENT DELETION SCRIPT")
    print("="*70)
    print(f"\n⚠️  WARNING: This will permanently delete the '{figure_id}' document")
    print("and ALL of its subcollections and nested data.")
    print("This action CANNOT be undone!\n")
    
    # First, run in dry-run mode to show what will be deleted
    print("Step 1: Running DRY RUN to preview deletion...\n")
    delete_figure_document(db, figure_id, dry_run=True)
    
    # Ask for confirmation
    print("\n" + "="*70)
    print("⚠️  FINAL CONFIRMATION")
    print("="*70)
    print(f"You are about to PERMANENTLY DELETE the document '{figure_id}'")
    print("and all its subcollections.")
    print("\nThis action cannot be undone!")
    
    response = input("\nType 'DELETE' (in all caps) to confirm deletion: ")
    
    if response == 'DELETE':
        print("\n" + "="*70)
        response2 = input("Are you absolutely sure? Type 'yes' to proceed: ")
        
        if response2.lower() == 'yes':
            print("\nStep 2: Proceeding with deletion...\n")
            delete_figure_document(db, figure_id, dry_run=False)
            print("\n✅ Deletion complete!")
        else:
            print("\n❌ Operation cancelled. No changes were made.")
    else:
        print("\n❌ Operation cancelled. No changes were made.")

if __name__ == "__main__":
    main()