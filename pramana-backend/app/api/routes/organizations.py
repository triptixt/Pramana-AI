from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.organization import Organization
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.core.dependencies import get_current_user

router = APIRouter(
    prefix="/organizations",
    tags=["Organizations"]
)


# POST - Create Organization
@router.post("/", response_model=OrganizationResponse)
def create_organization(
    organization: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    new_organization = Organization(
        name=organization.name
    )

    db.add(new_organization)
    db.commit()
    db.refresh(new_organization)

    return new_organization


# GET - Get Current User's Organization
@router.get("/", response_model=list[OrganizationResponse])
def get_organizations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    organizations = (
        db.query(Organization)
        .filter(
            Organization.id == current_user.organization_id
        )
        .all()
    )

    return organizations


# GET - Get Organization by ID
@router.get("/{organization_id}", response_model=OrganizationResponse)
def get_organization(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if organization_id != current_user.organization_id:
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
    if organization_id != current_user.organization_id:
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

    organization.name = organization_data.name

    db.commit()
    db.refresh(organization)

    return organization


# DELETE - Delete Organization
@router.delete("/{organization_id}")
def delete_organization(
    organization_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if organization_id != current_user.organization_id:
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

    db.delete(organization)
    db.commit()

    return {
        "message": "Organization deleted successfully"
    }