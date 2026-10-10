"""
Pramana AI - System Database Seed Script
Idempotently initializes system master permissions and user-mapped roles.
Does NOT seed fake/demo business data (no mock organizations, frameworks, controls, evidence, or AI outputs).
"""

import sys
from app.database import SessionLocal, Base, engine
from app.services.rbac_service import initialize_rbac


def seed():
    """
    Idempotently initialize system RBAC master data for active users.
    Does NOT seed mock business data (organizations, frameworks, controls, evidence, gaps, audits).
    """
    print("Creating database tables if not exist...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print("Initializing system RBAC permissions and active user roles...")
        stats = initialize_rbac(db)
        print("System RBAC initialized successfully:")
        print(f"  - Master Permissions:             {stats.get('permissions_created', 0)}")
        print(f"  - Active Roles (with users):      {stats.get('roles_active', 0)}")
        print(f"  - Active Role Permissions:        {stats.get('role_permissions_active', 0)}")
        print(f"  - Unused Role Permissions Purged: {stats.get('unused_role_permissions_removed', 0)}")
        print(f"  - Unused Roles Purged:            {stats.get('unused_roles_removed', 0)}")
    except Exception as e:
        print(f"Error during system seed: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed()
