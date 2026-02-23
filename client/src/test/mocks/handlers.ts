import { http, HttpResponse } from 'msw'
import type { FormListItem } from '@/api/types'

export const mockForms: FormListItem[] = [
  {
    id: '1',
    name: 'Contact Form',
    description: 'A simple contact form',
    status: 'PUBLISHED',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    elementCount: 3,
  },
  {
    id: '2',
    name: 'Survey',
    description: 'Employee satisfaction survey',
    status: 'DRAFT',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
    elementCount: 5,
  },
]

export const handlers = [
  http.get('/api/forms', () => {
    return HttpResponse.json(mockForms)
  }),

  http.delete('/api/forms/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('/api/forms/import', () => {
    return HttpResponse.json({
      id: '3',
      name: 'Imported Form',
      status: 'DRAFT',
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
      elements: [],
      pages: [],
    })
  }),
]
