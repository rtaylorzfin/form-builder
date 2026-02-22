import { useEffect } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Eye, Save, Send } from 'lucide-react'
import { formsApi, elementsApi } from '@/api/client'
import type { ElementType } from '@/api/types'
import { useFormBuilderStore, createNewElement } from '@/stores/formBuilderStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import ElementPalette from './ElementPalette'
import Canvas from './Canvas'
import ElementConfigPanel from './ElementConfigPanel'

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
    setForm,
    addElement,
    reorderElements,
    selectElement,
    setDirty,
    isDirty,
  } = useFormBuilderStore()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

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
    onSuccess: (newElement) => {
      addElement(newElement)
      selectElement(newElement.id)
      setDirty(false)
    },
  })

  const saveElementsMutation = useMutation({
    mutationFn: async () => {
      const reorderRequest = { elementIds: elements.map((e) => e.id) }
      await elementsApi.reorder(formId, reorderRequest)

      for (const element of elements) {
        await elementsApi.update(formId, element.id, {
          label: element.label,
          fieldName: element.fieldName,
          configuration: element.configuration,
        })
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

  const handleDragStart = (_event: DragStartEvent) => {
    selectElement(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const activeData = active.data.current

    if (activeData?.fromPalette && over.id === 'canvas') {
      const type = activeData.type as ElementType
      const newElement = createNewElement(type, elements.length)

      createElementMutation.mutate({
        type: newElement.type,
        label: newElement.label,
        fieldName: newElement.fieldName,
        sortOrder: newElement.sortOrder,
        configuration: newElement.configuration,
      })
      return
    }

    if (active.id !== over.id) {
      const oldIndex = elements.findIndex((e) => e.id === active.id)
      const newIndex = elements.findIndex((e) => e.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderElements(oldIndex, newIndex)
      }
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

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-96 text-red-500">Failed to load form</div>
  }

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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          <ElementPalette />
          <Canvas />
          <ElementConfigPanel />
        </div>
        <DragOverlay />
      </DndContext>
    </div>
  )
}
