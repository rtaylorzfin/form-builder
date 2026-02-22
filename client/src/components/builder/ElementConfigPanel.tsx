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

  // Find element in tree (including children)
  function findElement(els: typeof elements, id: string): typeof elements[0] | undefined {
    for (const e of els) {
      if (e.id === id) return e
      if (e.children) {
        const found = findElement(e.children, id)
        if (found) return found
      }
    }
    return undefined
  }

  const selectedElement = selectedElementId ? findElement(elements, selectedElementId) : undefined

  const [label, setLabel] = useState('')
  const [fieldName, setFieldName] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [options, setOptions] = useState<ElementOption[]>([])
  const [repeatable, setRepeatable] = useState(false)
  const [minInstances, setMinInstances] = useState(1)
  const [maxInstances, setMaxInstances] = useState(5)

  useEffect(() => {
    if (selectedElement) {
      setLabel(selectedElement.label)
      setFieldName(selectedElement.fieldName)
      setPlaceholder(selectedElement.configuration?.placeholder || '')
      setRequired(selectedElement.configuration?.required || false)
      setOptions(selectedElement.configuration?.options || [])
      setRepeatable(selectedElement.configuration?.repeatable || false)
      setMinInstances(selectedElement.configuration?.minInstances || 1)
      setMaxInstances(selectedElement.configuration?.maxInstances || 5)
    }
  }, [selectedElement])

  if (!selectedElement) {
    return (
      <div className="w-80 bg-gray-50 border-l p-4">
        <p className="text-gray-400 text-center mt-8">Select an element to configure</p>
      </div>
    )
  }

  const isGroup = selectedElement.type === 'ELEMENT_GROUP'
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

  const handleRepeatableChange = (checked: boolean) => {
    setRepeatable(checked)
    handleUpdate({
      configuration: {
        ...selectedElement.configuration,
        repeatable: checked,
        minInstances: checked ? minInstances : undefined,
        maxInstances: checked ? maxInstances : undefined,
      },
    })
  }

  const handleMinInstancesChange = (value: number) => {
    setMinInstances(value)
    handleUpdate({
      configuration: { ...selectedElement.configuration, minInstances: value },
    })
  }

  const handleMaxInstancesChange = (value: number) => {
    setMaxInstances(value)
    handleUpdate({
      configuration: { ...selectedElement.configuration, maxInstances: value },
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

        {!isGroup && !hasOptions && selectedElement.type !== 'CHECKBOX' && (
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

        {!isGroup && (
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
        )}

        {isGroup && (
          <div className="space-y-4 border-t pt-4">
            <h3 className="font-medium text-sm text-gray-600">Group Settings</h3>
            <div className="flex items-center gap-2">
              <Checkbox
                id="repeatable"
                checked={repeatable}
                onCheckedChange={(checked) => handleRepeatableChange(checked as boolean)}
              />
              <Label htmlFor="repeatable" className="cursor-pointer">
                Allow multiple instances
              </Label>
            </div>
            {repeatable && (
              <>
                <div>
                  <Label htmlFor="minInstances">Min Instances</Label>
                  <Input
                    id="minInstances"
                    type="number"
                    min={1}
                    value={minInstances}
                    onChange={(e) => handleMinInstancesChange(parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="maxInstances">Max Instances</Label>
                  <Input
                    id="maxInstances"
                    type="number"
                    min={1}
                    value={maxInstances}
                    onChange={(e) => handleMaxInstancesChange(parseInt(e.target.value) || 5)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
        )}

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
