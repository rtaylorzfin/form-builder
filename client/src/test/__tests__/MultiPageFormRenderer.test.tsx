import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MultiPageFormRenderer from '@/components/preview/MultiPageFormRenderer'
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

describe('MultiPageFormRenderer', () => {
  describe('progress bar', () => {
    it('displays page title in progress bar when available', () => {
      const pages = [
        makePage({
          id: 'p1',
          pageNumber: 1,
          title: 'Personal Info',
          elements: [makeElement()],
        }),
        makePage({
          id: 'p2',
          pageNumber: 2,
          title: 'Contact',
          elements: [makeElement({ id: 'el-2', label: 'Email', fieldName: 'email', pageId: 'p2' })],
        }),
      ]
      render(<MultiPageFormRenderer pages={pages} onSubmit={vi.fn()} />)
      expect(screen.getByText('Personal Info (Page 1 of 2)')).toBeInTheDocument()
    })

    it('falls back to Page N when no title', () => {
      const pages = [
        makePage({
          elements: [makeElement()],
        }),
      ]
      render(<MultiPageFormRenderer pages={pages} onSubmit={vi.fn()} />)
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    })
  })

  describe('page break rendering', () => {
    it('renders page break as a visual divider on a page', () => {
      const pages = [
        makePage({
          elements: [
            makeElement(),
            makeElement({
              id: 'pb-1',
              type: 'PAGE_BREAK',
              label: 'Section Divider',
              fieldName: 'section_divider',
              sortOrder: 1,
            }),
            makeElement({
              id: 'el-2',
              label: 'Age',
              fieldName: 'age',
              type: 'NUMBER',
              sortOrder: 2,
            }),
          ],
        }),
      ]
      const { container } = render(<MultiPageFormRenderer pages={pages} onSubmit={vi.fn()} />)
      expect(screen.getByText('Section Divider')).toBeInTheDocument()
      expect(container.querySelector('.border-dashed')).toBeInTheDocument()
    })

    it('page break does not create validation fields', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const pages = [
        makePage({
          elements: [
            makeElement({ configuration: { required: true, placeholder: 'Enter text...' } }),
            makeElement({
              id: 'pb-1',
              type: 'PAGE_BREAK',
              label: 'Break',
              fieldName: 'break_1',
              sortOrder: 1,
            }),
          ],
        }),
      ]
      render(<MultiPageFormRenderer pages={pages} onSubmit={onSubmit} />)

      await user.type(screen.getByPlaceholderText('Enter text...'), 'Test Value')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('full-page group navigation', () => {
    const makeFullPageGroupPages = () => [
      makePage({
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

    it('renders Add button for fullPage repeatable group', () => {
      render(<MultiPageFormRenderer pages={makeFullPageGroupPages()} onSubmit={vi.fn()} />)
      expect(screen.getByText('Mutations')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Add Mutation/ })).toBeInTheDocument()
    })

    it('adds an instance and shows Edit button', async () => {
      const user = userEvent.setup()
      render(<MultiPageFormRenderer pages={makeFullPageGroupPages()} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Add Mutation/ }))
      expect(screen.getByText('Mutation 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument()
    })

    it('navigates into full-page group and shows breadcrumb', async () => {
      const user = userEvent.setup()
      render(<MultiPageFormRenderer pages={makeFullPageGroupPages()} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Add Mutation/ }))
      await user.click(screen.getByRole('button', { name: /Edit/ }))

      // Should show breadcrumb with page link
      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
      expect(within(nav).getByText('Page 1')).toBeInTheDocument()

      // Should show Mutations header
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Mutations')

      // Should show the child fields
      expect(screen.getByPlaceholderText('Enter allele...')).toBeInTheDocument()

      // Should show Done buttons (top and bottom)
      const doneButtons = screen.getAllByRole('button', { name: /Done/ })
      expect(doneButtons.length).toBeGreaterThanOrEqual(2)
    })

    it('Done button returns to page view', async () => {
      const user = userEvent.setup()
      render(<MultiPageFormRenderer pages={makeFullPageGroupPages()} onSubmit={vi.fn()} />)

      await user.click(screen.getByRole('button', { name: /Add Mutation/ }))
      await user.click(screen.getByRole('button', { name: /Edit/ }))

      // Should be in the group view
      expect(screen.getByPlaceholderText('Enter allele...')).toBeInTheDocument()

      // Click Done
      await user.click(screen.getAllByRole('button', { name: /Done/ })[0])

      // Should be back on the page
      expect(screen.queryByPlaceholderText('Enter allele...')).not.toBeInTheDocument()
      expect(screen.getByText('Mutation 1')).toBeInTheDocument()
    })
  })

  describe('multi-page navigation', () => {
    const makeTwoPageForm = () => [
      makePage({
        id: 'p1',
        pageNumber: 1,
        title: 'Step One',
        elements: [
          makeElement({ pageId: 'p1', configuration: { required: true, placeholder: 'Enter name...' } }),
        ],
      }),
      makePage({
        id: 'p2',
        pageNumber: 2,
        title: 'Step Two',
        elements: [
          makeElement({
            id: 'el-2',
            label: 'Email',
            fieldName: 'email',
            type: 'EMAIL',
            pageId: 'p2',
            sortOrder: 0,
            configuration: { placeholder: 'Enter email...' },
          }),
        ],
      }),
    ]

    it('advances to next page after filling required fields', async () => {
      const user = userEvent.setup()
      render(<MultiPageFormRenderer pages={makeTwoPageForm()} onSubmit={vi.fn()} />)

      expect(screen.getByText('Step One (Page 1 of 2)')).toBeInTheDocument()

      await user.type(screen.getByPlaceholderText('Enter name...'), 'John')
      await user.click(screen.getByRole('button', { name: /Next/ }))

      await vi.waitFor(() => {
        expect(screen.getByText('Step Two (Page 2 of 2)')).toBeInTheDocument()
      })
    })

    it('Previous button goes back a page', async () => {
      const user = userEvent.setup()
      render(<MultiPageFormRenderer pages={makeTwoPageForm()} onSubmit={vi.fn()} />)

      // Go to page 2
      await user.type(screen.getByPlaceholderText('Enter name...'), 'John')
      await user.click(screen.getByRole('button', { name: /Next/ }))

      await vi.waitFor(() => {
        expect(screen.getByText('Step Two (Page 2 of 2)')).toBeInTheDocument()
      })

      // Go back
      await user.click(screen.getByRole('button', { name: /Previous/ }))

      await vi.waitFor(() => {
        expect(screen.getByText('Step One (Page 1 of 2)')).toBeInTheDocument()
      })
    })
  })
})
