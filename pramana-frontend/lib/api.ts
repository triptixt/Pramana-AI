const CANDIDATE_API_BASES = [
  process.env.NEXT_PUBLIC_API_URL,
  'http://127.0.0.1:8001',
  'http://127.0.0.1:8000',
  'http://localhost:8001',
  'http://localhost:8000',
].filter(Boolean) as string[];

let activeApiBase = CANDIDATE_API_BASES[0] || 'http://127.0.0.1:8001';

const TOKEN_STORAGE_KEY = 'pramana_access_token';

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY) || sessionStorage.getItem(TOKEN_STORAGE_KEY);
  },
  setToken: (token: string | null) => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },
  clearToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithFallback(path: string, options: RequestInit = {}): Promise<Response> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // Try current activeApiBase first
  const primaryUrl = `${activeApiBase}${cleanPath}`;
  try {
    const res = await fetch(primaryUrl, options);
    return res;
  } catch (err: any) {
    // If connection refused / network error, probe other candidate ports
    for (const candidate of CANDIDATE_API_BASES) {
      if (candidate === activeApiBase) continue;
      try {
        const altUrl = `${candidate}${cleanPath}`;
        const altRes = await fetch(altUrl, options);
        activeApiBase = candidate; // switch to working port
        return altRes;
      } catch {
        // continue trying
      }
    }
    throw err;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Centralized authentication: Automatically attach JWT Bearer token
  const token = authStorage.getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const res = await fetchWithFallback(path, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // ignore json parse error
      }

      // Handle 401 Unauthorized centrally
      if (res.status === 401) {
        authStorage.clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pramana:unauthorized', { detail: { path, errorDetail } }));
        }
      }

      throw new ApiError(res.status, errorDetail);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (err: any) {
    console.warn(`[Pramana API] Request to ${path} failed:`, err.message || err);
    throw err;
  }
}

// ── Backend API Client ──────────────────────────────────────────────────────────

export const api = {
  get baseUrl() {
    return activeApiBase;
  },

  // Authentication (Centralized JWT Bearer)
  auth: {
    register: async (data: {
      name: string;
      email: string;
      password: string;
      organization_name?: string;
      organization_id?: number;
    }): Promise<{
      message: string;
      user_id: number;
      name: string;
      email: string;
      organization_id: number;
      access_token: string;
      token_type: string;
    }> => {
      const res = await request<{
        message: string;
        user_id: number;
        name: string;
        email: string;
        organization_id: number;
        access_token: string;
        token_type: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.access_token) {
        authStorage.setToken(res.access_token);
      }
      return res;
    },
    login: async (email: string, password: string): Promise<{ access_token: string; token_type: string }> => {
      const data = await request<{ access_token: string; token_type: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.access_token) {
        authStorage.setToken(data.access_token);
      }
      return data;
    },
    me: async (): Promise<{ id: number; name: string; email: string; organization_id: number; organization_name?: string; is_active: boolean; role?: string; permissions?: string[] }> => {
      return await request<{ id: number; name: string; email: string; organization_id: number; organization_name?: string; is_active: boolean; role?: string; permissions?: string[] }>('/auth/me');
    },
    logout: () => {
      authStorage.clearToken();
    },
    resetPassword: async (email: string, new_password: string): Promise<{ message: string; email: string }> => {
      return await request<{ message: string; email: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email, new_password }),
      });
    },
    impersonate: async (userId: number): Promise<{ access_token: string; token_type: string }> => {
      const data = await request<{ access_token: string; token_type: string }>(`/auth/impersonate/${userId}`, {
        method: 'POST',
      });
      if (data.access_token) {
        authStorage.setToken(data.access_token);
      }
      return data;
    },
    getToken: () => authStorage.getToken(),
  },

  // Health
  checkHealth: async (): Promise<{ status: string; app: string; version: string }> => {
    try {
      return await request<{ status: string; app: string; version: string }>('/health');
    } catch {
      return { status: 'offline', app: 'Pramana API', version: 'unknown' };
    }
  },

  // 0. Platform (SuperAdmin Overview)
  platform: {
    overview: () => request<{
      status: string;
      data: {
        total_organizations: number;
        total_users: number;
        total_frameworks: number;
        total_evidence: number;
        open_gaps: number;
      };
    }>('/platform/overview'),
  },



  // 1. Organizations (Super Admin / Multi-Tenancy)
  organizations: {
    list: () => request<Array<{ id: number; name: string }>>('/organizations/'),
    get: (id: number) => request<{ id: number; name: string }>(`/organizations/${id}`),
    create: (name: string) => request<{ id: number; name: string }>('/organizations/', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    update: (id: number, name: string) => request<{ id: number; name: string }>(`/organizations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),
    delete: (id: number) => request<{ message: string }>(`/organizations/${id}`, {
      method: 'DELETE',
    }),
  },

  // 2. Users (Super Admin, CISO, Team Management)
  users: {
    list: () => request<Array<{ id: number; organization_id: number; name: string; email: string; is_active: boolean; role?: string; organization_name?: string }>>('/users/'),
    get: (id: number) => request<{ id: number; organization_id: number; name: string; email: string; is_active: boolean }>(`/users/${id}`),
    create: (data: { organization_id: number; name: string; email: string; role?: string; password?: string }) => request<{ id: number; organization_id: number; name: string; email: string; is_active: boolean; role?: string; organization_name?: string }>('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: { organization_id?: number; name?: string; email?: string; role?: string; password?: string; is_active?: boolean }) => request<{ id: number; organization_id: number; name: string; email: string; is_active: boolean; role?: string; organization_name?: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string; deleted?: boolean; deactivated?: boolean }>(`/users/${id}`, {
      method: 'DELETE',
    }),
  },

  // 3. Roles & Permissions (Role-Based Access Control)
  roles: {
    list: () => request<Array<{ id: number; organization_id: number; name: string; description: string }>>('/roles/'),
    create: (data: { organization_id: number; name: string; description?: string }) => request<{ id: number; organization_id: number; name: string; description: string }>('/roles/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string }>(`/roles/${id}`, {
      method: 'DELETE',
    }),
  },

  // 4. Frameworks & Controls (Compliance Framework Management)
  frameworks: {
    list: () => request<Array<{
      id: number;
      name: string;
      code: string;
      version?: string;
      description?: string;
      is_active: boolean;
      file_name?: string;
      status?: string;
      total_controls: number;
      error_message?: string;
      created_at?: string;
    }>>('/frameworks/'),
    get: (id: number) => request<{
      id: number;
      name: string;
      code: string;
      version?: string;
      description?: string;
      file_name?: string;
      status?: string;
      total_controls: number;
    }>(`/frameworks/${id}`),
    getControls: (id: number) => request<Array<{
      id: number;
      framework_version_id: number;
      control_code: string;
      title: string;
      description?: string;
      requirement?: string;
      category?: string;
      guidance?: string;
      source_reference?: string;
    }>>(`/frameworks/${id}/controls`),
    create: (data: { name: string; code: string; version?: string; description?: string }) => request<{ id: number; name: string; code: string; description: string }>('/frameworks/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    upload: async (file: File, name: string, code: string, version: string = '1.0', description: string = '', authority: string = '') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('code', code);
      formData.append('version', version);
      if (description) formData.append('description', description);
      if (authority) formData.append('authority', authority);

      return request<{
        framework_id: number;
        version_id: number;
        name: string;
        code: string;
        status: string;
        total_controls: number;
        relationships_detected?: number;
        relationships_created?: number;
        relationships_rejected?: number;
        message: string;
      }>('/frameworks/upload', {
        method: 'POST',
        body: formData,
      });
    },
    reprocess: (id: number) => request<{
      framework_id: number;
      status: string;
      total_controls: number;
      relationships_detected?: number;
      relationships_created?: number;
      relationships_rejected?: number;
      message: string;
    }>(`/frameworks/${id}/reprocess`, {
      method: 'POST',
    }),
    toggleStatus: (id: number) => request<{
      id: number;
      name: string;
      code: string;
      is_active: boolean;
      status?: string;
    }>(`/frameworks/${id}/toggle-status`, {
      method: 'POST',
    }),
    delete: (id: number) => request<{ message: string }>(`/frameworks/${id}`, {
      method: 'DELETE',
    }),
  },

  frameworkVersions: {
    list: () => request<Array<{
      id: number;
      framework_id: number;
      version_string: string;
      description?: string;
      is_active: boolean;
      total_controls?: number;
      created_at?: string;
    }>>('/framework-versions/'),
    get: (id: number) => request<{
      id: number;
      framework_id: number;
      version_string: string;
      description?: string;
      is_active: boolean;
    }>(`/framework-versions/${id}`),
  },

  controls: {
    list: () => request<Array<{ id: number; framework_version_id: number; control_code: string; title: string; description: string; category?: string; requirement?: string }>>('/controls/'),
    get: (id: number) => request<{ id: number; framework_version_id: number; control_code: string; title: string; description: string; category?: string; requirement?: string }>(`/controls/${id}`),
    create: (data: { framework_version_id: number; control_code: string; title: string; description?: string; category?: string; requirement?: string }) => request<any>('/controls/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: { framework_version_id: number; control_code: string; title: string; description?: string; category?: string; requirement?: string }) => request<any>(`/controls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  controlRelationships: {
    list: (params?: {
      source_framework_id?: number;
      source_framework_version_id?: number;
      target_framework_id?: number;
      target_framework_version_id?: number;
      source_control_id?: number;
      target_control_id?: number;
      control_id?: number;
      status?: string;
      relationship_type?: string;
      search?: string;
    }) => {
      const q = new URLSearchParams();
      if (params?.source_framework_id) q.append('source_framework_id', params.source_framework_id.toString());
      if (params?.source_framework_version_id) q.append('source_framework_version_id', params.source_framework_version_id.toString());
      if (params?.target_framework_id) q.append('target_framework_id', params.target_framework_id.toString());
      if (params?.target_framework_version_id) q.append('target_framework_version_id', params.target_framework_version_id.toString());
      if (params?.source_control_id) q.append('source_control_id', params.source_control_id.toString());
      if (params?.target_control_id) q.append('target_control_id', params.target_control_id.toString());
      if (params?.control_id) q.append('control_id', params.control_id.toString());
      if (params?.status) q.append('status', params.status);
      if (params?.relationship_type) q.append('relationship_type', params.relationship_type);
      if (params?.search) q.append('search', params.search);
      const qs = q.toString();
      return request<Array<{
        id: number;
        source_control_id: number;
        target_control_id: number;
        relationship_type: string;
        source_reference?: string;
        mapping_confidence?: number;
        status: string;
        mapping_source?: string;
        ai_explanation?: string;
        overlap_summary?: string;
        differences_summary?: string;
        reviewed_by?: number;
        reviewed_at?: string;
        created_at?: string;
        source_control?: {
          id: number;
          framework_version_id: number;
          control_code: string;
          title: string;
          category?: string;
          description?: string;
          requirement?: string;
          framework_id?: number;
          framework_name?: string;
          framework_code?: string;
          framework_version?: string;
        };
        target_control?: {
          id: number;
          framework_version_id: number;
          control_code: string;
          title: string;
          category?: string;
          description?: string;
          requirement?: string;
          framework_id?: number;
          framework_name?: string;
          framework_code?: string;
          framework_version?: string;
        };
      }>>(`/control-relationships/${qs ? `?${qs}` : ''}`);
    },
    generate: (data: {
      source_framework_version_id: number;
      target_framework_version_id?: number;
      source_control_id?: number;
      min_confidence?: number;
      top_k?: number;
    }) => request<Array<any>>('/control-relationships/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    review: (id: number, data: { status: string; relationship_type?: string; notes?: string }) =>
      request<any>(`/control-relationships/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    create: (data: {
      source_control_id: number;
      target_control_id: number;
      relationship_type: string;
      source_reference?: string;
      mapping_confidence?: number;
      status?: string;
      ai_explanation?: string;
      overlap_summary?: string;
      differences_summary?: string;
    }) => request<any>('/control-relationships/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string }>(`/control-relationships/${id}`, {
      method: 'DELETE',
    }),
  },

  // 5. Evidence (Enterprise CISO & Compliance Team)
  evidence: {
    list: (orgId?: number) => {
      const url = orgId ? `/evidence/?organization_id=${orgId}` : '/evidence/';
      return request<Array<{
        id: number;
        organization_id: number;
        uploaded_by: number;
        file_name: string;
        file_path: string;
        file_type: string | null;
        description: string | null;
        status: string;
      }>>(url);
    },
    get: (id: number) => request<{
      id: number;
      organization_id: number;
      uploaded_by: number;
      file_name: string;
      file_path: string;
      file_type: string | null;
      description: string | null;
      status: string;
    }>(`/evidence/${id}`),
    create: (data: {
      organization_id: number;
      uploaded_by: number;
      file_name: string;
      file_path: string;
      file_type?: string;
      description?: string;
      status?: string;
    }) => request<{
      id: number;
      organization_id: number;
      uploaded_by: number;
      file_name: string;
      file_path: string;
      file_type: string | null;
      description: string | null;
      status: string;
    }>('/evidence/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    upload: async (file: File, orgId: number = 1, uploadedBy: number = 1, description: string = '') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('organization_id', orgId.toString());
      formData.append('uploaded_by', uploadedBy.toString());
      if (description) formData.append('description', description);

      return request<{
        id: number;
        organization_id: number;
        uploaded_by: number;
        file_name: string;
        file_path: string;
        file_type: string;
        description: string;
        status: string;
        mapping_id?: number;
        ai_confidence?: number;
        message: string;
      }>('/evidence/upload', {
        method: 'POST',
        body: formData,
      });
    },
    update: (id: number, data: {
      organization_id: number;
      uploaded_by: number;
      file_name: string;
      file_path: string;
      file_type?: string;
      description?: string;
      status: string;
    }) => request<{
      id: number;
      organization_id: number;
      uploaded_by: number;
      file_name: string;
      file_path: string;
      file_type: string | null;
      description: string | null;
      status: string;
    }>(`/evidence/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string }>(`/evidence/${id}`, {
      method: 'DELETE',
    }),
    process: (id: number) => request<{ message: string; chunks?: number }>(`/evidence/${id}/process`, {
      method: 'POST',
    }),
  },

  // 6. Evidence Control Mappings (AI Evidence Analysis & Auditor Review)
  mappings: {
    list: (params?: {
      evidence_id?: number;
      control_id?: number;
      mapping_status?: string;
      framework_version_id?: number;
    }) => {
      const q = new URLSearchParams();
      if (params?.evidence_id) q.append('evidence_id', params.evidence_id.toString());
      if (params?.control_id) q.append('control_id', params.control_id.toString());
      if (params?.mapping_status) q.append('mapping_status', params.mapping_status);
      if (params?.framework_version_id) q.append('framework_version_id', params.framework_version_id.toString());
      const qs = q.toString();
      return request<Array<{
        id: number;
        evidence_id: number;
        control_id: number;
        mapping_type: string;
        confidence_score: number | null;
        mapping_status: string;
        notes: string | null;
        ai_explanation?: string;
        requirement_supported?: string;
        unsupported_requirements?: string;
        reviewed_by?: number;
        reviewed_at?: string;
        created_at?: string;
        evidence?: {
          id: number;
          organization_id: number;
          file_name: string;
          file_type?: string;
          description?: string;
          status: string;
        };
        control?: {
          id: number;
          framework_version_id: number;
          control_code: string;
          title: string;
          category?: string;
          requirement?: string;
          framework_id?: number;
          framework_name?: string;
          framework_code?: string;
          framework_version?: string;
        };
      }>>(`/evidence-control-mappings/${qs ? `?${qs}` : ''}`);
    },
    generate: (data: {
      evidence_id: number;
      framework_version_id?: number;
      control_id?: number;
      top_k?: number;
    }) => request<Array<any>>('/evidence-control-mappings/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    review: (id: number, data: { mapping_status: string; notes?: string }) =>
      request<any>(`/evidence-control-mappings/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    create: (data: {
      evidence_id: number;
      control_id: number;
      mapping_type?: string;
      confidence_score?: number;
      mapping_status?: string;
      notes?: string;
      ai_explanation?: string;
      requirement_supported?: string;
      unsupported_requirements?: string;
    }) => request<{
      id: number;
      evidence_id: number;
      control_id: number;
      mapping_type: string;
      confidence_score: number | null;
      mapping_status: string;
      notes: string | null;
    }>('/evidence-control-mappings/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string }>(`/evidence-control-mappings/${id}`, {
      method: 'DELETE',
    }),
  },

  // 7. Gap Analysis (CISO & Compliance Team remediation)
  gaps: {
    list: (orgId?: number) => {
      const url = orgId ? `/gap-analysis/?organization_id=${orgId}` : '/gap-analysis/';
      return request<Array<{
        id: number;
        organization_id: number;
        control_id: number;
        status: string;
        severity: string;
        findings: string | null;
        recommendation: string | null;
        created_at: string;
        updated_at: string;
      }>>(url);
    },
    get: (id: number) => request<{
      id: number;
      organization_id: number;
      control_id: number;
      status: string;
      severity: string;
      findings: string | null;
      recommendation: string | null;
    }>(`/gap-analysis/${id}`),
    create: (data: {
      organization_id: number;
      control_id: number;
      status?: string;
      severity?: string;
      findings?: string;
      recommendation?: string;
    }) => request<{
      id: number;
      organization_id: number;
      control_id: number;
      status: string;
      severity: string;
      findings: string | null;
      recommendation: string | null;
    }>('/gap-analysis/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: {
      organization_id: number;
      control_id: number;
      status: string;
      severity: string;
      findings?: string;
      recommendation?: string;
    }) => request<{
      id: number;
      organization_id: number;
      control_id: number;
      status: string;
      severity: string;
      findings: string | null;
      recommendation: string | null;
    }>(`/gap-analysis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string }>(`/gap-analysis/${id}`, {
      method: 'DELETE',
    }),
  },

  // 8. Audits, Reviews & Auditor Decisions (Auditor-in-the-Loop)
  audits: {
    list: () => request<Array<{
      id: number;
      organization_id: number;
      framework_id: number;
      created_by: number;
      name: string;
      description: string | null;
      status: string;
    }>>('/audits/'),
    reviews: {
      list: () => request<Array<{
        id: number;
        audit_id: number;
        reviewer_id: number;
        status: string;
        comments: string | null;
        reviewed_at: string | null;
      }>>('/audit-reviews/'),
      create: (data: {
        audit_id: number;
        reviewer_id: number;
        status: string;
        comments?: string;
        reviewed_at?: string;
      }) => request<any>('/audit-reviews/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    },
    decisions: {
      list: () => request<Array<{
        id: number;
        audit_id: number;
        decided_by: number;
        decision: string;
        comments: string | null;
        decided_at: string;
      }>>('/audit-decisions/'),
      create: (data: {
        audit_id: number;
        decided_by: number;
        decision: string;
        comments?: string;
      }) => request<any>('/audit-decisions/', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    },
  },

  // 9. Audit Trail (Immutable Security Log)
  auditLogs: {
    list: (orgId?: number) => {
      const url = orgId ? `/audit-logs/?organization_id=${orgId}` : '/audit-logs/';
      return request<Array<{
        id: number;
        organization_id: number;
        user_id: number | null;
        action: string;
        entity_type: string;
        entity_id: number | null;
        details: string | null;
        created_at: string;
      }>>(url);
    },
    create: (data: {
      organization_id: number;
      user_id?: number;
      action: string;
      entity_type: string;
      entity_id?: number;
      details?: string;
    }) => request<{
      id: number;
      organization_id: number;
      user_id: number | null;
      action: string;
      entity_type: string;
      entity_id: number | null;
      details: string | null;
    }>('/audit-logs/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  // 10. Real Compliance Framework Comparison
  compliance: {
    getFrameworks: () => request<Array<{
      id: number;
      name: string;
      code: string;
      description: string;
      category?: string;
      status?: string;
      total_controls?: number;
      versions: Array<{
        id: number;
        version: string;
        authority: string;
        effective_date: string;
        status: string;
        source_url: string;
      }>;
    }>>('/compliance/frameworks'),
    selectFrameworks: (framework_ids: number[]) =>
      request<{ message: string; selected_framework_ids: number[]; active_count: number }>(
        '/compliance/organization-frameworks/select',
        {
          method: 'POST',
          body: JSON.stringify({ framework_ids }),
        }
      ),
    getControls: (versionId: number) => request<Array<{
      id: number;
      framework_version_id: number;
      control_code: string;
      title: string;
      category: string;
      requirement: string;
      source_reference: string;
      guidance?: string;
    }>>(`/compliance/frameworks/versions/${versionId}/controls`),
    getOrganizationFrameworks: () => request<Array<{
      id: number;
      organization_id: number;
      framework_id: number;
      framework_name: string;
      framework_code: string;
      framework_version_id: number;
      version: string;
      authority: string;
      status: string;
      created_at: string;
    }>>('/compliance/organization-frameworks'),
    getOrganizationControls: () => request<Array<{
      id: number;
      framework_version_id: number;
      control_code: string;
      title: string;
      category: string;
      requirement: string;
      description?: string;
      source_reference: string;
      guidance?: string;
      framework_id: number;
      framework_name: string;
      framework_code: string;
      framework_version: string;
      is_active: boolean;
    }>>('/compliance/organization-controls'),
    toggleFramework: (data: { framework_id: number; framework_version_id?: number; active: boolean }) =>
      request<{ message: string; framework: string; status: string }>('/compliance/organization-frameworks/toggle', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    evaluateControl: (controlId: number) =>
      request<any>('/compliance/evaluate-control', {
        method: 'POST',
        body: JSON.stringify({ control_id: controlId }),
      }),
    compareFramework: (data: { framework_code_or_id: string | number; version?: string }) =>
      request<any>('/compliance/compare-framework', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCrossFrameworkMatrix: (frameworkCodes?: string[]) =>
      request<{
        organization_id: number;
        frameworks: Array<{ framework_id: number; code: string; name: string; version: string; authority: string }>;
        matrix: Array<{
          domain: string;
          framework_evaluations: Record<string, {
            control_code: string;
            control_title: string;
            status: string;
            confidence: number;
            evidence_count: number;
          }>;
        }>;
      }>('/compliance/cross-framework-matrix', {
        method: 'POST',
        body: JSON.stringify({ framework_codes: frameworkCodes }),
      }),
  },

  // 11. Assessments
  assessments: {
    create: (framework_id: number) => request<any>(`/assessments/?framework_id=${framework_id}`, {
      method: 'POST'
    })
  }
};
