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
  FileText,
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
  { type: 'STATIC_TEXT', label: 'Static Text', icon: <FileText className="h-4 w-4" /> },
]

interface ElementPaletteProps {
  onAddElement: (type: ElementType) => void
  targetGroupLabel?: string
}

export default function ElementPalette({ onAddElement, targetGroupLabel }: ElementPaletteProps) {
  return (
    <div className="w-64 bg-gray-50 border-r p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Elements</h2>
      {targetGroupLabel && (
        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded px-2 py-1 mb-3">
          Adding to: <strong>{targetGroupLabel}</strong>
        </p>
      )}
      <div className="space-y-2">
        {elementTypes.map((element) => {
          const disabled = targetGroupLabel && element.type === 'ELEMENT_GROUP'
          return (
            <button
              key={element.type}
              onClick={() => !disabled && onAddElement(element.type)}
              disabled={!!disabled}
              className={`flex items-center gap-2 p-3 w-full border rounded-lg transition-all text-left ${
                disabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-white cursor-pointer hover:border-primary hover:shadow-sm'
              }`}
            >
              {element.icon}
              <span className="text-sm font-medium">{element.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
