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

def replace_in_value(value, old_name, new_name):
    """Recursively replace old_name with new_name in a value"""
    if isinstance(value, str):
        return value.replace(old_name, new_name)
    elif isinstance(value, list):
        return [replace_in_value(item, old_name, new_name) for item in value]
    elif isinstance(value, dict):
        return {key: replace_in_value(val, old_name, new_name) for key, val in value.items()}
    else:
        return value

def update_document_fields(doc_ref, old_name, new_name, dry_run=False):
    """Update all string fields in a document that contain the old name"""
    doc = doc_ref.get()
    if not doc.exists:
        return 0, 0
    
    data = doc.to_dict()
    updated_data = {}
    changes_made = 0
    
    for field, value in data.items():
        new_value = replace_in_value(value, old_name, new_name)
        
        # Check if anything actually changed
        if new_value != value:
            updated_data[field] = new_value
            changes_made += 1
    
    # Update the document if there are changes
    if updated_data and not dry_run:
        doc_ref.update(updated_data)
        return 1, changes_made
    elif updated_data and dry_run:
        print(f"      [DRY RUN] Would update {changes_made} field(s) in document {doc.id}")
        return 1, changes_made
    
    return 0, 0

def process_subcollection(parent_ref, subcol_name, old_name, new_name, dry_run=False, indent=2):
    """Recursively process a subcollection and update all documents"""
    indent_str = "  " * indent
    print(f"{indent_str}- Processing subcollection: {subcol_name}")
    
    subcol_ref = parent_ref.collection(subcol_name)
    docs = subcol_ref.stream()
    
    total_docs = 0
    total_updated = 0
    total_changes = 0
    
    for doc in docs:
        total_docs += 1
        
        # Update this document
        docs_updated, changes = update_document_fields(doc.reference, old_name, new_name, dry_run)
        total_updated += docs_updated
        total_changes += changes
        
        if changes > 0:
            print(f"{indent_str}  ✓ Updated document '{doc.id}' ({changes} field(s) changed)")
        
        # Check for nested subcollections
        nested_subcols = doc.reference.collections()
        for nested_subcol in nested_subcols:
            nested_updated, nested_changes = process_subcollection(
                doc.reference, 
                nested_subcol.id, 
                old_name, 
                new_name, 
                dry_run, 
                indent + 1
            )
            total_updated += nested_updated
            total_changes += nested_changes
    
    print(f"{indent_str}  → Processed {total_docs} documents, updated {total_updated} documents, {total_changes} total field changes")
    return total_updated, total_changes

def update_name_in_figure(db, figure_id="yimsiwan", old_name="Im Si-wan", new_name="Yim Si-wan", dry_run=True):
    """Update all instances of old_name to new_name in a figure's subcollections"""
    print(f"\n{'='*70}")
    print(f"{'DRY RUN MODE' if dry_run else 'LIVE UPDATE MODE'}")
    print(f"{'='*70}")
    print(f"Figure ID: {figure_id}")
    print(f"Replacing: '{old_name}' → '{new_name}'")
    print(f"{'='*70}\n")
    
    try:
        # Get the figure document
        figure_ref = db.collection('selected-figures').document(figure_id)
        figure_doc = figure_ref.get()
        
        if not figure_doc.exists:
            print(f"❌ Error: Document '{figure_id}' does not exist!")
            return False
        
        # Update the main document fields
        print("1. Checking main document fields...")
        main_updated, main_changes = update_document_fields(figure_ref, old_name, new_name, dry_run)
        if main_changes > 0:
            print(f"   ✓ Updated main document ({main_changes} field(s) changed)")
        else:
            print(f"   → No changes needed in main document")
        
        # Process all subcollections
        print("\n2. Processing subcollections...")
        subcollections = figure_ref.collections()
        
        total_docs_updated = main_updated
        total_field_changes = main_changes
        
        for subcol in subcollections:
            docs_updated, changes = process_subcollection(figure_ref, subcol.id, old_name, new_name, dry_run)
            total_docs_updated += docs_updated
            total_field_changes += changes
        
        print(f"\n{'='*70}")
        print(f"SUMMARY")
        print(f"{'='*70}")
        print(f"Total documents updated: {total_docs_updated}")
        print(f"Total field changes: {total_field_changes}")
        
        if dry_run:
            print(f"\n⚠️  THIS WAS A DRY RUN - No actual changes were made")
            print(f"Run with dry_run=False to apply changes")
        else:
            print(f"\n✅ All changes have been applied successfully!")
        
        return True
        
    except Exception as e:
        print(f"\n❌ An error occurred: {e}")
        raise

def main():
    """Main function"""
    db = setup_firebase()
    
    # Configuration
    figure_id = "yimsiwan"
    old_name = "Im Si-wan"
    new_name = "Yim Si-wan"
    
    print("\n" + "="*70)
    print("NAME UPDATE SCRIPT")
    print("="*70)
    
    # First, run in dry-run mode to preview changes
    print("\nStep 1: Running DRY RUN to preview changes...\n")
    update_name_in_figure(db, figure_id, old_name, new_name, dry_run=True)
    
    # Ask for confirmation
    print("\n" + "="*70)
    response = input("\nDo you want to apply these changes? (yes/no): ")
    
    if response.lower() == 'yes':
        print("\nStep 2: Applying changes...\n")
        update_name_in_figure(db, figure_id, old_name, new_name, dry_run=False)
        print("\n✅ Update complete!")
    else:
        print("\n❌ Operation cancelled. No changes were made.")

if __name__ == "__main__":
    main()