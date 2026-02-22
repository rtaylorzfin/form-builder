import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
}

function buildValidationSchema(elements: FormElement[]) {
  const shape: Record<string, z.ZodTypeAny> = {}

  for (const element of elements) {
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
        fieldSchema = z.string().optional()
        if (element.configuration?.required) {
          fieldSchema = z
            .string({ required_error: `${element.label} is required` })
            .min(1, `${element.label} is required`)
            .email('Please enter a valid email address')
        } else {
          fieldSchema = z.string().email('Please enter a valid email address').optional().or(z.literal(''))
        }
        break

      default:
        fieldSchema = z.string().optional()
        if (element.configuration?.required) {
          fieldSchema = z
            .string({ required_error: `${element.label} is required` })
            .min(1, `${element.label} is required`)
        }
    }

    shape[element.fieldName] = fieldSchema
  }

  return z.object(shape)
}

function renderElement(
  element: FormElement,
  register: ReturnType<typeof useForm>['register'],
  errors: Record<string, { message?: string }>,
  setValue: ReturnType<typeof useForm>['setValue'],
  watch: ReturnType<typeof useForm>['watch'],
  readOnly?: boolean
) {
  const error = errors[element.fieldName]
  const config = element.configuration || {}

  const commonProps = {
    ...register(element.fieldName),
    disabled: readOnly,
  }

  switch (element.type) {
    case 'TEXT_INPUT':
      return (
        <Input
          {...commonProps}
          type="text"
          placeholder={config.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )

    case 'TEXT_AREA':
      return (
        <Textarea
          {...commonProps}
          placeholder={config.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )

    case 'NUMBER':
      return (
        <Input
          {...commonProps}
          type="number"
          placeholder={config.placeholder}
          className={cn(error && 'border-red-500')}
        />
      )

    case 'EMAIL':
      return (
        <Input
          {...commonProps}
          type="email"
          placeholder={config.placeholder || 'email@example.com'}
          className={cn(error && 'border-red-500')}
        />
      )

    case 'DATE':
      return (
        <Input
          {...commonProps}
          type="date"
          className={cn(error && 'border-red-500')}
        />
      )

    case 'CHECKBOX':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={element.fieldName}
            checked={watch(element.fieldName) || false}
            onCheckedChange={(checked) => setValue(element.fieldName, checked)}
            disabled={readOnly}
          />
          <Label htmlFor={element.fieldName} className="cursor-pointer">
            {element.label}
          </Label>
        </div>
      )

    case 'RADIO_GROUP':
      return (
        <RadioGroup
          value={watch(element.fieldName) || ''}
          onValueChange={(value) => setValue(element.fieldName, value)}
          disabled={readOnly}
        >
          {config.options?.map((option) => (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={`${element.fieldName}-${option.value}`} />
              <Label htmlFor={`${element.fieldName}-${option.value}`} className="cursor-pointer">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )

    case 'SELECT':
      return (
        <Select
          value={watch(element.fieldName) || ''}
          onValueChange={(value) => setValue(element.fieldName, value)}
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

    default:
      return null
  }
}

export default function FormRenderer({
  form,
  onSubmit,
  isSubmitting,
  readOnly,
}: FormRendererProps) {
  const schema = buildValidationSchema(form.elements)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {form.elements.map((element) => (
        <div key={element.id} className="space-y-2">
          {element.type !== 'CHECKBOX' && (
            <Label>
              {element.label}
              {element.configuration?.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </Label>
          )}
          {renderElement(element, register, errors as Record<string, { message?: string }>, setValue, watch, readOnly)}
          {errors[element.fieldName] && (
            <p className="text-sm text-red-500">
              {(errors[element.fieldName] as { message?: string })?.message}
            </p>
          )}
        </div>
      ))}

      {!readOnly && (
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      )}
    </form>
  )
}
