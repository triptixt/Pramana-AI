import os
from datetime import datetime, timezone
from app.database import SessionLocal, Base, engine
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
    AIRun,
    AIOutput
)

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(Organization).first():
            print("Database already contains data, skipping seed.")
            return

        print("Seeding database with initial Pramana compliance data...")

        # 1. Organizations
        orgs_data = [
            Organization(name="Acme Technologies Inc."),
            Organization(name="Nova Fintech Ltd."),
            Organization(name="Apex Cloud Corp."),
            Organization(name="Blaze Analytics"),
            Organization(name="Zeta Cybersecurity")
        ]
        db.add_all(orgs_data)
        db.commit()
        for o in orgs_data:
            db.refresh(o)
        
        acme_org = orgs_data[0]
        nova_org = orgs_data[1]

        # 2. Roles
        roles_data = [
            Role(organization_id=acme_org.id, name="admin", description="Super Admin - Platform-level management"),
            Role(organization_id=acme_org.id, name="ciso", description="Enterprise CISO - Manage compliance, evidence and gaps"),
            Role(organization_id=acme_org.id, name="auditor", description="External Auditor - Review evidence and verify AI control mappings"),
            Role(organization_id=acme_org.id, name="compliance_team", description="Compliance Team - Upload and organize evidence, resolve gaps"),
            Role(organization_id=acme_org.id, name="viewer", description="Read-Only Viewer - Inspect dashboards and audit reports")
        ]
        db.add_all(roles_data)
        db.commit()

        # 3. Users
        users_data = [
            User(organization_id=acme_org.id, name="Aarav Mehta", email="aarav@acme.com", is_active=True),
            User(organization_id=acme_org.id, name="Priya Sharma", email="priya@acme.com", is_active=True),
            User(organization_id=acme_org.id, name="David Chen", email="david@audits.com", is_active=True),
            User(organization_id=acme_org.id, name="Vikram Malhotra", email="admin@pramana.ai", is_active=True),
            User(organization_id=nova_org.id, name="Leo Torres", email="leo@nova.com", is_active=True),
            User(organization_id=acme_org.id, name="Sana Raza", email="sana@acme.com", is_active=True),
        ]
        db.add_all(users_data)
        db.commit()
        for u in users_data:
            db.refresh(u)
        
        ciso_user = users_data[0]
        auditor_user = users_data[2]
        admin_user = users_data[3]

        # 4. Frameworks
        frameworks_data = [
            Framework(name="ISO/IEC 27001", code="iso-27001", description="Information security management system standard"),
            Framework(name="SOC 2 Type II", code="soc-2", description="AICPA Trust Services Criteria: Security, Availability, Confidentiality"),
            Framework(name="PCI DSS", code="pci-dss", description="Payment Card Industry Data Security Standard"),
            Framework(name="DPDP Act 2023", code="dpdp", description="Digital Personal Data Protection Act compliance framework")
        ]
        db.add_all(frameworks_data)
        db.commit()
        for f in frameworks_data:
            db.refresh(f)

        # 5. Framework Versions
        versions_data = [
            FrameworkVersion(framework_id=frameworks_data[0].id, version="2022", description="ISO/IEC 27001:2022 revised controls"),
            FrameworkVersion(framework_id=frameworks_data[1].id, version="2017", description="SOC 2 TSC 2017 with revised points of focus"),
            FrameworkVersion(framework_id=frameworks_data[2].id, version="v4.0", description="PCI DSS v4.0 requirement set"),
            FrameworkVersion(framework_id=frameworks_data[3].id, version="2023", description="DPDP Act 2023 Gazette specifications")
        ]
        db.add_all(versions_data)
        db.commit()
        for v in versions_data:
            db.refresh(v)

        iso_ver = versions_data[0]
        soc_ver = versions_data[1]

        # 6. Controls
        controls_data = [
            Control(framework_version_id=iso_ver.id, control_code="ISO-A.9.2.1", title="User Registration & Access Provisioning", description="Formal user registration and de-registration process shall be implemented."),
            Control(framework_version_id=iso_ver.id, control_code="ISO-A.9.4.2", title="Secure Log-on Procedures & MFA", description="Access to systems shall be controlled by a secure log-on procedure and multi-factor authentication."),
            Control(framework_version_id=iso_ver.id, control_code="ISO-A.12.1.2", title="Change Management & DevOps", description="Changes to the organization, business processes, information processing facilities and systems shall be controlled."),
            Control(framework_version_id=iso_ver.id, control_code="ISO-A.12.6.1", title="Vulnerability Management & Pen Testing", description="Information about technical vulnerabilities of information systems shall be obtained and evaluated."),
            Control(framework_version_id=soc_ver.id, control_code="CC6.1", title="Logical Access & Identity Boundaries", description="The entity implements logical access security software and infrastructure to protect resources."),
            Control(framework_version_id=soc_ver.id, control_code="CC6.2", title="User Access Provisioning & Role RBAC", description="Prior to issuing system credentials, the entity registers and authorizes new internal and external users."),
            Control(framework_version_id=soc_ver.id, control_code="CC7.1", title="Vulnerability Infrastructure Scanning", description="To meet its objectives, the entity uses detection and monitoring procedures to identify changes and flaws.")
        ]
        db.add_all(controls_data)
        db.commit()
        for c in controls_data:
            db.refresh(c)

        # 7. Evidence
        evidence_data = [
            Evidence(
                organization_id=acme_org.id,
                uploaded_by=ciso_user.id,
                file_name="Okta_MFA_Enforcement_Policy_2026.pdf",
                file_path="/uploads/Okta_MFA_Enforcement_Policy_2026.pdf",
                file_type="pdf",
                description="Global multi-factor authentication enforcement policy across identity providers and cloud consoles.",
                status="processed"
            ),
            Evidence(
                organization_id=acme_org.id,
                uploaded_by=ciso_user.id,
                file_name="AWS_IAM_Access_Keys_Audit_Q1.json",
                file_path="/uploads/AWS_IAM_Access_Keys_Audit_Q1.json",
                file_type="json",
                description="Export of active IAM access keys with 90-day rotation validation across AWS production environments.",
                status="processed"
            ),
            Evidence(
                organization_id=acme_org.id,
                uploaded_by=ciso_user.id,
                file_name="Annual_External_VAPT_Report_2026.pdf",
                file_path="/uploads/Annual_External_VAPT_Report_2026.pdf",
                file_type="pdf",
                description="Independent third-party penetration testing report conducted by Bishop Fox Cyber Security.",
                status="under_review"
            ),
            Evidence(
                organization_id=acme_org.id,
                uploaded_by=ciso_user.id,
                file_name="Employee_Security_Awareness_Training_Q1.csv",
                file_path="/uploads/Employee_Security_Awareness_Training_Q1.csv",
                file_type="csv",
                description="LMS completion records demonstrating 98.4% employee completion for cyber awareness.",
                status="approved"
            )
        ]
        db.add_all(evidence_data)
        db.commit()
        for e in evidence_data:
            db.refresh(e)

        # 8. Evidence Control Mappings (AI Suggested + Auditor Reviewed)
        mappings_data = [
            EvidenceControlMapping(
                evidence_id=evidence_data[0].id,
                control_id=controls_data[1].id, # ISO-A.9.4.2 MFA
                mapping_type="ai_suggested",
                confidence_score=0.96,
                mapping_status="pending",
                notes="AI Engine extracted Section 3.2 enforcing FIDO2/WebAuthn hardware tokens and TOTP across 100% of internal staff."
            ),
            EvidenceControlMapping(
                evidence_id=evidence_data[0].id,
                control_id=controls_data[4].id, # CC6.1
                mapping_type="ai_suggested",
                confidence_score=0.93,
                mapping_status="pending",
                notes="Cross-mapped to SOC 2 CC6.1 Logical Access Controls."
            ),
            EvidenceControlMapping(
                evidence_id=evidence_data[1].id,
                control_id=controls_data[0].id, # ISO-A.9.2.1
                mapping_type="ai_suggested",
                confidence_score=0.91,
                mapping_status="approved",
                notes="Auditor verified automated key rotation mechanism."
            ),
            EvidenceControlMapping(
                evidence_id=evidence_data[2].id,
                control_id=controls_data[3].id, # ISO-A.12.6.1
                mapping_type="ai_suggested",
                confidence_score=0.98,
                mapping_status="pending",
                notes="Annual VAPT report covers web apps, API endpoints, and cloud infrastructure."
            )
        ]
        db.add_all(mappings_data)
        db.commit()

        # 9. Gap Analysis
        gaps_data = [
            GapAnalysis(
                organization_id=acme_org.id,
                control_id=controls_data[3].id,
                status="open",
                severity="critical",
                findings="Evidence report lacks explicit remediation re-test verification for medium vulnerability finding CVE-2025-4128.",
                recommendation="Upload delta remediation sign-off letter from Bishop Fox verifying patch installation."
            ),
            GapAnalysis(
                organization_id=acme_org.id,
                control_id=controls_data[2].id,
                status="in_progress",
                severity="medium",
                findings="Change advisory board (CAB) weekly meeting minutes missing for December release cycle.",
                recommendation="Attach Jira release approval audit log for December deployments."
            )
        ]
        db.add_all(gaps_data)
        db.commit()

        # 10. Audit Record
        audit_record = Audit(
            organization_id=acme_org.id,
            framework_id=frameworks_data[0].id,
            created_by=auditor_user.id,
            name="Q1 2026 ISO 27001 Surveillance Audit",
            description="Comprehensive surveillance audit of technical controls and organizational policies.",
            status="active"
        )
        db.add(audit_record)
        db.commit()
        db.refresh(audit_record)

        # 11. Audit Reviews & Decisions
        review_record = AuditReview(
            audit_id=audit_record.id,
            reviewer_id=auditor_user.id,
            status="under_review",
            comments="Verified Okta MFA enforcement policy. Requested delta penetration test re-verification.",
            reviewed_at=datetime.now(timezone.utc)
        )
        db.add(review_record)
        db.commit()

        # 12. Audit Logs
        logs_data = [
            AuditLog(
                organization_id=acme_org.id,
                user_id=ciso_user.id,
                action="Evidence Uploaded",
                entity_type="Evidence",
                entity_id=evidence_data[0].id,
                details="Uploaded Okta_MFA_Enforcement_Policy_2026.pdf with AI auto-mapping."
            ),
            AuditLog(
                organization_id=acme_org.id,
                user_id=auditor_user.id,
                action="Control Verified",
                entity_type="Control",
                entity_id=controls_data[0].id,
                details="External auditor David Chen approved mapping for ISO-A.9.2.1."
            ),
            AuditLog(
                organization_id=acme_org.id,
                user_id=admin_user.id,
                action="Tenant Provisioned",
                entity_type="Organization",
                entity_id=acme_org.id,
                details="Super Admin initialized organization Acme Technologies Inc."
            )
        ]
        db.add_all(logs_data)
        db.commit()

        print("Database seeded successfully with organizations, users, roles, controls, evidence, and audit logs!")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
