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

export const ROLES_CONFIG: Record<Role, RoleConfig> = {
  super_admin: {
    id: 'super_admin',
    name: 'Super Admin',
    title: 'Super Admin',
    department: 'Platform Administration',
    description: 'Platform Super Administrator — Full system configuration, organization onboarding, and user management.',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-300',
    avatar: '',
    defaultPage: 'super-admin',
  },
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

// Aliases for legacy role names to canonical 8 roles
export const ROLE_ALIASES: Record<string, Role> = {
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  admin: 'super_admin',
  ciso: 'ciso',
  vciso: 'ciso',
  grc: 'grc',
  compliance_team: 'grc',
  compliance_manager: 'grc',
  internal_auditor: 'internal_auditor',
  control_owner: 'control_owner',
  evidence_contributor: 'evidence_contributor',
  external_auditor: 'external_auditor',
  auditor: 'external_auditor',
  executive: 'executive',
  viewer: 'executive',
};

export function normalizeRole(role: string): Role {
  if (!role) return 'executive';
  const clean = role.toLowerCase().trim();
  return ROLE_ALIASES[clean] || (clean as Role) || 'executive';
}

/**
 * EXACT Role-Based Access Control Matrix
 * For the 8 canonical enterprise compliance roles:
 */
export const RBAC_MATRIX: Record<ActiveView, Record<Role, PageAccessLevel>> = {
  overview: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View',
    control_owner: 'Limited',
    evidence_contributor: '❌',
    external_auditor: 'Limited',
    executive: 'View',
  },
  'select-frameworks': {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: 'Full',
    external_auditor: '❌',
    executive: '❌',
  },
  evidence: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View/Review',
    control_owner: 'Assigned only',
    evidence_contributor: 'Create/Upload',
    external_auditor: 'Assigned only',
    executive: '❌',
  },
  controls: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View/Review',
    control_owner: 'Assigned controls',
    evidence_contributor: 'View assigned',
    external_auditor: 'Assigned only',
    executive: '❌',
  },
  gaps: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View/Review',
    control_owner: 'Assigned gaps',
    evidence_contributor: 'Assigned actions',
    external_auditor: 'Assigned only',
    executive: 'Summary',
  },
  'review-queue': {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'Full',
    control_owner: 'Assigned items',
    evidence_contributor: '❌',
    external_auditor: 'Assigned items',
    executive: '❌',
  },
  'audit-trail': {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'Full',
    control_owner: 'Assigned scope',
    evidence_contributor: 'Own activity',
    external_auditor: 'Audit scope',
    executive: 'View',
  },
  reports: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'Full',
    control_owner: 'Relevant reports',
    evidence_contributor: '❌',
    external_auditor: 'Audit reports',
    executive: 'Executive reports',
  },
  frameworks: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: 'Full',
    internal_auditor: 'View',
    control_owner: 'View',
    evidence_contributor: '❌',
    external_auditor: 'View assigned',
    executive: 'Summary',
  },
  settings: {
    super_admin: 'Full',
    ciso: 'Full',
    grc: '❌',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
  },
  'super-admin': {
    super_admin: 'Full',
    ciso: '❌',
    grc: '❌',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
  },
  'admin-organizations': {
    super_admin: 'Full',
    ciso: '❌',
    grc: '❌',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
  },
  'admin-frameworks': {
    super_admin: 'Full',
    ciso: '❌',
    grc: '❌',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
  },
  'admin-users': {
    super_admin: 'Full',
    ciso: '❌',
    grc: '❌',
    internal_auditor: '❌',
    control_owner: '❌',
    evidence_contributor: '❌',
    external_auditor: '❌',
    executive: '❌',
  }
};

/**
 * Get the exact access level for a role on a given page
 */
export function getPageAccess(role: string, page: ActiveView): PageAccessLevel {
  const normRole = normalizeRole(role);
  const pagePermissions = RBAC_MATRIX[page];
  if (!pagePermissions) return '❌';
  return pagePermissions[normRole] || '❌';
}

/**
 * Returns true if the user role can navigate to and see the page
 */
export function hasPageAccess(role: string, page: ActiveView): boolean {
  const access = getPageAccess(role, page);
  return access !== '❌';
}

/**
 * If the current active view is inaccessible for this role, return their primary allowed view
 */
export function getRoleDefaultPage(role: string): ActiveView {
  const normRole = normalizeRole(role);
  if (normRole === 'super_admin') {
    return 'super-admin';
  }
  const config = ROLES_CONFIG[normRole];
  if (config && hasPageAccess(normRole, config.defaultPage)) {
    return config.defaultPage;
  }
  // Fallbacks: find first allowed page
  const pages: ActiveView[] = ['overview', 'evidence', 'controls', 'gaps', 'review-queue', 'audit-trail', 'reports', 'frameworks', 'settings'];
  for (const page of pages) {
    if (hasPageAccess(normRole, page)) return page;
  }
  return 'overview';
}

/**
 * Formats badge appearance for an access level
 */
export function getAccessBadge(access: PageAccessLevel): { label: string; badgeClass: string } {
  switch (access) {
    case 'Full':
      return { label: 'Full Access', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'View':
      return { label: 'View Only', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'View/Review':
      return { label: 'View & Review', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case 'Limited':
      return { label: 'Limited Access', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'Assigned only':
      return { label: 'Assigned Only', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'Create/Upload':
      return { label: 'Create / Upload', badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'Assigned controls':
      return { label: 'Assigned Controls', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'View assigned':
      return { label: 'View Assigned', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'Assigned gaps':
      return { label: 'Assigned Gaps', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'Assigned actions':
      return { label: 'Assigned Actions', badgeClass: 'bg-teal-100 text-teal-800 border-teal-300' };
    case 'Summary':
      return { label: 'Summary View', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' };
    case 'Assigned items':
      return { label: 'Assigned Items', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'Assigned scope':
      return { label: 'Assigned Scope', badgeClass: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 'Own activity':
      return { label: 'Own Activity', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'Audit scope':
      return { label: 'Audit Scope', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' };
    case 'Relevant reports':
      return { label: 'Relevant Reports', badgeClass: 'bg-blue-100 text-blue-800 border-blue-300' };
    case 'Audit reports':
      return { label: 'Audit Reports', badgeClass: 'bg-sky-100 text-sky-800 border-sky-300' };
    case 'Executive reports':
      return { label: 'Executive Reports', badgeClass: 'bg-purple-100 text-purple-800 border-purple-300' };
    case 'Admin/limited':
      return { label: 'Admin (Limited)', badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
    case '❌':
    default:
      return { label: 'No Access', badgeClass: 'bg-rose-100 text-rose-700 border-rose-300' };
  }
}
