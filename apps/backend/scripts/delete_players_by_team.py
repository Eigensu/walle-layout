import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import asyncio
import argparse
from typing import List
import re

from config.database import connect_to_mongo, close_mongo_connection, get_database

TEAMS_TO_DELETE: List[str] = [
    "Chhajer Super Kings",
    "Mumbai Stars",
    "Mumbai Titans",
    "SAMBHAV BOMBAIM CC",
    "The Stallions",
    "The Wild Ones",
    "WORLD TOWER SPARTANS",
]


async def summarize_and_delete(apply: bool) -> None:
    db = get_database()
    col = db["players"]

    print("Players deletion script")
    print("Teams:")
    for t in TEAMS_TO_DELETE:
        print(f" - {t}")

    # Per-team counts
    total = 0
    for team in TEAMS_TO_DELETE:
        # Build a relaxed regex that allows any non-alphanumeric chars between word tokens
        tokens = re.findall(r"[A-Za-z0-9]+", team)
        if not tokens:
            continue
        pattern = r"[^A-Za-z0-9]*".join(map(re.escape, tokens))
        cnt = await col.count_documents({"team": {"$regex": f"^{pattern}$", "$options": "i"}})
        print(f"Count in '{team}': {cnt}")
        total += cnt

    print(f"Total matching players: {total}")

    if not apply:
        print("Dry run only. Pass --apply to perform deletion.")
        return

    # Perform deletion
    or_clauses = []
    for team in TEAMS_TO_DELETE:
        tokens = re.findall(r"[A-Za-z0-9]+", team)
        if not tokens:
            continue
        pattern = r"[^A-Za-z0-9]*".join(map(re.escape, tokens))
        or_clauses.append({"team": {"$regex": f"^{pattern}$", "$options": "i"}})
    result = await col.delete_many({"$or": or_clauses})
    print(f"Deleted players: {result.deleted_count}")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Delete players by team name list")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply deletions. Without this flag, the script performs a dry run",
    )
    parser.add_argument(
        "--debug",
        action="store_true",
        help="Print diagnostic information about teams present in the collection",
    )
    args = parser.parse_args()

    await connect_to_mongo()
    try:
        if args.debug:
            db = get_database()
            col = db["players"]
            total_docs = await col.count_documents({})
            with_team = await col.count_documents({"team": {"$exists": True}})
            print(f"Total docs in players: {total_docs}")
            print(f"Docs with 'team' field: {with_team}")

            # Print sample distinct team values (up to 20)
            try:
                teams = await col.distinct("team")
                print("Sample distinct team values (up to 20):")
                for t in list(filter(None, teams))[:20]:
                    print(f" - {t}")
            except Exception as e:
                print(f"Could not fetch distinct teams: {e}")

        await summarize_and_delete(apply=args.apply)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())
