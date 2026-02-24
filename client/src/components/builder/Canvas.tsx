import { ChevronUp, ChevronDown, Trash2, Layers } from 'lucide-react'
import type { FormElement as FormElementType } from '@/api/types'
import { useFormBuilderStore } from '@/stores/formBuilderStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const depthColors = [
  { bg: 'bg-blue-50/50', border: 'border-blue-200', header: 'bg-blue-100/50', headerBorder: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-500', footer: 'bg-blue-50', footerText: 'text-blue-400' },
  { bg: 'bg-green-50/50', border: 'border-green-200', header: 'bg-green-100/50', headerBorder: 'border-green-200', text: 'text-green-700', icon: 'text-green-500', footer: 'bg-green-50', footerText: 'text-green-400' },
  { bg: 'bg-purple-50/50', border: 'border-purple-200', header: 'bg-purple-100/50', headerBorder: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-500', footer: 'bg-purple-50', footerText: 'text-purple-400' },
  { bg: 'bg-orange-50/50', border: 'border-orange-200', header: 'bg-orange-100/50', headerBorder: 'border-orange-200', text: 'text-orange-700', icon: 'text-orange-500', footer: 'bg-orange-50', footerText: 'text-orange-400' },
  { bg: 'bg-pink-50/50', border: 'border-pink-200', header: 'bg-pink-100/50', headerBorder: 'border-pink-200', text: 'text-pink-700', icon: 'text-pink-500', footer: 'bg-pink-50', footerText: 'text-pink-400' },
]

interface CanvasElementProps {
  element: FormElementType
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  isFirst: boolean
  isLast: boolean
  depth?: number
}

function CanvasElement({ element, isSelected, onSelect, onDelete, onMoveUp, onMoveDown, isFirst, isLast, depth = 0 }: CanvasElementProps) {
  const { selectedElementId, selectElement, removeElement, moveElementUp, moveElementDown } = useFormBuilderStore()

  if (element.type === 'PAGE_BREAK') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 py-1 text-xs text-gray-400 cursor-pointer',
          isSelected && 'ring-2 ring-primary rounded'
        )}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
      >
        <div className="flex-1 border-t border-dashed" />
        <span>{element.label || 'Page Break'}</span>
        <div className="flex-1 border-t border-dashed" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-gray-400 hover:text-red-500"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  if (element.type === 'ELEMENT_GROUP') {
    const children = element.children || []
    const colors = depthColors[depth % depthColors.length]
    return (
      <div
        className={cn(
          'border-2 border-dashed rounded-lg transition-all',
          colors.bg,
          isSelected ? 'ring-2 ring-primary border-primary' : colors.border
        )}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        {/* Group header */}
        <div className={cn('flex items-center gap-2 p-3 rounded-t-lg border-b', colors.header, colors.headerBorder)}>
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={isFirst}
              onClick={(e) => { e.stopPropagation(); onMoveUp() }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              disabled={isLast}
              onClick={(e) => { e.stopPropagation(); onMoveDown() }}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
          <Layers className={cn('h-4 w-4', colors.icon)} />
          <div className={cn('flex-1 font-medium', colors.text)}>{element.label}</div>
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

        {/* Group children */}
        <div className="p-3 min-h-[60px] space-y-2">
          {children.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">
              No elements in this group
            </p>
          ) : (
            children.map((child, childIndex) => (
              <CanvasElement
                key={child.id}
                element={child}
                isSelected={selectedElementId === child.id}
                onSelect={() => selectElement(child.id)}
                onDelete={() => removeElement(child.id)}
                onMoveUp={() => moveElementUp(child.id)}
                onMoveDown={() => moveElementDown(child.id)}
                isFirst={childIndex === 0}
                isLast={childIndex === children.length - 1}
                depth={depth + 1}
              />
            ))
          )}
        </div>

        {/* Group footer */}
        <div className={cn('px-3 py-2 rounded-b-lg border-t', colors.footer, colors.headerBorder)}>
          <span className={cn('text-xs', colors.footerText)}>End of {element.label}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-4 bg-white border rounded-lg transition-all',
        isSelected && 'ring-2 ring-primary'
      )}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      <div className="flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          disabled={isFirst}
          onClick={(e) => { e.stopPropagation(); onMoveUp() }}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          disabled={isLast}
          onClick={(e) => { e.stopPropagation(); onMoveDown() }}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>
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
  const { elements, pages, currentPageIndex, selectedElementId, selectElement, removeElement, moveElementUp, moveElementDown } = useFormBuilderStore()

  const currentPage = pages[currentPageIndex]
  const pageElements = currentPage
    ? elements.filter((e) => e.pageId === currentPage.id)
    : elements

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div
        className={cn(
          'min-h-[400px] p-4 border-2 border-dashed rounded-lg transition-colors border-gray-200',
          pageElements.length === 0 && 'flex items-center justify-center'
        )}
      >
        {pageElements.length === 0 ? (
          <p className="text-gray-400">Click elements in the palette to add them to your form</p>
        ) : (
          <div className="space-y-3">
            {pageElements.map((element, index) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={selectedElementId === element.id}
                onSelect={() => selectElement(element.id)}
                onDelete={() => removeElement(element.id)}
                onMoveUp={() => moveElementUp(element.id)}
                onMoveDown={() => moveElementDown(element.id)}
                isFirst={index === 0}
                isLast={index === pageElements.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
