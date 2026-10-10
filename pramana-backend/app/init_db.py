from app.database import Base, engine
from app.models.ai_output import AIOutput
from app.models import (
    Organization,
    User,
    Role,
    Permission,
    UserRole,
    RolePermission,
    Framework,
    FrameworkVersion,
    Control,
    ControlRelationship,
    Evidence,
    EvidenceVersion,
    EvidenceChunk,
    EvidenceControlMapping,
    OrganizationFramework,
    GapAnalysis,
    EvidenceRequest,
    Audit,
    AuditReview,
    AuditDecision,
    AuditLog,
)

Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")

from app.database import SessionLocal
from app.services.rbac_service import initialize_rbac

db = SessionLocal()
try:
    stats = initialize_rbac(db)
    print(f"RBAC initialized successfully: {stats}")
finally:
    db.close()