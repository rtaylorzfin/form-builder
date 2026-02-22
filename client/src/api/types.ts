export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

export type ElementType =
  | 'TEXT_INPUT'
  | 'TEXT_AREA'
  | 'NUMBER'
  | 'EMAIL'
  | 'DATE'
  | 'CHECKBOX'
  | 'RADIO_GROUP'
  | 'SELECT'

export interface ElementOption {
  label: string
  value: string
}

export interface ElementConfiguration {
  placeholder?: string
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  patternMessage?: string
  options?: ElementOption[]
  defaultValue?: string
}

export interface FormElement {
  id: string
  type: ElementType
  label: string
  fieldName: string
  sortOrder: number
  configuration: ElementConfiguration
}

export interface Form {
  id: string
  name: string
  description?: string
  status: FormStatus
  createdAt: string
  updatedAt: string
  publishedAt?: string
  elements: FormElement[]
}

export interface FormListItem {
  id: string
  name: string
  description?: string
  status: FormStatus
  createdAt: string
  updatedAt: string
  elementCount: number
}

export interface CreateFormRequest {
  name: string
  description?: string
}

export interface UpdateFormRequest {
  name?: string
  description?: string
  status?: FormStatus
}

export interface CreateElementRequest {
  type: ElementType
  label: string
  fieldName: string
  sortOrder?: number
  configuration?: ElementConfiguration
}

export interface UpdateElementRequest {
  type?: ElementType
  label?: string
  fieldName?: string
  sortOrder?: number
  configuration?: ElementConfiguration
}

export interface ReorderElementsRequest {
  elementIds: string[]
}

export interface Submission {
  id: string
  formId: string
  data: Record<string, unknown>
  submittedAt: string
  ipAddress?: string
}

export interface SubmissionPage {
  submissions: Submission[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface SubmitFormRequest {
  data: Record<string, unknown>
}

export interface ApiError {
  status: number
  error: string
  message: string
  timestamp: string
  fieldErrors?: Record<string, string>
}
