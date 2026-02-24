import axios from 'axios'
import type {
  Form,
  FormListItem,
  CreateFormRequest,
  UpdateFormRequest,
  FormElement,
  CreateElementRequest,
  UpdateElementRequest,
  ReorderElementsRequest,
  Submission,
  SubmissionPage,
  SubmitFormRequest,
  UpdateSubmissionRequest,
  FormExportData,
} from './types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage)
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`
      }
    } catch {
      // ignore parse errors
    }
  }
  return config
})

// Response interceptor to handle 401 (not 403 - that's a role issue, not auth)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          if (parsed.state?.token) {
            // Token expired or invalid - clear auth and redirect
            localStorage.removeItem('auth-storage')
            window.location.href = '/login'
          }
        } catch {
          // ignore
        }
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
interface AuthResponse {
  token: string
  user: { id: string; email: string; name: string; role: string }
}

interface UserResponse {
  id: string
  email: string
  name: string
  role: string
}

export const authApi = {
  register: async (request: { name: string; email: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', request)
    return data
  },

  login: async (request: { email: string; password: string }): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', request)
    return data
  },

  me: async (): Promise<UserResponse> => {
    const { data } = await api.get<UserResponse>('/auth/me')
    return data
  },
}

// Forms API
export const formsApi = {
  list: async (): Promise<FormListItem[]> => {
    const { data } = await api.get<FormListItem[]>('/forms')
    return data
  },

  get: async (id: string): Promise<Form> => {
    const { data } = await api.get<Form>(`/forms/${id}`)
    return data
  },

  create: async (request: CreateFormRequest): Promise<Form> => {
    const { data } = await api.post<Form>('/forms', request)
    return data
  },

  update: async (id: string, request: UpdateFormRequest): Promise<Form> => {
    const { data } = await api.put<Form>(`/forms/${id}`, request)
    return data
  },

  publish: async (id: string): Promise<Form> => {
    const { data } = await api.post<Form>(`/forms/${id}/publish`)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/forms/${id}`)
  },

  export: async (id: string): Promise<FormExportData> => {
    const { data } = await api.get<FormExportData>(`/forms/${id}/export`)
    return data
  },

  import: async (data: FormExportData): Promise<Form> => {
    const { data: result } = await api.post<Form>('/forms/import', data)
    return result
  },
}

// Elements API
export const elementsApi = {
  list: async (formId: string): Promise<FormElement[]> => {
    const { data } = await api.get<FormElement[]>(`/forms/${formId}/elements`)
    return data
  },

  create: async (formId: string, request: CreateElementRequest): Promise<FormElement> => {
    const { data } = await api.post<FormElement>(`/forms/${formId}/elements`, request)
    return data
  },

  update: async (
    formId: string,
    elementId: string,
    request: UpdateElementRequest
  ): Promise<FormElement> => {
    const { data } = await api.put<FormElement>(`/forms/${formId}/elements/${elementId}`, request)
    return data
  },

  delete: async (formId: string, elementId: string): Promise<void> => {
    await api.delete(`/forms/${formId}/elements/${elementId}`)
  },

  reorder: async (formId: string, request: ReorderElementsRequest): Promise<FormElement[]> => {
    const { data } = await api.put<FormElement[]>(`/forms/${formId}/elements/reorder`, request)
    return data
  },
}

// Pages API
export const pagesApi = {
  list: async (formId: string) => {
    const { data } = await api.get(`/forms/${formId}/pages`)
    return data
  },

  create: async (formId: string, request: { title?: string; description?: string }) => {
    const { data } = await api.post(`/forms/${formId}/pages`, request)
    return data
  },

  update: async (formId: string, pageId: string, request: { title?: string; description?: string }) => {
    const { data } = await api.put(`/forms/${formId}/pages/${pageId}`, request)
    return data
  },

  delete: async (formId: string, pageId: string): Promise<void> => {
    await api.delete(`/forms/${formId}/pages/${pageId}`)
  },

  reorder: async (formId: string, request: { pageIds: string[] }) => {
    const { data } = await api.put(`/forms/${formId}/pages/reorder`, request)
    return data
  },
}

// Public API
export const publicApi = {
  getForm: async (id: string): Promise<Form> => {
    const { data } = await api.get<Form>(`/public/forms/${id}`)
    return data
  },

  submit: async (id: string, request: SubmitFormRequest): Promise<Submission> => {
    const { data } = await api.post<Submission>(`/public/forms/${id}/submit`, request)
    return data
  },

  getDraft: async (id: string): Promise<Submission | null> => {
    const response = await api.get(`/public/forms/${id}/draft`)
    return response.status === 204 ? null : response.data
  },

  saveDraft: async (id: string, data: Record<string, unknown>): Promise<Submission> => {
    const { data: result } = await api.put<Submission>(`/public/forms/${id}/draft`, { data })
    return result
  },
}

// Submissions API
export const submissionsApi = {
  list: async (formId: string, page = 0, size = 20): Promise<SubmissionPage> => {
    const { data } = await api.get<SubmissionPage>(`/forms/${formId}/submissions`, {
      params: { page, size },
    })
    return data
  },

  get: async (formId: string, submissionId: string): Promise<Submission> => {
    const { data } = await api.get<Submission>(`/forms/${formId}/submissions/${submissionId}`)
    return data
  },

  update: async (formId: string, submissionId: string, request: UpdateSubmissionRequest): Promise<Submission> => {
    const { data } = await api.put<Submission>(`/forms/${formId}/submissions/${submissionId}`, request)
    return data
  },

  export: async (formId: string): Promise<string> => {
    const { data } = await api.get<string>(`/forms/${formId}/submissions/export`)
    return data
  },
}

export default api
