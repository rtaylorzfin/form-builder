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
} from './types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

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
}

// Submissions API
export const submissionsApi = {
  list: async (formId: string, page = 0, size = 20): Promise<SubmissionPage> => {
    const { data } = await api.get<SubmissionPage>(`/forms/${formId}/submissions`, {
      params: { page, size },
    })
    return data
  },

  export: async (formId: string): Promise<string> => {
    const { data } = await api.get<string>(`/forms/${formId}/submissions/export`)
    return data
  },
}

export default api
