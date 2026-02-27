import { Form, FormElement, ElementOption } from '@/api/types'
import { Submission } from '@/api/types'
import { Badge } from '@/components/ui/badge'

interface SubmissionPrintViewProps {
  form: Form
  submission: Submission
}

export default function SubmissionPrintView({ form, submission }: SubmissionPrintViewProps) {
  const pages = [...form.pages].sort((a, b) => a.pageNumber - b.pageNumber)

  return (
    <div className="submission-print-view space-y-8">
      {/* Header */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold">{form.name}</h1>
        {form.description && (
          <p className="text-gray-600 mt-1">{form.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
          <span>Submitted {new Date(submission.submittedAt).toLocaleString()}</span>
          <Badge variant={submission.status === 'SUBMITTED' ? 'success' : 'outline'}>
            {submission.status || 'SUBMITTED'}
          </Badge>
        </div>
      </div>

      {/* Pages */}
      {pages.map((page, idx) => (
        <section key={page.id} className="print-page-section">
          {(pages.length > 1 || page.title) && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                {page.title || `Page ${idx + 1}`}
              </h2>
              {page.description && (
                <p className="text-sm text-gray-500 mt-1">{page.description}</p>
              )}
            </div>
          )}
          <div className="space-y-4">
            {renderElements(page.elements, submission.data, 0)}
          </div>
        </section>
      ))}
    </div>
  )
}

function renderElements(
  elements: FormElement[],
  data: Record<string, unknown>,
  depth: number
): React.ReactNode[] {
  const sorted = [...elements].sort((a, b) => a.sortOrder - b.sortOrder)
  return sorted.map((el) => renderElement(el, data, depth)).filter(Boolean)
}

function renderElement(
  element: FormElement,
  data: Record<string, unknown>,
  depth: number
): React.ReactNode {
  if (element.type === 'PAGE_BREAK') return null

  if (element.type === 'STATIC_TEXT') {
    return (
      <div
        key={element.id}
        className="print-field prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: element.configuration.content || '' }}
      />
    )
  }

  if (element.type === 'ELEMENT_GROUP') {
    return renderGroup(element, data, depth)
  }

  const value = data[element.fieldName]

  // Repeatable primitive
  if (element.configuration.repeatable && Array.isArray(value)) {
    return (
      <div key={element.id} className="print-field">
        <dt className="text-sm font-medium text-gray-500">{element.label}</dt>
        <dd className="mt-1">
          {value.length === 0 ? (
            <span className="text-gray-400">{'\u2014'}</span>
          ) : (
            <ul className="list-disc list-inside space-y-0.5">
              {value.map((v, i) => (
                <li key={i} className="text-sm">{formatSingleValue(element, v)}</li>
              ))}
            </ul>
          )}
        </dd>
      </div>
    )
  }

  return (
    <div key={element.id} className="print-field">
      <dt className="text-sm font-medium text-gray-500">{element.label}</dt>
      <dd className="mt-1 text-sm">{formatValue(element, value)}</dd>
    </div>
  )
}

function renderGroup(
  element: FormElement,
  data: Record<string, unknown>,
  depth: number
): React.ReactNode {
  const children = element.children || []
  const isRepeatable = element.configuration.repeatable
  const instanceLabel = element.configuration.instanceLabel || element.label

  if (isRepeatable) {
    const instances = data[element.fieldName]
    const arr = Array.isArray(instances) ? instances : []

    return (
      <fieldset key={element.id} className="print-field border rounded-md p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">{element.label}</legend>
        {arr.length === 0 ? (
          <p className="text-sm text-gray-400">{'\u2014'} No entries</p>
        ) : (
          arr.map((instance, idx) => (
            <div
              key={idx}
              className="print-group-instance border-l-2 border-gray-300 pl-4 space-y-3"
            >
              <h4 className="text-sm font-medium text-gray-700">
                {instanceLabel} {idx + 1}
              </h4>
              {renderElements(children, instance as Record<string, unknown>, depth + 1)}
            </div>
          ))
        )}
      </fieldset>
    )
  }

  // Non-repeatable group (including fullPage): children flatten into parent data
  return (
    <fieldset key={element.id} className="print-field border rounded-md p-4 space-y-3">
      <legend className="text-sm font-semibold px-2">{element.label}</legend>
      {renderElements(children, data, depth + 1)}
    </fieldset>
  )
}

function formatValue(element: FormElement, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">{'\u2014'}</span>
  }

  return formatSingleValue(element, value)
}

function formatSingleValue(element: FormElement, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-gray-400">{'\u2014'}</span>
  }

  const options = element.configuration.options || []

  switch (element.type) {
    case 'TEXT_INPUT':
    case 'NUMBER':
      return <span>{String(value)}</span>

    case 'TEXT_AREA':
      return <span className="whitespace-pre-wrap">{String(value)}</span>

    case 'EMAIL':
      return (
        <a href={`mailto:${value}`} className="text-blue-600 underline">
          {String(value)}
        </a>
      )

    case 'DATE':
      return <span>{new Date(String(value)).toLocaleDateString()}</span>

    case 'CHECKBOX':
      return <span>{value ? 'Yes' : 'No'}</span>

    case 'RADIO_GROUP':
    case 'SELECT':
      return <span>{resolveOptionLabel(String(value), options)}</span>

    case 'CHECKBOX_GROUP': {
      const selected = Array.isArray(value) ? value : [value]
      if (selected.length === 0) return <span className="text-gray-400">{'\u2014'}</span>
      return (
        <span>
          {selected.map((v) => resolveOptionLabel(String(v), options)).join(', ')}
        </span>
      )
    }

    default:
      return <span>{String(value)}</span>
  }
}

function resolveOptionLabel(value: string, options: ElementOption[]): string {
  // Handle "other:<text>" prefix
  if (value.startsWith('other:')) {
    const text = value.slice(6)
    return `Other: ${text}`
  }

  const match = options.find((o) => o.value === value)
  return match ? match.label : value
}
