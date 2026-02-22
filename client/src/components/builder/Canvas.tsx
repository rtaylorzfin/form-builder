import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import type { FormElement as FormElementType } from '@/api/types'
import { useFormBuilderStore } from '@/stores/formBuilderStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SortableElementProps {
  element: FormElementType
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
}

function SortableElement({ element, isSelected, onSelect, onDelete }: SortableElementProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: element.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 p-4 bg-white border rounded-lg transition-all',
        isSelected && 'ring-2 ring-primary',
        isDragging && 'opacity-50'
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>
      <div className="flex-1">
        <div className="font-medium">{element.label}</div>
        <div className="text-sm text-gray-500">
          {element.type.replace('_', ' ')}
          {element.configuration?.required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-gray-400 hover:text-red-500"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function Canvas() {
  const { elements, selectedElementId, selectElement, removeElement } = useFormBuilderStore()

  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas',
  })

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[400px] p-4 border-2 border-dashed rounded-lg transition-colors',
          isOver ? 'border-primary bg-primary/5' : 'border-gray-200',
          elements.length === 0 && 'flex items-center justify-center'
        )}
      >
        {elements.length === 0 ? (
          <p className="text-gray-400">Drag elements here to build your form</p>
        ) : (
          <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {elements.map((element) => (
                <SortableElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElementId === element.id}
                  onSelect={() => selectElement(element.id)}
                  onDelete={() => removeElement(element.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  )
}
