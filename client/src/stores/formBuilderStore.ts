import { create } from 'zustand'
import type { Form, FormElement, ElementType, ElementConfiguration } from '@/api/types'

interface FormBuilderState {
  form: Form | null
  elements: FormElement[]
  selectedElementId: string | null
  isDirty: boolean

  // Actions
  setForm: (form: Form) => void
  setElements: (elements: FormElement[]) => void
  addElement: (element: FormElement) => void
  updateElement: (id: string, updates: Partial<FormElement>) => void
  removeElement: (id: string) => void
  reorderElements: (oldIndex: number, newIndex: number) => void
  selectElement: (id: string | null) => void
  getSelectedElement: () => FormElement | null
  setDirty: (dirty: boolean) => void
  reset: () => void
}

const initialState = {
  form: null,
  elements: [],
  selectedElementId: null,
  isDirty: false,
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  ...initialState,

  setForm: (form) => set({ form, elements: form.elements || [] }),

  setElements: (elements) => set({ elements }),

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
      isDirty: true,
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
      isDirty: true,
    })),

  removeElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
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

  selectElement: (id) => set({ selectedElementId: id }),

  getSelectedElement: () => {
    const state = get()
    return state.elements.find((el) => el.id === state.selectedElementId) || null
  },

  setDirty: (dirty) => set({ isDirty: dirty }),

  reset: () => set(initialState),
}))

// Helper to create a new element with defaults
export function createNewElement(type: ElementType, sortOrder: number): Omit<FormElement, 'id'> {
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
  }

  const label = typeLabels[type]
  const fieldName = label.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now()

  return {
    type,
    label,
    fieldName,
    sortOrder,
    configuration: { ...baseConfig, ...typeConfigs[type] },
  }
}
