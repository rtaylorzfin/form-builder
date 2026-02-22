import { useState } from 'react'
import { useForm, useFieldArray, Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
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
    default:
      return element.configuration?.required
        ? z.string({ required_error: `${element.label} is required` }).min(1, `${element.label} is required`)
        : z.string().optional()
  }
}

function buildFullSchema(pages: FormPage[]) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const page of pages) {
    for (const element of page.elements) {
      if (element.type === 'STATIC_TEXT') continue
      if (element.type === 'ELEMENT_GROUP') {
        const children = element.children || []
        if (element.configuration?.repeatable) {
          const childShape: Record<string, z.ZodTypeAny> = {}
          for (const child of children) {
            if (child.type !== 'ELEMENT_GROUP') childShape[child.fieldName] = buildFieldSchema(child)
          }
          let arraySchema = z.array(z.object(childShape))
          if (element.configuration.minInstances) arraySchema = arraySchema.min(element.configuration.minInstances)
          if (element.configuration.maxInstances) arraySchema = arraySchema.max(element.configuration.maxInstances)
          shape[element.fieldName] = arraySchema
        } else {
          for (const child of children) {
            if (child.type !== 'ELEMENT_GROUP') shape[child.fieldName] = buildFieldSchema(child)
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
  return z.object(shape)
}

function buildPageSchema(page: FormPage) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const element of page.elements) {
    if (element.type === 'STATIC_TEXT') continue
    if (element.type === 'ELEMENT_GROUP') {
      const children = element.children || []
      if (element.configuration?.repeatable) {
        const childShape: Record<string, z.ZodTypeAny> = {}
        for (const child of children) {
          if (child.type !== 'ELEMENT_GROUP') childShape[child.fieldName] = buildFieldSchema(child)
        }
        let arraySchema = z.array(z.object(childShape))
        if (element.configuration.minInstances) arraySchema = arraySchema.min(element.configuration.minInstances)
        if (element.configuration.maxInstances) arraySchema = arraySchema.max(element.configuration.maxInstances)
        shape[element.fieldName] = arraySchema
      } else {
        for (const child of children) {
          if (child.type !== 'ELEMENT_GROUP') shape[child.fieldName] = buildFieldSchema(child)
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
    case 'RADIO_GROUP':
      input = (
        <RadioGroup value={watch(fieldPath) || ''} onValueChange={(value) => setValue(fieldPath, value)} disabled={readOnly}>
          {config.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${fieldPath}-${option.value}`} />
              <Label htmlFor={`${fieldPath}-${option.value}`} className="cursor-pointer">{option.label}</Label>
            </div>
          ))}
        </RadioGroup>
      )
      break
    case 'SELECT':
      input = (
        <Select value={watch(fieldPath) || ''} onValueChange={(value) => setValue(fieldPath, value)} disabled={readOnly}>
          <SelectTrigger className={cn(error && 'border-red-500')}>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {config.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
      break
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
        <Label>{element.label}{config.required && <span className="text-red-500 ml-1">*</span>}</Label>
      )}
      {input}
      {error && <p className="text-sm text-red-500">{error.message}</p>}
    </div>
  )
}

function RepeatableGroupField({
  element, control, register, errors, setValue, watch, readOnly,
}: {
  element: FormElement
  control: Control
  register: ReturnType<typeof useForm>['register']
  errors: Record<string, unknown>
  setValue: ReturnType<typeof useForm>['setValue']
  watch: ReturnType<typeof useForm>['watch']
  readOnly?: boolean
}) {
  const { fields, append, remove } = useFieldArray({ control, name: element.fieldName })
  const children = element.children || []
  const config = element.configuration || {}
  const minInstances = config.minInstances || 1
  const maxInstances = config.maxInstances || 10

  const getDefaults = () => {
    const d: Record<string, unknown> = {}
    for (const child of children) { d[child.fieldName] = child.type === 'CHECKBOX' ? false : '' }
    return d
  }

  return (
    <fieldset className="border rounded-lg p-4 space-y-4">
      <legend className="font-medium px-2">{element.label}</legend>
      {fields.map((field, index) => (
        <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-gray-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-500">Instance {index + 1}</span>
            {!readOnly && fields.length > minInstances && (
              <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 mr-1" /> Remove
              </Button>
            )}
          </div>
          {children.map((child) => (
            <RenderElement
              key={child.id} element={child} register={register}
              errors={(errors as Record<string, Record<string, Record<string, { message?: string }>>>)?.[element.fieldName]?.[index] as Record<string, { message?: string }> || {}}
              setValue={setValue} watch={watch} readOnly={readOnly} prefix={`${element.fieldName}.${index}`}
            />
          ))}
        </div>
      ))}
      {!readOnly && fields.length < maxInstances && (
        <Button type="button" variant="outline" size="sm" onClick={() => append(getDefaults())} className="w-full">
          <Plus className="h-4 w-4 mr-1" /> Add {element.label}
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
  const minInstances = config.minInstances || 1
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

function renderPageElements(
  elements: FormElement[],
  register: ReturnType<typeof useForm>['register'],
  errors: Record<string, unknown>,
  setValue: ReturnType<typeof useForm>['setValue'],
  watch: ReturnType<typeof useForm>['watch'],
  control: Control,
  readOnly?: boolean,
) {
  return elements.map((element) => {
    if (element.type === 'ELEMENT_GROUP') {
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
          {element.children?.map((child) => (
            <RenderElement
              key={child.id} element={child} register={register}
              errors={errors as Record<string, { message?: string }>}
              setValue={setValue} watch={watch} readOnly={readOnly}
            />
          ))}
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

export default function MultiPageFormRenderer({
  pages,
  onSubmit,
  isSubmitting,
  readOnly,
  defaultValues,
}: MultiPageFormRendererProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const schema = buildFullSchema(pages)

  const {
    register, handleSubmit, setValue, watch, control, trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  })

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

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-500">
          <span>Page {currentPage + 1} of {pages.length}</span>
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {renderPageElements(page.elements, register, errors, setValue, watch, control, readOnly)}

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
              <Button type="submit" disabled={isSubmitting}>
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
