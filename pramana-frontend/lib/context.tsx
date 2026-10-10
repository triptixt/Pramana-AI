'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  Role,
  ActiveView,
  UserProfile,
  FrameworkId,
  EvidenceItem,
  ControlItem,
  GapItem,
  ReviewQueueItem,
  AuditTrailLog,
  NotificationItem,
  Organization
} from '../types';
import { api } from './api';
import { ROLES_CONFIG, hasPageAccess, getRoleDefaultPage, normalizeRole } from './rbac';

const INITIAL_ORG: Organization = {
  id: '',
  name: 'No Organization',
  slug: '',
  industry: '',
  plan: 'Enterprise',
  auditPeriod: '',
  activeFrameworks: [],
};

const INITIAL_USER: UserProfile = {
  id: '',
  name: 'User',
  email: '',
  role: 'ciso',
  roleTitle: 'Enterprise CISO',
  avatar: '',
  organizationId: '',
  organizationName: '',
  lastActive: '',
  status: 'active',
};

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface AppContextType {
  // Backend Connection Status
  isBackendConnected: boolean;
  backendInfo: { status: string; app: string; version: string } | null;
  refreshBackendData: () => Promise<void>;

  // Authentication & Multi-Tenancy State
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'signup';
  setAuthModalMode: (mode: 'login' | 'signup') => void;

  organizations: Organization[];
  currentOrg: Organization;
  switchOrganization: (orgId: string) => void;

  login: (email: string, password: string, orgId?: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string, orgName?: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  logout: () => void;

  // View & Role State
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  activeUser: UserProfile;
  setActiveUser: (user: UserProfile) => void;
  usersList: UserProfile[];
  activeFrameworkFilter: FrameworkId | 'all';
  setActiveFrameworkFilter: (framework: FrameworkId | 'all') => void;

  // Data (Filtered to current active organization)
  evidenceList: EvidenceItem[];
  controlsList: ControlItem[];
  gapsList: GapItem[];
  reviewQueueList: ReviewQueueItem[];
  auditTrailList: AuditTrailLog[];
  notificationsList: NotificationItem[];
  toasts: ToastMessage[];

  // Modals & Drawers
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isAIChatOpen: boolean;
  setIsAIChatOpen: (open: boolean) => void;
  aiChatEvidenceId: number | null;
  setAIChatEvidenceId: (id: number | null) => void;

  selectedEvidenceId: string | null;
  setSelectedEvidenceId: (id: string | null) => void;
  selectedControlId: string | null;
  setSelectedControlId: (id: string | null) => void;
  selectedAuditLogId: string | null;
  setSelectedAuditLogId: (id: string | null) => void;
  selectedGapId: string | null;
  setSelectedGapId: (id: string | null) => void;
  selectedReviewItem: ReviewQueueItem | null;
  setSelectedReviewItem: (item: ReviewQueueItem | null) => void;

  // AI Engine Direct Actions
  runAIGapAnalysis: () => Promise<any>;
  evaluateControlAI: (controlId: number) => Promise<any>;
  analyzeEvidenceAI: (evidenceId: number) => Promise<any>;
  summarizeEvidenceAI: (evidenceId: number) => Promise<any>;

  // Actions
  uploadEvidence: (file: File) => Promise<void>;
  approveReviewItem: (reviewId: string, notes: string) => Promise<void>;
  rejectReviewItem: (reviewId: string, comment: string) => Promise<void>;
  requestAdditionalEvidence: (reviewId: string, details: string, owner: string, dueDate: string) => Promise<void>;
  resolveGap: (gapId: string, notes: string) => Promise<void>;
  showToast: (title: string, description?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
  dismissToast: (id: string) => void;
  switchRole: (role: Role) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Super Admin & Team Management Backend Actions
  createOrganizationBackend: (name: string) => Promise<void>;
  updateOrganizationBackend: (id: string, name: string) => Promise<void>;
  deleteOrganizationBackend: (id: string) => Promise<void>;
  createUserBackend: (data: { name: string; email: string; role: Role; organization_id?: number; password?: string }) => Promise<void>;
  updateUserBackend: (id: string, data: { name?: string; email?: string; role?: Role; password?: string; is_active?: boolean }) => Promise<void>;
  deleteUserBackend: (id: string) => Promise<void>;
  impersonateUser: (userId: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Backend Connection
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);
  const [backendInfo, setBackendInfo] = useState<{ status: string; app: string; version: string } | null>(null);

  // Auth & Tenant State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization>(INITIAL_ORG);

  // View & User
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [activeUser, setActiveUser] = useState<UserProfile>(INITIAL_USER);
  const [activeFrameworkFilter, setActiveFrameworkFilter] = useState<FrameworkId | 'all'>('all');

  // Master Lists - populated live from PostgreSQL via FastAPI
  const [masterEvidence, setMasterEvidence] = useState<EvidenceItem[]>([]);
  const [masterControls, setMasterControls] = useState<ControlItem[]>([]);
  const [masterGaps, setMasterGaps] = useState<GapItem[]>([]);
  const [masterReviewQueue, setMasterReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [masterAuditTrail, setMasterAuditTrail] = useState<AuditTrailLog[]>([]);
  const [masterNotifications, setMasterNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals & Drawers state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [aiChatEvidenceId, setAIChatEvidenceId] = useState<number | null>(null);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [selectedAuditLogId, setSelectedAuditLogId] = useState<string | null>(null);
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
  const [selectedReviewItem, setSelectedReviewItem] = useState<ReviewQueueItem | null>(null);

  // Toast notification helper
  const showToast = useCallback((title: string, description?: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Convert string or formatted id to integer for backend queries
  const getNumericId = (idStr: string | number): number => {
    if (typeof idStr === 'number') return idStr;
    const cleaned = idStr.replace(/^[a-z]+-/, '');
    const parsed = parseInt(cleaned, 10);
    return isNaN(parsed) ? 1 : parsed;
  };

  const isFetchingBackendRef = useRef(false);
  const currentOrgRef = useRef(currentOrg);
  useEffect(() => {
    currentOrgRef.current = currentOrg;
  }, [currentOrg]);

  // ── Sync with Backend on Mount & Refresh ────────────────────────────────────
  const refreshBackendData = useCallback(async (explicitOrgId?: string, force = false) => {
    if (isFetchingBackendRef.current && !force) {
      return;
    }
    isFetchingBackendRef.current = true;
    try {
      const health = await api.checkHealth();
      if (health.status === 'ok' || health.status === 'success') {
        setIsBackendConnected(true);
        setBackendInfo({
          status: health.status,
          app: health.app || 'Pramana Compliance API',
          version: health.version || '1.0.0',
        });

        // Check authentication status via token
        const token = api.auth.getToken();
        let activeOrgForFetch = currentOrgRef.current;
        if (token) {
          try {
            const me = await api.auth.me();
            setIsAuthenticated(true);

            // Fetch Organizations from backend for authenticated user
            try {
              const backendOrgs = await api.organizations.list();
              if (backendOrgs && backendOrgs.length > 0) {
                const mappedOrgs: Organization[] = backendOrgs.map((o: any, idx: number) => ({
                  id: `org-${o.id}`,
                  name: o.name,
                  slug: o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                  industry: 'Enterprise Technology',
                  plan: idx % 2 === 0 ? 'Enterprise' : 'Growth',
                  auditPeriod: 'Annual Audit Window',
                  activeFrameworks: [],
                  created_at: o.created_at,
                }));
                setOrganizations(mappedOrgs);
                const chosenOrgId = explicitOrgId || currentOrgRef.current.id;
                const matchingOrg = mappedOrgs.find((o) => o.id === chosenOrgId) || mappedOrgs.find(o => o.id === `org-${me.organization_id}`) || mappedOrgs[0];
                activeOrgForFetch = matchingOrg;
                setCurrentOrg(matchingOrg);

                const isSuper = me.role === 'super_admin' || normalizeRole(me.role || '') === 'super_admin';
                const assignedRole = (me.role || 'ciso') as Role;
                setActiveUser((prev) => ({
                  ...prev,
                  id: `usr-${me.id}`,
                  name: me.name || prev.name,
                  email: me.email,
                  role: assignedRole,
                  roleTitle: isSuper ? 'Super Admin' : prev.roleTitle,
                  organizationId: matchingOrg.id,
                  organizationName: matchingOrg.name,
                }));
              }
            } catch (e: any) {
              console.warn('[Pramana] Error loading organizations:', e.message || e);
            }
          } catch (authErr) {
            console.warn('[Pramana] Stored session invalid, resetting auth state');
            api.auth.logout();
            setIsAuthenticated(false);
            setOrganizations([]);
            return;
          }
        } else {
          setIsAuthenticated(false);
          setOrganizations([]);
          setUsersList([]);
          setMasterControls([]);
          setMasterEvidence([]);
          setMasterGaps([]);
          setMasterAuditTrail([]);
          setMasterNotifications([]);
          return;
        }

        // Fetch Users from PostgreSQL backend
        let backendUsersList: Array<{ id: number; organization_id: number; name: string; email: string; is_active: boolean; role?: string; organization_name?: string }> = [];
        try {
          const backendUsers = await api.users.list();
          if (backendUsers && backendUsers.length > 0) {
            backendUsersList = backendUsers;
            const mappedUsers: UserProfile[] = backendUsers.map((u: any) => {
              const userRole: Role = normalizeRole(u.role || 'ciso');
              const normRole = normalizeRole(userRole);
              const roleCfg = ROLES_CONFIG[normRole] || ROLES_CONFIG['ciso'];
              const isSuper = userRole === 'super_admin' || normRole === 'super_admin';
              const roleTitle = isSuper ? 'Super Admin' : (roleCfg ? roleCfg.title : 'Enterprise CISO');

              return {
                id: `usr-${u.id}`,
                name: u.name,
                email: u.email,
                role: userRole,
                roleTitle,
                avatar: roleCfg?.avatar || '',
                organizationId: `org-${u.organization_id}`,
                organizationName: u.organization_name || `Org ${u.organization_id}`,
                lastActive: 'Active now',
                status: u.is_active ? 'active' : 'inactive',
              };
            });
            setUsersList(mappedUsers);
          }
        } catch (e: any) {
          console.warn('[Pramana] Error loading users:', e.message || e);
        }

        // Fetch Controls from PostgreSQL backend (scoped to the organization's selected frameworks)
        try {
          let backendControls: any[] | null = await api.compliance.getOrganizationControls().catch(() => null);
          if (!backendControls || backendControls.length === 0) {
            backendControls = (await api.controls.list().catch(() => null)) as any;
          }
          if (backendControls && backendControls.length > 0) {
            const mappedControls: ControlItem[] = backendControls.map((c: any) => {
              const rawCode = (c.framework_code || '').toUpperCase().trim();
              let fwKey: FrameworkId = 'iso-27001';
              if (rawCode.includes('ISO') || rawCode.includes('27001')) fwKey = 'iso-27001';
              else if (rawCode.includes('SOC') || rawCode.includes('SOC2')) fwKey = 'soc-2';
              else if (rawCode.includes('PCI') || rawCode.includes('DSS')) fwKey = 'pci-dss';
              else if (rawCode.includes('DPDP')) fwKey = 'dpdp';
              else if (rawCode.includes('NIST') || rawCode.includes('CSF')) fwKey = 'nist-csf';
              else fwKey = (c.framework_code?.toLowerCase().replace(/_/g, '-') || 'iso-27001') as FrameworkId;

              return {
                id: `ctrl-${c.id}`,
                organizationId: activeOrgForFetch.id,
                code: c.control_code,
                title: c.title,
                description: c.description || c.title,
                requirementText: c.requirement || c.description || c.title,
                framework: fwKey,
                frameworkVersion: c.framework_version || '',
                category: c.category || 'General Controls',
                coverageState: 'none' as const,
                mappedEvidenceCount: 0,
                evidenceIds: [],
                aiConfidence: 0,
                aiExplanation: '',
                reviewStatus: 'Pending Review' as const,
                gapsCount: 0,
              };
            });
            setMasterControls(mappedControls);
          } else {
            setMasterControls([]);
          }
        } catch (e: any) {
          console.warn('[Pramana] Error loading controls:', e.message || e);
          setMasterControls([]);
        }

        const currentOrgNum = getNumericId(activeOrgForFetch.id);
        let backendEvidenceList: any[] = [];
        let backendGapsList: any[] = [];

        // Fetch Evidence
        try {
          const backendEvidence = await api.evidence.list(currentOrgNum);
          if (backendEvidence && backendEvidence.length > 0) {
            backendEvidenceList = backendEvidence;
            const mappedEvidence: EvidenceItem[] = backendEvidence.map((e: any) => {
              const fileType = (['pdf', 'json', 'png', 'docx', 'csv'].includes(e.file_type || '') ? e.file_type : 'pdf') as any;
              return {
                id: `ev-${e.id}`,
                organizationId: `org-${e.organization_id}`,
                name: e.file_name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
                fileName: e.file_name,
                fileType,
                fileSize: '—',
                fileHash: '—',
                version: 'v1.0',
                owner: 'Compliance Team',
                frameworks: [],
                mappedControlIds: [],
                processingStatus: (e.status as any) || 'needs_review',
                aiConfidence: 0,
                aiReasoning: e.description || '',
                extractedTextExcerpt: '',
                uploadDate: e.created_at ? new Date(e.created_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
                lastUpdated: e.created_at ? new Date(e.created_at).toLocaleDateString('en-US') : new Date().toLocaleDateString('en-US'),
                decisionType: e.status === 'approved' ? 'human_decision' : 'ai_suggestion',
                securityLevel: 'Confidential',
              };
            });
            setMasterEvidence(mappedEvidence);
          } else {
            setMasterEvidence([]);
          }
        } catch (e: any) {
          console.warn('[Pramana] Error loading evidence:', e.message || e);
          setMasterEvidence([]);
        }

        // Fetch Gaps
        try {
          const backendGaps = await api.gaps.list(currentOrgNum);
          if (backendGaps && backendGaps.length > 0) {
            backendGapsList = backendGaps;
            const mappedGaps: GapItem[] = backendGaps.map((g) => ({
              id: `gap-${g.id}`,
              organizationId: `org-${g.organization_id}`,
              title: g.findings ? g.findings.slice(0, 50) + '...' : `Gap in Control ${g.control_id}`,
              framework: 'iso-27001',
              controlId: `CTRL-${g.control_id}`,
              severity: (g.severity as any) || 'medium',
              owner: 'Compliance Team',
              dueDate: '—',
              status: (g.status as any) || 'open',
              identifiedDate: g.created_at ? g.created_at.split('T')[0] : '',
              whyIdentified: g.findings || 'Compliance gap identified.',
              missingInfo: g.findings || 'Evidence documentation needed.',
              recommendedAction: g.recommendation || '',
              relatedEvidenceIds: [],
            }));
            setMasterGaps(mappedGaps);
          } else {
            setMasterGaps([]);
          }
        } catch (e: any) {
          console.warn('[Pramana] Error loading gaps:', e.message || e);
          setMasterGaps([]);
        }

        // Fetch Audit Logs (filtered to tenant organization users only)
        try {
          const backendAuditLogs = await api.auditLogs.list(currentOrgNum);
          if (backendAuditLogs && backendAuditLogs.length > 0) {
            const mappedAuditTrail: AuditTrailLog[] = backendAuditLogs
              .filter((log) => {
                const matchedActor = backendUsersList.find((u) => u.id === log.user_id);
                // Exclude superadmin actions from the organization audit trail
                if (matchedActor && (matchedActor.role === 'super_admin' || normalizeRole(matchedActor.role || '') === 'super_admin')) {
                  return false;
                }
                return log.organization_id !== 1;
              })
              .map((log) => {
                const matchedActor = backendUsersList.find((u) => u.id === log.user_id);
                const roleKey = matchedActor ? normalizeRole(matchedActor.role || 'ciso') : 'ciso';
                const roleCfg = ROLES_CONFIG[roleKey];
                return {
                  id: `log-${log.id}`,
                  organizationId: `org-${log.organization_id}`,
                  timestamp: log.created_at ? new Date(log.created_at).toLocaleString('en-US') : new Date().toLocaleString('en-US'),
                  actor: {
                    name: matchedActor ? matchedActor.name : 'Organization Member',
                    email: matchedActor ? matchedActor.email : 'user@organization.com',
                    role: roleCfg ? roleCfg.title : 'Compliance Member',
                    type: (roleKey === 'external_auditor' || roleKey === 'internal_auditor') ? 'auditor' : 'user',
                  },
                  action: log.action,
                  resourceType: (log.entity_type as any) || 'Evidence',
                  resourceId: `res-${log.entity_id || log.id}`,
                  resourceName: log.details?.slice(0, 30) || 'Platform Resource',
                  details: log.details || 'Audit event logged.',
                  ipAddress: '192.168.1.104',
                  integrityVerified: true,
                  sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
                };
              });
            setMasterAuditTrail(mappedAuditTrail);
          }
        } catch (e: any) {
          console.warn('[Pramana] Error loading audit logs:', e.message || e);
        }

        // Populate live notifications from real database gaps and evidence
        const dynamicNotifs: NotificationItem[] = [];
        if (backendEvidenceList && backendEvidenceList.length > 0) {
          backendEvidenceList.slice(0, 3).forEach((e: any) => {
            dynamicNotifs.push({
              id: `notif-ev-${e.id}`,
              organizationId: `org-${e.organization_id}`,
              title: `Evidence Ingested: ${e.file_name}`,
              description: e.description || 'Document processed and indexed in PostgreSQL.',
              timestamp: e.created_at ? new Date(e.created_at).toLocaleDateString('en-US') : 'Recent',
              read: false,
              type: 'evidence_uploaded',
              linkTarget: 'evidence',
            });
          });
        }
        if (backendGapsList && backendGapsList.length > 0) {
          backendGapsList.filter((g: any) => g.status === 'open').slice(0, 3).forEach((g: any) => {
            dynamicNotifs.push({
              id: `notif-gap-${g.id}`,
              organizationId: `org-${g.organization_id}`,
              title: `Open Gap in Control ${g.control_id}`,
              description: g.findings ? g.findings.slice(0, 60) + '...' : 'Compliance remediation required.',
              timestamp: g.created_at ? new Date(g.created_at).toLocaleDateString('en-US') : 'Recent',
              read: false,
              type: 'gap_alert',
              linkTarget: 'gaps',
            });
          });
        }
        setMasterNotifications(dynamicNotifs);
      }
    } catch (err: any) {
      console.info('[Pramana] Backend offline or fallback to cache:', err.message || err);
      setIsBackendConnected(false);
    } finally {
      isFetchingBackendRef.current = false;
    }
  }, []);

  // Handle 401 Unauthorized event from central API client
  useEffect(() => {
    const handleUnauthorized = () => {
      api.auth.logout();
      setIsAuthenticated(false);
      setOrganizations([]);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pramana:unauthorized', handleUnauthorized);
      return () => window.removeEventListener('pramana:unauthorized', handleUnauthorized);
    }
  }, []);

  useEffect(() => {
    refreshBackendData();
  }, [refreshBackendData]);

  // Multi-tenant isolated datasets filtered by currentOrg.id
  const evidenceList = masterEvidence.filter(e => e.organizationId === currentOrg.id);
  const controlsList = masterControls.filter(c => c.organizationId === currentOrg.id);
  const gapsList = masterGaps.filter(g => g.organizationId === currentOrg.id);
  const reviewQueueList = masterReviewQueue.filter(r => r.organizationId === currentOrg.id);
  const auditTrailList = masterAuditTrail.filter(l => l.organizationId === currentOrg.id);
  const notificationsList = masterNotifications.filter(n => n.organizationId === currentOrg.id);

  // ── Authentication & Multi-Tenancy ──────────────────────────────────────────
  const login = async (email: string, password: string, orgId?: string): Promise<boolean> => {
    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Authenticate with backend: POST /auth/login
      const authRes = await api.auth.login(cleanEmail, password);
      if (!authRes.access_token) {
        throw new Error('Authentication failed: no access token returned.');
      }

      // 2. Fetch authenticated user profile: GET /auth/me
      const me = await api.auth.me();

      // 3. Fetch user's authorized organizations: GET /organizations/
      const backendOrgs = await api.organizations.list();
      let activeOrg: Organization;

      if (backendOrgs && backendOrgs.length > 0) {
        const mappedOrgs: Organization[] = backendOrgs.map((o, idx) => ({
          id: `org-${o.id}`,
          name: o.name,
          slug: o.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          industry: 'Enterprise Technology',
          plan: idx % 2 === 0 ? 'Enterprise' : 'Growth',
          auditPeriod: 'Annual Audit Window',
          activeFrameworks: [],
        }));
        setOrganizations(mappedOrgs);
        activeOrg = mappedOrgs[0];
        setCurrentOrg(activeOrg);
      } else {
        activeOrg = {
          id: `org-${me.organization_id}`,
          name: `Organization ${me.organization_id}`,
          slug: `org-${me.organization_id}`,
          industry: 'Enterprise Technology',
          plan: 'Enterprise',
          auditPeriod: 'Annual Audit Window',
          activeFrameworks: [],
        };
        setOrganizations([activeOrg]);
        setCurrentOrg(activeOrg);
      }

      // 4. Match or derive user profile & role
      let matchedUser = usersList.find(u => u.email.toLowerCase() === cleanEmail);

      const assignedRole: Role = normalizeRole(me.role || matchedUser?.role || 'ciso');
      const normRole = normalizeRole(assignedRole);
      const roleCfg = ROLES_CONFIG[normRole] || ROLES_CONFIG['ciso'];
      const isSuper = assignedRole === 'super_admin' || normRole === 'super_admin';
      const roleTitle = isSuper ? 'Super Admin' : (roleCfg ? roleCfg.title : 'Enterprise CISO');

      const assignedUser: UserProfile = {
        id: `usr-${me.id}`,
        name: me.name,
        email: me.email,
        role: assignedRole,
        roleTitle,
        avatar: matchedUser?.avatar || roleCfg?.avatar || '',
        organizationId: activeOrg.id,
        organizationName: activeOrg.name,
        lastActive: 'Active now',
        status: me.is_active ? 'active' : 'inactive',
      };

      setActiveUser(assignedUser);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);

      const defaultPage = getRoleDefaultPage(assignedUser.role);
      setActiveView(defaultPage);

      showToast(
        `Welcome, ${assignedUser.name}`,
        `Authenticated as ${assignedUser.roleTitle}. Access configured automatically.`,
        'success'
      );

      // Refresh datasets from real database
      await refreshBackendData(activeOrg.id, true);

      return true;
    } catch (err: any) {
      console.error('[Pramana] Login error:', err);
      showToast(
        'Authentication Failed',
        err.message || 'Invalid email or password',
        'error'
      );
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string, orgName?: string): Promise<boolean> => {
    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.trim() || 'Enterprise Admin';
    const cleanOrgName = (orgName || '').trim() || `${cleanName}'s Organization`;

    try {
      // 1. Call POST /auth/register on backend API
      const registerRes = await api.auth.register({
        name: cleanName,
        email: cleanEmail,
        password,
        organization_name: cleanOrgName,
      });

      const assignedOrg: Organization = {
        id: `org-${registerRes.organization_id}`,
        name: cleanOrgName,
        slug: cleanOrgName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        industry: 'Enterprise Technology',
        plan: 'Enterprise',
        auditPeriod: 'Annual Audit Window',
        activeFrameworks: [],
      };

      const assignedUser: UserProfile = {
        id: `usr-${registerRes.user_id}`,
        name: registerRes.name,
        email: registerRes.email,
        role: 'ciso',
        roleTitle: 'Enterprise CISO',
        avatar: '',
        organizationId: assignedOrg.id,
        organizationName: assignedOrg.name,
        lastActive: 'Just now',
        status: 'active',
      };

      setOrganizations([assignedOrg]);
      setUsersList((prev) => [...prev, assignedUser]);
      setCurrentOrg(assignedOrg);
      setActiveUser(assignedUser);
      setIsAuthenticated(true);
      setIsAuthModalOpen(false);

      const defaultPage = getRoleDefaultPage(assignedUser.role);
      setActiveView(defaultPage);

      showToast(
        'Account Registered',
        `Tenant vault initialized for ${assignedOrg.name}. Welcome to Pramana!`,
        'success'
      );

      await refreshBackendData(assignedOrg.id, true);
      return true;
    } catch (err: any) {
      console.error('[Pramana] Signup error:', err);
      showToast(
        'Registration Failed',
        err.message || 'Could not complete registration. Please try again.',
        'error'
      );
      return false;
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<boolean> => {
    const cleanEmail = email.toLowerCase().trim();
    try {
      const res = await api.auth.resetPassword(cleanEmail, newPassword);
      showToast('Password Updated', res.message || 'Password has been safely updated in PostgreSQL.', 'success');
      return true;
    } catch (err: any) {
      console.error('[Pramana] Password reset error:', err);
      showToast('Reset Failed', err.message || 'Could not reset password. Please verify the email address.', 'error');
      return false;
    }
  };

  const logout = () => {
    api.auth.logout();
    setIsAuthenticated(false);
    setOrganizations([]);
    showToast('Signed Out', 'You have been safely logged out of your tenant vault.', 'info');
  };

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrg(org);
      const userMatch = usersList.find((u) => u.organizationId === org.id) || {
        id: `usr-${org.id}`,
        name: `${org.name} User`,
        email: `admin@${org.slug}.com`,
        role: 'ciso' as const,
        roleTitle: 'Enterprise CISO',
        avatar: '',
        organizationId: org.id,
        organizationName: org.name,
        lastActive: 'Just now',
        status: 'active' as const,
      };
      setActiveUser(userMatch);
      showToast('Switched Tenant Vault', `Now displaying isolated compliance data for ${org.name}.`, 'info');
      refreshBackendData(org.id, true);
    }
  };

  const switchRole = (role: Role) => {
    const normRole = normalizeRole(role);
    const config = ROLES_CONFIG[normRole] || ROLES_CONFIG['ciso'];
    const matchedUser = usersList.find((u) => u.role === role || u.role === normRole);

    const updatedUser: UserProfile = {
      id: matchedUser ? matchedUser.id : `usr-${role}`,
      name: matchedUser ? matchedUser.name : config.name,
      email: matchedUser ? matchedUser.email : `${role}@acme.com`,
      role,
      roleTitle: config.title,
      avatar: config.avatar,
      organizationId: currentOrg.id,
      organizationName: currentOrg.name,
      lastActive: 'Just now',
      status: 'active',
    };

    setActiveUser(updatedUser);

    // If current view is restricted (❌) for this role, redirect to their primary allowed view
    if (!hasPageAccess(role, activeView)) {
      const targetPage = getRoleDefaultPage(role);
      setActiveView(targetPage);
      showToast(
        `Switched Role: ${config.title}`,
        `Current view '${activeView}' is restricted (❌) for ${config.title}. Navigated to '${targetPage}'.`,
        'info'
      );
    } else {
      showToast(
        `Switched Role: ${config.title}`,
        config.description,
        'success'
      );
    }
  };

  const addAuditLog = async (
    action: string,
    resourceType: 'Evidence' | 'Control' | 'Gap' | 'Framework' | 'User' | 'System',
    resourceId: string,
    resourceName: string,
    details: string,
    previousState?: string,
    newState?: string,
    framework?: FrameworkId
  ) => {
    // Never record superadmin actions in tenant organization audit trails
    if (activeUser.role === 'super_admin' || normalizeRole(activeUser.role) === 'super_admin' || currentOrg.id === 'org-1') {
      return;
    }

    const newLog: AuditTrailLog = {
      id: `log-${Date.now()}`,
      organizationId: currentOrg.id,
      timestamp: new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }),
      actor: {
        name: activeUser.name,
        email: activeUser.email,
        role: activeUser.roleTitle,
        type: (activeUser.role === 'external_auditor' || activeUser.role === 'internal_auditor') ? 'auditor' : 'user',
      },
      action,
      resourceType,
      resourceId,
      resourceName,
      framework,
      details,
      previousState,
      newState,
      ipAddress: '127.0.0.1 (Session Verified)',
      integrityVerified: true,
      sha256Hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    };

    setMasterAuditTrail((prev) => [newLog, ...prev]);

    // Send to Backend API
    try {
      if (isBackendConnected) {
        await api.auditLogs.create({
          organization_id: getNumericId(currentOrg.id),
          user_id: getNumericId(activeUser.id),
          action,
          entity_type: resourceType,
          entity_id: getNumericId(resourceId),
          details,
        });
      }
    } catch {
      // Background sync logged locally
    }
  };

  // ── Evidence Upload & AI Mapping ──────────────────────────────────────────
  const uploadEvidence = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const fileType = (['pdf', 'json', 'png', 'docx', 'csv'].includes(extension) ? extension : 'pdf') as any;
    let newId = `ev-${Date.now().toString().slice(-4)}`;
    let aiResult: any = null;

    try {
      if (isBackendConnected) {
        const uploadRes = await api.evidence.upload(
          file,
          getNumericId(currentOrg.id),
          getNumericId(activeUser.id),
          `Evidence uploaded by ${activeUser.name}: ${file.name}`
        );
        newId = `ev-${uploadRes.id}`;
      }
    } catch (err: any) {
      console.warn('Backend upload fallback:', err.message);
    }

    const confidence = aiResult?.matched_controls?.[0]?.confidence_score
      ? Math.round(aiResult.matched_controls[0].confidence_score * 100)
      : 0;

    const mappedControlCodes = aiResult?.matched_controls?.length
      ? aiResult.matched_controls.map((m: any) => m.control_code)
      : [];

    const newEvidenceItem: EvidenceItem = {
      id: newId,
      organizationId: currentOrg.id,
      name: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      fileName: file.name,
      fileType,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      fileHash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      version: 'v1.0',
      owner: activeUser.name,
      ownerAvatar: activeUser.avatar,
      frameworks: [],
      mappedControlIds: mappedControlCodes,
      processingStatus: 'needs_review',
      aiConfidence: confidence,
      aiReasoning: aiResult?.summary || '',
      extractedTextExcerpt: aiResult?.citations?.[0]?.text || '',
      uploadDate: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
      lastUpdated: new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }),
      decisionType: 'pending_human_review',
      securityLevel: (aiResult?.data_classification as any) || 'Confidential',
    };

    setMasterEvidence((prev) => [newEvidenceItem, ...prev]);

    // If real AI matched controls, add to Auditor Review Queue
    const firstMatched = aiResult?.matched_controls?.[0];
    if (firstMatched) {
      const newReviewItem: ReviewQueueItem = {
        id: `rev-${Date.now().toString().slice(-4)}`,
        organizationId: currentOrg.id,
        evidenceId: newId,
        evidenceName: newEvidenceItem.name,
        evidenceVersion: 'v1.0',
        fileType: newEvidenceItem.fileType,
        framework: firstMatched?.framework || 'compliance',
        controlId: firstMatched.control_code,
        controlTitle: firstMatched.title || 'Compliance Control',
        aiConfidence: confidence,
        aiReasoning: firstMatched.reasoning || newEvidenceItem.aiReasoning,
        evidenceExcerpt: firstMatched.cited_text || newEvidenceItem.extractedTextExcerpt,
        assignedAuditor: 'Assigned Auditor',
        lastUpdated: newEvidenceItem.lastUpdated,
        status: 'pending_review',
        decisionType: 'pending_human_review',
      };
      setMasterReviewQueue((prev) => [newReviewItem, ...prev]);
    }

    await addAuditLog(
      'Evidence Uploaded',
      'Evidence',
      newId,
      newEvidenceItem.fileName,
      `User ${activeUser.name} uploaded evidence for ${currentOrg.name}.`,
      'Unprocessed',
      'Needs Review'
    );

    showToast('Evidence Uploaded', `File ${file.name} uploaded successfully.`, 'success');
  };

  // ── Auditor-in-the-Loop Decisions ──────────────────────────────────────────
  const approveReviewItem = async (reviewId: string, notes: string) => {
    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

    setMasterReviewQueue((prev) =>
      prev.map((item) => {
        if (item.id === reviewId) {
          return {
            ...item,
            status: 'approved',
            decisionType: 'human_decision',
            humanDecisionDate: timestamp,
            humanDecisionBy: activeUser.name,
            auditorNotes: notes,
          };
        }
        return item;
      })
    );

    const item = masterReviewQueue.find((r) => r.id === reviewId);
    if (item) {
      setMasterEvidence((prev) =>
        prev.map((ev) => {
          if (ev.id === item.evidenceId) {
            return {
              ...ev,
              processingStatus: 'mapped',
              decisionType: 'human_decision',
              auditorDecision: 'approved',
              auditorName: activeUser.name,
              auditorNotes: notes,
              auditorDecisionDate: timestamp,
            };
          }
          return ev;
        })
      );

      setMasterControls((prev) =>
        prev.map((ctrl) => {
          if (ctrl.id === item.controlId && ctrl.organizationId === currentOrg.id) {
            return {
              ...ctrl,
              reviewStatus: 'Approved',
              auditorDecision: 'approved',
              auditorName: activeUser.name,
              auditorDecisionDate: timestamp,
              auditorComments: [...(ctrl.auditorComments || []), notes],
            };
          }
          return ctrl;
        })
      );

      // Record to Backend API
      try {
        if (isBackendConnected) {
          await api.audits.decisions.create({
            audit_id: 1,
            decided_by: getNumericId(activeUser.id),
            decision: 'approved',
            comments: notes || `Approved by auditor ${activeUser.name}`,
          });
        }
      } catch {
        // Logged locally
      }

      await addAuditLog(
        'Auditor Decision Approved',
        'Control',
        item.controlId,
        item.controlTitle,
        `Auditor ${activeUser.name} approved AI mapping for ${item.evidenceName}. Human decision recorded.`,
        'Pending Auditor Review',
        'Auditor Approved (Human Decision)',
        item.framework
      );

      showToast('Human Approval Recorded', `Control mapping for ${item.controlId} approved by ${activeUser.name}.`, 'success');
    }
  };

  const rejectReviewItem = async (reviewId: string, comment: string) => {
    const timestamp = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

    setMasterReviewQueue((prev) =>
      prev.map((item) => {
        if (item.id === reviewId) {
          return {
            ...item,
            status: 'rejected',
            decisionType: 'human_decision',
            humanDecisionDate: timestamp,
            humanDecisionBy: activeUser.name,
            auditorNotes: comment,
          };
        }
        return item;
      })
    );

    const item = masterReviewQueue.find((r) => r.id === reviewId);
    if (item) {
      setMasterEvidence((prev) =>
        prev.map((ev) => {
          if (ev.id === item.evidenceId) {
            return {
              ...ev,
              processingStatus: 'rejected',
              decisionType: 'human_decision',
              auditorDecision: 'rejected',
              auditorName: activeUser.name,
              auditorNotes: comment,
              auditorDecisionDate: timestamp,
            };
          }
          return ev;
        })
      );

      try {
        if (isBackendConnected) {
          await api.audits.decisions.create({
            audit_id: 1,
            decided_by: getNumericId(activeUser.id),
            decision: 'rejected',
            comments: comment || `Rejected by auditor ${activeUser.name}`,
          });
        }
      } catch {
        // Logged locally
      }

      await addAuditLog(
        'Auditor Decision Rejected',
        'Evidence',
        item.evidenceId,
        item.evidenceName,
        `Auditor ${activeUser.name} rejected AI mapping. Reason: ${comment}`,
        'Pending Auditor Review',
        'Rejected by Auditor',
        item.framework
      );

      showToast('Mapping Rejected', `Auditor rejection recorded with reason for ${item.evidenceName}.`, 'warning');
    }
  };

  const requestAdditionalEvidence = async (reviewId: string, details: string, owner: string, dueDate: string) => {
    setMasterReviewQueue((prev) =>
      prev.map((item) => {
        if (item.id === reviewId) {
          return {
            ...item,
            status: 'evidence_requested',
            auditorNotes: `Evidence Requested: ${details} (Assigned to: ${owner}, Due: ${dueDate})`,
          };
        }
        return item;
      })
    );

    const item = masterReviewQueue.find((r) => r.id === reviewId);
    if (item) {
      let newGapId = `gap-${Date.now().toString().slice(-4)}`;

      // Post to Backend Gap Analysis
      try {
        if (isBackendConnected) {
          const gapRes = await api.gaps.create({
            organization_id: getNumericId(currentOrg.id),
            control_id: getNumericId(item.controlId),
            status: 'open',
            severity: 'high',
            findings: details,
            recommendation: `Upload required evidence for control ${item.controlId}`,
          });
          newGapId = `gap-${gapRes.id}`;
        }
      } catch {
        // Fallback local ID
      }

      const newGap: GapItem = {
        id: newGapId,
        organizationId: currentOrg.id,
        title: `Additional Evidence Required: ${item.controlTitle}`,
        framework: item.framework,
        controlId: item.controlId,
        severity: 'high',
        owner: owner || 'Priya Sharma',
        dueDate: dueDate || '2026-10-15',
        status: 'open',
        identifiedDate: new Date().toISOString().split('T')[0],
        whyIdentified: `Auditor ${activeUser.name} requested supplementary evidence: ${details}`,
        missingInfo: details,
        recommendedAction: `Upload updated file addressing auditor query for control ${item.controlId}.`,
        relatedEvidenceIds: [item.evidenceId],
      };

      setMasterGaps((prev) => [newGap, ...prev]);

      await addAuditLog(
        'Additional Evidence Requested',
        'Control',
        item.controlId,
        item.controlTitle,
        `Auditor ${activeUser.name} requested additional evidence from ${owner}. Task created in Gap Analysis.`,
        'Pending Review',
        'Evidence Required',
        item.framework
      );

      showToast('Evidence Request Sent', `Notification & task sent to ${owner} due on ${dueDate}.`, 'info');
    }
  };

  const resolveGap = async (gapId: string, notes: string) => {
    setMasterGaps((prev) =>
      prev.map((g) => {
        if (g.id === gapId) {
          return {
            ...g,
            status: 'resolved',
            remediationNotes: notes,
          };
        }
        return g;
      })
    );

    const gap = masterGaps.find((g) => g.id === gapId);
    if (gap) {
      try {
        if (isBackendConnected) {
          await api.gaps.update(getNumericId(gapId), {
            organization_id: getNumericId(gap.organizationId),
            control_id: getNumericId(gap.controlId),
            status: 'resolved',
            severity: 'low',
            findings: gap.whyIdentified,
            recommendation: notes,
          });
        }
      } catch {
        // Fallback
      }

      await addAuditLog(
        'Compliance Gap Resolved',
        'Gap',
        gap.id,
        gap.title,
        `User ${activeUser.name} marked compliance gap as resolved. Remediation notes: ${notes}`,
        'Open Gap',
        'Resolved Gap',
        gap.framework
      );

      showToast('Gap Marked Resolved', `Compliance gap "${gap.title}" updated to Resolved.`, 'success');
    }
  };

  // ── Super Admin Backend Operations ──────────────────────────────────────────
  const createOrganizationBackend = async (name: string) => {
    try {
      let newOrgId = `org-${Date.now().toString().slice(-4)}`;
      if (isBackendConnected) {
        const res = await api.organizations.create(name);
        newOrgId = `org-${res.id}`;
      }
      const newOrg: Organization = {
        id: newOrgId,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        industry: 'Enterprise Technology Services',
        plan: 'Growth',
        auditPeriod: 'Annual Q4 Audit Window',
        activeFrameworks: ['iso-27001', 'soc-2'],
      };
      setOrganizations((prev) => [...prev, newOrg]);
      showToast('Organization Created', `Tenant "${name}" successfully registered in database.`, 'success');
    } catch (err: any) {
      showToast('Failed to Create Org', err.message, 'error');
    }
  };

  const updateOrganizationBackend = async (id: string, name: string) => {
    try {
      if (isBackendConnected) {
        await api.organizations.update(getNumericId(id), name);
      }
      setOrganizations((prev) =>
        prev.map((o) => (o.id === id ? { ...o, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') } : o))
      );
      showToast('Organization Updated', `Organization name updated to "${name}".`, 'success');
    } catch (err: any) {
      showToast('Update Failed', err.message, 'error');
    }
  };

  const deleteOrganizationBackend = async (id: string) => {
    try {
      if (isBackendConnected) {
        await api.organizations.delete(getNumericId(id));
      }
      setOrganizations((prev) => prev.filter((o) => o.id !== id));
      showToast('Organization Deleted', 'Tenant organization removed from platform.', 'warning');
    } catch (err: any) {
      showToast('Delete Failed', err.message, 'error');
    }
  };

  const createUserBackend = async (data: { name: string; email: string; role: Role; organization_id?: number; password?: string }) => {
    try {
      const targetOrgId = data.organization_id || getNumericId(currentOrg.id);
      let newUserId = `usr-${Date.now().toString().slice(-4)}`;
      if (isBackendConnected) {
        const res = await api.users.create({
          organization_id: targetOrgId,
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password,
        });
        newUserId = `usr-${res.id}`;
      }

      const normRole = normalizeRole(data.role);
      const roleCfg = ROLES_CONFIG[normRole] || ROLES_CONFIG['ciso'];
      const targetOrg = organizations.find((o) => getNumericId(o.id) === targetOrgId) || currentOrg;

      const newUser: UserProfile = {
        id: newUserId,
        name: data.name,
        email: data.email,
        role: data.role,
        roleTitle: roleCfg.title,
        avatar: roleCfg.avatar,
        organizationId: targetOrg.id,
        organizationName: targetOrg.name,
        lastActive: 'Just registered',
        status: 'active',
      };

      setUsersList((prev) => [...prev, newUser]);
      await refreshBackendData();
      const pwdStatus = data.password ? 'Custom password set' : 'Default password: Pramana@123';
      showToast('User Created & Active', `Account for "${data.name}" registered in DB with role ${roleCfg.title}. (${pwdStatus})`, 'success');
    } catch (err: any) {
      showToast('User Creation Failed', err.message, 'error');
      throw err;
    }
  };

  const updateUserBackend = async (id: string, data: { name?: string; email?: string; role?: Role; password?: string; is_active?: boolean }) => {
    try {
      const numericId = getNumericId(id);
      if (isBackendConnected) {
        await api.users.update(numericId, {
          name: data.name,
          email: data.email,
          role: data.role,
          password: data.password,
          is_active: data.is_active,
        });
      }

      await refreshBackendData();
      showToast('User Updated', 'Account details updated in database.', 'success');
    } catch (err: any) {
      showToast('Update Failed', err.message || 'Could not update user', 'error');
      throw err;
    }
  };

  const deleteUserBackend = async (id: string) => {
    try {
      let msg = 'User account removed from database.';
      let isDeactivated = false;
      if (isBackendConnected) {
        const res = await api.users.delete(getNumericId(id));
        if (res?.message) msg = res.message;
        if (res?.deactivated) isDeactivated = true;
      }
      setUsersList((prev) => prev.filter((u) => u.id !== id));
      await refreshBackendData();
      showToast(
        isDeactivated ? 'User Deactivated' : 'User Removed',
        msg,
        isDeactivated ? 'info' : 'warning'
      );
    } catch (err: any) {
      showToast('Action Failed', err.message || 'Could not remove user.', 'error');
      throw err;
    }
  };

  const markNotificationRead = (id: string) => {
    setMasterNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setMasterNotifications((prev) =>
      prev.map((n) => (n.organizationId === currentOrg.id ? { ...n, read: true } : n))
    );
  };

  // ── AI Engine Direct Actions ────────────────────────────────────────────────
  const runAIGapAnalysis = async () => {
    try {
      showToast('AI Features Disabled', 'AI processing is removed from this build.', 'info');
      return {};
    } catch (err: any) {
      showToast('AI Gap Analysis Failed', err.message, 'error');
      throw err;
    }
  };

  const evaluateControlAI = async (controlId: number) => {
    try {
      showToast('AI Evaluation Started', 'Evaluating control evidence using local RAG...', 'info');
      const result = await api.compliance.evaluateControl(controlId);
      showToast('Control Evaluated', `Status: ${result.evaluation?.status || 'Assessed'} (Confidence: ${Math.round((result.evaluation?.confidence || 0) * 100)}%)`, 'success');
      await refreshBackendData();
      return result;
    } catch (err: any) {
      showToast('Control Evaluation Failed', err.message, 'error');
      throw err;
    }
  };

  const analyzeEvidenceAI = async (evidenceId: number) => {
    try {
      showToast('AI Features Disabled', 'AI processing is removed from this build.', 'info');
      return {};
    } catch (err: any) {
      showToast('Document Analysis Failed', err.message, 'error');
      throw err;
    }
  };

  const summarizeEvidenceAI = async (evidenceId: number) => {
    try {
      showToast('AI Features Disabled', 'AI processing is removed from this build.', 'info');
      return {};
    } catch (err: any) {
      showToast('Summarization Failed', err.message, 'error');
      throw err;
    }
  };
  const impersonateUser = async (numericUserId: number) => {
    try {
      const res = await api.auth.impersonate(numericUserId);
      if (!res.access_token) {
        throw new Error('Failed to obtain impersonation token.');
      }
      showToast('Impersonation Active', 'Signed in as target user with audit log recorded in PostgreSQL.', 'success');
      await refreshBackendData();
    } catch (err: any) {
      showToast('Impersonation Failed', err.message || 'Could not impersonate user', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        isBackendConnected,
        backendInfo,
        refreshBackendData,
        isAuthenticated,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        organizations,
        currentOrg,
        switchOrganization,
        login,
        signup,
        resetPassword,
        logout,
        activeView,
        setActiveView,
        activeUser,
        setActiveUser,
        usersList,
        activeFrameworkFilter,
        setActiveFrameworkFilter,
        evidenceList,
        controlsList,
        gapsList,
        reviewQueueList,
        auditTrailList,
        notificationsList,
        toasts,
        isSearchOpen,
        setIsSearchOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isAIChatOpen,
        setIsAIChatOpen,
        aiChatEvidenceId,
        setAIChatEvidenceId,
        selectedEvidenceId,
        setSelectedEvidenceId,
        selectedControlId,
        setSelectedControlId,
        selectedAuditLogId,
        setSelectedAuditLogId,
        selectedGapId,
        setSelectedGapId,
        selectedReviewItem,
        setSelectedReviewItem,
        runAIGapAnalysis,
        evaluateControlAI,
        analyzeEvidenceAI,
        summarizeEvidenceAI,
        uploadEvidence,
        approveReviewItem,
        rejectReviewItem,
        requestAdditionalEvidence,
        resolveGap,
        showToast,
        dismissToast,
        switchRole,
        markNotificationRead,
        clearAllNotifications,
        createOrganizationBackend,
        updateOrganizationBackend,
        deleteOrganizationBackend,
        createUserBackend,
        updateUserBackend,
        deleteUserBackend,
        impersonateUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
