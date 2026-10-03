import { Role, ActiveView, PageAccessLevel } from '../types';

export interface RoleConfig {
  id: Role;
  name: string;
  title: string;
  department: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  avatar: string;
  defaultPage: ActiveView;
}

export const ROLES_CONFIG: Record<string, RoleConfig> = {
  ciso: {
    id: 'ciso',
    name: 'Enterprise CISO',
    title: 'CISO',
    department: 'Executive Leadership',
    description: 'Chief Information Security Officer — Full enterprise compliance oversight, governance, and policy authority.',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    avatar: '',
    defaultPage: 'overview',
  },
  grc: {
    id: 'grc',
    name: 'GRC Manager',
    title: 'GRC / Compliance Manager',
    department: 'Governance & Compliance',
    description: 'Compliance & Risk Operations — Manages control frameworks, evidence pipelines, gap remediation, and day-to-day audit readiness.',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    avatar: '',
    defaultPage: 'overview',
  },
  internal_auditor: {
    id: 'internal_auditor',
    name: 'Internal Auditor',
    title: 'Internal Auditor',
    department: 'Internal Audit & Risk Assurance',
    description: 'Independent Assurance — Audits controls, performs independent verification, reviews queue items, and monitors complete audit trails.',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    avatar: '',
    defaultPage: 'overview',
  },
  control_owner: {
    id: 'control_owner',
    name: 'Control Owner',
    title: 'Control Owner',
    department: 'Engineering & Infrastructure SecOps',
    description: 'Control Implementer — Directly owns assigned infrastructure, IAM, and DevOps controls; resolves gaps and uploads evidence for assigned domain.',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    avatar: '',
    defaultPage: 'controls',
  },
  evidence_contributor: {
    id: 'evidence_contributor',
    name: 'Evidence Contributor',
    title: 'Evidence Contributor',
    department: 'IT Operations & Cloud Platform',
    description: 'Operational Submitter — Uploads configuration exports, policies, and logs. Focuses strictly on artifact generation and assigned action items.',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    avatar: '',
    defaultPage: 'evidence',
  },
  external_auditor: {
    id: 'external_auditor',
    name: 'External Auditor',
    title: 'External Auditor',
    department: 'Independent CPA / Audit Firm',
    description: 'External Attestation — Evaluates scoped evidence, attests control design and operational effectiveness, signs off on audit review items.',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    avatar: '',
    defaultPage: 'review-queue',
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    title: 'Executive',
    department: 'Board of Directors & Executive Office',
    description: 'Strategic Governance — High-level visibility into enterprise risk posture, framework certification readiness, and executive reporting packs.',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-200',
    avatar: '',
    defaultPage: 'overview',
  },
};

// Aliases for legacy role names
export const ROLE_ALIASES: Record<string, Role> = {
  admin: 'ciso',
  compliance_team: 'grc',
  auditor: 'external_auditor',
  viewer: 'executive',
};

export function normalizeRole(role: Role): Role {
  return ROLE_ALIASES[role] || role;
}

/**
 * EXACT Role-Based Access Control Matrix
 * As defined in enterprise compliance requirements:
 * 
 * Page              CISO   GRC / Compliance  Internal Auditor  Control Owner      Evidence Contributor  External Auditor  Executive
 * Overview          Full   Full              View              Limited            ❌                    Limited           View
 * Evidence Library  Full   Full              View/Review       Assigned only      Create/Upload         Assigned only     ❌
 * Control Center    Full   Full              View/Review       Assigned controls  View assigned         Assigned only     ❌
 * Gap Analysis      Full   Full              View/Review       Assigned gaps      Assigned actions      Assigned only     Summary
 * Review Queue      Full   Full              Full              Assigned items     ❌                    Assigned items    ❌
 * Audit Trail       Full   Full              Full              Assigned scope     Own activity          Audit scope       View
 * Reports           Full   Full              Full              Relevant reports   ❌                    Audit reports     Executive reports
 * Frameworks        Full   Full              View              View               ❌                    View assigned     Summary
 * Settings          Full   Admin/limited     ❌                ❌                 ❌                    ❌                ❌
 */
export const RBAC_MATRIX: Record<ActiveView, Record<Role, PageAccessLevel>> = {
  overview: {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View',
    control_owner: 'Limited',
    evidence_contributor: '❌',
    external_auditor: 'Limited',
    executive: 'View',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Limited',
    viewer: 'View',
  },
  evidence: {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View/Review',
    control_owner: 'Assigned only',
    evidence_contributor: 'Create/Upload',
    external_auditor: 'Assigned only',
    executive: '❌',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Assigned only',
    viewer: '❌',
  },
  controls: {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View/Review',
    control_owner: 'Assigned controls',
    evidence_contributor: 'View assigned',
    external_auditor: 'Assigned only',
    executive: '❌',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Assigned only',
    viewer: '❌',
  },
  gaps: {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View/Review',
    control_owner: 'Assigned gaps',
    evidence_contributor: 'Assigned actions',
    external_auditor: 'Assigned only',
    executive: 'Summary',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Assigned only',
    viewer: 'Summary',
  },
  'review-queue': {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'Full',
    control_owner: 'Assigned items',
    evidence_contributor: '❌',
    external_auditor: 'Assigned items',
    executive: '❌',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Assigned items',
    viewer: '❌',
  },
  'audit-trail': {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'Full',
    control_owner: 'Assigned scope',
    evidence_contributor: 'Own activity',
    external_auditor: 'Audit scope',
    executive: 'View',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Audit scope',
    viewer: 'View',
  },
  reports: {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'Full',
    control_owner: 'Relevant reports',
    evidence_contributor: '❌',
    external_auditor: 'Audit reports',
    executive: 'Executive reports',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'Audit reports',
    viewer: 'Executive reports',
  },
  frameworks: {
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View',
    control_owner: 'View',
    evidence_contributor: '❌',
    external_auditor: 'View assigned',
    executive: 'Summary',
    // Aliases
    admin: 'Full',
    compliance_team: 'Full',
    auditor: 'View assigned',
    viewer: 'Summary',
  },
  settings: {
    ciso: 'Full',
    grc: 'Admin/limited',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
    // Aliases
    admin: 'Full',
    compliance_team: 'Admin/limited',
    auditor: '❌',
    viewer: '❌',
  },
  'super-admin': {
    ciso: 'Full',
    grc: '❌',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
    admin: 'Full',
    compliance_team: '❌',
    auditor: '❌',
    viewer: '❌',
  }
};

/**
 * Get the exact access level for a role on a given page
 */
export function getPageAccess(role: Role, page: ActiveView): PageAccessLevel {
  const normRole = normalizeRole(role);
  const pagePermissions = RBAC_MATRIX[page];
  if (!pagePermissions) return '❌';
  return pagePermissions[normRole] || pagePermissions[role] || '❌';
}

/**
 * Returns true if the user role can navigate to and see the page
 */
export function hasPageAccess(role: Role, page: ActiveView): boolean {
  const access = getPageAccess(role, page);
  return access !== '❌';
}

/**
 * If the current active view is inaccessible for this role, return their primary allowed view
 */
export function getRoleDefaultPage(role: Role): ActiveView {
  const normRole = normalizeRole(role);
  const config = ROLES_CONFIG[normRole];
  if (config && hasPageAccess(role, config.defaultPage)) {
    return config.defaultPage;
  }
  // Fallbacks: find first allowed page
  const pages: ActiveView[] = ['overview', 'evidence', 'controls', 'gaps', 'review-queue', 'audit-trail', 'reports', 'frameworks', 'settings'];
  for (const page of pages) {
    if (hasPageAccess(role, page)) return page;
  }
  return 'evidence';
}

/**
 * Formats badge appearance for an access level
 */
export function getAccessBadge(access: PageAccessLevel): { label: string; badgeClass: string } {
  switch (access) {
    case 'Full':
      return { label: 'Full Access', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'View':
      return { label: 'View Only', badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200' };
    case 'View/Review':
      return { label: 'View & Review', badgeClass: 'bg-sky-50 text-sky-700 border border-sky-200' };
    case 'Limited':
      return { label: 'Limited Scope', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case 'Assigned only':
    case 'Assigned controls':
    case 'Assigned gaps':
    case 'Assigned items':
    case 'Assigned scope':
    case 'View assigned':
      return { label: access, badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200' };
    case 'Create/Upload':
      return { label: 'Create / Upload', badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    case 'Assigned actions':
      return { label: 'Assigned Actions', badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200' };
    case 'Summary':
      return { label: 'Executive Summary', badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200' };
    case 'Own activity':
      return { label: 'Own Activity Only', badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200' };
    case 'Audit scope':
    case 'Audit reports':
      return { label: access, badgeClass: 'bg-cyan-50 text-cyan-700 border border-cyan-200' };
    case 'Relevant reports':
    case 'Executive reports':
      return { label: access, badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200' };
    case 'Admin/limited':
      return { label: 'Admin (Limited)', badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200' };
    case '❌':
    default:
      return { label: 'No Access', badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200' };
  }
}

/**
 * List of the 7 primary roles for display
 */
export const CANONICAL_ROLES: Role[] = [
  'ciso',
  'grc',
  'internal_auditor',
  'control_owner',
  'evidence_contributor',
  'external_auditor',
  'executive'
];

/**
 * List of all pages in the matrix
 */
export const MATRIX_PAGES: { id: ActiveView; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'evidence', label: 'Evidence Library', icon: 'FileText' },
  { id: 'controls', label: 'Control Center', icon: 'ShieldCheck' },
  { id: 'gaps', label: 'Gap Analysis', icon: 'AlertTriangle' },
  { id: 'review-queue', label: 'Review Queue', icon: 'ClipboardCheck' },
  { id: 'audit-trail', label: 'Audit Trail', icon: 'History' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3' },
  { id: 'frameworks', label: 'Frameworks', icon: 'Layers' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];
