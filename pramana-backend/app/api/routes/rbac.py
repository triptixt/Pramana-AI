from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.database import SessionLocal
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission

router = APIRouter(
    prefix="/rbac",
    tags=["Role-Based Access Control"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Canonical 8 Enterprise Roles
ROLES_INFO = {
    "super_admin": {
        "id": "super_admin",
        "title": "Super Admin",
        "fullName": "Platform Super Administrator",
        "description": "Full platform administration, organization onboarding, and user management across tenants.",
        "badgeColor": "bg-indigo-100 text-indigo-700 border-indigo-200"
    },
    "ciso": {
        "id": "ciso",
        "title": "CISO",
        "fullName": "Chief Information Security Officer",
        "description": "Full administrative governance, security leadership, and compliance oversight.",
        "badgeColor": "bg-purple-100 text-purple-700 border-purple-200"
    },
    "grc": {
        "id": "grc",
        "title": "GRC / Compliance Manager",
        "fullName": "Governance, Risk & Compliance Manager",
        "description": "Operational compliance management, evidence review, and audit coordination.",
        "badgeColor": "bg-indigo-100 text-indigo-700 border-indigo-200"
    },
    "internal_auditor": {
        "id": "internal_auditor",
        "title": "Internal Auditor",
        "fullName": "Internal Audit Specialist",
        "description": "Continuous internal control evaluation, review queue authority, and audit trail verification.",
        "badgeColor": "bg-blue-100 text-blue-700 border-blue-200"
    },
    "control_owner": {
        "id": "control_owner",
        "title": "Control Owner",
        "fullName": "Control & Process Owner",
        "description": "Operational responsibility for assigned technical and organizational security controls.",
        "badgeColor": "bg-amber-100 text-amber-700 border-amber-200"
    },
    "evidence_contributor": {
        "id": "evidence_contributor",
        "title": "Evidence Contributor",
        "fullName": "Evidence Contributor & Submitter",
        "description": "Responsible for uploading compliance evidence and resolving assigned action items.",
        "badgeColor": "bg-emerald-100 text-emerald-700 border-emerald-200"
    },
    "external_auditor": {
        "id": "external_auditor",
        "title": "External Auditor",
        "fullName": "Third-Party Certification Auditor",
        "description": "Independent evaluation of scoped evidence, controls, and formal audit readiness packages.",
        "badgeColor": "bg-sky-100 text-sky-700 border-sky-200"
    },
    "executive": {
        "id": "executive",
        "title": "Executive",
        "fullName": "C-Suite & Board Executive",
        "description": "High-level visibility into compliance posture, risk exposure summaries, and board reports.",
        "badgeColor": "bg-slate-100 text-slate-700 border-slate-200"
    }
}

PAGES_INFO = {
    "overview": {"title": "Overview", "icon": "LayoutDashboard", "category": "Workspace"},
    "evidence": {"title": "Evidence Library", "icon": "FileText", "category": "Workspace"},
    "controls": {"title": "Control Center", "icon": "ShieldCheck", "category": "Workspace"},
    "gaps": {"title": "Gap Analysis", "icon": "AlertTriangle", "category": "Workspace"},
    "review-queue": {"title": "Review Queue", "icon": "ClipboardCheck", "category": "Workspace"},
    "audit-trail": {"title": "Audit Trail", "icon": "History", "category": "Workspace"},
    "reports": {"title": "Reports", "icon": "BarChart3", "category": "Workspace"},
    "frameworks": {"title": "Frameworks", "icon": "Layers", "category": "Management"},
    "settings": {"title": "Settings", "icon": "Settings", "category": "Management"},
}

# The Canonical RBAC Matrix
RBAC_MATRIX: Dict[str, Dict[str, str]] = {
    "super_admin": {
        "overview": "Full",
        "evidence": "Full",
        "controls": "Full",
        "gaps": "Full",
        "review-queue": "Full",
        "audit-trail": "Full",
        "reports": "Full",
        "frameworks": "Full",
        "settings": "Full"
    },
    "ciso": {
        "overview": "Full",
        "evidence": "Full",
        "controls": "Full",
        "gaps": "Full",
        "review-queue": "Full",
        "audit-trail": "Full",
        "reports": "Full",
        "frameworks": "Full",
        "settings": "Full"
    },
    "grc": {
        "overview": "Full",
        "evidence": "Full",
        "controls": "Full",
        "gaps": "Full",
        "review-queue": "Full",
        "audit-trail": "Full",
        "reports": "Full",
        "frameworks": "Full",
        "settings": "❌"
    },
    "internal_auditor": {
        "overview": "View",
        "evidence": "View/Review",
        "controls": "View/Review",
        "gaps": "View/Review",
        "review-queue": "Full",
        "audit-trail": "Full",
        "reports": "Full",
        "frameworks": "View",
        "settings": "❌"
    },
    "control_owner": {
        "overview": "Limited",
        "evidence": "Assigned only",
        "controls": "Assigned controls",
        "gaps": "Assigned gaps",
        "review-queue": "Assigned items",
        "audit-trail": "Assigned scope",
        "reports": "Relevant reports",
        "frameworks": "View",
        "settings": "❌"
    },
    "evidence_contributor": {
        "overview": "❌",
        "evidence": "Create/Upload",
        "controls": "View assigned",
        "gaps": "Assigned actions",
        "review-queue": "❌",
        "audit-trail": "Own activity",
        "reports": "❌",
        "frameworks": "❌",
        "settings": "❌"
    },
    "external_auditor": {
        "overview": "Limited",
        "evidence": "Assigned only",
        "controls": "Assigned only",
        "gaps": "Assigned only",
        "review-queue": "Assigned items",
        "audit-trail": "Audit scope",
        "reports": "Audit reports",
        "frameworks": "View assigned",
        "settings": "❌"
    },
    "executive": {
        "overview": "View",
        "evidence": "❌",
        "controls": "❌",
        "gaps": "Summary",
        "review-queue": "❌",
        "audit-trail": "View",
        "reports": "Executive reports",
        "frameworks": "Summary",
        "settings": "❌"
    }
}

# Role aliases for backward compatibility resolution
ROLE_ALIASES = {
    "admin": "super_admin",
    "superadmin": "super_admin",
    "vciso": "ciso",
    "compliance_manager": "grc",
    "compliance_team": "grc",
    "auditor": "external_auditor",
    "viewer": "executive"
}

def resolve_role(role_id: str) -> str:
    role_normalized = role_id.lower().strip()
    return ROLE_ALIASES.get(role_normalized, role_normalized)

@router.get("/matrix")
def get_rbac_matrix():
    """Returns the complete canonical Role-Based Access Control matrix."""
    return {
        "status": "success",
        "roles": ROLES_INFO,
        "pages": PAGES_INFO,
        "matrix": RBAC_MATRIX
    }

@router.get("/roles")
def get_rbac_roles():
    """Returns the list of 8 canonical enterprise personas with role metadata."""
    return list(ROLES_INFO.values())

@router.get("/role/{role_id}")
def get_role_permissions(role_id: str):
    """Returns page permissions for a specific role."""
    resolved = resolve_role(role_id)
    if resolved not in RBAC_MATRIX:
        raise HTTPException(status_code=404, detail=f"Role '{role_id}' not found in RBAC matrix.")
    
    return {
        "role": ROLES_INFO.get(resolved, {"id": resolved, "title": resolved}),
        "permissions": RBAC_MATRIX[resolved]
    }

@router.get("/check")
def check_permission(
    role: str = Query(..., description="Role ID e.g. ciso, control_owner, etc."),
    page: str = Query(..., description="Page ID e.g. overview, evidence, settings, etc.")
):
    """Checks access level for a specific role on a specific page."""
    resolved = resolve_role(role)
    if resolved not in RBAC_MATRIX:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not recognized.")
    
    role_perms = RBAC_MATRIX[resolved]
    access = role_perms.get(page, "❌")
    
    return {
        "role": resolved,
        "page": page,
        "access": access,
        "is_allowed": access != "❌"
    }

@router.post("/seed")
def seed_rbac_in_db(db: Session = Depends(get_db)):
    """Synchronizes the canonical RBAC roles and page permissions into the database."""
    from app.services.rbac_service import initialize_rbac
    stats = initialize_rbac(db)

    return {
        "status": "success",
        "message": "RBAC roles and permissions synchronized successfully.",
        **stats
    }
