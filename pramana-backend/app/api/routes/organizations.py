from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.models.role import Role
from app.models.user_role import UserRole
from app.models.audit_log import AuditLog
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"]
)


from app.services.rbac_service import get_user_effective_permissions, initialize_rbac


def check_is_admin(user: User, db: Session) -> bool:
    if user.role and user.role.lower() in ["super_admin", "superadmin", "admin"]:
        return True
    role = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(
        UserRole.user_id == user.id,
        Role.name.in_(["super_admin", "admin"])
    ).first()
    return role is not None


# POST - Create Organization (Super Admin Only)
@router.post("/", response_model=OrganizationResponse)
def create_organization(
    organization: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not check_is_admin(current_user, db):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Super Admin required to create new organizations."
        )

    clean_name = (organization.name or "").strip()
    if not clean_name or len(clean_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Organization name must be at least 2 characters long"
        )

    # 1. Verification - Check for existing organization with same name
    existing_org = db.query(Organization).filter(
        func.lower(Organization.name) == clean_name.lower()
    ).first()

    if existing_org:
        raise HTTPException(
            status_code=400,
            detail=f"Organization with name '{clean_name}' already exists"
        )

    # 2. Storage - Persist new Organization
    new_organization = Organization(
        name=clean_name
    )

    db.add(new_organization)
    db.commit()
    db.refresh(new_organization)

    # 3. Usability - Provision standard roles & permissions for the new organization
    initialize_rbac(db)

    return new_organization


# GET - Get Current User's Organization (or All Orgs for SuperAdmin)
@router.get("/", response_model=list[OrganizationResponse])
def get_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if check_is_admin(current_user, db):
        organizations = db.query(Organization).order_by(Organization.id.asc()).all()
    else:
        organizations = (
            db.query(Organization)
            .filter(
                Organization.id == current_user.organization_id
            )
            .all()
        )

    return organizations


# GET - Get Organization by ID (Tenant-scoped for CISO, Global for SuperAdmin)
@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    is_admin = check_is_admin(current_user, db)
    if not is_admin and organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot access another organization"
        )

    organization = (
        db.query(Organization)
        .filter(Organization.id == organization_id)
        .first()
    )

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    return organization


# PUT - Update Organization
@router.put("/{organization_id}", response_model=OrganizationResponse)
def update_organization(
    organization_id: int,
    organization_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    perms = get_user_effective_permissions(current_user, db)
    if "manage_organizations" not in perms:
        raise HTTPException(
            status_code=403,
            detail="Permission denied: 'manage_organizations' required"
        )

    is_admin = check_is_admin(current_user, db)
    if not is_admin and organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail="You cannot access another organization"
        )

    organization = (
        db.query(Organization)
        .filter(Organization.id == organization_id)
        .first()
    )

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    clean_name = (organization_data.name or "").strip()
    if not clean_name or len(clean_name) < 2:
        raise HTTPException(
            status_code=400,
            detail="Organization name must be at least 2 characters long"
        )

    existing_org = db.query(Organization).filter(
        func.lower(Organization.name) == clean_name.lower(),
        Organization.id != organization_id
    ).first()

    if existing_org:
        raise HTTPException(
            status_code=400,
            detail=f"Organization with name '{clean_name}' already exists"
        )

    organization.name = clean_name

    db.commit()
    db.refresh(organization)

    return organization


# DELETE - Delete Organization (Super Admin Only)
@router.delete("/{organization_id}")
def delete_organization(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not check_is_admin(current_user, db):
        raise HTTPException(
            status_code=403,
            detail="Permission denied: Super Admin required to delete organizations."
        )

    organization = (
        db.query(Organization)
        .filter(Organization.id == organization_id)
        .first()
    )

    if organization is None:
        raise HTTPException(
            status_code=404,
            detail="Organization not found"
        )

    # Clean up dependent records before deleting organization
    from app.models.audit_log import AuditLog
    from app.models.user import User
    from app.models.user_role import UserRole
    from app.models.role import Role
    from app.models.role_permission import RolePermission
    from app.models.gap_analysis import GapAnalysis
    from app.models.evidence import Evidence
    from app.models.organization_framework import OrganizationFramework

    db.query(AuditLog).filter(AuditLog.organization_id == organization_id).delete(synchronize_session=False)
    db.query(GapAnalysis).filter(GapAnalysis.organization_id == organization_id).delete(synchronize_session=False)
    db.query(Evidence).filter(Evidence.organization_id == organization_id).delete(synchronize_session=False)
    db.query(OrganizationFramework).filter(OrganizationFramework.organization_id == organization_id).delete(synchronize_session=False)
    
    org_user_ids = [u.id for u in db.query(User).filter(User.organization_id == organization_id).all()]
    if org_user_ids:
        db.query(UserRole).filter(UserRole.user_id.in_(org_user_ids)).delete(synchronize_session=False)
        db.query(User).filter(User.organization_id == organization_id).delete(synchronize_session=False)
    
    org_roles = db.query(Role).filter(Role.organization_id == organization_id).all()
    org_role_ids = [r.id for r in org_roles]
    if org_role_ids:
        db.query(RolePermission).filter(RolePermission.role_id.in_(org_role_ids)).delete(synchronize_session=False)
        db.query(Role).filter(Role.organization_id == organization_id).delete(synchronize_session=False)

    db.delete(organization)
    db.commit()

    return {
        "message": "Organization deleted successfully"
    }
