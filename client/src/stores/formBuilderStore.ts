import { create } from 'zustand'
import type { Form, FormElement, FormPage, ElementType, ElementConfiguration } from '@/api/types'

interface FormBuilderState {
  form: Form | null
  elements: FormElement[]
  pages: FormPage[]
  currentPageIndex: number
  selectedElementId: string | null
  isDirty: boolean

  // Actions
  setForm: (form: Form) => void
  setElements: (elements: FormElement[]) => void
  setPages: (pages: FormPage[]) => void
  setCurrentPageIndex: (index: number) => void
  addElement: (element: FormElement) => void
  addElementToGroup: (element: FormElement, parentId: string) => void
  updateElement: (id: string, updates: Partial<FormElement>) => void
  removeElement: (id: string) => void
  reorderElements: (oldIndex: number, newIndex: number) => void
  moveElementUp: (id: string) => void
  moveElementDown: (id: string) => void
  selectElement: (id: string | null) => void
  getSelectedElement: () => FormElement | null
  setDirty: (dirty: boolean) => void
  reset: () => void
}

const initialState = {
  form: null,
  elements: [],
  pages: [] as FormPage[],
  currentPageIndex: 0,
  selectedElementId: null,
  isDirty: false,
}

function findElementById(elements: FormElement[], id: string): FormElement | null {
  for (const el of elements) {
    if (el.id === id) return el
    if (el.children) {
      const found = findElementById(el.children, id)
      if (found) return found
    }
  }
  return null
}

function removeElementFromTree(elements: FormElement[], id: string): FormElement[] {
  return elements
    .filter((el) => el.id !== id)
    .map((el) => ({
      ...el,
      children: el.children ? removeElementFromTree(el.children, id) : el.children,
    }))
}

function moveChildUp(elements: FormElement[], id: string): FormElement[] {
  return elements.map((el) => {
    if (!el.children) return el
    const childIndex = el.children.findIndex((c) => c.id === id)
    if (childIndex > 0) {
      const newChildren = [...el.children]
      ;[newChildren[childIndex - 1], newChildren[childIndex]] = [newChildren[childIndex], newChildren[childIndex - 1]]
      return { ...el, children: newChildren.map((c, i) => ({ ...c, sortOrder: i })) }
    }
    return { ...el, children: moveChildUp(el.children, id) }
  })
}

function moveChildDown(elements: FormElement[], id: string): FormElement[] {
  return elements.map((el) => {
    if (!el.children) return el
    const childIndex = el.children.findIndex((c) => c.id === id)
    if (childIndex !== -1 && childIndex < el.children.length - 1) {
      const newChildren = [...el.children]
      ;[newChildren[childIndex], newChildren[childIndex + 1]] = [newChildren[childIndex + 1], newChildren[childIndex]]
      return { ...el, children: newChildren.map((c, i) => ({ ...c, sortOrder: i })) }
    }
    return { ...el, children: moveChildDown(el.children, id) }
  })
}

function addChildToGroup(elements: FormElement[], parentId: string, child: FormElement): FormElement[] {
  return elements.map((el) => {
    if (el.id === parentId) {
      return { ...el, children: [...(el.children || []), child] }
    }
    if (el.children) {
      return { ...el, children: addChildToGroup(el.children, parentId, child) }
    }
    return el
  })
}

function updateElementInTree(elements: FormElement[], id: string, updates: Partial<FormElement>): FormElement[] {
  return elements.map((el) => {
    if (el.id === id) return { ...el, ...updates }
    if (el.children) {
      return { ...el, children: updateElementInTree(el.children, id, updates) }
    }
    return el
  })
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  ...initialState,

  setForm: (form) => set({ form, elements: form.elements || [], pages: form.pages }),

  setElements: (elements) => set({ elements }),

  setPages: (pages) => set({ pages }),

  setCurrentPageIndex: (index) => set({ currentPageIndex: index }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      isDirty: true,
    })),

  addElementToGroup: (element, parentId) =>
    set((state) => ({
      elements: addChildToGroup(state.elements, parentId, element),
      isDirty: true,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: updateElementInTree(state.elements, id, updates),
      isDirty: true,
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: removeElementFromTree(state.elements, id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
      isDirty: true,
    })),

  reorderElements: (oldIndex, newIndex) =>
    set((state) => {
      const newElements = [...state.elements]
      const [removed] = newElements.splice(oldIndex, 1)
      newElements.splice(newIndex, 0, removed)
      return {
        elements: newElements.map((el, index) => ({ ...el, sortOrder: index })),
        isDirty: true,
      }
    }),

  moveElementUp: (id) =>
    set((state) => {
      // Check if it's a root element
      const rootIndex = state.elements.findIndex((el) => el.id === id)
      if (rootIndex > 0) {
        const element = state.elements[rootIndex]
        // Find the nearest previous element on the same page
        let swapIndex = -1
        for (let i = rootIndex - 1; i >= 0; i--) {
          if (state.elements[i].pageId === element.pageId) {
            swapIndex = i
            break
          }
        }
        if (swapIndex === -1) return state
        const newElements = [...state.elements]
        ;[newElements[swapIndex], newElements[rootIndex]] = [newElements[rootIndex], newElements[swapIndex]]
        return {
          elements: newElements.map((el, i) => ({ ...el, sortOrder: i })),
          isDirty: true,
        }
      }
      // Check if it's a child element (recursive)
      const newElements = moveChildUp(state.elements, id)
      return { elements: newElements, isDirty: true }
    }),

  moveElementDown: (id) =>
    set((state) => {
      // Check if it's a root element
      const rootIndex = state.elements.findIndex((el) => el.id === id)
      if (rootIndex !== -1) {
        const element = state.elements[rootIndex]
        // Find the nearest next element on the same page
        let swapIndex = -1
        for (let i = rootIndex + 1; i < state.elements.length; i++) {
          if (state.elements[i].pageId === element.pageId) {
            swapIndex = i
            break
          }
        }
        if (swapIndex === -1) return state
        const newElements = [...state.elements]
        ;[newElements[rootIndex], newElements[swapIndex]] = [newElements[swapIndex], newElements[rootIndex]]
        return {
          elements: newElements.map((el, i) => ({ ...el, sortOrder: i })),
          isDirty: true,
        }
      }
      // Check if it's a child element (recursive)
      const newElements = moveChildDown(state.elements, id)
      return { elements: newElements, isDirty: true }
    }),

  selectElement: (id) => set({ selectedElementId: id }),

  getSelectedElement: () => {
    const state = get()
    if (!state.selectedElementId) return null
    return findElementById(state.elements, state.selectedElementId)
  },

  setDirty: (dirty) => set({ isDirty: dirty }),

  reset: () => set(initialState),
}))

// Helper to create a new element with defaults
export function createNewElement(type: ElementType, sortOrder: number): Omit<FormElement, 'id' | 'pageId'> {
  const baseConfig: ElementConfiguration = {
    required: false,
  }

  const typeConfigs: Record<ElementType, Partial<ElementConfiguration>> = {
    TEXT_INPUT: { placeholder: 'Enter text...' },
    TEXT_AREA: { placeholder: 'Enter text...' },
    NUMBER: { placeholder: 'Enter number...' },
    EMAIL: { placeholder: 'Enter email...', pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$', patternMessage: 'Please enter a valid email address' },
    DATE: {},
    CHECKBOX: {},
    RADIO_GROUP: { options: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
    SELECT: { options: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
    CHECKBOX_GROUP: { options: [{ label: 'Option 1', value: 'option1' }, { label: 'Option 2', value: 'option2' }] },
    ELEMENT_GROUP: {},
    STATIC_TEXT: { content: '<p>Enter your text here</p>' },
  }

  const typeLabels: Record<ElementType, string> = {
    TEXT_INPUT: 'Text Input',
    TEXT_AREA: 'Text Area',
    NUMBER: 'Number',
    EMAIL: 'Email',
    DATE: 'Date',
    CHECKBOX: 'Checkbox',
    RADIO_GROUP: 'Radio Group',
    SELECT: 'Select',
    CHECKBOX_GROUP: 'Checkbox Group',
    ELEMENT_GROUP: 'Group',
    STATIC_TEXT: 'Static Text',
  }

  const label = typeLabels[type]
  const fieldName = label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()

  return {
    type,
    label,
    fieldName,
    sortOrder,
    configuration: { ...baseConfig, ...typeConfigs[type] },
    children: type === 'ELEMENT_GROUP' ? [] : undefined,
  }
}
