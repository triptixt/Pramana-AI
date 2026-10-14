-- =====================================================================
-- Pramana AI — Database Structure & Relationship Audit Remediation Script
-- Version: 001
-- Date: 2026-10-13
-- Description: Applies missing unique constraints, foreign key delete rules,
--              structural AI/Audit columns, pgvector HNSW indexes,
--              nullability alignments, and enum check constraints.
-- =====================================================================

BEGIN;

-- =========================================================
-- PART 1: Unique Constraints
-- =========================================================

-- 1. roles(organization_id, name)
ALTER TABLE roles DROP CONSTRAINT IF EXISTS uq_roles_organization_name;
ALTER TABLE roles ADD CONSTRAINT uq_roles_organization_name
  UNIQUE (organization_id, name);

-- 2. framework_versions(framework_id, version)
ALTER TABLE framework_versions DROP CONSTRAINT IF EXISTS uq_framework_versions_framework_id_version;
ALTER TABLE framework_versions ADD CONSTRAINT uq_framework_versions_framework_id_version
  UNIQUE (framework_id, version);

-- 3. controls(framework_version_id, control_code)
ALTER TABLE controls DROP CONSTRAINT IF EXISTS uq_controls_framework_version_code;
ALTER TABLE controls ADD CONSTRAINT uq_controls_framework_version_code
  UNIQUE (framework_version_id, control_code);

-- 4. evidence_versions(evidence_id, version_number)
ALTER TABLE evidence_versions DROP CONSTRAINT IF EXISTS uq_evidence_versions_evidence_version;
ALTER TABLE evidence_versions ADD CONSTRAINT uq_evidence_versions_evidence_version
  UNIQUE (evidence_id, version_number);

-- 5. evidence_chunks(evidence_version_id, chunk_index)
ALTER TABLE evidence_chunks DROP CONSTRAINT IF EXISTS uq_evidence_chunks_version_index;
ALTER TABLE evidence_chunks ADD CONSTRAINT uq_evidence_chunks_version_index
  UNIQUE (evidence_version_id, chunk_index);

-- 6. evidence_control_mappings(evidence_id, control_id)
ALTER TABLE evidence_control_mappings DROP CONSTRAINT IF EXISTS uq_evidence_control_mappings_pair;
ALTER TABLE evidence_control_mappings ADD CONSTRAINT uq_evidence_control_mappings_pair
  UNIQUE (evidence_id, control_id);

-- 7. control_relationships(source_control_id, target_control_id, relationship_type)
ALTER TABLE control_relationships DROP CONSTRAINT IF EXISTS uq_control_relationships_pair;
ALTER TABLE control_relationships ADD CONSTRAINT uq_control_relationships_pair
  UNIQUE (source_control_id, target_control_id, relationship_type);

-- 8. organization_frameworks(organization_id, framework_id)
ALTER TABLE organization_frameworks DROP CONSTRAINT IF EXISTS uq_org_framework_org_framework;
ALTER TABLE organization_frameworks ADD CONSTRAINT uq_org_framework_org_framework
  UNIQUE (organization_id, framework_id);

-- 9. gap_analysis(organization_id, control_id)
ALTER TABLE gap_analysis DROP CONSTRAINT IF EXISTS uq_gap_analysis_org_control;
ALTER TABLE gap_analysis ADD CONSTRAINT uq_gap_analysis_org_control
  UNIQUE (organization_id, control_id);


-- =========================================================
-- PART 2: Structural Columns for AI-Audit & Control Integrity
-- =========================================================

-- Add audit_id to ai_runs (link assessment run to formal audit)
ALTER TABLE ai_runs ADD COLUMN IF NOT EXISTS audit_id INTEGER;
ALTER TABLE ai_runs DROP CONSTRAINT IF EXISTS ai_runs_audit_id_fkey;
ALTER TABLE ai_runs ADD CONSTRAINT ai_runs_audit_id_fkey
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL;

-- Add audit_id to gap_analysis (link gap finding to formal audit)
ALTER TABLE gap_analysis ADD COLUMN IF NOT EXISTS audit_id INTEGER;
ALTER TABLE gap_analysis DROP CONSTRAINT IF EXISTS gap_analysis_audit_id_fkey;
ALTER TABLE gap_analysis ADD CONSTRAINT gap_analysis_audit_id_fkey
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE SET NULL;

-- Add control_id to ai_outputs (direct FK instead of parsing JSON)
ALTER TABLE ai_outputs ADD COLUMN IF NOT EXISTS control_id INTEGER;
ALTER TABLE ai_outputs DROP CONSTRAINT IF EXISTS ai_outputs_control_id_fkey;
ALTER TABLE ai_outputs ADD CONSTRAINT ai_outputs_control_id_fkey
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE SET NULL;

-- Indexes on new foreign keys
CREATE INDEX IF NOT EXISTS ix_ai_runs_audit_id ON ai_runs(audit_id);
CREATE INDEX IF NOT EXISTS ix_gap_analysis_audit_id ON gap_analysis(audit_id);
CREATE INDEX IF NOT EXISTS ix_ai_outputs_control_id ON ai_outputs(control_id);


-- =========================================================
-- PART 3: Foreign Key ON DELETE Cascades & SET NULL
-- =========================================================

-- ai_outputs -> ai_runs (CASCADE)
ALTER TABLE ai_outputs DROP CONSTRAINT IF EXISTS ai_outputs_ai_run_id_fkey;
ALTER TABLE ai_outputs ADD CONSTRAINT ai_outputs_ai_run_id_fkey
  FOREIGN KEY (ai_run_id) REFERENCES ai_runs(id) ON DELETE CASCADE;

-- ai_runs -> organizations (CASCADE)
ALTER TABLE ai_runs DROP CONSTRAINT IF EXISTS ai_runs_organization_id_fkey;
ALTER TABLE ai_runs ADD CONSTRAINT ai_runs_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- ai_runs -> evidence (SET NULL)
ALTER TABLE ai_runs DROP CONSTRAINT IF EXISTS ai_runs_evidence_id_fkey;
ALTER TABLE ai_runs ADD CONSTRAINT ai_runs_evidence_id_fkey
  FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE SET NULL;

-- ai_runs -> users (SET NULL)
ALTER TABLE ai_runs DROP CONSTRAINT IF EXISTS ai_runs_triggered_by_fkey;
ALTER TABLE ai_runs ADD CONSTRAINT ai_runs_triggered_by_fkey
  FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL;

-- audits -> organizations (CASCADE)
ALTER TABLE audits DROP CONSTRAINT IF EXISTS audits_organization_id_fkey;
ALTER TABLE audits ADD CONSTRAINT audits_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- audits -> users (SET NULL)
ALTER TABLE audits ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE audits DROP CONSTRAINT IF EXISTS audits_created_by_fkey;
ALTER TABLE audits ADD CONSTRAINT audits_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- audit_reviews -> audits (CASCADE)
ALTER TABLE audit_reviews DROP CONSTRAINT IF EXISTS audit_reviews_audit_id_fkey;
ALTER TABLE audit_reviews ADD CONSTRAINT audit_reviews_audit_id_fkey
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE;

-- audit_reviews -> users (SET NULL)
ALTER TABLE audit_reviews ALTER COLUMN reviewer_id DROP NOT NULL;
ALTER TABLE audit_reviews DROP CONSTRAINT IF EXISTS audit_reviews_reviewer_id_fkey;
ALTER TABLE audit_reviews ADD CONSTRAINT audit_reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL;

-- audit_decisions -> audits (CASCADE)
ALTER TABLE audit_decisions DROP CONSTRAINT IF EXISTS audit_decisions_audit_id_fkey;
ALTER TABLE audit_decisions ADD CONSTRAINT audit_decisions_audit_id_fkey
  FOREIGN KEY (audit_id) REFERENCES audits(id) ON DELETE CASCADE;

-- audit_decisions -> users (SET NULL)
ALTER TABLE audit_decisions ALTER COLUMN decided_by DROP NOT NULL;
ALTER TABLE audit_decisions DROP CONSTRAINT IF EXISTS audit_decisions_decided_by_fkey;
ALTER TABLE audit_decisions ADD CONSTRAINT audit_decisions_decided_by_fkey
  FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL;

-- audit_logs -> organizations (CASCADE)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_organization_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- audit_logs -> users (SET NULL)
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- framework_versions -> frameworks (CASCADE)
ALTER TABLE framework_versions DROP CONSTRAINT IF EXISTS framework_versions_framework_id_fkey;
ALTER TABLE framework_versions ADD CONSTRAINT framework_versions_framework_id_fkey
  FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE;

-- controls -> framework_versions (CASCADE)
ALTER TABLE controls DROP CONSTRAINT IF EXISTS controls_framework_version_id_fkey;
ALTER TABLE controls ADD CONSTRAINT controls_framework_version_id_fkey
  FOREIGN KEY (framework_version_id) REFERENCES framework_versions(id) ON DELETE CASCADE;

-- control_relationships -> controls (CASCADE)
ALTER TABLE control_relationships DROP CONSTRAINT IF EXISTS control_relationships_source_control_id_fkey;
ALTER TABLE control_relationships ADD CONSTRAINT control_relationships_source_control_id_fkey
  FOREIGN KEY (source_control_id) REFERENCES controls(id) ON DELETE CASCADE;

ALTER TABLE control_relationships DROP CONSTRAINT IF EXISTS control_relationships_target_control_id_fkey;
ALTER TABLE control_relationships ADD CONSTRAINT control_relationships_target_control_id_fkey
  FOREIGN KEY (target_control_id) REFERENCES controls(id) ON DELETE CASCADE;

-- evidence -> users (SET NULL)
ALTER TABLE evidence ALTER COLUMN uploaded_by DROP NOT NULL;
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS evidence_uploaded_by_fkey;
ALTER TABLE evidence ADD CONSTRAINT evidence_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

-- evidence_versions -> evidence (CASCADE)
ALTER TABLE evidence_versions DROP CONSTRAINT IF EXISTS evidence_versions_evidence_id_fkey;
ALTER TABLE evidence_versions ADD CONSTRAINT evidence_versions_evidence_id_fkey
  FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE;

-- evidence_versions -> users (SET NULL)
ALTER TABLE evidence_versions ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE evidence_versions DROP CONSTRAINT IF EXISTS evidence_versions_created_by_fkey;
ALTER TABLE evidence_versions ADD CONSTRAINT evidence_versions_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- evidence_chunks -> evidence_versions (CASCADE)
ALTER TABLE evidence_chunks DROP CONSTRAINT IF EXISTS evidence_chunks_evidence_version_id_fkey;
ALTER TABLE evidence_chunks ADD CONSTRAINT evidence_chunks_evidence_version_id_fkey
  FOREIGN KEY (evidence_version_id) REFERENCES evidence_versions(id) ON DELETE CASCADE;

-- evidence_control_mappings -> evidence & controls (CASCADE)
ALTER TABLE evidence_control_mappings DROP CONSTRAINT IF EXISTS evidence_control_mappings_evidence_id_fkey;
ALTER TABLE evidence_control_mappings ADD CONSTRAINT evidence_control_mappings_evidence_id_fkey
  FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE;

ALTER TABLE evidence_control_mappings DROP CONSTRAINT IF EXISTS evidence_control_mappings_control_id_fkey;
ALTER TABLE evidence_control_mappings ADD CONSTRAINT evidence_control_mappings_control_id_fkey
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE;

-- evidence_requests -> organizations & controls (CASCADE)
ALTER TABLE evidence_requests DROP CONSTRAINT IF EXISTS evidence_requests_organization_id_fkey;
ALTER TABLE evidence_requests ADD CONSTRAINT evidence_requests_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE evidence_requests DROP CONSTRAINT IF EXISTS evidence_requests_control_id_fkey;
ALTER TABLE evidence_requests ADD CONSTRAINT evidence_requests_control_id_fkey
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE;

-- evidence_requests -> users (SET NULL)
ALTER TABLE evidence_requests ALTER COLUMN requested_by DROP NOT NULL;
ALTER TABLE evidence_requests DROP CONSTRAINT IF EXISTS evidence_requests_requested_by_fkey;
ALTER TABLE evidence_requests ADD CONSTRAINT evidence_requests_requested_by_fkey
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE evidence_requests DROP CONSTRAINT IF EXISTS evidence_requests_assigned_to_fkey;
ALTER TABLE evidence_requests ADD CONSTRAINT evidence_requests_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL;

-- gap_analysis -> organizations & controls (CASCADE)
ALTER TABLE gap_analysis DROP CONSTRAINT IF EXISTS gap_analysis_organization_id_fkey;
ALTER TABLE gap_analysis ADD CONSTRAINT gap_analysis_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE gap_analysis DROP CONSTRAINT IF EXISTS gap_analysis_control_id_fkey;
ALTER TABLE gap_analysis ADD CONSTRAINT gap_analysis_control_id_fkey
  FOREIGN KEY (control_id) REFERENCES controls(id) ON DELETE CASCADE;

-- organization_frameworks -> org & frameworks (CASCADE), framework_version (SET NULL)
ALTER TABLE organization_frameworks DROP CONSTRAINT IF EXISTS organization_frameworks_organization_id_fkey;
ALTER TABLE organization_frameworks ADD CONSTRAINT organization_frameworks_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE organization_frameworks DROP CONSTRAINT IF EXISTS organization_frameworks_framework_id_fkey;
ALTER TABLE organization_frameworks ADD CONSTRAINT organization_frameworks_framework_id_fkey
  FOREIGN KEY (framework_id) REFERENCES frameworks(id) ON DELETE CASCADE;

ALTER TABLE organization_frameworks DROP CONSTRAINT IF EXISTS organization_frameworks_framework_version_id_fkey;
ALTER TABLE organization_frameworks ADD CONSTRAINT organization_frameworks_framework_version_id_fkey
  FOREIGN KEY (framework_version_id) REFERENCES framework_versions(id) ON DELETE SET NULL;

-- roles & permissions (CASCADE)
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_organization_id_fkey;
ALTER TABLE roles ADD CONSTRAINT roles_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_fkey;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_id_fkey;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE;

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_id_fkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
ALTER TABLE users ADD CONSTRAINT users_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;


-- =========================================================
-- PART 4: Column Defaults & Nullability Alignment
-- =========================================================

-- Align controls.is_active to NOT NULL DEFAULT true
UPDATE controls SET is_active = true WHERE is_active IS NULL;
ALTER TABLE controls ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE controls ALTER COLUMN is_active SET NOT NULL;

-- Align frameworks.is_active to NOT NULL DEFAULT true
UPDATE frameworks SET is_active = true WHERE is_active IS NULL;
ALTER TABLE frameworks ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE frameworks ALTER COLUMN is_active SET NOT NULL;

-- Align frameworks.created_at to NOT NULL DEFAULT now()
UPDATE frameworks SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE frameworks ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE frameworks ALTER COLUMN created_at SET NOT NULL;


-- =========================================================
-- PART 5: pgvector HNSW Indexes & Check Constraints
-- =========================================================

-- Vector HNSW indexes
CREATE INDEX IF NOT EXISTS ix_evidence_chunks_embedding_hnsw
  ON evidence_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS ix_controls_embedding_hnsw
  ON controls USING hnsw (embedding vector_cosine_ops);

-- Enum check constraints
ALTER TABLE evidence DROP CONSTRAINT IF EXISTS chk_evidence_status;
ALTER TABLE evidence ADD CONSTRAINT chk_evidence_status
  CHECK (status IN ('uploaded', 'processing', 'processed', 'failed', 'error', 'archived'));

ALTER TABLE gap_analysis DROP CONSTRAINT IF EXISTS chk_gap_analysis_status;
ALTER TABLE gap_analysis ADD CONSTRAINT chk_gap_analysis_status
  CHECK (status IN ('open', 'in_progress', 'resolved', 'remediated', 'accepted', 'closed'));

ALTER TABLE gap_analysis DROP CONSTRAINT IF EXISTS chk_gap_analysis_severity;
ALTER TABLE gap_analysis ADD CONSTRAINT chk_gap_analysis_severity
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE ai_runs DROP CONSTRAINT IF EXISTS chk_ai_runs_status;
ALTER TABLE ai_runs ADD CONSTRAINT chk_ai_runs_status
  CHECK (status IN ('pending', 'running', 'completed', 'failed', 'partially_failed'));

COMMIT;
