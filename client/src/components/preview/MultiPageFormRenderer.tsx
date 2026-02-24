import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft, Check, Pencil, ChevronRightIcon } from 'lucide-react'
import type { FormElement, FormPage } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface MultiPageFormRendererProps {
  pages: FormPage[]
  onSubmit: (data: Record<string, unknown>) => void
  isSubmitting?: boolean
  readOnly?: boolean
  defaultValues?: Record<string, unknown>
  onValuesChange?: (data: Record<string, unknown>) => void
}

function buildFieldSchema(element: FormElement): z.ZodTypeAny {
  switch (element.type) {
    case 'NUMBER':
      return element.configuration?.required
        ? z.coerce.number({ required_error: `${element.label} is required` })
        : z.coerce.number().optional()
    case 'CHECKBOX':
      return element.configuration?.required
        ? z.boolean().refine((val) => val === true, { message: `${element.label} is required` })
        : z.boolean().optional()
    case 'EMAIL':
      return element.configuration?.required
        ? z.string({ required_error: `${element.label} is required` }).min(1, `${element.label} is required`).email('Please enter a valid email address')
        : z.string().email('Please enter a valid email address').optional().or(z.literal(''))
    case 'CHECKBOX_GROUP':
      return element.configuration?.required
        ? z.array(z.string()).min(1, `${element.label} is required`)
        : z.array(z.string()).optional().default([])
    default:
      return element.configuration?.required
        ? z.string({ required_error: `${element.label} is required` }).min(1, `${element.label} is required`)
        : z.string().optional()
  }
}

function buildGroupObjectSchema(children: FormElement[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const child of children) {
    if (child.type === 'STATIC_TEXT' || child.type === 'PAGE_BREAK') continue
    if (child.type === 'ELEMENT_GROUP') {
      const nestedChildren = child.children || []
      const nestedObj = buildGroupObjectSchema(nestedChildren)
      if (child.configuration?.repeatable) {
        let arraySchema = z.array(nestedObj)
        if (child.configuration.minInstances) arraySchema = arraySchema.min(child.configuration.minInstances)
        if (child.configuration.maxInstances) arraySchema = arraySchema.max(child.configuration.maxInstances)
        shape[child.fieldName] = arraySchema
      } else {
        for (const nestedChild of nestedChildren) {
          if (nestedChild.type !== 'STATIC_TEXT' && nestedChild.type !== 'PAGE_BREAK') shape[nestedChild.fieldName] = buildFieldSchema(nestedChild)
        }
      }
      continue
    }
    shape[child.fieldName] = buildFieldSchema(child)
  }
  return z.object(shape)
}

function buildElementsSchema(elements: FormElement[], shape: Record<string, z.ZodTypeAny>) {
  for (const element of elements) {
    if (element.type === 'STATIC_TEXT' || element.type === 'PAGE_BREAK') continue
    if (element.type === 'ELEMENT_GROUP') {
      const children = element.children || []
      const groupObj = buildGroupObjectSchema(children)
      if (element.configuration?.repeatable) {
        let arraySchema = z.array(groupObj)
        if (element.configuration.minInstances) arraySchema = arraySchema.min(element.configuration.minInstances)
        if (element.configuration.maxInstances) arraySchema = arraySchema.max(element.configuration.maxInstances)
        shape[element.fieldName] = arraySchema
      } else {
        for (const child of children) {
          if (child.type !== 'STATIC_TEXT' && child.type !== 'PAGE_BREAK' && child.type !== 'ELEMENT_GROUP') {
            shape[child.fieldName] = buildFieldSchema(child)
          }
        }
      }
      continue
    }
    if (element.configuration?.repeatable) {
      let arraySchema = z.array(buildFieldSchema(element))
      if (element.configuration.minInstances) arraySchema = arraySchema.min(element.configuration.minInstances)
      if (element.configuration.maxInstances) arraySchema = arraySchema.max(element.configuration.maxInstances)
      shape[element.fieldName] = arraySchema
      continue
    }
    shape[element.fieldName] = buildFieldSchema(element)
  }
}

function buildFullSchema(pages: FormPage[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const page of pages) {
    buildElementsSchema(page.elements, shape)
  }
  return z.object(shape)
}

function buildPageSchema(page: FormPage) {
  const shape: Record<string, z.ZodTypeAny> = {}
  buildElementsSchema(page.elements, shape)
  return z.object(shape)
}

function RenderElement({
  element,
  register,
  errors,
  setValue,
  watch,
  readOnly,
  prefix,
}: {
  element: FormElement
  register: ReturnType<typeof useForm>['register']
  errors: Record<string, { message?: string }>
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  readOnly?: boolean
  prefix?: string
}) {
  const fieldPath = prefix ? `${prefix}.${element.fieldName}` : element.fieldName
  const error = prefix
    ? (errors as Record<string, Record<string, { message?: string }>>)?.[prefix]?.[element.fieldName]
    : errors[element.fieldName]
  const config = element.configuration || {}

  const commonProps = {
    ...register(fieldPath),
    disabled: readOnly,
  }

  let input: React.ReactNode = null

  switch (element.type) {
    case 'TEXT_INPUT':
      input = <Input {...commonProps} type="text" placeholder={config.placeholder} className={cn(error && 'border-red-500')} />
      break
    case 'TEXT_AREA':
      input = <Textarea {...commonProps} placeholder={config.placeholder} className={cn(error && 'border-red-500')} />
      break
    case 'NUMBER':
      input = <Input {...commonProps} type="number" placeholder={config.placeholder} className={cn(error && 'border-red-500')} />
      break
    case 'EMAIL':
      input = <Input {...commonProps} type="email" placeholder={config.placeholder || 'email@example.com'} className={cn(error && 'border-red-500')} />
      break
    case 'DATE':
      input = <Input {...commonProps} type="date" className={cn(error && 'border-red-500')} />
      break
    case 'CHECKBOX':
      input = (
        <div className="flex items-center gap-2">
          <Checkbox id={fieldPath} checked={watch(fieldPath) || false} onCheckedChange={(checked) => setValue(fieldPath, checked)} disabled={readOnly} />
          <Label htmlFor={fieldPath} className="cursor-pointer">{element.label}</Label>
        </div>
      )
      break
    case 'RADIO_GROUP': {
      const rawValue: string = watch(fieldPath) || ''
      const isOtherSelected = rawValue.startsWith('other:')
      const radioValue = isOtherSelected ? '__other__' : rawValue
      const otherText = isOtherSelected ? rawValue.slice(6) : ''
      input = (
        <RadioGroup
          value={radioValue}
          onValueChange={(value) => {
            if (value === '__other__') {
              setValue(fieldPath, 'other:', { shouldValidate: true })
            } else {
              setValue(fieldPath, value, { shouldValidate: true })
            }
          }}
          disabled={readOnly}
        >
          {config.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${fieldPath}-${option.value}`} />
              <Label htmlFor={`${fieldPath}-${option.value}`} className="cursor-pointer">{option.label}</Label>
            </div>
          ))}
          {config.allowOther && (
            <>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="__other__" id={`${fieldPath}-__other__`} />
                <Label htmlFor={`${fieldPath}-__other__`} className="cursor-pointer">Other (please specify)</Label>
              </div>
              {isOtherSelected && (
                <Input
                  className="ml-6 w-auto"
                  placeholder="Please specify..."
                  value={otherText}
                  onChange={(e) => setValue(fieldPath, `other:${e.target.value}`, { shouldValidate: true })}
                  disabled={readOnly}
                />
              )}
            </>
          )}
        </RadioGroup>
      )
      break
    }
    case 'SELECT': {
      const selectRawValue: string = watch(fieldPath) || ''
      const isSelectOther = selectRawValue.startsWith('other:')
      const selectDisplayValue = isSelectOther ? '__other__' : selectRawValue
      const selectOtherText = isSelectOther ? selectRawValue.slice(6) : ''
      input = (
        <>
          <Select
            value={selectDisplayValue}
            onValueChange={(value) => {
              if (value === '__other__') {
                setValue(fieldPath, 'other:', { shouldValidate: true })
              } else {
                setValue(fieldPath, value, { shouldValidate: true })
              }
            }}
            disabled={readOnly}
          >
            <SelectTrigger className={cn(error && 'border-red-500')}>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
              {config.allowOther && (
                <SelectItem value="__other__">Other (please specify)</SelectItem>
              )}
            </SelectContent>
          </Select>
          {config.allowOther && isSelectOther && (
            <Input
              className="mt-2"
              placeholder="Please specify..."
              value={selectOtherText}
              onChange={(e) => setValue(fieldPath, `other:${e.target.value}`, { shouldValidate: true })}
              disabled={readOnly}
            />
          )}
        </>
      )
      break
    }
    case 'CHECKBOX_GROUP': {
      const currentValues: string[] = watch(fieldPath) || []
      const otherEntry = currentValues.find((v) => v.startsWith('other:'))
      const isOtherChecked = otherEntry !== undefined
      const otherInputText = isOtherChecked ? otherEntry.slice(6) : ''
      input = (
        <div className="space-y-2">
          {config.options?.map((option) => {
            const isChecked = currentValues.includes(option.value)
            return (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`${fieldPath}-${option.value}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => {
                    const newValues = checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v) => v !== option.value)
                    setValue(fieldPath, newValues, { shouldValidate: true })
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor={`${fieldPath}-${option.value}`} className="cursor-pointer">{option.label}</Label>
              </div>
            )
          })}
          {config.allowOther && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`${fieldPath}-__other__`}
                  checked={isOtherChecked}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue(fieldPath, [...currentValues, 'other:'], { shouldValidate: true })
                    } else {
                      setValue(fieldPath, currentValues.filter((v) => !v.startsWith('other:')), { shouldValidate: true })
                    }
                  }}
                  disabled={readOnly}
                />
                <Label htmlFor={`${fieldPath}-__other__`} className="cursor-pointer">Other (please specify)</Label>
              </div>
              {isOtherChecked && (
                <Input
                  className="ml-6 w-auto"
                  placeholder="Please specify..."
                  value={otherInputText}
                  onChange={(e) => {
                    const newValues = currentValues.map((v) =>
                      v.startsWith('other:') ? `other:${e.target.value}` : v
                    )
                    setValue(fieldPath, newValues, { shouldValidate: true })
                  }}
                  disabled={readOnly}
                />
              )}
            </>
          )}
        </div>
      )
      break
    }
    case 'STATIC_TEXT':
      return (
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: config.content || '' }}
        />
      )
    case 'PAGE_BREAK':
      return (
        <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
          <div className="flex-1 border-t border-dashed" />
          <span>{element.label || 'Page Break'}</span>
          <div className="flex-1 border-t border-dashed" />
        </div>
      )
    default:
      return null
  }

  return (
    <div className="space-y-2">
      {element.type !== 'CHECKBOX' && (
        <Label>{element.label}{config.required && <span className="text-red-500 ml-1">*</span>}</Label>
      )}
      {input}
      {error && <p className="text-sm text-red-500">{error.message}</p>}
    </div>
  )
}

function getDefaultValuesForGroup(children: FormElement[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const child of children) {
    if (child.type === 'STATIC_TEXT' || child.type === 'PAGE_BREAK') continue
    if (child.type === 'ELEMENT_GROUP') {
      if (child.configuration?.repeatable) {
        const minInstances = child.configuration.minInstances ?? 0
        const nestedDefaults = getDefaultValuesForGroup(child.children || [])
        defaults[child.fieldName] = Array.from({ length: minInstances }, () => ({ ...nestedDefaults }))
      }
      continue
    }
    if (child.type === 'CHECKBOX') {
      defaults[child.fieldName] = false
    } else if (child.type === 'CHECKBOX_GROUP') {
      defaults[child.fieldName] = []
    } else {
      defaults[child.fieldName] = ''
    }
  }
  return defaults
}

function RepeatableGroupField({
  element, control, register, errors, setValue, watch, readOnly, prefix,
}: {
  element: FormElement
  control: Control
  register: ReturnType<typeof useForm>['register']
  errors: Record<string, unknown>
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  readOnly?: boolean
  prefix?: string
}) {
  const fieldName = prefix ? `${prefix}.${element.fieldName}` : element.fieldName
  const { fields, append, remove } = useFieldArray({ control, name: fieldName })
  const children = element.children || []
  const config = element.configuration || {}
  const minInstances = config.minInstances ?? 0
  const maxInstances = config.maxInstances || 10

  return (
    <fieldset className="border rounded-lg p-4 space-y-4">
      <legend className="font-medium px-2">{element.label}</legend>
      {fields.map((field, index) => (
        <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500">{config.instanceLabel || 'Instance'} {index + 1}</span>
            {!readOnly && fields.length > minInstances && (
              <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            )}
          </div>
          {children.map((child) => {
            if (child.type === 'ELEMENT_GROUP') {
              if (child.configuration?.repeatable) {
                return (
                  <RepeatableGroupField
                    key={child.id} element={child} control={control} register={register}
                    errors={errors} setValue={setValue} watch={watch} readOnly={readOnly}
                    prefix={`${fieldName}.${index}`}
                  />
                )
              }
              return (
                <fieldset key={child.id} className="border rounded-lg p-4 space-y-4">
                  <legend className="font-medium px-2">{child.label}</legend>
                  {child.children?.map((nestedChild) => (
                    <RenderElement
                      key={nestedChild.id} element={nestedChild} register={register}
                      errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[index] as Record<string, { message?: string }> || {}}
                      setValue={setValue} watch={watch} readOnly={readOnly} prefix={`${fieldName}.${index}`}
                    />
                  ))}
                </fieldset>
              )
            }
            return (
              <RenderElement
                key={child.id} element={child} register={register}
                errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[index] as Record<string, { message?: string }> || {}}
                setValue={setValue} watch={watch} readOnly={readOnly} prefix={`${fieldName}.${index}`}
              />
            )
          })}
        </div>
      ))}
      {!readOnly && fields.length < maxInstances && (
        <Button type="button" variant="outline" size="sm" onClick={() => append(getDefaultValuesForGroup(children))} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add {config.instanceLabel || element.label}
        </Button>
      )}
    </fieldset>
  )
}

function RepeatableFieldArray({
  element, register, errors, setValue, watch, readOnly,
}: {
  element: FormElement
  register: ReturnType<typeof useForm>['register']
  errors: Record<string, unknown>
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  readOnly?: boolean
}) {
  const config = element.configuration || {}
  const minInstances = config.minInstances ?? 0
  const maxInstances = config.maxInstances || 10
  const values: unknown[] = watch(element.fieldName) || []

  const addValue = () => {
    setValue(element.fieldName, [...values, ''], { shouldValidate: true })
  }

  const removeValue = (index: number) => {
    setValue(element.fieldName, values.filter((_: unknown, i: number) => i !== index), { shouldValidate: true })
  }

  const updateValue = (index: number, val: string) => {
    const newValues = [...values]
    newValues[index] = val
    setValue(element.fieldName, newValues, { shouldValidate: true })
  }

  const fieldErrors = errors as Record<string, { message?: string } & Record<string, { message?: string }>>

  return (
    <div className="space-y-2">
      <Label>{element.label}{config.required && <span className="text-red-500 ml-1">*</span>}</Label>
      {values.map((_val: unknown, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            {...register(`${element.fieldName}.${index}`)}
            type={element.type === 'NUMBER' ? 'number' : element.type === 'EMAIL' ? 'email' : element.type === 'DATE' ? 'date' : 'text'}
            placeholder={config.placeholder}
            disabled={readOnly}
            onChange={(e) => updateValue(index, e.target.value)}
            className={cn(fieldErrors?.[element.fieldName]?.[index]?.message && 'border-red-500')}
          />
          {!readOnly && values.length > minInstances && (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-red-500" onClick={() => removeValue(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && values.length < maxInstances && (
        <Button type="button" variant="outline" size="sm" onClick={addValue} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add {element.label}
        </Button>
      )}
      {fieldErrors?.[element.fieldName]?.message && (
        <p className="text-sm text-red-500">{(fieldErrors[element.fieldName] as { message?: string }).message}</p>
      )}
    </div>
  )
}

function splitAtPageBreaks(children: FormElement[]) {
  const sections: { title?: string; elements: FormElement[] }[] = []
  let currentElements: FormElement[] = []
  let nextTitle: string | undefined = undefined

  for (const child of children) {
    if (child.type === 'PAGE_BREAK') {
      if (currentElements.length > 0 || sections.length === 0) {
        sections.push({ title: nextTitle, elements: currentElements })
      }
      nextTitle = child.label || undefined
      currentElements = []
    } else {
      currentElements.push(child)
    }
  }
  if (currentElements.length > 0 || sections.length > 0) {
    sections.push({ title: nextTitle, elements: currentElements })
  }
  return sections
}

function FullPageGroupView({
  element,
  register,
  errors,
  setValue,
  watch,
  control,
  readOnly,
  prefix,
  instanceIndex,
  onNavigateToGroup,
}: {
  element: FormElement
  register: ReturnType<typeof useForm>['register']
  errors: Record<string, unknown>
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  control: Control
  readOnly?: boolean
  prefix?: string
  instanceIndex?: number
  onNavigateToGroup: (element: FormElement, instanceIndex?: number) => void
}) {
  const children = element.children || []
  const isInstance = instanceIndex !== undefined
  const fieldName = prefix ? `${prefix}.${element.fieldName}` : element.fieldName
  const instancePrefix = isInstance ? `${fieldName}.${instanceIndex}` : undefined

  const sections = splitAtPageBreaks(children)
  const hasPageBreaks = sections.length > 1
  const [currentSection, setCurrentSection] = useState(0)

  const renderChildren = (childElements: FormElement[]) =>
    childElements.map((child) => {
      if (child.type === 'ELEMENT_GROUP') {
        if (child.configuration?.fullPage && !child.configuration?.repeatable) {
          return (
            <div key={child.id} className="border rounded-lg p-4">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => onNavigateToGroup(child)}
              >
                <span>Fill {child.label}</span>
                <Check className="h-4 w-4 text-gray-400" />
              </Button>
            </div>
          )
        }
        if (child.configuration?.fullPage && child.configuration?.repeatable) {
          return (
            <FullPageRepeatableGroup
              key={child.id}
              element={child}
              control={control}
              watch={watch}
              readOnly={readOnly}
              prefix={instancePrefix}
              onOpenInstance={(index) => onNavigateToGroup(child, index)}
            />
          )
        }
        if (child.configuration?.repeatable) {
          return (
            <RepeatableGroupField
              key={child.id}
              element={child}
              control={control}
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              readOnly={readOnly}
              prefix={instancePrefix}
            />
          )
        }
        return (
          <fieldset key={child.id} className="border rounded-lg p-4 space-y-4">
            <legend className="font-medium px-2">{child.label}</legend>
            {child.children?.map((nestedChild) => (
              <RenderElement
                key={nestedChild.id}
                element={nestedChild}
                register={register}
                errors={isInstance
                  ? ((errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[instanceIndex] as Record<string, { message?: string }> || {})
                  : (errors as Record<string, { message?: string }>)}
                setValue={setValue}
                watch={watch}
                readOnly={readOnly}
                prefix={instancePrefix}
              />
            ))}
          </fieldset>
        )
      }
      return (
        <RenderElement
          key={child.id}
          element={child}
          register={register}
          errors={isInstance
            ? ((errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[instanceIndex] as Record<string, { message?: string }> || {})
            : (errors as Record<string, { message?: string }>)}
          setValue={setValue}
          watch={watch}
          readOnly={readOnly}
          prefix={instancePrefix}
        />
      )
    })

  if (hasPageBreaks) {
    const section = sections[currentSection]
    return (
      <div className="space-y-6">
        {section.title && (
          <h3 className="text-md font-medium text-gray-700">{section.title}</h3>
        )}
        <div className="space-y-6">
          {renderChildren(section.elements)}
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentSection === 0}
            onClick={() => setCurrentSection((s) => s - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-gray-500">
            Section {currentSection + 1} of {sections.length}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentSection === sections.length - 1}
            onClick={() => setCurrentSection((s) => s + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {renderChildren(children)}
    </div>
  )
}

function getInstanceSummary(
  children: FormElement[],
  instanceData: Record<string, unknown> | undefined,
  index: number,
  instanceLabel: string = 'Instance',
): string {
  if (!instanceData) return `${instanceLabel} ${index + 1}`
  const parts: string[] = []
  for (const child of children) {
    if (parts.length >= 3) break
    if (child.type === 'ELEMENT_GROUP' || child.type === 'STATIC_TEXT' || child.type === 'PAGE_BREAK') continue
    const val = instanceData[child.fieldName]
    if (val !== undefined && val !== null && val !== '' && val !== false) {
      const strVal = String(val)
      parts.push(strVal.length > 12 ? strVal.slice(0, 12) + '...' : strVal)
    }
  }
  return parts.length > 0
    ? `${instanceLabel} ${index + 1} — ${parts.join(', ')}`
    : `${instanceLabel} ${index + 1}`
}

function FullPageRepeatableGroup({
  element,
  control,
  watch,
  readOnly,
  prefix,
  onOpenInstance,
}: {
  element: FormElement
  control: Control
  watch: ReturnType<typeof useForm>['watch']
  readOnly?: boolean
  prefix?: string
  onOpenInstance: (index: number) => void
}) {
  const fieldName = prefix ? `${prefix}.${element.fieldName}` : element.fieldName
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  })

  const children = element.children || []
  const config = element.configuration || {}
  const minInstances = config.minInstances ?? 0
  const maxInstances = config.maxInstances || 10
  const instanceLabel = config.instanceLabel || 'Instance'

  return (
    <fieldset className="border rounded-lg p-4 space-y-4">
      <legend className="font-medium px-2">{element.label}</legend>

      {fields.map((field, index) => {
        const instanceData = watch(`${fieldName}.${index}`) as Record<string, unknown> | undefined
        const summary = getInstanceSummary(children, instanceData, index, instanceLabel)
        return (
          <div key={field.id} className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
            <span className="text-sm font-medium truncate mr-2" title={summary}>{summary}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenInstance(index)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Edit
              </Button>
              {!readOnly && fields.length > minInstances && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )
      })}

      {!readOnly && fields.length < maxInstances && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(getDefaultValuesForGroup(children))}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add {instanceLabel}
        </Button>
      )}
    </fieldset>
  )
}

type NavigationEntry = {
  element: FormElement
  instanceIndex?: number
}

function computePrefixForLevel(stack: NavigationEntry[], level: number): string | undefined {
  let prefix: string | undefined = undefined
  for (let i = 0; i < level; i++) {
    const entry = stack[i]
    const fieldName: string = prefix ? `${prefix}.${entry.element.fieldName}` : entry.element.fieldName
    if (entry.instanceIndex !== undefined) {
      prefix = `${fieldName}.${entry.instanceIndex}`
    } else {
      prefix = undefined
    }
  }
  return prefix
}

function renderPageElements(
  elements: FormElement[],
  register: ReturnType<typeof useForm>['register'],
  errors: Record<string, unknown>,
  setValue: ReturnType<typeof useForm>['setValue'],
  watch: ReturnType<typeof useForm>['watch'],
  control: Control,
  readOnly?: boolean,
  onOpenFullPageGroup?: (element: FormElement, instanceIndex?: number) => void,
) {
  return elements.map((element) => {
    if (element.type === 'ELEMENT_GROUP') {
      if (element.configuration?.fullPage && !element.configuration?.repeatable && onOpenFullPageGroup) {
        return (
          <div key={element.id} className="border rounded-lg p-4">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => onOpenFullPageGroup(element)}
            >
              <span>Fill {element.label}</span>
              <Check className="h-4 w-4 text-gray-400" />
            </Button>
          </div>
        )
      }

      if (element.configuration?.fullPage && element.configuration?.repeatable && onOpenFullPageGroup) {
        return (
          <FullPageRepeatableGroup
            key={element.id}
            element={element}
            control={control}
            watch={watch}
            readOnly={readOnly}
            onOpenInstance={(index) => onOpenFullPageGroup(element, index)}
          />
        )
      }

      if (element.configuration?.repeatable) {
        return (
          <RepeatableGroupField
            key={element.id} element={element} control={control} register={register}
            errors={errors} setValue={setValue} watch={watch} readOnly={readOnly}
          />
        )
      }
      return (
        <fieldset key={element.id} className="border rounded-lg p-4 space-y-4">
          <legend className="font-medium px-2">{element.label}</legend>
          {element.children?.map((child) => {
            if (child.type === 'ELEMENT_GROUP') {
              if (child.configuration?.repeatable) {
                return (
                  <RepeatableGroupField
                    key={child.id} element={child} control={control} register={register}
                    errors={errors} setValue={setValue} watch={watch} readOnly={readOnly}
                  />
                )
              }
              return (
                <fieldset key={child.id} className="border rounded-lg p-4 space-y-4">
                  <legend className="font-medium px-2">{child.label}</legend>
                  {child.children?.map((nestedChild) => (
                    <RenderElement
                      key={nestedChild.id} element={nestedChild} register={register}
                      errors={errors as Record<string, { message?: string }>}
                      setValue={setValue} watch={watch} readOnly={readOnly}
                    />
                  ))}
                </fieldset>
              )
            }
            return (
              <RenderElement
                key={child.id} element={child} register={register}
                errors={errors as Record<string, { message?: string }>}
                setValue={setValue} watch={watch} readOnly={readOnly}
              />
            )
          })}
        </fieldset>
      )
    }
    if (element.configuration?.repeatable) {
      return (
        <RepeatableFieldArray
          key={element.id} element={element} register={register}
          errors={errors} setValue={setValue} watch={watch} readOnly={readOnly}
        />
      )
    }
    return (
      <RenderElement
        key={element.id} element={element} register={register}
        errors={errors as Record<string, { message?: string }>}
        setValue={setValue} watch={watch} readOnly={readOnly}
      />
    )
  })
}

function Breadcrumb({
  pageTitle,
  navigationStack,
  onNavigateToPage,
  onNavigateToLevel,
}: {
  pageTitle: string
  navigationStack: NavigationEntry[]
  onNavigateToPage: () => void
  onNavigateToLevel: (level: number) => void
}) {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap mb-4">
      <button
        type="button"
        onClick={onNavigateToPage}
        className="text-blue-600 hover:text-blue-800 hover:underline"
      >
        {pageTitle}
      </button>
      {navigationStack.map((entry, index) => {
        const isLast = index === navigationStack.length - 1
        const instanceLabel = entry.element.configuration?.instanceLabel || 'Instance'
        const label = entry.instanceIndex !== undefined
          ? `${entry.element.label} - ${instanceLabel} ${entry.instanceIndex + 1}`
          : entry.element.label
        return (
          <span key={index} className="flex items-center gap-1">
            <ChevronRightIcon className="h-3 w-3 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-900">{label}</span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateToLevel(index + 1)}
                className="text-blue-600 hover:text-blue-800 hover:underline"
              >
                {label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}

export default function MultiPageFormRenderer({
  pages,
  onSubmit,
  isSubmitting,
  readOnly,
  defaultValues,
  onValuesChange,
}: MultiPageFormRendererProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [navigationStack, setNavigationStack] = useState<NavigationEntry[]>([])
  const schema = buildFullSchema(pages)

  const {
    register, handleSubmit, setValue, watch, control, trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  })

  // Notify parent of value changes for auto-save
  useEffect(() => {
    if (!onValuesChange) return
    const subscription = watch((values) => {
      onValuesChange(values as Record<string, unknown>)
    })
    return () => subscription.unsubscribe()
  }, [watch, onValuesChange])

  const page = pages[currentPage]
  const isFirstPage = currentPage === 0
  const isLastPage = currentPage === pages.length - 1

  const handleNext = async () => {
    const pageSchema = buildPageSchema(page)
    const fieldNames = Object.keys(pageSchema.shape)
    const isValid = await trigger(fieldNames)
    if (isValid) {
      setCurrentPage((prev) => Math.min(prev + 1, pages.length - 1))
    }
  }

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0))
  }

  const pushNavigation = (element: FormElement, instanceIndex?: number) => {
    setNavigationStack((prev) => [...prev, { element, instanceIndex }])
  }

  const popToLevel = (level: number) => {
    setNavigationStack((prev) => prev.slice(0, level))
  }

  // Render full-page group view when navigated into a group
  if (navigationStack.length > 0) {
    const deepest = navigationStack[navigationStack.length - 1]
    const prefix = computePrefixForLevel(navigationStack, navigationStack.length - 1)
    const pageTitle = page.title || `Page ${currentPage + 1}`

    return (
      <div className="space-y-6">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          <Breadcrumb
            pageTitle={pageTitle}
            navigationStack={navigationStack}
            onNavigateToPage={() => popToLevel(0)}
            onNavigateToLevel={popToLevel}
          />
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="text-lg font-semibold">
              {deepest.element.label}
              {deepest.instanceIndex !== undefined && (
                <span className="text-gray-500 ml-2">
                  - {deepest.element.configuration?.instanceLabel || 'Instance'} {deepest.instanceIndex + 1}
                </span>
              )}
            </h2>
            <Button type="button" variant="outline" onClick={() => popToLevel(navigationStack.length - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
          <FullPageGroupView
            element={deepest.element}
            register={register}
            errors={errors}
            setValue={setValue}
            watch={watch}
            control={control}
            readOnly={readOnly}
            prefix={prefix}
            instanceIndex={deepest.instanceIndex}
            onNavigateToGroup={(element, instanceIndex) => pushNavigation(element, instanceIndex)}
          />
          <div className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => popToLevel(navigationStack.length - 1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Done
            </Button>
          </div>
        </form>
      </div>
    )
  }

  const progressLabel = page.title
    ? `${page.title} (Page ${currentPage + 1} of ${pages.length})`
    : `Page ${currentPage + 1} of ${pages.length}`

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{progressLabel}</span>
          <span>{Math.round(((currentPage + 1) / pages.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Page title */}
      {page.title && (
        <div>
          <h3 className="text-lg font-semibold">{page.title}</h3>
          {page.description && <p className="text-gray-500 text-sm">{page.description}</p>}
        </div>
      )}

      {/* Page elements */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {renderPageElements(
          page.elements, register, errors, setValue, watch, control, readOnly,
          (element, instanceIndex) => pushNavigation(element, instanceIndex),
        )}

        {/* Navigation */}
        {!readOnly && (
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              disabled={isFirstPage}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            {isLastPage ? (
              <Button type="button" disabled={isSubmitting} onClick={handleSubmit(onSubmit)}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
