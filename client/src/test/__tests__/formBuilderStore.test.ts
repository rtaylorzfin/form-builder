import { describe, it, expect, beforeEach } from 'vitest'
import { useFormBuilderStore, createNewElement } from '@/stores/formBuilderStore'
import type { FormElement, FormPage } from '@/api/types'

const makePage = (id = 'page-1'): FormPage => ({
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

describe('formBuilderStore', () => {
  beforeEach(() => {
    useFormBuilderStore.getState().reset()
  })

  describe('addElement', () => {
    it('adds an element to the store', () => {
      const el = makeElement()
      useFormBuilderStore.getState().addElement(el)
      expect(useFormBuilderStore.getState().elements).toHaveLength(1)
      expect(useFormBuilderStore.getState().elements[0]).toEqual(el)
      expect(useFormBuilderStore.getState().isDirty).toBe(true)
    })

    it('appends multiple elements preserving order', () => {
      const el1 = makeElement({ id: 'el-1', sortOrder: 0 })
      const el2 = makeElement({ id: 'el-2', label: 'Email', fieldName: 'email', sortOrder: 1 })
      useFormBuilderStore.getState().addElement(el1)
      useFormBuilderStore.getState().addElement(el2)
      expect(useFormBuilderStore.getState().elements).toHaveLength(2)
      expect(useFormBuilderStore.getState().elements[1].id).toBe('el-2')
    })
  })

  describe('removeElement', () => {
    it('removes an element by id', () => {
      const el = makeElement()
      useFormBuilderStore.getState().addElement(el)
      useFormBuilderStore.getState().removeElement('el-1')
      expect(useFormBuilderStore.getState().elements).toHaveLength(0)
    })

    it('clears selectedElementId when removing the selected element', () => {
      const el = makeElement()
      useFormBuilderStore.getState().addElement(el)
      useFormBuilderStore.getState().selectElement('el-1')
      useFormBuilderStore.getState().removeElement('el-1')
      expect(useFormBuilderStore.getState().selectedElementId).toBeNull()
    })

    it('removes a nested child element', () => {
      const child = makeElement({ id: 'child-1', label: 'Child', fieldName: 'child' })
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Group',
        fieldName: 'group',
        children: [child],
      })
      useFormBuilderStore.getState().addElement(group)
      useFormBuilderStore.getState().removeElement('child-1')
      expect(useFormBuilderStore.getState().elements[0].children).toHaveLength(0)
    })
  })

  describe('updateElement', () => {
    it('updates element properties', () => {
      const el = makeElement()
      useFormBuilderStore.getState().addElement(el)
      useFormBuilderStore.getState().updateElement('el-1', { label: 'Full Name' })
      expect(useFormBuilderStore.getState().elements[0].label).toBe('Full Name')
      expect(useFormBuilderStore.getState().isDirty).toBe(true)
    })

    it('updates a nested element', () => {
      const child = makeElement({ id: 'child-1', label: 'Child', fieldName: 'child' })
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Group',
        fieldName: 'group',
        children: [child],
      })
      useFormBuilderStore.getState().addElement(group)
      useFormBuilderStore.getState().updateElement('child-1', { label: 'Updated Child' })
      expect(useFormBuilderStore.getState().elements[0].children![0].label).toBe('Updated Child')
    })
  })

  describe('moveElementUp / moveElementDown', () => {
    it('swaps root elements on the same page', () => {
      const el1 = makeElement({ id: 'el-1', sortOrder: 0 })
      const el2 = makeElement({ id: 'el-2', sortOrder: 1, label: 'Email', fieldName: 'email' })
      useFormBuilderStore.getState().addElement(el1)
      useFormBuilderStore.getState().addElement(el2)

      useFormBuilderStore.getState().moveElementDown('el-1')
      const elements = useFormBuilderStore.getState().elements
      expect(elements[0].id).toBe('el-2')
      expect(elements[1].id).toBe('el-1')
    })

    it('moves a child element up within a group', () => {
      const child1 = makeElement({ id: 'c1', label: 'A', fieldName: 'a', sortOrder: 0 })
      const child2 = makeElement({ id: 'c2', label: 'B', fieldName: 'b', sortOrder: 1 })
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Group',
        fieldName: 'group',
        children: [child1, child2],
      })
      useFormBuilderStore.getState().addElement(group)
      useFormBuilderStore.getState().moveElementUp('c2')
      const children = useFormBuilderStore.getState().elements[0].children!
      expect(children[0].id).toBe('c2')
      expect(children[1].id).toBe('c1')
    })

    it('does not move first element up', () => {
      const el1 = makeElement({ id: 'el-1', sortOrder: 0 })
      const el2 = makeElement({ id: 'el-2', sortOrder: 1 })
      useFormBuilderStore.getState().addElement(el1)
      useFormBuilderStore.getState().addElement(el2)

      useFormBuilderStore.getState().moveElementUp('el-1')
      expect(useFormBuilderStore.getState().elements[0].id).toBe('el-1')
    })

    it('does not move last element down', () => {
      const el1 = makeElement({ id: 'el-1', sortOrder: 0 })
      const el2 = makeElement({ id: 'el-2', sortOrder: 1 })
      useFormBuilderStore.getState().addElement(el1)
      useFormBuilderStore.getState().addElement(el2)

      useFormBuilderStore.getState().moveElementDown('el-2')
      expect(useFormBuilderStore.getState().elements[1].id).toBe('el-2')
    })
  })

  describe('addElementToGroup', () => {
    it('adds a child to a group', () => {
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Group',
        fieldName: 'group',
        children: [],
      })
      useFormBuilderStore.getState().addElement(group)

      const child = makeElement({ id: 'child-1', label: 'Child', fieldName: 'child' })
      useFormBuilderStore.getState().addElementToGroup(child, 'group-1')
      expect(useFormBuilderStore.getState().elements[0].children).toHaveLength(1)
      expect(useFormBuilderStore.getState().elements[0].children![0].id).toBe('child-1')
    })

    it('adds a child to a deeply nested group', () => {
      const innerGroup = makeElement({
        id: 'inner',
        type: 'ELEMENT_GROUP',
        label: 'Inner',
        fieldName: 'inner',
        children: [],
      })
      const outerGroup = makeElement({
        id: 'outer',
        type: 'ELEMENT_GROUP',
        label: 'Outer',
        fieldName: 'outer',
        children: [innerGroup],
      })
      useFormBuilderStore.getState().addElement(outerGroup)

      const child = makeElement({ id: 'deep-child', label: 'Deep', fieldName: 'deep' })
      useFormBuilderStore.getState().addElementToGroup(child, 'inner')

      const outer = useFormBuilderStore.getState().elements[0]
      expect(outer.children![0].children).toHaveLength(1)
      expect(outer.children![0].children![0].id).toBe('deep-child')
    })
  })

  describe('selectElement / getSelectedElement', () => {
    it('selects and retrieves an element', () => {
      const el = makeElement()
      useFormBuilderStore.getState().addElement(el)
      useFormBuilderStore.getState().selectElement('el-1')
      expect(useFormBuilderStore.getState().selectedElementId).toBe('el-1')
      expect(useFormBuilderStore.getState().getSelectedElement()?.id).toBe('el-1')
    })

    it('finds a nested selected element', () => {
      const child = makeElement({ id: 'child-1', label: 'Child', fieldName: 'child' })
      const group = makeElement({
        id: 'group-1',
        type: 'ELEMENT_GROUP',
        label: 'Group',
        fieldName: 'group',
        children: [child],
      })
      useFormBuilderStore.getState().addElement(group)
      useFormBuilderStore.getState().selectElement('child-1')
      expect(useFormBuilderStore.getState().getSelectedElement()?.id).toBe('child-1')
    })

    it('returns null when nothing is selected', () => {
      expect(useFormBuilderStore.getState().getSelectedElement()).toBeNull()
    })
  })

  describe('pages', () => {
    it('sets and navigates pages', () => {
      const page1 = makePage('p1')
      const page2 = makePage('p2')
      useFormBuilderStore.getState().setPages([page1, page2])
      expect(useFormBuilderStore.getState().pages).toHaveLength(2)

      useFormBuilderStore.getState().setCurrentPageIndex(1)
      expect(useFormBuilderStore.getState().currentPageIndex).toBe(1)
    })
  })

  describe('setForm', () => {
    it('populates elements and pages from a form', () => {
      const page = makePage()
      const el = makeElement()
      useFormBuilderStore.getState().setForm({
        id: 'form-1',
        name: 'Test Form',
        status: 'DRAFT',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        elements: [el],
        pages: [page],
      })
      expect(useFormBuilderStore.getState().form?.id).toBe('form-1')
      expect(useFormBuilderStore.getState().elements).toHaveLength(1)
      expect(useFormBuilderStore.getState().pages).toHaveLength(1)
    })
  })

  describe('createNewElement', () => {
    it('creates a text input element with defaults', () => {
      const el = createNewElement('TEXT_INPUT', 0)
      expect(el.type).toBe('TEXT_INPUT')
      expect(el.label).toBe('Text Input')
      expect(el.configuration.placeholder).toBe('Enter text...')
      expect(el.configuration.required).toBe(false)
      expect(el.sortOrder).toBe(0)
    })

    it('creates a select element with default options', () => {
      const el = createNewElement('SELECT', 1)
      expect(el.type).toBe('SELECT')
      expect(el.configuration.options).toHaveLength(2)
    })

    it('creates an element group with empty children', () => {
      const el = createNewElement('ELEMENT_GROUP', 2)
      expect(el.type).toBe('ELEMENT_GROUP')
      expect(el.children).toEqual([])
    })

    it('creates a static text element with default content', () => {
      const el = createNewElement('STATIC_TEXT', 3)
      expect(el.type).toBe('STATIC_TEXT')
      expect(el.configuration.content).toContain('<p>')
    })

    it('creates a page break element', () => {
      const el = createNewElement('PAGE_BREAK', 4)
      expect(el.type).toBe('PAGE_BREAK')
      expect(el.label).toBe('Page Break')
      expect(el.children).toBeUndefined()
    })
  })

  describe('reset', () => {
    it('clears all state', () => {
      const el = makeElement()
      useFormBuilderStore.getState().addElement(el)
      useFormBuilderStore.getState().selectElement('el-1')
      useFormBuilderStore.getState().reset()

      const state = useFormBuilderStore.getState()
      expect(state.elements).toHaveLength(0)
      expect(state.selectedElementId).toBeNull()
      expect(state.isDirty).toBe(false)
      expect(state.form).toBeNull()
    })
  })
})
