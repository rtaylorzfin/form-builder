import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FormRenderer from '@/components/preview/FormRenderer'
import type { Form, FormElement } from '@/api/types'

const makePage = (id = 'page-1') => ({
  id,
  pageNumber: 1,
  elements: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
})

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

const makeForm = (elements: FormElement[]): Form => ({
  id: 'form-1',
  name: 'Test Form',
  status: 'PUBLISHED',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  elements,
  pages: [makePage()],
})

describe('FormRenderer', () => {
  describe('field rendering', () => {
    it('renders a text input field', () => {
      const form = makeForm([
        makeElement({ configuration: { required: false, placeholder: 'Enter text...' } }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
    })

    it('renders a textarea field', () => {
      const form = makeForm([
        makeElement({
          id: 'ta-1',
          type: 'TEXT_AREA',
          label: 'Description',
          fieldName: 'description',
          configuration: { placeholder: 'Enter text...' },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('renders a number field', () => {
      const form = makeForm([
        makeElement({
          id: 'num-1',
          type: 'NUMBER',
          label: 'Age',
          fieldName: 'age',
          configuration: { placeholder: 'Enter number...' },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Age')).toBeInTheDocument()
    })

    it('renders an email field', () => {
      const form = makeForm([
        makeElement({
          id: 'email-1',
          type: 'EMAIL',
          label: 'Email',
          fieldName: 'email',
          configuration: { placeholder: 'Enter email...' },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Email')).toBeInTheDocument()
    })

    it('renders a date field', () => {
      const form = makeForm([
        makeElement({
          id: 'date-1',
          type: 'DATE',
          label: 'Birthday',
          fieldName: 'birthday',
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Birthday')).toBeInTheDocument()
    })

    it('renders a checkbox field', () => {
      const form = makeForm([
        makeElement({
          id: 'cb-1',
          type: 'CHECKBOX',
          label: 'Agree to terms',
          fieldName: 'agree',
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Agree to terms')).toBeInTheDocument()
    })

    it('renders radio group options', () => {
      const form = makeForm([
        makeElement({
          id: 'rg-1',
          type: 'RADIO_GROUP',
          label: 'Color',
          fieldName: 'color',
          configuration: {
            options: [
              { label: 'Red', value: 'red' },
              { label: 'Blue', value: 'blue' },
            ],
          },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Color')).toBeInTheDocument()
      expect(screen.getByText('Red')).toBeInTheDocument()
      expect(screen.getByText('Blue')).toBeInTheDocument()
    })

    it('renders select with options', () => {
      const form = makeForm([
        makeElement({
          id: 'sel-1',
          type: 'SELECT',
          label: 'Country',
          fieldName: 'country',
          configuration: {
            options: [
              { label: 'USA', value: 'us' },
              { label: 'Canada', value: 'ca' },
            ],
          },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Country')).toBeInTheDocument()
    })

    it('renders static text as HTML', () => {
      const form = makeForm([
        makeElement({
          id: 'st-1',
          type: 'STATIC_TEXT',
          label: 'Info',
          fieldName: 'info',
          configuration: { content: '<p>Welcome to the form</p>' },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Welcome to the form')).toBeInTheDocument()
    })

    it('renders a page break as a visual divider', () => {
      const form = makeForm([
        makeElement({
          id: 'pb-1',
          type: 'PAGE_BREAK',
          label: 'Section Break',
          fieldName: 'section_break',
        }),
      ])
      const { container } = render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Section Break')).toBeInTheDocument()
      expect(container.querySelector('.border-dashed')).toBeInTheDocument()
    })
  })

  describe('required indicator', () => {
    it('shows asterisk for required fields', () => {
      const form = makeForm([
        makeElement({ configuration: { required: true } }),
      ])
      const { container } = render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(container.querySelector('.text-red-500')).toBeInTheDocument()
    })

    it('does not show asterisk for optional fields', () => {
      const form = makeForm([
        makeElement({ configuration: { required: false } }),
      ])
      const { container } = render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      // The only .text-red-500 elements should be error messages, not asterisks
      const asterisks = container.querySelectorAll('span.text-red-500')
      expect(asterisks).toHaveLength(0)
    })
  })

  describe('validation', () => {
    it('shows error for required text field when empty', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const form = makeForm([
        makeElement({ configuration: { required: true, placeholder: 'Enter text...' } }),
      ])
      render(<FormRenderer form={form} onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(await screen.findByText('Name is required')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('shows error for required email when empty', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const form = makeForm([
        makeElement({
          id: 'email-1',
          type: 'EMAIL',
          label: 'Email',
          fieldName: 'email',
          configuration: { required: true, placeholder: 'Enter email...' },
        }),
      ])
      render(<FormRenderer form={form} onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(await screen.findByText('Email is required')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('submits successfully with valid data', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const form = makeForm([
        makeElement({ configuration: { required: true, placeholder: 'Enter text...' } }),
      ])
      render(<FormRenderer form={form} onSubmit={onSubmit} />)

      await user.type(screen.getByPlaceholderText('Enter text...'), 'John Doe')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      // Wait for form submission
      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
      })
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'John Doe' }),
        expect.anything()
      )
    })

    it('page break elements do not interfere with validation', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      const form = makeForm([
        makeElement({ configuration: { required: true, placeholder: 'Enter text...' } }),
        makeElement({
          id: 'pb-1',
          type: 'PAGE_BREAK',
          label: 'Break',
          fieldName: 'break_1',
        }),
      ])
      render(<FormRenderer form={form} onSubmit={onSubmit} />)

      await user.type(screen.getByPlaceholderText('Enter text...'), 'Test')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      await vi.waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('groups', () => {
    it('renders a non-repeatable group as fieldset', () => {
      const child = makeElement({
        id: 'child-1',
        label: 'Street',
        fieldName: 'street',
        configuration: { placeholder: 'Enter street...' },
      })
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Address',
        fieldName: 'address',
        children: [child],
      })
      const form = makeForm([group])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Address')).toBeInTheDocument()
      expect(screen.getByText('Street')).toBeInTheDocument()
    })

    it('renders a repeatable group with instance controls', () => {
      const child = makeElement({
        id: 'child-1',
        label: 'Item',
        fieldName: 'item',
      })
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Items',
        fieldName: 'items',
        configuration: { repeatable: true, minInstances: 1, maxInstances: 3 },
        children: [child],
      })
      const form = makeForm([group])
      render(<FormRenderer form={form} onSubmit={vi.fn()} />)
      expect(screen.getByText('Items')).toBeInTheDocument()
      expect(screen.getByText('Instance 1')).toBeInTheDocument()
      expect(screen.getByText(/Add Items/)).toBeInTheDocument()
    })
  })

  describe('submit button', () => {
    it('shows custom submit label', () => {
      const form = makeForm([makeElement()])
      render(<FormRenderer form={form} onSubmit={vi.fn()} submitLabel="Save Draft" />)
      expect(screen.getByRole('button', { name: 'Save Draft' })).toBeInTheDocument()
    })

    it('shows submitting state', () => {
      const form = makeForm([makeElement()])
      render(<FormRenderer form={form} onSubmit={vi.fn()} isSubmitting />)
      expect(screen.getByRole('button', { name: 'Submitting...' })).toBeInTheDocument()
    })

    it('hides submit button in readOnly mode', () => {
      const form = makeForm([makeElement()])
      render(<FormRenderer form={form} onSubmit={vi.fn()} readOnly />)
      expect(screen.queryByRole('button', { name: 'Submit' })).not.toBeInTheDocument()
    })
  })
})
