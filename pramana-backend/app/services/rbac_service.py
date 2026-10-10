"""
RBAC Service for Pramana AI.
Handles idempotent initialization, role-permission synchronization,
user-role assignments, and permission retrieval.
Only retains roles and role-permissions for roles actually mapped to existing users.
"""

from typing import List, Dict, Set, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.organization import Organization
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission
from app.models.user import User
from app.models.user_role import UserRole

# Canonical real roles supported across Pramana AI
STANDARD_ROLES = [
    ("super_admin", "Super Admin - Platform management and full administrative access"),
    ("ciso", "Chief Information Security Officer - Organization compliance & security governance"),
    ("grc", "GRC Manager - Framework/control management, evidence, and compliance monitoring"),
    ("internal_auditor", "Internal Auditor - View controls, evidence, review AI results, audit decisions and reports"),
    ("control_owner", "Control Owner - Control management, evidence upload and review"),
    ("evidence_contributor", "Evidence Contributor - Evidence upload and submission"),
    ("external_auditor", "External Auditor - Third-party audit evaluation, evidence verification and reports"),
    ("executive", "Executive - High-level compliance and risk reporting")
]

# Canonical Granular Permissions + Page Access Levels
PERMISSIONS_DEFINITIONS = [
    # 1. Granular Functional Permissions
    ("manage_organizations", "Manage organizations, tenants, and platform configuration"),
    ("manage_users", "Manage user accounts, invitations, and role assignments"),
    ("manage_roles", "Manage roles, permission definitions, and role-permission mappings"),
    ("manage_frameworks", "Create, update, and manage compliance frameworks"),
    ("manage_controls", "Create, update, and manage security controls and requirements"),
    ("upload_evidence", "Upload compliance evidence artifacts and files"),
    ("view_evidence", "View and download compliance evidence and audit materials"),
    ("run_ai_analysis", "Execute AI document processing and control auto-mapping"),
    ("review_ai_results", "Review, approve, or reject AI-suggested mappings and findings"),
    ("view_reports", "View compliance reports, posture metrics, and executive summaries"),
    ("manage_audits", "Create, update, and manage audits, review queues, and decisions"),
    ("view_audit_logs", "View security audit trails and system activity logs"),

    # 2. UI View Permissions
    ("overview:full", "Full access to overview dashboard"),
    ("overview:view", "View-only access to overview dashboard"),
    ("overview:limited", "Limited scope access to overview dashboard"),
    ("evidence:full", "Full access to evidence library"),
    ("evidence:view_review", "View and review access to evidence library"),
    ("evidence:assigned_only", "Access to assigned evidence only"),
    ("evidence:create_upload", "Create and upload evidence"),
    ("controls:full", "Full access to control center"),
    ("controls:view_review", "View and review access to control center"),
    ("controls:assigned_controls", "Access to assigned controls only"),
    ("controls:view_assigned", "View assigned controls"),
    ("gaps:full", "Full access to gap analysis"),
    ("gaps:view_review", "View and review access to gap analysis"),
    ("gaps:assigned_gaps", "Access to assigned gaps only"),
    ("gaps:assigned_actions", "Access to assigned gap actions"),
    ("gaps:summary", "Summary access to gap analysis"),
    ("review-queue:full", "Full access to review queue"),
    ("review-queue:assigned_items", "Access to assigned review queue items"),
    ("audit-trail:full", "Full access to audit trail"),
    ("audit-trail:assigned_scope", "Access to assigned audit scope"),
    ("audit-trail:own_activity", "Access to own activity in audit trail"),
    ("audit-trail:audit_scope", "Access to audit scope in audit trail"),
    ("audit-trail:view", "View access to audit trail"),
    ("reports:full", "Full access to reports"),
    ("reports:relevant_reports", "Access to relevant reports"),
    ("reports:audit_reports", "Access to audit reports"),
    ("reports:executive_reports", "Access to executive reports"),
    ("frameworks:full", "Full access to frameworks"),
    ("frameworks:view", "View access to frameworks"),
    ("frameworks:view_assigned", "View assigned frameworks"),
    ("frameworks:summary", "Summary access to frameworks"),
    ("settings:full", "Full access to settings"),
    ("settings:admin_limited", "Limited administrative access to settings"),
]

# Canonical Role to Permission Matrix
ROLE_PERMISSION_MATRIX: Dict[str, List[str]] = {
    "super_admin": [
        "manage_organizations", "manage_users", "manage_roles", "manage_frameworks",
        "manage_controls", "upload_evidence", "view_evidence", "run_ai_analysis",
        "review_ai_results", "view_reports", "manage_audits", "view_audit_logs",
        "overview:full", "evidence:full", "controls:full", "gaps:full",
        "review-queue:full", "audit-trail:full", "reports:full", "frameworks:full", "settings:full"
    ],
    "ciso": [
        "manage_organizations", "manage_users", "manage_frameworks", "manage_controls", "upload_evidence",
        "view_evidence", "run_ai_analysis", "review_ai_results", "view_reports",
        "manage_audits", "view_audit_logs",
        "overview:full", "evidence:full", "controls:full", "gaps:full",
        "review-queue:full", "audit-trail:full", "reports:full", "frameworks:full", "settings:full"
    ],
    "grc": [
        "manage_frameworks", "manage_controls", "upload_evidence", "view_evidence",
        "run_ai_analysis", "review_ai_results", "view_reports", "manage_audits", "view_audit_logs",
        "overview:full", "evidence:full", "controls:full", "gaps:full",
        "review-queue:full", "audit-trail:full", "reports:full", "frameworks:full"
    ],
    "internal_auditor": [
        "view_evidence", "review_ai_results", "view_reports", "manage_audits", "view_audit_logs",
        "overview:view", "evidence:view_review", "controls:view_review", "gaps:view_review",
        "review-queue:full", "audit-trail:full", "reports:full", "frameworks:view"
    ],
    "control_owner": [
        "manage_controls", "upload_evidence", "view_evidence", "view_reports",
        "overview:limited", "evidence:assigned_only", "controls:assigned_controls", "gaps:assigned_gaps",
        "review-queue:assigned_items", "audit-trail:assigned_scope", "reports:relevant_reports", "frameworks:view"
    ],
    "evidence_contributor": [
        "upload_evidence", "view_evidence",
        "evidence:create_upload", "controls:view_assigned", "gaps:assigned_actions", "audit-trail:own_activity"
    ],
    "external_auditor": [
        "view_evidence", "review_ai_results", "view_reports", "manage_audits", "view_audit_logs",
        "overview:limited", "evidence:assigned_only", "controls:assigned_only", "gaps:assigned_only",
        "review-queue:assigned_items", "audit-trail:audit_scope", "reports:audit_reports", "frameworks:view_assigned"
    ],
    "executive": [
        "view_evidence", "view_reports",
        "overview:view", "gaps:summary", "audit-trail:view", "reports:executive_reports", "frameworks:summary"
    ]
}


def normalize_role_name(name: str) -> str:
    """Normalize role string to canonical key."""
    if not name:
        return "executive"
    clean = name.strip().lower()
    mapping = {
        "super_admin": "super_admin",
        "superadmin": "super_admin",
        "admin": "super_admin",
        "ciso": "ciso",
        "vciso": "ciso",
        "compliance_manager": "grc",
        "compliance manager": "grc",
        "grc": "grc",
        "compliance_team": "grc",
        "internal_auditor": "internal_auditor",
        "internal auditor": "internal_auditor",
        "auditor": "external_auditor",
        "external_auditor": "external_auditor",
        "external auditor": "external_auditor",
        "control_owner": "control_owner",
        "control owner": "control_owner",
        "evidence_contributor": "evidence_contributor",
        "evidence contributor": "evidence_contributor",
        "executive": "executive",
        "viewer": "executive"
    }
    return mapping.get(clean, "executive")


def get_role_description(role_name: str) -> str:
    for name, desc in STANDARD_ROLES:
        if name == role_name:
            return desc
    return f"{role_name.replace('_', ' ').title()} Role"


def ensure_role_permissions_for_role(db: Session, role: Role, perm_id_map: Optional[Dict[str, int]] = None) -> int:
    """Populates permissions in role_permissions table for a specific role and purges obsolete ones."""
    if perm_id_map is None:
        perm_id_map = {p.name: p.id for p in db.query(Permission).all()}

    role_key = normalize_role_name(role.name)
    allowed_perms = ROLE_PERMISSION_MATRIX.get(role_key, [])
    allowed_perm_ids = {perm_id_map[p] for p in allowed_perms if p in perm_id_map}

    # Delete permissions no longer in allowed_perms for this role
    db.query(RolePermission).filter(
        RolePermission.role_id == role.id,
        ~RolePermission.permission_id.in_(allowed_perm_ids)
    ).delete(synchronize_session=False)

    created = 0
    for p_id in allowed_perm_ids:
        exists = db.query(RolePermission).filter(
            RolePermission.role_id == role.id,
            RolePermission.permission_id == p_id
        ).first()

        if not exists:
            rp = RolePermission(role_id=role.id, permission_id=p_id)
            db.add(rp)
            created += 1

    return created


def ensure_user_role(db: Session, user: User, role_name: Optional[str] = None) -> Role:
    """
    Ensures a user has their canonical Role, RolePermissions, and UserRole link.
    Only creates/maintains roles and permissions for active assigned users.
    """
    canonical_role_name = normalize_role_name(role_name or user.role or "executive")
    user.role = canonical_role_name

    role = db.query(Role).filter(
        Role.organization_id == user.organization_id,
        Role.name == canonical_role_name
    ).first()

    if not role:
        role = Role(
            organization_id=user.organization_id,
            name=canonical_role_name,
            description=get_role_description(canonical_role_name)
        )
        db.add(role)
        db.flush()

    # Ensure role permissions for this active role
    ensure_role_permissions_for_role(db, role)

    # Link in user_roles
    existing_ur = db.query(UserRole).filter(
        UserRole.user_id == user.id,
        UserRole.role_id == role.id
    ).first()

    if not existing_ur:
        # Remove any previous user_roles links for this user
        db.query(UserRole).filter(UserRole.user_id == user.id).delete()
        ur = UserRole(user_id=user.id, role_id=role.id)
        db.add(ur)

    return role


def cleanup_unused_rbac_data(db: Session) -> Dict[str, int]:
    """
    Deletes all role_permissions and roles that are not mapped to any existing user in user_roles.
    """
    stats = {
        "unused_role_permissions_removed": 0,
        "unused_roles_removed": 0
    }

    # Find all role_ids actively assigned to users
    used_role_ids = set([r[0] for r in db.query(UserRole.role_id).distinct().all()])

    # Delete all role_permissions whose role_id is not in used_role_ids
    deleted_rp = (
        db.query(RolePermission)
        .filter(~RolePermission.role_id.in_(used_role_ids))
        .delete(synchronize_session=False)
    )
    stats["unused_role_permissions_removed"] = deleted_rp

    # Delete all roles whose id is not in used_role_ids
    deleted_roles = (
        db.query(Role)
        .filter(~Role.id.in_(used_role_ids))
        .delete(synchronize_session=False)
    )
    stats["unused_roles_removed"] = deleted_roles

    db.commit()
    return stats


def initialize_rbac(db: Session) -> Dict[str, int]:
    """
    Idempotent initialization of RBAC master permissions and active user-role permissions.
    Removes any role_permissions not mapped to existing users.
    """
    stats = {
        "permissions_created": 0,
        "roles_active": 0,
        "role_permissions_active": 0,
        "unused_role_permissions_removed": 0,
        "unused_roles_removed": 0
    }

    # 1. Seed / Ensure Permissions definitions
    perm_id_map: Dict[str, int] = {}
    for perm_name, perm_desc in PERMISSIONS_DEFINITIONS:
        perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if not perm:
            perm = Permission(name=perm_name, description=perm_desc)
            db.add(perm)
            db.flush()
            stats["permissions_created"] += 1
        elif perm_desc and perm.description != perm_desc:
            perm.description = perm_desc
        perm_id_map[perm_name] = perm.id

    db.commit()

    # 2. Sync roles and role permissions ONLY for existing active users
    users = db.query(User).all()
    for user in users:
        ensure_user_role(db, user, user.role)

    db.commit()

    # 3. Clean up all role_permissions and roles not assigned to any user
    cleanup_stats = cleanup_unused_rbac_data(db)
    stats["unused_role_permissions_removed"] = cleanup_stats["unused_role_permissions_removed"]
    stats["unused_roles_removed"] = cleanup_stats["unused_roles_removed"]

    stats["roles_active"] = db.query(Role).count()
    stats["role_permissions_active"] = db.query(RolePermission).count()

    return stats


def get_user_effective_permissions(user: User, db: Session) -> Set[str]:
    """
    Returns the set of all permission names granted to the user through their roles in the database.
    SUPER_ADMIN role grants all permissions.
    """
    if not user:
        return set()

    # Query roles assigned to this user from user_roles -> roles
    user_role_records = (
        db.query(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .filter(UserRole.user_id == user.id)
        .all()
    )
    user_role_names = [r.name.lower() for r in user_role_records]

    # Also check user.role column
    if user.role:
        user_role_names.append(user.role.lower())

    if "super_admin" in user_role_names or "superadmin" in user_role_names or "admin" in user_role_names:
        all_perms = db.query(Permission.name).all()
        return {p[0] for p in all_perms}

    # Fetch permissions mapped through user_roles -> role_permissions -> permissions
    mapped_perms = (
        db.query(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(UserRole, UserRole.role_id == RolePermission.role_id)
        .filter(UserRole.user_id == user.id)
        .all()
    )

    permissions_set = {p[0] for p in mapped_perms}

    # Fallback to direct user.role mapping from matrix
    if not permissions_set and user.role:
        norm = normalize_role_name(user.role)
        permissions_set = set(ROLE_PERMISSION_MATRIX.get(norm, []))

    return permissions_set
