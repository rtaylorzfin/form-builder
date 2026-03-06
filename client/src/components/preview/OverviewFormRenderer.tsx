import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Circle,
  Clock,
  ArrowLeft,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverviewFormRendererProps {
  pages: FormPage[]
  onSubmit: (data: Record<string, unknown>) => void
  isSubmitting?: boolean
  readOnly?: boolean
  defaultValues?: Record<string, unknown>
  onValuesChange?: (data: Record<string, unknown>) => void
}

type EditingState = {
  pageIndex: number
  instanceIndex?: number
  subSectionIndex?: number
  subInstanceIndex?: number
} | null

// ─── Schema Building (shared with existing renderers) ─────────────────────────

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
  // Allow _sectionStatus metadata
  shape['_sectionStatus'] = z.record(z.boolean()).optional()
  return z.object(shape)
}

// ─── Default Values ───────────────────────────────────────────────────────────

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

function buildAllDefaults(pages: FormPage[], existingDefaults?: Record<string, unknown>): Record<string, unknown> {
  const defaults: Record<string, unknown> = { ...existingDefaults }
  for (const page of pages) {
    for (const element of page.elements) {
      if (element.type === 'ELEMENT_GROUP' && element.configuration?.repeatable && !defaults[element.fieldName]) {
        const minInstances = element.configuration.minInstances ?? 0
        const childDefaults = getDefaultValuesForGroup(element.children || [])
        defaults[element.fieldName] = Array.from({ length: minInstances }, () => ({ ...childDefaults }))
      } else if (element.type !== 'ELEMENT_GROUP' && element.configuration?.repeatable && !defaults[element.fieldName]) {
        const minInstances = element.configuration?.minInstances ?? 0
        defaults[element.fieldName] = Array.from({ length: minInstances }, () => '')
      } else if (element.type === 'CHECKBOX_GROUP' && !defaults[element.fieldName]) {
        defaults[element.fieldName] = []
      }
    }
  }
  if (!defaults['_sectionStatus']) {
    defaults['_sectionStatus'] = {}
  }
  return defaults
}

// ─── RenderElement ────────────────────────────────────────────────────────────

function RenderElement({
  element, register, errors, setValue, watch, readOnly, prefix,
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
  const commonProps = { ...register(fieldPath), disabled: readOnly }

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
                <Input className="ml-6 w-auto" placeholder="Please specify..." value={otherText}
                  onChange={(e) => setValue(fieldPath, `other:${e.target.value}`, { shouldValidate: true })} disabled={readOnly} />
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
            <Input className="mt-2" placeholder="Please specify..." value={selectOtherText}
              onChange={(e) => setValue(fieldPath, `other:${e.target.value}`, { shouldValidate: true })} disabled={readOnly} />
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
                <Checkbox id={`${fieldPath}-${option.value}`} checked={isChecked}
                  onCheckedChange={(checked) => {
                    const newValues = checked ? [...currentValues, option.value] : currentValues.filter((v) => v !== option.value)
                    setValue(fieldPath, newValues, { shouldValidate: true })
                  }} disabled={readOnly} />
                <Label htmlFor={`${fieldPath}-${option.value}`} className="cursor-pointer">{option.label}</Label>
              </div>
            )
          })}
          {config.allowOther && (
            <>
              <div className="flex items-center gap-2">
                <Checkbox id={`${fieldPath}-__other__`} checked={isOtherChecked}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setValue(fieldPath, [...currentValues, 'other:'], { shouldValidate: true })
                    } else {
                      setValue(fieldPath, currentValues.filter((v) => !v.startsWith('other:')), { shouldValidate: true })
                    }
                  }} disabled={readOnly} />
                <Label htmlFor={`${fieldPath}-__other__`} className="cursor-pointer">Other (please specify)</Label>
              </div>
              {isOtherChecked && (
                <Input className="ml-6 w-auto" placeholder="Please specify..." value={otherInputText}
                  onChange={(e) => {
                    const newValues = currentValues.map((v) => v.startsWith('other:') ? `other:${e.target.value}` : v)
                    setValue(fieldPath, newValues, { shouldValidate: true })
                  }} disabled={readOnly} />
              )}
            </>
          )}
        </div>
      )
      break
    }
    case 'STATIC_TEXT':
      return (
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: config.content || '' }} />
      )
    case 'PAGE_BREAK':
      return null
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

// ─── Repeatable Group Field (inline) ──────────────────────────────────────────

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
                  <RepeatableGroupField key={child.id} element={child} control={control} register={register}
                    errors={errors} setValue={setValue} watch={watch} readOnly={readOnly} prefix={`${fieldName}.${index}`} />
                )
              }
              return (
                <fieldset key={child.id} className="border rounded-lg p-4 space-y-4">
                  <legend className="font-medium px-2">{child.label}</legend>
                  {child.children?.map((nestedChild) => (
                    <RenderElement key={nestedChild.id} element={nestedChild} register={register}
                      errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[index] as Record<string, { message?: string }> || {}}
                      setValue={setValue} watch={watch} readOnly={readOnly} prefix={`${fieldName}.${index}`} />
                  ))}
                </fieldset>
              )
            }
            return (
              <RenderElement key={child.id} element={child} register={register}
                errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[index] as Record<string, { message?: string }> || {}}
                setValue={setValue} watch={watch} readOnly={readOnly} prefix={`${fieldName}.${index}`} />
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

// ─── Repeatable Field Array (for non-group repeatable fields) ─────────────────

function RepeatableFieldArray({
  element, register, setValue, watch, readOnly,
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

  return (
    <div className="space-y-2">
      <Label>{element.label}{config.required && <span className="text-red-500 ml-1">*</span>}</Label>
      {values.map((_val: unknown, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            {...register(`${element.fieldName}.${index}`)}
            type={element.type === 'NUMBER' ? 'number' : element.type === 'EMAIL' ? 'email' : element.type === 'DATE' ? 'date' : 'text'}
            placeholder={config.placeholder} disabled={readOnly}
            onChange={(e) => {
              const newValues = [...values]; newValues[index] = e.target.value
              setValue(element.fieldName, newValues, { shouldValidate: true })
            }}
          />
          {!readOnly && values.length > minInstances && (
            <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-red-500"
              onClick={() => setValue(element.fieldName, values.filter((_: unknown, i: number) => i !== index), { shouldValidate: true })}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && values.length < maxInstances && (
        <Button type="button" variant="outline" size="sm"
          onClick={() => setValue(element.fieldName, [...values, ''], { shouldValidate: true })} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add {element.label}
        </Button>
      )}
    </div>
  )
}

// ─── Overview Helpers ─────────────────────────────────────────────────────────

function getRepeatableGroupForPage(page: FormPage): FormElement | null {
  const groups = page.elements.filter(
    (el) => el.type === 'ELEMENT_GROUP' && el.configuration?.repeatable && el.configuration?.fullPage
  )
  return groups.length === 1 ? groups[0] : null
}

function getSubSections(element: FormElement): FormElement[] {
  return (element.children || []).filter(
    (child) => child.type === 'ELEMENT_GROUP' && child.configuration?.fullPage
  )
}

function getNonGroupElements(elements: FormElement[]): FormElement[] {
  return elements.filter((el) => el.type !== 'ELEMENT_GROUP' || !el.configuration?.fullPage)
}

type SectionStatusMap = Record<string, boolean>

function getSectionStatusKey(pageIndex: number, groupFieldName?: string, instanceIndex?: number, subFieldName?: string): string {
  let key = `page:${pageIndex}`
  if (groupFieldName !== undefined) key += `:${groupFieldName}`
  if (instanceIndex !== undefined) key += `:${instanceIndex}`
  if (subFieldName !== undefined) key += `:${subFieldName}`
  return key
}

function getSectionDisplayStatus(
  statusMap: SectionStatusMap,
  key: string,
  formValues: Record<string, unknown>,
  fieldNames: string[],
  prefix?: string,
): 'complete' | 'in_progress' | 'not_started' {
  if (statusMap[key]) return 'complete'

  const hasData = fieldNames.some((name) => {
    const fullPath = prefix ? `${prefix}.${name}` : name
    const val = getNestedValue(formValues, fullPath)
    if (val === undefined || val === null || val === '' || val === false) return false
    if (Array.isArray(val) && val.length === 0) return false
    return true
  })

  return hasData ? 'in_progress' : 'not_started'
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function getFieldNamesForElements(elements: FormElement[]): string[] {
  const names: string[] = []
  for (const el of elements) {
    if (el.type === 'STATIC_TEXT' || el.type === 'PAGE_BREAK') continue
    if (el.type === 'ELEMENT_GROUP') {
      if (!el.configuration?.repeatable) {
        names.push(...getFieldNamesForElements(el.children || []))
      } else {
        names.push(el.fieldName)
      }
    } else {
      names.push(el.fieldName)
    }
  }
  return names
}

function getInstanceSummary(children: FormElement[], instanceData: Record<string, unknown> | undefined, index: number, instanceLabel: string = 'Instance'): string {
  if (!instanceData) return `${instanceLabel} ${index + 1}`
  const parts: string[] = []
  for (const child of children) {
    if (parts.length >= 3) break
    if (child.type === 'ELEMENT_GROUP' || child.type === 'STATIC_TEXT' || child.type === 'PAGE_BREAK') continue
    const val = instanceData[child.fieldName]
    if (val !== undefined && val !== null && val !== '' && val !== false) {
      const strVal = String(val)
      parts.push(strVal.length > 20 ? strVal.slice(0, 20) + '...' : strVal)
    }
  }
  return parts.length > 0 ? `${instanceLabel} ${index + 1} — ${parts.join(', ')}` : `${instanceLabel} ${index + 1}`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'complete' | 'in_progress' | 'not_started' }) {
  switch (status) {
    case 'complete':
      return (
        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Complete
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1">
          <Clock className="h-3 w-3" /> In Progress
        </Badge>
      )
    case 'not_started':
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-300 bg-gray-50 gap-1">
          <Circle className="h-3 w-3" /> Not Started
        </Badge>
      )
  }
}

// ─── Form Overview ────────────────────────────────────────────────────────────

function FormOverview({
  pages,
  formValues,
  sectionStatus,
  onEditPage,
  onEditInstance,
  onEditSubSection,
  onAddInstance,
  onRemoveInstance,
  onToggleComplete,
  readOnly,
}: {
  pages: FormPage[]
  formValues: Record<string, unknown>
  sectionStatus: SectionStatusMap
  onEditPage: (pageIndex: number) => void
  onEditInstance: (pageIndex: number, instanceIndex: number) => void
  onEditSubSection: (pageIndex: number, instanceIndex: number, subSectionIndex: number) => void
  onAddInstance: (groupFieldName: string) => void
  onRemoveInstance: (groupFieldName: string, index: number) => void
  onToggleComplete: (key: string, value: boolean) => void
  readOnly?: boolean
}) {
  return (
    <div className="space-y-2">
      {pages.map((page, pageIndex) => {
        const repeatableGroup = getRepeatableGroupForPage(page)

        if (repeatableGroup) {
          return (
            <RepeatablePageSection
              key={pageIndex}
              page={page}
              pageIndex={pageIndex}
              group={repeatableGroup}
              formValues={formValues}
              sectionStatus={sectionStatus}
              onEditInstance={(instanceIndex) => onEditInstance(pageIndex, instanceIndex)}
              onEditSubSection={(instanceIndex, subIdx) => onEditSubSection(pageIndex, instanceIndex, subIdx)}
              onAddInstance={() => onAddInstance(repeatableGroup.fieldName)}
              onRemoveInstance={(index) => onRemoveInstance(repeatableGroup.fieldName, index)}
              onToggleComplete={onToggleComplete}
              readOnly={readOnly}
            />
          )
        }

        return (
          <SimplePageSection
            key={pageIndex}
            page={page}
            pageIndex={pageIndex}
            formValues={formValues}
            sectionStatus={sectionStatus}
            onEdit={() => onEditPage(pageIndex)}
            onToggleComplete={onToggleComplete}
            readOnly={readOnly}
          />
        )
      })}
    </div>
  )
}

function SimplePageSection({
  page, pageIndex, formValues, sectionStatus, onEdit, onToggleComplete, readOnly,
}: {
  page: FormPage
  pageIndex: number
  formValues: Record<string, unknown>
  sectionStatus: SectionStatusMap
  onEdit: () => void
  onToggleComplete: (key: string, value: boolean) => void
  readOnly?: boolean
}) {
  const statusKey = getSectionStatusKey(pageIndex)
  const fieldNames = getFieldNamesForElements(page.elements)
  const status = getSectionDisplayStatus(sectionStatus, statusKey, formValues, fieldNames)
  const isComplete = sectionStatus[statusKey] || false

  const hasFields = fieldNames.length > 0

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-base">
            {pageIndex + 1}. {page.title || `Page ${pageIndex + 1}`}
          </h3>
          {hasFields && <StatusBadge status={status} />}
        </div>
        {!readOnly && hasFields && (
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
        )}
      </div>
      {!readOnly && hasFields && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Checkbox
            id={`complete-${statusKey}`}
            checked={isComplete}
            onCheckedChange={(checked) => onToggleComplete(statusKey, !!checked)}
          />
          <Label htmlFor={`complete-${statusKey}`} className="text-sm text-gray-600 cursor-pointer">
            Mark this section as complete
          </Label>
        </div>
      )}
    </div>
  )
}

function RepeatablePageSection({
  page, pageIndex, group, formValues, sectionStatus,
  onEditInstance, onEditSubSection, onAddInstance, onRemoveInstance, onToggleComplete, readOnly,
}: {
  page: FormPage
  pageIndex: number
  group: FormElement
  formValues: Record<string, unknown>
  sectionStatus: SectionStatusMap
  onEditInstance: (instanceIndex: number) => void
  onEditSubSection: (instanceIndex: number, subSectionIndex: number) => void
  onAddInstance: () => void
  onRemoveInstance: (index: number) => void
  onToggleComplete: (key: string, value: boolean) => void
  readOnly?: boolean
}) {
  const instances = (formValues[group.fieldName] as Record<string, unknown>[] | undefined) || []
  const subSections = getSubSections(group)
  const config = group.configuration || {}
  const instanceLabel = config.instanceLabel || 'Instance'
  const maxInstances = config.maxInstances || 10
  const minInstances = config.minInstances ?? 0
  const statusKey = getSectionStatusKey(pageIndex, group.fieldName)
  const isComplete = sectionStatus[statusKey] || false

  // Get direct (non-group) children for instance summaries
  const directChildren = (group.children || []).filter(
    (c) => c.type !== 'ELEMENT_GROUP' || !c.configuration?.fullPage
  )

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-semibold text-base">
          {pageIndex + 1}. {page.title || group.label}
        </h3>
      </div>

      <div className="space-y-3 ml-4">
        {instances.map((instanceData, instanceIndex) => {
          const summary = getInstanceSummary(directChildren.length > 0 ? directChildren : (group.children || []), instanceData, instanceIndex, instanceLabel)

          return (
            <div key={instanceIndex} className="border rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{summary}</span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onEditInstance(instanceIndex)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  {!readOnly && instances.length > minInstances && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                      onClick={() => onRemoveInstance(instanceIndex)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {subSections.length > 0 && (
                <div className="space-y-1 ml-4 mt-2">
                  {subSections.map((sub, subIdx) => {
                    const subKey = getSectionStatusKey(pageIndex, group.fieldName, instanceIndex, sub.fieldName)
                    const subFieldNames = getFieldNamesForElements(sub.children || [])
                    const subHasFields = subFieldNames.length > 0 || (sub.configuration?.repeatable)
                    const instancePrefix = `${group.fieldName}.${instanceIndex}`
                    const subStatus = getSectionDisplayStatus(sectionStatus, subKey, formValues, subFieldNames, instancePrefix)

                    return (
                      <div key={sub.id} className="flex items-center justify-between py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">{sub.label}</span>
                          {subHasFields && <StatusBadge status={subStatus} />}
                        </div>
                        {subHasFields && (
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => onEditSubSection(instanceIndex, subIdx)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {!readOnly && instances.length < maxInstances && (
          <Button type="button" variant="outline" size="sm" onClick={onAddInstance} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add {instanceLabel}
          </Button>
        )}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Checkbox
            id={`complete-${statusKey}`}
            checked={isComplete}
            onCheckedChange={(checked) => onToggleComplete(statusKey, !!checked)}
          />
          <Label htmlFor={`complete-${statusKey}`} className="text-sm text-gray-600 cursor-pointer">
            Mark this section as complete
          </Label>
        </div>
      )}
    </div>
  )
}

// ─── Section Editor ───────────────────────────────────────────────────────────

function SectionEditor({
  pages, pageIndex, instanceIndex, subSectionIndex, subInstanceIndex,
  register, errors, setValue, watch, control, readOnly,
  onSaveAndExit, onNavigateSubSection, onEditSubInstance, onBackToSubSection,
}: {
  pages: FormPage[]
  pageIndex: number
  instanceIndex?: number
  subSectionIndex?: number
  subInstanceIndex?: number
  register: ReturnType<typeof useForm>['register']
  errors: Record<string, unknown>
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  control: Control
  readOnly?: boolean
  onSaveAndExit: () => void
  onNavigateSubSection: (subIdx: number) => void
  onEditSubInstance: (subInstanceIndex: number) => void
  onBackToSubSection: () => void
}) {
  const page = pages[pageIndex]
  const repeatableGroup = getRepeatableGroupForPage(page)

  // Simple page editing (no repeatable group)
  if (!repeatableGroup || instanceIndex === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold">{page.title || `Page ${pageIndex + 1}`}</h2>
          <Button type="button" variant="outline" onClick={onSaveAndExit}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Save and Exit
          </Button>
        </div>
        {page.description && <p className="text-gray-500 text-sm">{page.description}</p>}
        <div className="space-y-6">
          {renderElementList(page.elements, register, errors as Record<string, { message?: string }>, setValue, watch, control, readOnly)}
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSaveAndExit}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Save and Exit
          </Button>
        </div>
      </div>
    )
  }

  // Editing a repeatable group instance with sub-sections
  const subSections = getSubSections(repeatableGroup)
  const config = repeatableGroup.configuration || {}
  const instanceLabel = config.instanceLabel || 'Instance'
  const prefix = `${repeatableGroup.fieldName}.${instanceIndex}`

  // If there are sub-sections and we have a subSectionIndex
  if (subSections.length > 0 && subSectionIndex !== undefined) {
    const currentSub = subSections[subSectionIndex]
    const isFirst = subSectionIndex === 0
    const isLast = subSectionIndex === subSections.length - 1
    const prevLabel = !isFirst ? subSections[subSectionIndex - 1].label : null
    const nextLabel = !isLast ? subSections[subSectionIndex + 1].label : null

    // Repeatable sub-section: editing a specific instance
    if (currentSub.configuration?.repeatable && subInstanceIndex !== undefined) {
      const subPrefix = `${prefix}.${currentSub.fieldName}.${subInstanceIndex}`
      const subChildren = (currentSub.children || []).filter(
        (c) => c.type !== 'ELEMENT_GROUP' || !c.configuration?.fullPage
      )
      const subInstanceLabel = currentSub.configuration?.instanceLabel || 'Instance'

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {instanceLabel} {instanceIndex + 1} — {currentSub.label} — {subInstanceLabel} {subInstanceIndex + 1}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Section {subSectionIndex + 1} of {subSections.length}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onBackToSubSection}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to {currentSub.label}
            </Button>
          </div>
          <div className="space-y-6">
            {subChildren.map((child) => (
              <RenderElement key={child.id} element={child} register={register}
                errors={errors as Record<string, { message?: string }>} setValue={setValue}
                watch={watch} readOnly={readOnly} prefix={subPrefix} />
            ))}
          </div>
          <div className="flex justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onBackToSubSection}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to {currentSub.label}
            </Button>
          </div>
        </div>
      )
    }

    // Repeatable sub-section: show collapsed instance list
    if (currentSub.configuration?.repeatable && subInstanceIndex === undefined) {
      const subFieldName = `${prefix}.${currentSub.fieldName}`
      const subInstances = (watch(subFieldName) || []) as Record<string, unknown>[]
      const subConfig = currentSub.configuration || {}
      const subInstanceLabel = subConfig.instanceLabel || 'Instance'
      const subMaxInstances = subConfig.maxInstances || 10
      const subMinInstances = subConfig.minInstances ?? 0
      const subChildren = (currentSub.children || []).filter(
        (c) => c.type !== 'ELEMENT_GROUP' || !c.configuration?.fullPage
      )

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {instanceLabel} {instanceIndex + 1} — {currentSub.label}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Section {subSectionIndex + 1} of {subSections.length}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onSaveAndExit}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Save and Exit
            </Button>
          </div>

          <div className="space-y-3">
            {subInstances.map((instanceData, idx) => {
              const summary = getInstanceSummary(subChildren, instanceData, idx, subInstanceLabel)
              return (
                <div key={idx} className="border rounded-lg p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{summary}</span>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => onEditSubInstance(idx)}>
                        <Pencil className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {!readOnly && subInstances.length > subMinInstances && (
                        <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600"
                          onClick={() => {
                            const updated = subInstances.filter((_, i) => i !== idx)
                            setValue(subFieldName, updated)
                          }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {!readOnly && subInstances.length < subMaxInstances && (
              <Button type="button" variant="outline" size="sm" className="w-full"
                onClick={() => {
                  const newInstance = getDefaultValuesForGroup(currentSub.children || [])
                  setValue(subFieldName, [...subInstances, newInstance])
                }}>
                <Plus className="h-4 w-4 mr-1" /> Add {subInstanceLabel}
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {!isFirst && (
                <Button type="button" variant="outline" onClick={() => onNavigateSubSection(subSectionIndex - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous ({prevLabel})
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onSaveAndExit}>
                Save and Exit
              </Button>
              {!isLast && (
                <Button type="button" onClick={() => onNavigateSubSection(subSectionIndex + 1)}>
                  Next ({nextLabel})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Non-repeatable sub-section: render fields directly
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold">
              {instanceLabel} {instanceIndex + 1} — {currentSub.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Section {subSectionIndex + 1} of {subSections.length}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onSaveAndExit}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Save and Exit
          </Button>
        </div>

        <div className="space-y-6">
          {renderElementList(
            currentSub.children || [],
            register,
            errors as Record<string, { message?: string }>,
            setValue, watch, control, readOnly, prefix
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {!isFirst && (
              <Button type="button" variant="outline" onClick={() => onNavigateSubSection(subSectionIndex - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous ({prevLabel})
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onSaveAndExit}>
              Save and Exit
            </Button>
            {!isLast && (
              <Button type="button" onClick={() => onNavigateSubSection(subSectionIndex + 1)}>
                Next ({nextLabel})
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Editing a repeatable group instance without sub-sections (or sub-sections not selected)
  // Show all direct children
  const directElements = getNonGroupElements(repeatableGroup.children || [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-semibold">
          {instanceLabel} {instanceIndex + 1}
        </h2>
        <Button type="button" variant="outline" onClick={onSaveAndExit}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Save and Exit
        </Button>
      </div>
      <div className="space-y-6">
        {renderElementList(directElements, register, errors as Record<string, { message?: string }>, setValue, watch, control, readOnly, prefix)}
      </div>
      <div className="flex justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onSaveAndExit}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Save and Exit
        </Button>
      </div>
    </div>
  )
}

function renderElementList(
  elements: FormElement[],
  register: ReturnType<typeof useForm>['register'],
  errors: Record<string, { message?: string }>,
  setValue: ReturnType<typeof useForm>['setValue'],
  watch: ReturnType<typeof useForm>['watch'],
  control: Control,
  readOnly?: boolean,
  prefix?: string,
) {
  return elements.map((element) => {
    if (element.type === 'ELEMENT_GROUP') {
      if (element.configuration?.repeatable) {
        return (
          <RepeatableGroupField
            key={element.id} element={element} control={control} register={register}
            errors={errors} setValue={setValue} watch={watch} readOnly={readOnly} prefix={prefix}
          />
        )
      }
      // Non-repeatable, non-fullPage group: render as fieldset
      if (!element.configuration?.fullPage) {
        return (
          <fieldset key={element.id} className="border rounded-lg p-4 space-y-4">
            <legend className="font-medium px-2">{element.label}</legend>
            {element.children?.map((child) => (
              <RenderElement key={child.id} element={child} register={register}
                errors={errors} setValue={setValue} watch={watch} readOnly={readOnly} prefix={prefix} />
            ))}
          </fieldset>
        )
      }
      // fullPage non-repeatable: render children inline (they're flattened)
      return (
        <div key={element.id} className="space-y-4">
          {element.children?.map((child) => (
            <RenderElement key={child.id} element={child} register={register}
              errors={errors} setValue={setValue} watch={watch} readOnly={readOnly} prefix={prefix} />
          ))}
        </div>
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
      <RenderElement key={element.id} element={element} register={register}
        errors={errors} setValue={setValue} watch={watch} readOnly={readOnly} prefix={prefix} />
    )
  })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OverviewFormRenderer({
  pages,
  onSubmit,
  isSubmitting,
  readOnly,
  defaultValues,
  onValuesChange,
}: OverviewFormRendererProps) {
  const [editing, setEditing] = useState<EditingState>(null)
  const schema = buildFullSchema(pages)
  const builtDefaults = buildAllDefaults(pages, defaultValues)

  const {
    register, handleSubmit, setValue, watch, control, getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: builtDefaults,
  })

  // Notify parent of value changes for auto-save
  useEffect(() => {
    if (!onValuesChange) return
    const subscription = watch((values) => {
      onValuesChange(values as Record<string, unknown>)
    })
    return () => subscription.unsubscribe()
  }, [watch, onValuesChange])

  const formValues = watch() as Record<string, unknown>
  const sectionStatus = (formValues['_sectionStatus'] || {}) as SectionStatusMap

  const handleToggleComplete = (key: string, value: boolean) => {
    const current = (getValues('_sectionStatus') || {}) as SectionStatusMap
    const updated = { ...current, [key]: value }
    setValue('_sectionStatus', updated)
  }

  const handleAddInstance = (groupFieldName: string) => {
    // Find the group element to get its children for defaults
    for (const page of pages) {
      for (const el of page.elements) {
        if (el.fieldName === groupFieldName && el.type === 'ELEMENT_GROUP') {
          const currentInstances = (getValues(groupFieldName) || []) as Record<string, unknown>[]
          const newInstance = getDefaultValuesForGroup(el.children || [])
          setValue(groupFieldName, [...currentInstances, newInstance])
          return
        }
      }
    }
  }

  const handleRemoveInstance = (groupFieldName: string, index: number) => {
    const currentInstances = (getValues(groupFieldName) || []) as Record<string, unknown>[]
    setValue(groupFieldName, currentInstances.filter((_, i) => i !== index))
  }

  // Editing mode
  if (editing) {
    return (
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        <SectionEditor
          pages={pages}
          pageIndex={editing.pageIndex}
          instanceIndex={editing.instanceIndex}
          subSectionIndex={editing.subSectionIndex}
          subInstanceIndex={editing.subInstanceIndex}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          control={control}
          readOnly={readOnly}
          onSaveAndExit={() => setEditing(null)}
          onNavigateSubSection={(subIdx) =>
            setEditing({ ...editing, subSectionIndex: subIdx, subInstanceIndex: undefined })
          }
          onEditSubInstance={(subInstanceIdx) =>
            setEditing({ ...editing, subInstanceIndex: subInstanceIdx })
          }
          onBackToSubSection={() =>
            setEditing({ ...editing, subInstanceIndex: undefined })
          }
        />
      </form>
    )
  }

  // Overview mode
  return (
    <div className="space-y-6">
      <FormOverview
        pages={pages}
        formValues={formValues}
        sectionStatus={sectionStatus}
        onEditPage={(pageIndex) => setEditing({ pageIndex })}
        onEditInstance={(pageIndex, instanceIndex) => {
          const page = pages[pageIndex]
          const group = getRepeatableGroupForPage(page)
          const subSections = group ? getSubSections(group) : []
          setEditing({
            pageIndex,
            instanceIndex,
            subSectionIndex: subSections.length > 0 ? 0 : undefined,
          })
        }}
        onEditSubSection={(pageIndex, instanceIndex, subSectionIndex) =>
          setEditing({ pageIndex, instanceIndex, subSectionIndex })
        }
        onAddInstance={handleAddInstance}
        onRemoveInstance={handleRemoveInstance}
        onToggleComplete={handleToggleComplete}
        readOnly={readOnly}
      />

      {!readOnly && (
        <div className="pt-4 border-t">
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit(onSubmit)}
            className="w-full"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      )}
    </div>
  )
}
