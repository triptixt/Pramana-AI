export type Role =
  | 'ciso'
  | 'grc'
  | 'internal_auditor'
  | 'control_owner'
  | 'evidence_contributor'
  | 'external_auditor'
  | 'executive'
  | 'admin'
  | 'auditor'
  | 'compliance_team'
  | 'viewer';

export type PageAccessLevel =
  | 'Full'
  | 'View'
  | 'View/Review'
  | 'Limited'
  | 'Assigned only'
  | 'Create/Upload'
  | 'Assigned controls'
  | 'View assigned'
  | 'Assigned gaps'
  | 'Assigned actions'
  | 'Summary'
  | 'Assigned items'
  | 'Assigned scope'
  | 'Own activity'
  | 'Audit scope'
  | 'Relevant reports'
  | 'Audit reports'
  | 'Executive reports'
  | 'Admin/limited'
  | '❌';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  industry: string;
  plan: 'Enterprise' | 'Growth' | 'Starter';
  auditPeriod: string;
  activeFrameworks: FrameworkId[];
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  roleTitle: string;
  avatar: string;
  organizationId: string;
  organizationName: string;
  lastActive: string;
  status: 'active' | 'pending' | 'inactive';
}

export type FrameworkId = 'iso-27001' | 'soc-2' | 'pci-dss' | 'dpdp';

export interface FrameworkInfo {
  id: FrameworkId;
  name: string;
  code: string;
  version: string;
  description: string;
  totalControls: number;
  coveredControls: number;
  readinessPercentage: number;
  pendingReviews: number;
  openGaps: number;
  status: 'On Track' | 'Attention Needed' | 'Critical Review';
  lastAuditDate: string;
}

export type ProcessingStatus =
  | 'uploaded'
  | 'processing'
  | 'processed'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'superseded'
  | 'mapped'
  | 'needs_review'
  | 'gap_detected';

export type DecisionType = 'ai_suggestion' | 'pending_human_review' | 'human_decision';

export interface EvidenceCitation {
  page: number;
  section: string;
  text: string;
}

export interface EvidenceItem {
  id: string;
  organizationId: string;
  name: string;
  fileName: string;
  fileType: 'pdf' | 'json' | 'png' | 'docx' | 'csv';
  fileSize: string;
  fileHash: string;
  version: string; // e.g. "v1.2"
  expiryDate?: string;
  owner: string;
  ownerAvatar?: string;
  frameworks: FrameworkId[];
  mappedControlIds: string[];
  processingStatus: ProcessingStatus;
  aiConfidence: number;
  aiReasoning: string;
  aiModelInfo?: {
    model: string;
    modelVersion: string;
    promptVersion: string;
    runId: string;
  };
  extractedTextExcerpt: string;
  citations?: EvidenceCitation[];
  missingEvidenceList?: string[];
  uploadDate: string;
  lastUpdated: string;
  decisionType: DecisionType;
  auditorDecision?: 'approved' | 'rejected' | 'requested_evidence';
  auditorName?: string;
  auditorNotes?: string;
  auditorDecisionDate?: string;
  gaps?: string[];
  securityLevel: 'Confidential' | 'Internal' | 'Public' | 'Restricted';
}

export type CoverageState = 'full' | 'partial' | 'none';

export interface ControlItem {
  id: string;
  organizationId: string;
  code: string;
  title: string;
  description: string;
  objective?: string;
  requirementText: string;
  assessmentMethod?: string;
  framework: FrameworkId;
  frameworkVersion: string;
  category: string;
  coverageState: CoverageState;
  mappedEvidenceCount: number;
  evidenceIds: string[];
  aiConfidence: number;
  aiExplanation: string;
  reviewStatus: 'Approved' | 'Pending Review' | 'Needs Evidence' | 'Rejected';
  auditorDecision?: 'approved' | 'rejected' | 'requested_evidence';
  auditorName?: string;
  auditorDecisionDate?: string;
  auditorComments?: string[];
  gapsCount: number;
}

export type GapSeverity = 'critical' | 'high' | 'medium' | 'low';
export type GapStatus = 'open' | 'in_progress' | 'evidence_requested' | 'resolved' | 'rejected' | 'closed' | 'in_remediation' | 'needs_verification';

export interface GapItem {
  id: string;
  organizationId: string;
  title: string;
  framework: FrameworkId;
  controlId: string;
  severity: GapSeverity;
  owner: string;
  dueDate: string;
  status: GapStatus;
  identifiedDate: string;
  whyIdentified: string;
  missingInfo: string;
  recommendedAction: string;
  relatedEvidenceIds: string[];
  remediationNotes?: string;
}

export interface ReviewQueueItem {
  id: string;
  organizationId: string;
  evidenceId: string;
  evidenceName: string;
  evidenceVersion: string;
  fileType: string;
  framework: FrameworkId;
  controlId: string;
  controlTitle: string;
  aiConfidence: number;
  aiReasoning: string;
  evidenceExcerpt: string;
  citations?: EvidenceCitation[];
  missingEvidenceList?: string[];
  potentialConcerns?: string;
  assignedAuditor: string;
  lastUpdated: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'evidence_requested';
  decisionType: DecisionType;
  humanDecisionDate?: string;
  humanDecisionBy?: string;
  auditorNotes?: string;
}

export interface AuditTrailLog {
  id: string;
  organizationId: string;
  timestamp: string;
  actor: {
    name: string;
    email: string;
    role: string;
    type: 'user' | 'ai' | 'auditor';
  };
  action: string;
  resourceType: 'Evidence' | 'Control' | 'Gap' | 'Framework' | 'User' | 'System';
  resourceId: string;
  resourceName: string;
  framework?: FrameworkId;
  details: string;
  previousState?: string;
  newState?: string;
  ipAddress: string;
  integrityVerified: boolean;
  sha256Hash: string;
}

export interface NotificationItem {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'review_required' | 'gap_alert' | 'evidence_uploaded' | 'system';
  linkTarget?: string;
}

export type ActiveView =
  | 'overview'
  | 'evidence'
  | 'controls'
  | 'gaps'
  | 'review-queue'
  | 'audit-trail'
  | 'reports'
  | 'frameworks'
  | 'super-admin'
  | 'settings';
