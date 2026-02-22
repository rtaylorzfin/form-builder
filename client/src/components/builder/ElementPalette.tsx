import {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Calendar,
  CheckSquare,
  Circle,
  ChevronDown,
  Layers,
} from 'lucide-react'
import type { ElementType } from '@/api/types'

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
  { type: 'ELEMENT_GROUP', label: 'Group', icon: <Layers className="h-4 w-4" /> },
]

interface ElementPaletteProps {
  onAddElement: (type: ElementType) => void
}

export default function ElementPalette({ onAddElement }: ElementPaletteProps) {
  return (
    <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Elements</h2>
      <div className="space-y-2">
        {elementTypes.map((element) => (
          <button
            key={element.type}
            onClick={() => onAddElement(element.type)}
            className="flex items-center gap-2 p-3 w-full bg-white border rounded-lg cursor-pointer hover:border-primary hover:shadow-sm transition-all text-left"
          >
            {element.icon}
            <span className="text-sm font-medium">{element.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
