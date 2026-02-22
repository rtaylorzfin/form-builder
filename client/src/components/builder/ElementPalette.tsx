import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Calendar,
  CheckSquare,
  Circle,
  ChevronDown,
} from 'lucide-react'
import type { ElementType } from '@/api/types'
import { cn } from '@/lib/utils'

interface ElementTypeConfig {
  type: ElementType
  label: string
  icon: React.ReactNode
}

const elementTypes: ElementTypeConfig[] = [
  { type: 'TEXT_INPUT', label: 'Text Input', icon: <Type className="h-4 w-4" /> },
  { type: 'TEXT_AREA', label: 'Text Area', icon: <AlignLeft className="h-4 w-4" /> },
  { type: 'NUMBER', label: 'Number', icon: <Hash className="h-4 w-4" /> },
  { type: 'EMAIL', label: 'Email', icon: <Mail className="h-4 w-4" /> },
  { type: 'DATE', label: 'Date', icon: <Calendar className="h-4 w-4" /> },
  { type: 'CHECKBOX', label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" /> },
  { type: 'RADIO_GROUP', label: 'Radio Group', icon: <Circle className="h-4 w-4" /> },
  { type: 'SELECT', label: 'Select', icon: <ChevronDown className="h-4 w-4" /> },
]

interface DraggableElementProps {
  type: ElementType
  label: string
  icon: React.ReactNode
}

function DraggableElement({ type, label, icon }: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type, fromPalette: true },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 p-3 bg-white border rounded-lg cursor-grab hover:border-primary hover:shadow-sm transition-all',
        isDragging && 'opacity-50 cursor-grabbing'
      )}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  )
}

export default function ElementPalette() {
  return (
    <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Elements</h2>
      <div className="space-y-2">
        {elementTypes.map((element) => (
          <DraggableElement
            key={element.type}
            type={element.type}
            label={element.label}
            icon={element.icon}
          />
        ))}
      </div>
    </div>
  )
}
