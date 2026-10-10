"""
Pramana AI - Roles & Permissions Seed Script
Idempotently seeds system master roles and permissions for active users.
Cleans up unassigned role permissions and unused roles.
"""

from app.database import SessionLocal, Base, engine
from app.services.rbac_service import initialize_rbac


def seed_roles():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        stats = initialize_rbac(db)
        print("Idempotent RBAC synchronization complete:")
        print(f"  - Master Permissions:             {stats.get('permissions_created', 0)}")
        print(f"  - Active Roles (with users):      {stats.get('roles_active', 0)}")
        print(f"  - Active Role Permissions:        {stats.get('role_permissions_active', 0)}")
        print(f"  - Unused Role Permissions Purged: {stats.get('unused_role_permissions_removed', 0)}")
        print(f"  - Unused Roles Purged:            {stats.get('unused_roles_removed', 0)}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_roles()
