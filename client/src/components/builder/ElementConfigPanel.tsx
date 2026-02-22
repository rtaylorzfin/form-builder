import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ElementConfiguration, ElementOption } from '@/api/types'
import { useFormBuilderStore } from '@/stores/formBuilderStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function ElementConfigPanel() {
  const { selectedElementId, elements, updateElement } = useFormBuilderStore()
  const selectedElement = elements.find((e) => e.id === selectedElementId)

  const [label, setLabel] = useState('')
  const [fieldName, setFieldName] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<ElementOption[]>([])

  useEffect(() => {
    if (selectedElement) {
      setLabel(selectedElement.label)
      setFieldName(selectedElement.fieldName)
      setPlaceholder(selectedElement.configuration?.placeholder || '')
      setRequired(selectedElement.configuration?.required || false)
      setOptions(selectedElement.configuration?.options || [])
    }
  }, [selectedElement])

  if (!selectedElement) {
    return (
      <div className="w-80 bg-gray-50 border-l p-4">
        <p className="text-gray-400 text-center mt-8">Select an element to configure</p>
      </div>
    )
  }

  const hasOptions = ['RADIO_GROUP', 'SELECT'].includes(selectedElement.type)

  const handleUpdate = (updates: Partial<{ label: string; fieldName: string; configuration: ElementConfiguration }>) => {
    updateElement(selectedElement.id, updates)
  }

  const handleLabelChange = (value: string) => {
    setLabel(value)
    handleUpdate({ label: value })
  }

  const handleFieldNameChange = (value: string) => {
    setFieldName(value)
    handleUpdate({ fieldName: value })
  }

  const handlePlaceholderChange = (value: string) => {
    setPlaceholder(value)
    handleUpdate({
      configuration: { ...selectedElement.configuration, placeholder: value },
    })
  }

  const handleRequiredChange = (checked: boolean) => {
    setRequired(checked)
    handleUpdate({
      configuration: { ...selectedElement.configuration, required: checked },
    })
  }

  const handleOptionChange = (index: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setOptions(newOptions)
    handleUpdate({
      configuration: { ...selectedElement.configuration, options: newOptions },
    })
  }

  const handleAddOption = () => {
    const newOptions = [...options, { label: `Option ${options.length + 1}`, value: `option${options.length + 1}` }]
    setOptions(newOptions)
    handleUpdate({
      configuration: { ...selectedElement.configuration, options: newOptions },
    })
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index)
    setOptions(newOptions)
    handleUpdate({
      configuration: { ...selectedElement.configuration, options: newOptions },
    })
  }

  return (
    <div className="w-80 bg-gray-50 border-l p-4 overflow-y-auto">
      <h2 className="font-semibold mb-4">Element Properties</h2>

      <div className="space-y-4">
        <div>
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="fieldName">Field Name</Label>
          <Input
            id="fieldName"
            value={fieldName}
            onChange={(e) => handleFieldNameChange(e.target.value)}
            className="mt-1"
          />
        </div>

        {!hasOptions && selectedElement.type !== 'CHECKBOX' && (
          <div>
            <Label htmlFor="placeholder">Placeholder</Label>
            <Input
              id="placeholder"
              value={placeholder}
              onChange={(e) => handlePlaceholderChange(e.target.value)}
              className="mt-1"
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox
            id="required"
            checked={required}
            onCheckedChange={(checked) => handleRequiredChange(checked as boolean)}
          />
          <Label htmlFor="required" className="cursor-pointer">
            Required
          </Label>
        </div>

        {hasOptions && (
          <div>
            <Label>Options</Label>
            <div className="space-y-2 mt-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => handleOptionChange(index, 'label', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={option.value}
                    onChange={(e) => handleOptionChange(index, 'value', e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-gray-400 hover:text-red-500"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddOption} className="w-full">
                <Plus className="h-4 w-4 mr-1" /> Add Option
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
