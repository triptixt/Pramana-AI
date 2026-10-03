const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const TOKEN_STORAGE_KEY = 'pramana_access_token';

export const authStorage = {
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  setToken: (token: string | null) => {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  },
  clearToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

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
    const res = await fetch(url, {
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

      // Step 8: Handle 401 Unauthorized centrally
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
    // Return friendly error or propagate
    console.warn(`[Pramana API] Request to ${url} failed:`, err.message || err);
    throw err;
  }
}

// ── Backend API Client ──────────────────────────────────────────────────────────

export const api = {
  baseUrl: API_BASE,

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
    me: async (): Promise<{ id: number; name: string; email: string; organization_id: number; is_active: boolean }> => {
      return await request<{ id: number; name: string; email: string; organization_id: number; is_active: boolean }>('/auth/me');
    },
    logout: () => {
      authStorage.clearToken();
    },
    getToken: () => authStorage.getToken(),
  },

  // Health
  checkHealth: async (): Promise<{ status: string; app: string; version: string }> => {
    try {
      return await request<{ status: string; app: string; version: string }>('/health');
    } catch {
      try {
        const altBase = API_BASE.includes('127.0.0.1') ? 'http://localhost:8000' : 'http://127.0.0.1:8000';
        const res = await fetch(`${altBase}/health`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // ignore
      }
      return { status: 'offline', app: 'Pramana API', version: 'unknown' };
    }
  },

  // 0. AI Engine (Ollama Local LLM & RAG)
  ai: {
    checkHealth: () => request<{
      status: string;
      ollama_base_url: string;
      configured_model: string;
      configured_embed_model: string;
      installed_models: string[];
      model_ready: boolean;
      embed_model_ready: boolean;
    }>('/ai/health'),
    analyzeDocument: (evidenceId: number, modelName?: string) => request<{
      run_id: number;
      evidence_id: number;
      status: string;
      model_name: string;
      summary: string;
      document_type: string;
      data_classification: string;
      key_policies: string[];
      matched_controls: Array<{
        control_id: number;
        control_code: string;
        title: string;
        confidence_score: number;
        mapping_type: string;
        reasoning: string;
        cited_text?: string;
      }>;
      gaps: Array<{
        control_id: number;
        control_code: string;
        title: string;
        severity: string;
        findings: string;
        recommendation: string;
      }>;
      citations: Array<{
        page?: number;
        section?: string;
        text: string;
        relevance?: number;
      }>;
      recommendations: string[];
    }>('/ai/analyze-document', {
      method: 'POST',
      body: JSON.stringify({ evidence_id: evidenceId, model_name: modelName }),
    }),
    summarizeDocument: (evidenceId: number) => request<{
      run_id: number;
      evidence_id: number;
      file_name: string;
      summary: string;
      key_takeaways: string[];
      document_type: string;
      model_name: string;
    }>('/ai/summarize-document', {
      method: 'POST',
      body: JSON.stringify({ evidence_id: evidenceId }),
    }),
    chat: (question: string, evidenceId?: number) => request<{
      run_id: number;
      question: string;
      answer: string;
      model_name: string;
      citations: Array<{
        page?: number;
        section?: string;
        text: string;
        relevance?: number;
      }>;
      related_controls: string[];
    }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ question, evidence_id: evidenceId }),
    }),
    gapAnalysis: (evidenceId?: number, frameworkCode?: string) => request<{
      run_id: number;
      organization_id: number;
      compliance_score: number;
      summary: string;
      gaps: Array<{
        control_id: number;
        control_code: string;
        title: string;
        severity: string;
        findings: string;
        recommendation: string;
      }>;
    }>('/ai/gap-analysis', {
      method: 'POST',
      body: JSON.stringify({ evidence_id: evidenceId, framework_code: frameworkCode }),
    }),
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
    list: () => request<Array<{ id: number; organization_id: number; name: string; email: string; is_active: boolean }>>('/users/'),
    get: (id: number) => request<{ id: number; organization_id: number; name: string; email: string; is_active: boolean }>(`/users/${id}`),
    create: (data: { organization_id: number; name: string; email: string }) => request<{ id: number; organization_id: number; name: string; email: string; is_active: boolean }>('/users/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: { organization_id: number; name: string; email: string }) => request<{ id: number; organization_id: number; name: string; email: string; is_active: boolean }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: number) => request<{ message: string }>(`/users/${id}`, {
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
    list: () => request<Array<{ id: number; name: string; code: string; description: string }>>('/frameworks/'),
    create: (data: { name: string; code: string; description?: string }) => request<{ id: number; name: string; code: string; description: string }>('/frameworks/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  controls: {
    list: () => request<Array<{ id: number; framework_version_id: number; control_code: string; title: string; description: string }>>('/controls/'),
    get: (id: number) => request<{ id: number; framework_version_id: number; control_code: string; title: string; description: string }>(`/controls/${id}`),
    create: (data: { framework_version_id: number; control_code: string; title: string; description: string }) => request<{ id: number; framework_version_id: number; control_code: string; title: string; description: string }>('/controls/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: number, data: { framework_version_id: number; control_code: string; title: string; description: string }) => request<{ id: number; framework_version_id: number; control_code: string; title: string; description: string }>(`/controls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
  },

  // 6. Evidence Control Mappings (AI Evidence Analysis & Auditor Review)
  mappings: {
    list: () => request<Array<{
      id: number;
      evidence_id: number;
      control_id: number;
      mapping_type: string;
      confidence_score: number | null;
      mapping_status: string;
      notes: string | null;
    }>>('/evidence-control-mappings/'),
    create: (data: {
      evidence_id: number;
      control_id: number;
      mapping_type?: string;
      confidence_score?: number;
      mapping_status?: string;
      notes?: string;
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
    update: (id: number, data: {
      evidence_id: number;
      control_id: number;
      mapping_type?: string;
      confidence_score?: number;
      mapping_status: string;
      notes?: string;
    }) => request<{
      id: number;
      evidence_id: number;
      control_id: number;
      mapping_type: string;
      confidence_score: number | null;
      mapping_status: string;
      notes: string | null;
    }>(`/evidence-control-mappings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
      versions: Array<{
        id: number;
        version: string;
        authority: string;
        effective_date: string;
        status: string;
        source_url: string;
      }>;
    }>>('/compliance/frameworks'),
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
};
