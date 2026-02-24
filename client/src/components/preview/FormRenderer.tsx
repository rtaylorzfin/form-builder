import { useState } from 'react'
import { useForm, useFieldArray, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, ArrowLeft, Check } from 'lucide-react'
import type { Form, FormElement } from '@/api/types'
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

interface FormRendererProps {
  form: Form
  onSubmit: (data: Record<string, unknown>) => void
  isSubmitting?: boolean
  readOnly?: boolean
  defaultValues?: Record<string, unknown>
  submitLabel?: string
}

function buildFieldSchema(element: FormElement): z.ZodTypeAny {
  let fieldSchema: z.ZodTypeAny

  switch (element.type) {
    case 'NUMBER':
      fieldSchema = z.coerce.number().optional()
      if (element.configuration?.required) {
        fieldSchema = z.coerce.number({ required_error: `${element.label} is required` })
      }
      break

    case 'CHECKBOX':
      fieldSchema = z.boolean().optional()
      if (element.configuration?.required) {
        fieldSchema = z.boolean().refine((val) => val === true, {
          message: `${element.label} is required`,
        })
      }
      break

    case 'EMAIL':
      if (element.configuration?.required) {
        fieldSchema = z
          .string({ required_error: `${element.label} is required` })
          .min(1, `${element.label} is required`)
          .email('Please enter a valid email address')
      } else {
        fieldSchema = z.string().email('Please enter a valid email address').optional().or(z.literal(''))
      }
      break

    case 'CHECKBOX_GROUP':
      if (element.configuration?.required) {
        fieldSchema = z.array(z.string()).min(1, `${element.label} is required`)
      } else {
        fieldSchema = z.array(z.string()).optional().default([])
      }
      break

    default:
      if (element.configuration?.required) {
        fieldSchema = z
          .string({ required_error: `${element.label} is required` })
          .min(1, `${element.label} is required`)
      } else {
        fieldSchema = z.string().optional()
      }
  }

  return fieldSchema
}

function buildGroupObjectSchema(children: FormElement[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const child of children) {
    if (child.type === 'STATIC_TEXT') continue
    if (child.type === 'ELEMENT_GROUP') {
      const nestedChildren = child.children || []
      const nestedObj = buildGroupObjectSchema(nestedChildren)
      if (child.configuration?.repeatable) {
        let arraySchema = z.array(nestedObj)
        if (child.configuration.minInstances) arraySchema = arraySchema.min(child.configuration.minInstances)
        if (child.configuration.maxInstances) arraySchema = arraySchema.max(child.configuration.maxInstances)
        shape[child.fieldName] = arraySchema
      } else {
        // Non-repeatable nested group: flatten into parent
        for (const nestedChild of nestedChildren) {
          if (nestedChild.type !== 'STATIC_TEXT') {
            shape[nestedChild.fieldName] = buildFieldSchema(nestedChild)
          }
        }
      }
      continue
    }
    shape[child.fieldName] = buildFieldSchema(child)
  }
  return z.object(shape)
}

function buildValidationSchema(elements: FormElement[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const element of elements) {
    if (element.type === 'STATIC_TEXT') continue

    if (element.type === 'ELEMENT_GROUP') {
      const children = element.children || []
      const groupObj = buildGroupObjectSchema(children)

      if (element.configuration?.repeatable) {
        let arraySchema = z.array(groupObj)
        if (element.configuration.minInstances) {
          arraySchema = arraySchema.min(element.configuration.minInstances, `At least ${element.configuration.minInstances} instance(s) required`)
        }
        if (element.configuration.maxInstances) {
          arraySchema = arraySchema.max(element.configuration.maxInstances, `At most ${element.configuration.maxInstances} instance(s) allowed`)
        }
        shape[element.fieldName] = arraySchema
      } else {
        // Non-repeatable group: flatten children into top-level
        for (const child of children) {
          if (child.type === 'ELEMENT_GROUP') continue
          shape[child.fieldName] = buildFieldSchema(child)
        }
      }
      continue
    }

    // Non-group repeatable elements: array of primitives
    if (element.configuration?.repeatable) {
      let arraySchema = z.array(buildFieldSchema(element))
      if (element.configuration.minInstances) {
        arraySchema = arraySchema.min(element.configuration.minInstances, `At least ${element.configuration.minInstances} value(s) required`)
      }
      if (element.configuration.maxInstances) {
        arraySchema = arraySchema.max(element.configuration.maxInstances, `At most ${element.configuration.maxInstances} value(s) allowed`)
      }
      shape[element.fieldName] = arraySchema
      continue
    }

    shape[element.fieldName] = buildFieldSchema(element)
  }

  return z.object(shape)
}

function getDefaultValuesForGroup(children: FormElement[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {}
  for (const child of children) {
    if (child.type === 'STATIC_TEXT') continue
    if (child.type === 'ELEMENT_GROUP') {
      const nestedChildren = child.children || []
      if (child.configuration?.repeatable) {
        const minInstances = child.configuration.minInstances ?? 0
        const nestedDefaults = getDefaultValuesForGroup(nestedChildren)
        defaults[child.fieldName] = Array.from({ length: minInstances }, () => ({ ...nestedDefaults }))
      } else {
        // Non-repeatable nested group: flatten
        const nestedDefaults = getDefaultValuesForGroup(nestedChildren)
        Object.assign(defaults, nestedDefaults)
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
      input = (
        <Input
          {...commonProps}
          type="text"
          placeholder={config.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )
      break

    case 'TEXT_AREA':
      input = (
        <Textarea
          {...commonProps}
          placeholder={config.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )
      break

    case 'NUMBER':
      input = (
        <Input
          {...commonProps}
          type="number"
          placeholder={config.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )
      break

    case 'EMAIL':
      input = (
        <Input
          {...commonProps}
          type="email"
          placeholder={config.placeholder || 'email@example.com'}
          className={cn(error && 'border-red-500')}
        />
      )
      break

    case 'DATE':
      input = (
        <Input
          {...commonProps}
          type="date"
          className={cn(error && 'border-red-500')}
        />
      )
      break

    case 'CHECKBOX':
      input = (
        <div className="flex items-center gap-2">
          <Checkbox
            id={fieldPath}
            checked={watch(fieldPath) || false}
            onCheckedChange={(checked) => setValue(fieldPath, checked)}
            disabled={readOnly}
          />
          <Label htmlFor={fieldPath} className="cursor-pointer">
            {element.label}
          </Label>
        </div>
      )
      break

    case 'RADIO_GROUP':
      input = (
        <RadioGroup
          value={watch(fieldPath) || ''}
          onValueChange={(value) => setValue(fieldPath, value)}
          disabled={readOnly}
        >
          {config.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${fieldPath}-${option.value}`} />
              <Label htmlFor={`${fieldPath}-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )
      break

    case 'SELECT':
      input = (
        <Select
          value={watch(fieldPath) || ''}
          onValueChange={(value) => setValue(fieldPath, value)}
          disabled={readOnly}
        >
          <SelectTrigger className={cn(error && 'border-red-500')}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {config.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      break

    case 'CHECKBOX_GROUP': {
      const currentValues: string[] = watch(fieldPath) || []
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
                <Label htmlFor={`${fieldPath}-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            )
          })}
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

    default:
      return null
  }

  return (
    <div className="space-y-2">
      {element.type !== 'CHECKBOX' && (
        <Label>
          {element.label}
          {config.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {input}
      {error && (
        <p className="text-sm text-red-500">{error.message}</p>
      )}
    </div>
  )
}

function RepeatableGroupField({
  element,
  control,
  register,
  errors,
  setValue,
  watch,
  readOnly,
  prefix,
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldName,
  })

  const children = element.children || []
  const config = element.configuration || {}
  const minInstances = config.minInstances ?? 0
  const maxInstances = config.maxInstances || 10

  return (
    <fieldset className="border rounded-lg p-4 space-y-4">
      <legend className="font-medium px-2">{element.label}</legend>

      {fields.map((field, index) => (
        <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50 relative">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500">{config.instanceLabel || 'Instance'} {index + 1}</span>
            {!readOnly && fields.length > minInstances && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
          {children.map((child) => {
            if (child.type === 'ELEMENT_GROUP') {
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
                    prefix={`${fieldName}.${index}`}
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
                      errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[index] as Record<string, { message?: string }> || {}}
                      setValue={setValue}
                      watch={watch}
                      readOnly={readOnly}
                      prefix={`${fieldName}.${index}`}
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
                errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[fieldName]?.[index] as Record<string, { message?: string }> || {}}
                setValue={setValue}
                watch={watch}
                readOnly={readOnly}
                prefix={`${fieldName}.${index}`}
              />
            )
          })}
        </div>
      ))}

      {!readOnly && fields.length < maxInstances && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(getDefaultValuesForGroup(children))}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add {element.label}
        </Button>
      )}

      {(errors as Record<string, { message?: string }>)?.[element.fieldName]?.message && (
        <p className="text-sm text-red-500">
          {((errors as Record<string, { message?: string }>)[element.fieldName]).message}
        </p>
      )}
    </fieldset>
  )
}

function RepeatableFieldArray({
  element,
  register,
  errors,
  setValue,
  watch,
  readOnly,
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
    const newValues = [...values, '']
    setValue(element.fieldName, newValues, { shouldValidate: true })
  }

  const removeValue = (index: number) => {
    const newValues = values.filter((_: unknown, i: number) => i !== index)
    setValue(element.fieldName, newValues, { shouldValidate: true })
  }

  const updateValue = (index: number, val: string) => {
    const newValues = [...values]
    newValues[index] = val
    setValue(element.fieldName, newValues, { shouldValidate: true })
  }

  const fieldErrors = errors as Record<string, { message?: string } & Record<string, { message?: string }>>

  return (
    <div className="space-y-2">
      <Label>
        {element.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
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
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-red-500 hover:text-red-600"
              onClick={() => removeValue(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {!readOnly && values.length < maxInstances && (
        <Button type="button" variant="outline" size="sm" onClick={addValue} className="w-full">
          <Plus className="h-4 w-4 mr-1" />
          Add {element.label}
        </Button>
      )}
      {fieldErrors?.[element.fieldName]?.message && (
        <p className="text-sm text-red-500">{(fieldErrors[element.fieldName] as { message?: string }).message}</p>
      )}
    </div>
  )
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
  onDone,
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
  onDone: () => void
}) {
  const children = element.children || []
  const isInstance = instanceIndex !== undefined
  const fieldName = prefix ? `${prefix}.${element.fieldName}` : element.fieldName
  const instancePrefix = isInstance ? `${fieldName}.${instanceIndex}` : undefined

  const [activeNestedGroup, setActiveNestedGroup] = useState<{
    fieldName: string
    instanceIndex?: number
  } | null>(null)

  // If a nested full-page group is active, render it recursively
  if (activeNestedGroup) {
    const nestedElement = children.find((c) => c.fieldName === activeNestedGroup.fieldName)
    if (nestedElement) {
      return (
        <FullPageGroupView
          element={nestedElement}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          control={control}
          readOnly={readOnly}
          prefix={instancePrefix}
          instanceIndex={activeNestedGroup.instanceIndex}
          onDone={() => setActiveNestedGroup(null)}
        />
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-semibold">
          {element.label}
          {isInstance && <span className="text-gray-500 ml-2">- {element.configuration?.instanceLabel || 'Instance'} {instanceIndex + 1}</span>}
        </h2>
        <Button type="button" variant="outline" onClick={onDone}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Done
        </Button>
      </div>
      <div className="space-y-6">
        {children.map((child) => {
          if (child.type === 'ELEMENT_GROUP') {
            // Nested full-page non-repeatable group
            if (child.configuration?.fullPage && !child.configuration?.repeatable) {
              return (
                <div key={child.id} className="border rounded-lg p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setActiveNestedGroup({ fieldName: child.fieldName })}
                  >
                    <span>Fill {child.label}</span>
                    <Check className="h-4 w-4 text-gray-400" />
                  </Button>
                </div>
              )
            }
            // Nested full-page repeatable group
            if (child.configuration?.fullPage && child.configuration?.repeatable) {
              return (
                <FullPageRepeatableGroup
                  key={child.id}
                  element={child}
                  control={control}
                  watch={watch}
                  readOnly={readOnly}
                  prefix={instancePrefix}
                  onOpenInstance={(index) =>
                    setActiveNestedGroup({ fieldName: child.fieldName, instanceIndex: index })
                  }
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
        })}
      </div>
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
    if (child.type === 'ELEMENT_GROUP' || child.type === 'STATIC_TEXT') continue
    const val = instanceData[child.fieldName]
    if (val !== undefined && val !== null && val !== '' && val !== false) {
      const strVal = String(val)
      const truncated = strVal.length > 20 ? strVal.slice(0, 20) + '...' : strVal
      parts.push(`${child.label}: ${truncated}`)
    }
  }
  return parts.length > 0 ? parts.join(', ') : `${instanceLabel} ${index + 1}`
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
                Fill {element.label}
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
          Add {element.label}
        </Button>
      )}
    </fieldset>
  )
}

export default function FormRenderer({
  form,
  onSubmit,
  isSubmitting,
  readOnly,
  defaultValues,
  submitLabel,
}: FormRendererProps) {
  const schema = buildValidationSchema(form.elements)

  // Build default values for repeatable groups and repeatable fields
  const builtDefaults: Record<string, unknown> = { ...defaultValues }
  for (const element of form.elements) {
    if (element.type === 'ELEMENT_GROUP' && element.configuration?.repeatable && !builtDefaults[element.fieldName]) {
      const minInstances = element.configuration.minInstances ?? 0
      const childDefaults = getDefaultValuesForGroup(element.children || [])
      builtDefaults[element.fieldName] = Array.from({ length: minInstances }, () => ({ ...childDefaults }))
    } else if (element.type !== 'ELEMENT_GROUP' && element.configuration?.repeatable && !builtDefaults[element.fieldName]) {
      const minInstances = element.configuration.minInstances ?? 0
      builtDefaults[element.fieldName] = Array.from({ length: minInstances }, () => '')
    } else if (element.type === 'CHECKBOX_GROUP' && !builtDefaults[element.fieldName]) {
      builtDefaults[element.fieldName] = []
    }
  }

  const [activeFullPageGroup, setActiveFullPageGroup] = useState<{
    fieldName: string
    instanceIndex?: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: builtDefaults,
  })

  // Find the active full-page group element
  const activeElement = activeFullPageGroup
    ? form.elements.find((el) => el.fieldName === activeFullPageGroup.fieldName)
    : null

  if (activeElement && activeFullPageGroup) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FullPageGroupView
          element={activeElement}
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          control={control}
          readOnly={readOnly}
          instanceIndex={activeFullPageGroup.instanceIndex}
          onDone={() => setActiveFullPageGroup(null)}
        />
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {form.elements.map((element) => {
        if (element.type === 'ELEMENT_GROUP') {
          // Full-page non-repeatable group: show button
          if (element.configuration?.fullPage && !element.configuration?.repeatable) {
            return (
              <div key={element.id} className="border rounded-lg p-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => setActiveFullPageGroup({ fieldName: element.fieldName })}
                >
                  <span>Fill {element.label}</span>
                  <Check className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            )
          }

          // Full-page repeatable group: show instance list with buttons
          if (element.configuration?.fullPage && element.configuration?.repeatable) {
            return (
              <FullPageRepeatableGroup
                key={element.id}
                element={element}
                control={control}
                watch={watch}
                readOnly={readOnly}
                onOpenInstance={(index) =>
                  setActiveFullPageGroup({ fieldName: element.fieldName, instanceIndex: index })
                }
              />
            )
          }

          if (element.configuration?.repeatable) {
            return (
              <RepeatableGroupField
                key={element.id}
                element={element}
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                readOnly={readOnly}
              />
            )
          }

          // Non-repeatable group: render as fieldset
          return (
            <fieldset key={element.id} className="border rounded-lg p-4 space-y-4">
              <legend className="font-medium px-2">{element.label}</legend>
              {element.children?.map((child) => (
                <RenderElement
                  key={child.id}
                  element={child}
                  register={register}
                  errors={errors as Record<string, { message?: string }>}
                  setValue={setValue}
                  watch={watch}
                  readOnly={readOnly}
                />
              ))}
            </fieldset>
          )
        }

        // Non-group repeatable element
        if (element.configuration?.repeatable) {
          return (
            <RepeatableFieldArray
              key={element.id}
              element={element}
              register={register}
              errors={errors}
              setValue={setValue}
              watch={watch}
              readOnly={readOnly}
            />
          )
        }

        return (
          <RenderElement
            key={element.id}
            element={element}
            register={register}
            errors={errors as Record<string, { message?: string }>}
            setValue={setValue}
            watch={watch}
            readOnly={readOnly}
          />
        )
      })}

      {!readOnly && (
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : (submitLabel || 'Submit')}
        </Button>
      )}
    </form>
  )
}
