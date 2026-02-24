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
  | 'CHECKBOX_GROUP'
  | 'ELEMENT_GROUP'
  | 'STATIC_TEXT'
  | 'PAGE_BREAK'

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
  content?: string
  repeatable?: boolean
  minInstances?: number
  maxInstances?: number
  fullPage?: boolean
  instanceLabel?: string
  allowOther?: boolean
}

export interface FormElement {
  id: string
  type: ElementType
  label: string
  fieldName: string
  sortOrder: number
  configuration: ElementConfiguration
  parentElementId?: string
  pageId: string
  children?: FormElement[]
}

export interface FormPage {
  id: string
  pageNumber: number
  title?: string
  description?: string
  elements: FormElement[]
  createdAt: string
  updatedAt: string
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
  pages: FormPage[]
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
  parentElementId?: string
  pageId?: string
}

export interface UpdateElementRequest {
  type?: ElementType
  label?: string
  fieldName?: string
  sortOrder?: number
  configuration?: ElementConfiguration
  parentElementId?: string
}

export interface ReorderElementsRequest {
  elementIds: string[]
}

export type SubmissionStatus = 'DRAFT' | 'SUBMITTED'

export interface Submission {
  id: string
  formId: string
  data: Record<string, unknown>
  submittedAt: string
  updatedAt?: string
  status?: SubmissionStatus
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
  status?: SubmissionStatus
}

export interface UpdateSubmissionRequest {
  data: Record<string, unknown>
  status?: SubmissionStatus
}

export interface ApiError {
  status: number
  error: string
  message: string
  timestamp: string
  fieldErrors?: Record<string, string>
}

// Import/Export types
export interface FormExportElement {
  type: ElementType
  label: string
  fieldName: string
  sortOrder: number
  configuration: ElementConfiguration
  pageIndex?: number
  children?: FormExportElement[]
}

export interface FormExportPage {
  pageNumber: number
  title?: string
  description?: string
}

export interface FormExportData {
  name: string
  description?: string
  pages: FormExportPage[]
  elements: FormExportElement[]
}
