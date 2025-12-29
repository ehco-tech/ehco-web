"""
Script to aggregate all public figures from 'selected-figures' collection
into a single document in 'all-figures-data' collection for faster API responses.

This eliminates the need to fetch 300+ individual documents and reduces
load time from 10-20 seconds to under 1 second.

Usage:
    python aggregate_figures.py
"""

import sys
from datetime import datetime
from setup_firebase_deepseek import news_manager

# Get the Firestore database instance
db = news_manager.db

def transform_figure_data(doc_id, data):
    """
    Transform a figure document into the minimal format needed for the API.
    Only includes fields necessary for the all-figures page.
    """
    # Parse occupation array - split combined occupations
    occupations = []
    if data.get('occupation') and isinstance(data['occupation'], list):
        for occ in data['occupation']:
            # Split by " / " and trim each part
            split_occs = [part.strip() for part in occ.split(' / ')]
            occupations.extend(split_occs)

    # For groups, determine nationality from members
    nationality = data.get('nationality', '')
    if data.get('is_group') and data.get('members') and isinstance(data['members'], list):
        member_nationalities = [
            member.get('nationality')
            for member in data['members']
            if member.get('nationality')
        ]

        if member_nationalities:
            unique_nationalities = list(set(member_nationalities))
            if len(unique_nationalities) == 1:
                nationality = unique_nationalities[0]
            else:
                nationality = 'Mixed'

    # Build the base figure object with only necessary fields
    figure = {
        'id': doc_id,
        'name': data.get('name', ''),
        'name_kr': data.get('name_kr', ''),
        'gender': data.get('gender', ''),
        'nationality': nationality,
        'occupation': occupations,
        'profilePic': data.get('profilePic', ''),
        'company': data.get('company', ''),
        'debutDate': data.get('debutDate', ''),
        'lastUpdated': data.get('lastUpdated', ''),
        'is_group': data.get('is_group', False),
    }

    # Add type-specific fields
    if data.get('is_group'):
        figure['members'] = data.get('members', [])
    else:
        figure['birthDate'] = data.get('birthDate', '')
        figure['group'] = data.get('group', '')

    return figure


def aggregate_all_figures():
    """
    Fetch all figures from 'selected-figures' collection and store them
    in a single document in 'all-figures-data' collection.
    """
    print("Starting aggregation of public figures...")
    print("-" * 60)

    try:
        # Fetch all documents from selected-figures collection
        print("Fetching all documents from 'selected-figures' collection...")
        figures_ref = db.collection('selected-figures')
        docs = figures_ref.order_by('name').stream()

        # Transform all documents
        all_figures = []
        count = 0

        for doc in docs:
            count += 1
            figure_data = transform_figure_data(doc.id, doc.to_dict())
            all_figures.append(figure_data)

            if count % 50 == 0:
                print(f"  Processed {count} figures...")

        print(f"\n✓ Successfully processed {count} figures")

        # Calculate data size
        import json
        data_size = len(json.dumps(all_figures))
        print(f"  Total data size: {data_size:,} bytes ({data_size / 1024:.2f} KB)")

        if data_size > 1_000_000:  # 1MB Firestore limit
            print("\n⚠ WARNING: Data exceeds 1MB Firestore document limit!")
            print("  You may need to split this into multiple documents.")
            return

        # Store in new collection
        print("\nStoring aggregated data in 'all-figures-data' collection...")

        aggregated_data = {
            'figures': all_figures,
            'totalCount': len(all_figures),
            'lastUpdated': datetime.utcnow().isoformat(),
            'version': 1,
        }

        # Write to Firestore
        all_figures_ref = db.collection('all-figures-data').document('figures-list')
        all_figures_ref.set(aggregated_data)

        print("✓ Successfully stored aggregated data!")
        print(f"  Collection: all-figures-data")
        print(f"  Document: figures-list")
        print(f"  Total figures: {len(all_figures)}")
        print(f"  Data size: {data_size / 1024:.2f} KB")

        print("\n" + "=" * 60)
        print("SUCCESS! Aggregation complete.")
        print("=" * 60)
        print("\nNext steps:")
        print("1. Update your API route to fetch from 'all-figures-data/figures-list'")
        print("2. Test the new API endpoint")
        print("3. Set up a cron job or trigger to re-run this script when figures are updated")

    except Exception as e:
        print(f"\n✗ ERROR during aggregation: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    aggregate_all_figures()
