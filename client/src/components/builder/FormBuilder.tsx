import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, Save, Send, Plus, X, Download } from 'lucide-react'
import { formsApi, elementsApi, pagesApi } from '@/api/client'
import type { ElementType, FormElement, FormPage } from '@/api/types'
import { useFormBuilderStore, createNewElement } from '@/stores/formBuilderStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import ElementPalette from './ElementPalette'
import Canvas from './Canvas'
import ElementConfigPanel from './ElementConfigPanel'

function collectAllIds(elements: FormElement[]): Set<string> {
  const ids = new Set<string>()
  for (const el of elements) {
    ids.add(el.id)
    if (el.children) for (const id of collectAllIds(el.children)) ids.add(id)
  }
  return ids
}

interface FormBuilderProps {
  formId: string
}

export default function FormBuilder({ formId }: FormBuilderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const {
    form,
    elements,
    pages,
    currentPageIndex,
    setForm,
    setCurrentPageIndex,
    addElement,
    addElementToGroup,
    selectElement,
    getSelectedElement,
    setDirty,
    isDirty,
  } = useFormBuilderStore()

  const [editingPageTitle, setEditingPageTitle] = useState<string | null>(null)
  const [pageTitleValue, setPageTitleValue] = useState('')

  const { data: formData, isLoading, error } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsApi.get(formId),
  })

  useEffect(() => {
    if (formData) {
      setForm(formData)
    }
  }, [formData, setForm])

  const createElementMutation = useMutation({
    mutationFn: (data: Parameters<typeof elementsApi.create>[1]) =>
      elementsApi.create(formId, data),
    onSuccess: (newElement, variables) => {
      if (variables.parentElementId) {
        addElementToGroup(newElement, variables.parentElementId)
        // Keep the group selected so the user can continue adding children
        selectElement(variables.parentElementId)
      } else {
        addElement(newElement)
        selectElement(newElement.id)
      }
      setDirty(false)
    },
  })

  const saveElementsMutation = useMutation({
    mutationFn: async () => {
      // Delete elements that were removed from the UI
      const originalIds = collectAllIds(formData?.elements || [])
      const currentIds = collectAllIds(elements)
      const deletedIds = [...originalIds].filter(id => !currentIds.has(id))

      for (const id of deletedIds) {
        await elementsApi.delete(formId, id).catch(() => {}) // ignore 404 from cascade
      }

      const reorderRequest = { elementIds: elements.map((e) => e.id) }
      await elementsApi.reorder(formId, reorderRequest)

      const saveElementRecursive = async (el: typeof elements[0]) => {
        await elementsApi.update(formId, el.id, {
          label: el.label,
          fieldName: el.fieldName,
          configuration: el.configuration,
        })
        if (el.children) {
          for (const child of el.children) {
            await saveElementRecursive(child)
          }
        }
      }

      for (const element of elements) {
        await saveElementRecursive(element)
      }
    },
    onSuccess: () => {
      setDirty(false)
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
      toast({ title: 'Form saved successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to save form', variant: 'destructive' })
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => formsApi.publish(formId),
    onSuccess: (data) => {
      setForm(data)
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
      toast({ title: 'Form published successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to publish form', variant: 'destructive' })
    },
  })

  const addPageMutation = useMutation({
    mutationFn: () => pagesApi.create(formId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
    },
  })

  const deletePageMutation = useMutation({
    mutationFn: (pageId: string) => pagesApi.delete(formId, pageId),
    onSuccess: () => {
      setCurrentPageIndex(Math.max(0, currentPageIndex - 1))
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
    },
    onError: () => {
      toast({ title: 'Cannot delete the last page', variant: 'destructive' })
    },
  })

  const updatePageMutation = useMutation({
    mutationFn: ({ pageId, title }: { pageId: string; title: string }) =>
      pagesApi.update(formId, pageId, { title }),
    onSuccess: () => {
      setEditingPageTitle(null)
      queryClient.invalidateQueries({ queryKey: ['form', formId] })
    },
  })

  const handleAddElement = (type: ElementType) => {
    const selectedElement = getSelectedElement()
    const isAddingToGroup = selectedElement?.type === 'ELEMENT_GROUP'

    const sortOrder = isAddingToGroup
      ? (selectedElement.children?.length ?? 0)
      : elements.length
    const newElement = createNewElement(type, sortOrder)
    const currentPage = pages[currentPageIndex]

    createElementMutation.mutate({
      type: newElement.type,
      label: newElement.label,
      fieldName: newElement.fieldName,
      sortOrder: newElement.sortOrder,
      configuration: newElement.configuration,
      pageId: currentPage?.id,
      parentElementId: isAddingToGroup ? selectedElement.id : undefined,
    })
  }

  const handleExport = async () => {
    try {
      const exportData = await formsApi.export(formId)
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${form?.name || 'form'}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Form exported successfully' })
    } catch {
      toast({ title: 'Failed to export form', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    saveElementsMutation.mutate()
  }

  const handlePublish = () => {
    if (elements.length === 0) {
      toast({ title: 'Add at least one element before publishing', variant: 'destructive' })
      return
    }
    publishMutation.mutate()
  }

  const handleStartEditPageTitle = (page: FormPage) => {
    setEditingPageTitle(page.id)
    setPageTitleValue(page.title || '')
  }

  const handleSavePageTitle = () => {
    if (editingPageTitle) {
      updatePageMutation.mutate({ pageId: editingPageTitle, title: pageTitleValue })
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-96 text-red-500">Failed to load form</div>
  }

  const selectedElement = getSelectedElement()
  const targetGroupLabel = selectedElement?.type === 'ELEMENT_GROUP' ? selectedElement.label : undefined
  const statusVariant = form?.status === 'PUBLISHED' ? 'success' : 'secondary'

  return (
    <div className="h-[calc(100vh-73px)] flex flex-col">
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">{form?.name}</h1>
          <Badge variant={statusVariant}>{form?.status}</Badge>
          {isDirty && <span className="text-sm text-gray-500">(unsaved changes)</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/forms/${formId}/preview`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={!isDirty || saveElementsMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button
            onClick={handlePublish}
            disabled={form?.status === 'PUBLISHED' || publishMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      {/* Page tabs */}
      <div className="flex items-center gap-1 px-6 py-2 bg-gray-50 border-b overflow-x-auto">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors ${
              index === currentPageIndex
                ? 'bg-white border shadow-sm font-medium'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            onClick={() => setCurrentPageIndex(index)}
          >
            {editingPageTitle === page.id ? (
              <Input
                value={pageTitleValue}
                onChange={(e) => setPageTitleValue(e.target.value)}
                onBlur={handleSavePageTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSavePageTitle()}
                className="h-6 w-24 text-xs"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span onDoubleClick={() => handleStartEditPageTitle(page)}>
                {page.title || `Page ${index + 1}`}
              </span>
            )}
            {pages.length > 1 && index === currentPageIndex && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Delete this page?')) {
                    deletePageMutation.mutate(page.id)
                  }
                }}
                className="ml-1 text-gray-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => addPageMutation.mutate()}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ElementPalette onAddElement={handleAddElement} targetGroupLabel={targetGroupLabel} />
        <Canvas />
        <ElementConfigPanel />
      </div>
    </div>
  )
}
