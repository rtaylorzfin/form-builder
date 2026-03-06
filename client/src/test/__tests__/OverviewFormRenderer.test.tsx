import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OverviewFormRenderer from '@/components/preview/OverviewFormRenderer'
import type { FormElement, FormPage } from '@/api/types'

const makeElement = (overrides: Partial<FormElement> = {}): FormElement => ({
  id: 'el-1',
  type: 'TEXT_INPUT',
  label: 'Name',
  fieldName: 'name',
  sortOrder: 0,
  pageId: 'page-1',
  configuration: { required: false },
  ...overrides,
})

const makePage = (overrides: Partial<FormPage> & { elements?: FormElement[] } = {}): FormPage => ({
  id: 'page-1',
  pageNumber: 1,
  elements: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('OverviewFormRenderer', () => {
  describe('overview display', () => {
    it('renders section titles with page numbers', () => {
      const pages = [
        makePage({
          id: 'p1',
          pageNumber: 1,
          title: 'General Info',
          elements: [makeElement({ pageId: 'p1' })],
        }),
        makePage({
          id: 'p2',
          pageNumber: 2,
          title: 'Contact Details',
          elements: [
            makeElement({ id: 'el-2', label: 'Email', fieldName: 'email', pageId: 'p2' }),
          ],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)
      expect(screen.getByText('1. General Info')).toBeInTheDocument()
      expect(screen.getByText('2. Contact Details')).toBeInTheDocument()
    })

    it('shows Not Started badges for empty sections', () => {
      const pages = [
        makePage({
          title: 'General Info',
          elements: [makeElement()],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)
      expect(screen.getByText('Not Started')).toBeInTheDocument()
    })

    it('shows Edit buttons for each section', () => {
      const pages = [
        makePage({
          id: 'p1',
          pageNumber: 1,
          title: 'Section A',
          elements: [makeElement({ pageId: 'p1' })],
        }),
        makePage({
          id: 'p2',
          pageNumber: 2,
          title: 'Section B',
          elements: [
            makeElement({ id: 'el-2', label: 'Age', fieldName: 'age', pageId: 'p2' }),
          ],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)
      const editButtons = screen.getAllByRole('button', { name: /Edit/ })
      expect(editButtons).toHaveLength(2)
    })

    it('shows Submit button', () => {
      const pages = [
        makePage({ elements: [makeElement()] }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    })

    it('shows Mark complete checkbox for each section', () => {
      const pages = [
        makePage({
          id: 'p1',
          pageNumber: 1,
          title: 'Section A',
          elements: [makeElement({ pageId: 'p1' })],
        }),
        makePage({
          id: 'p2',
          pageNumber: 2,
          title: 'Section B',
          elements: [
            makeElement({ id: 'el-2', label: 'Age', fieldName: 'age', pageId: 'p2' }),
          ],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)
      const labels = screen.getAllByText('Mark this section as complete')
      expect(labels).toHaveLength(2)
    })
  })

  describe('simple page editing', () => {
    it('clicking Edit shows section editor with page title', async () => {
      const user = userEvent.setup()
      const pages = [
        makePage({
          title: 'General Info',
          elements: [
            makeElement({ configuration: { required: false, placeholder: 'Enter name...' } }),
          ],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Edit/ }))

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('General Info')
    })

    it('shows form fields in editor', async () => {
      const user = userEvent.setup()
      const pages = [
        makePage({
          title: 'General Info',
          elements: [
            makeElement({ configuration: { required: false, placeholder: 'Enter name...' } }),
          ],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Edit/ }))

      expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument()
    })

    it('Save and Exit returns to overview', async () => {
      const user = userEvent.setup()
      const pages = [
        makePage({
          title: 'General Info',
          elements: [
            makeElement({ configuration: { required: false, placeholder: 'Enter name...' } }),
          ],
        }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Edit/ }))
      expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument()

      await user.click(screen.getAllByRole('button', { name: /Save and Exit/ })[0])

      expect(screen.queryByPlaceholderText('Enter name...')).not.toBeInTheDocument()
      expect(screen.getByText('1. General Info')).toBeInTheDocument()
    })
  })

  describe('repeatable group sections', () => {
    const makeRepeatablePages = () => [
      makePage({
        title: 'Mutations',
        elements: [
          makeElement({
            id: 'group-1',
            type: 'ELEMENT_GROUP',
            label: 'Mutations',
            fieldName: 'mutations',
            configuration: {
              repeatable: true,
              fullPage: true,
              minInstances: 0,
              maxInstances: 5,
              instanceLabel: 'Mutation',
            },
            children: [
              makeElement({
                id: 'child-1',
                label: 'Allele',
                fieldName: 'allele',
                pageId: 'page-1',
                configuration: { placeholder: 'Enter allele...' },
              }),
            ],
          }),
        ],
      }),
    ]

    it('shows Add button with instance label', () => {
      render(<OverviewFormRenderer pages={makeRepeatablePages()} onSubmit={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Add Mutation/ })).toBeInTheDocument()
    })

    it('clicking Add creates a new instance', async () => {
      const user = userEvent.setup()
      render(<OverviewFormRenderer pages={makeRepeatablePages()} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Add Mutation/ }))

      expect(screen.getByText('Mutation 1')).toBeInTheDocument()
    })

    it('instances show Edit and Delete buttons', async () => {
      const user = userEvent.setup()
      render(<OverviewFormRenderer pages={makeRepeatablePages()} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Add Mutation/ }))

      expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument()
      // Delete button is a ghost button with Trash2 icon (no text)
      const deleteButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('.lucide-trash-2') || btn.querySelector('svg')
      )
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  describe('submit', () => {
    it('Submit button shows submitting state', () => {
      const pages = [
        makePage({ elements: [makeElement()] }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} isSubmitting />)
      const submitButton = screen.getByRole('button', { name: 'Submitting...' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('readOnly hides Submit button', () => {
      const pages = [
        makePage({ elements: [makeElement()] }),
      ]
      render(<OverviewFormRenderer pages={pages} onSubmit={vi.fn()} readOnly />)
      expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
    })
  })
})
