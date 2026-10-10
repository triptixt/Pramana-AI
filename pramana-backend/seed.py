"""
Pramana AI - Seed Script Entry Point
Idempotently seeds system master roles and permissions.
Does NOT seed fake/demo business data.
"""

from app.seed_db import seed

if __name__ == "__main__":
    seed()
