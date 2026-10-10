from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.organizations import router as organization_router
from app.api.routes.users import router as user_router
from app.api.routes.roles import router as role_router
from app.api.routes.permissions import router as permission_router
from app.api.routes.role_permissions import router as role_permission_router
from app.api.routes.frameworks import router as framework_router
from app.api.routes.framework_version import router as framework_version_router
from app.api.routes.controls import router as control_router
from app.api.routes.control_relationships import router as control_relationship_router
from app.api.routes.evidence import router as evidence_router
from app.api.routes.evidence_control_mappings import router as evidence_control_mapping_router
from app.api.routes.gap_analysis import router as gap_analysis_router
from app.api.routes.audit import router as audit_router
from app.api.routes.audit_review import router as audit_review_router
from app.api.routes.audit_decision import router as audit_decision_router
from app.api.routes.audit_log import router as audit_log_router
from app.api.routes.ai_run import router as ai_run_router
from app.api.routes.assessments import router as assessment_router

from app.api.routes.rbac import router as rbac_router
from app.api.routes.platform import router as platform_router
from app.api.routes.compliance import router as compliance_router


from app.database import SessionLocal
from app.services.rbac_service import initialize_rbac


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend API for Pramana Compliance Platform",
    debug=settings.debug
)


@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        initialize_rbac(db)
    finally:
        db.close()



# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(rbac_router)
app.include_router(platform_router)

app.include_router(organization_router)
app.include_router(user_router)

app.include_router(role_router)
app.include_router(permission_router)
app.include_router(role_permission_router)

app.include_router(framework_router)
app.include_router(framework_version_router)

app.include_router(control_router)
app.include_router(control_relationship_router)

app.include_router(evidence_router)
app.include_router(evidence_control_mapping_router)

app.include_router(gap_analysis_router)

app.include_router(audit_router)
app.include_router(audit_review_router)
app.include_router(audit_decision_router)
app.include_router(audit_log_router)

app.include_router(ai_run_router)
app.include_router(assessment_router)
app.include_router(compliance_router)

# Root endpoint
@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.app_name}"
    }