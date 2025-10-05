#!/usr/bin/env python3
"""
Script to import player data from Excel/CSV file to MongoDB.

This script reads player data from an Excel or CSV file and imports it into
the MongoDB database for the WalleFantasy application.

Usage:
    python import-players-from-excel.py <file_path>

Example:
    python import-players-from-excel.py players_data.xlsx
    python import-players-from-excel.py players_data.csv
"""

import sys
import os
from pathlib import Path
import pandas as pd
from pymongo import MongoClient
from datetime import datetime
import re

# Add the backend directory to the path to import settings
backend_path = Path(__file__).resolve().parent.parent / "apps" / "backend"
sys.path.insert(0, str(backend_path))

from config.settings import settings


def clean_player_name(name):
    """Clean and normalize player name."""
    if pd.isna(name):
        return None
    return str(name).strip()


def clean_team_name(name):
    """Clean and normalize team name."""
    if pd.isna(name):
        return None
    return str(name).strip()


def parse_price(price):
    """Parse and validate price/credits value."""
    if pd.isna(price):
        return None
    try:
        return float(price)
    except (ValueError, TypeError):
        return None


def determine_slot(slots_value, current_slot):
    """
    Determine player slot based on Slots column or current slot tracking.
    
    The Slots column marks the beginning of each slot category.
    Players belong to the slot marked above them until a new slot marker appears.
    """
    if pd.isna(slots_value) or str(slots_value).strip() == '':
        # No slot marker, use current slot
        return current_slot
    
    # Extract slot number from strings like "SLOT 1 (Select Any 4)" or "Slot 2 (Select Any 4)"
    slots_str = str(slots_value).upper()
    if 'SLOT 1' in slots_str:
        return 1
    elif 'SLOT 2' in slots_str:
        return 2
    elif 'SLOT 3' in slots_str:
        return 3
    elif 'SLOT 4' in slots_str:
        return 4
    
    return current_slot





def read_data_file(file_path):
    """
    Read player data from Excel or CSV file.
    
    Expected columns:
    - Team: Team Name
    - Name: Player Name
    - Points: Credits/Price
    - Mobile: Slot info (optional)
    """
    print(f"📖 Reading file: {file_path}")
    
    try:
        # Determine file type and read accordingly
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == '.csv':
            # Read CSV file
            df = pd.read_csv(file_path)
            print("✅ Detected CSV file format")
        elif file_ext in ['.xlsx', '.xls']:
            # Read Excel file
            df = pd.read_excel(file_path)
            print("✅ Detected Excel file format")
        else:
            print(f"❌ Error: Unsupported file format: {file_ext}")
            print("   Supported formats: .csv, .xlsx, .xls")
            return None
        
        # Remove empty rows
        df = df.dropna(how='all')
        
        # Display first few rows for verification
        print("\n📊 First 5 rows of data:")
        print(df.head())
        
        # Get column names
        columns = df.columns.tolist()
        print(f"\n📋 Columns found: {columns}")
        
        # Check for required columns (flexible matching)
        required_cols = ['Team', 'Name', 'Points']
        missing_cols = [col for col in required_cols if col not in columns]
        
        if missing_cols:
            print(f"❌ Error: Missing required columns: {missing_cols}")
            print(f"   Required: {required_cols}")
            print(f"   Found: {columns}")
            return None
        
        return df
    
    except FileNotFoundError:
        print(f"❌ Error: File not found: {file_path}")
        return None
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return None


def transform_data(df):
    """Transform CSV/Excel data into MongoDB player documents."""
    print("\n🔄 Transforming data...")
    
    players = []
    
    # Column names from your CSV
    team_col = 'Team'
    player_col = 'Name'
    points_col = 'Points'
    slots_col = 'Slots' if 'Slots' in df.columns else 'Mobile'  # Handle both column names
    
    current_slot = 1  # Track current slot as we iterate through players
    
    for index, row in df.iterrows():
        team_name = clean_team_name(row[team_col])
        player_name = clean_player_name(row[player_col])
        base_points = parse_price(row[points_col])  # Using parse_price function but for points
        
        # Determine slot
        if slots_col in row:
            current_slot = determine_slot(row[slots_col], current_slot)
        
        # Skip rows with missing essential data
        if not team_name or not player_name or base_points is None:
            print(f"⚠️  Skipping row {index + 2}: Missing data (Team: {team_name}, Name: {player_name}, Points: {base_points})")
            continue
        
        # Create player document (no role since it's not in the CSV)
        player = {
            "name": player_name,
            "team": team_name,
            "role": "User",  # Default role since not specified in CSV
            "price": base_points,  # Keep points as-is (e.g., 1000, 10000, etc.)
            "slot": current_slot,  # Slot category (1, 2, 3, or 4)
            "points": 0,  # Current fantasy points earned in matches (starts at 0)
            "is_available": True,
            "stats": {
                "matches": 0,
                "runs": 0,
                "wickets": 0,
                "average": 0.0,
                "strike_rate": 0.0,
                "economy": 0.0
            },
            "form": "average",  # Can be: excellent, good, average, poor
            "injury_status": None,
            "image_url": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        players.append(player)
    
    print(f"✅ Transformed {len(players)} players")
    return players


def connect_to_mongodb():
    """Connect to MongoDB database."""
    print(f"\n🔌 Connecting to MongoDB: {settings.mongodb_url}")
    
    try:
        client = MongoClient(settings.mongodb_url)
        db = client[settings.mongodb_db_name]
        
        # Test connection
        client.server_info()
        print(f"✅ Connected to MongoDB database: {settings.mongodb_db_name}")
        
        return db
    
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {e}")
        return None


def import_players(db, players, clear_existing=False):
    """Import players into MongoDB."""
    print(f"\n📥 Importing {len(players)} players to MongoDB...")
    
    try:
        players_collection = db.players
        
        # Optionally clear existing players
        if clear_existing:
            confirm = input("⚠️  Clear all existing players? (yes/no): ")
            if confirm.lower() == 'yes':
                result = players_collection.delete_many({})
                print(f"🗑️  Deleted {result.deleted_count} existing players")
        
        # Insert players
        if players:
            result = players_collection.insert_many(players)
            print(f"✅ Successfully imported {len(result.inserted_ids)} players")
            
            # Create indexes for better query performance
            players_collection.create_index("name")
            players_collection.create_index("team")
            players_collection.create_index("role")
            players_collection.create_index("price")
            players_collection.create_index("slot")
            print("✅ Created indexes on players collection")
            
            return True
        else:
            print("⚠️  No players to import")
            return False
    
    except Exception as e:
        print(f"❌ Error importing players: {e}")
        return False


def display_summary(db):
    """Display summary of imported data."""
    print("\n" + "="*60)
    print("📊 IMPORT SUMMARY")
    print("="*60)
    
    try:
        players_collection = db.players
        
        # Total players
        total = players_collection.count_documents({})
        print(f"Total Players: {total}")
        
        # Players by role
        print("\nPlayers by Role:")
        roles = players_collection.aggregate([
            {"$group": {"_id": "$role", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ])
        for role in roles:
            print(f"  - {role['_id']}: {role['count']}")
        
        # Players by slot
        print("\nPlayers by Slot:")
        slots = players_collection.aggregate([
            {"$group": {"_id": "$slot", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ])
        for slot in slots:
            print(f"  - Slot {slot['_id']}: {slot['count']}")
        
        # Players by team
        print("\nPlayers by Team:")
        teams = players_collection.aggregate([
            {"$group": {"_id": "$team", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ])
        for team in teams:
            print(f"  - {team['_id']}: {team['count']}")
        
        # Points range
        print("\nBase Points Range:")
        price_stats = players_collection.aggregate([
            {
                "$group": {
                    "_id": None,
                    "min_price": {"$min": "$price"},
                    "max_price": {"$max": "$price"},
                    "avg_price": {"$avg": "$price"}
                }
            }
        ])
        for stat in price_stats:
            print(f"  - Min: {int(stat['min_price'])} pts")
            print(f"  - Max: {int(stat['max_price'])} pts")
            print(f"  - Avg: {int(stat['avg_price'])} pts")
        
        # Sample players
        print("\n📋 Sample Players:")
        sample = players_collection.find().limit(5)
        for player in sample:
            print(f"  - {player['name']} ({player['team']}) - {player['role']} - {player['price']} pts - Slot {player['slot']}")
        
    except Exception as e:
        print(f"❌ Error generating summary: {e}")
    
    print("="*60)


def main():
    """Main function to run the import process."""
    print("🎯 WalleFantasy - Player Import Script")
    print("="*60)
    
    # Check arguments
    if len(sys.argv) < 2:
        print("❌ Usage: python import-players-from-excel.py <file_path>")
        print("\nExample:")
        print("  python import-players-from-excel.py players_data.xlsx")
        print("  python import-players-from-excel.py players_data.csv")
        sys.exit(1)
    
    data_file = sys.argv[1]
    
    # Validate file exists
    if not os.path.exists(data_file):
        print(f"❌ Error: File not found: {data_file}")
        sys.exit(1)
    
    # Read data file (CSV or Excel)
    df = read_data_file(data_file)
    if df is None:
        sys.exit(1)
    
    # Transform data
    players = transform_data(df)
    if not players:
        print("❌ No valid players found in Excel file")
        sys.exit(1)
    
    # Preview data
    print(f"\n📋 Sample of transformed data:")
    for i, player in enumerate(players[:3]):
        print(f"\nPlayer {i+1}:")
        print(f"  Name: {player['name']}")
        print(f"  Team: {player['team']}")
        print(f"  Role: {player['role']}")
        print(f"  Base Points: {player['price']}")
        print(f"  Slot: {player['slot']}")
    
    # Ask for confirmation
    print(f"\n⚠️  About to import {len(players)} players to MongoDB")
    confirm = input("Continue? (yes/no): ")
    
    if confirm.lower() != 'yes':
        print("❌ Import cancelled")
        sys.exit(0)
    
    # Connect to MongoDB
    db = connect_to_mongodb()
    if db is None:
        sys.exit(1)
    
    # Ask if should clear existing data
    clear = input("\nClear existing players before import? (yes/no): ")
    clear_existing = clear.lower() == 'yes'
    
    # Import players
    success = import_players(db, players, clear_existing)
    
    if success:
        # Display summary
        display_summary(db)
        print("\n✅ Import completed successfully!")
    else:
        print("\n❌ Import failed")
        sys.exit(1)


if __name__ == "__main__":
    main()
