import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { formsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormRenderer from '@/components/preview/FormRenderer'

export default function FormPreviewPage() {
  const { formId } = useParams<{ formId: string }>()

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsApi.get(formId!),
    enabled: !!formId,
  })

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center">
        Loading preview...
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-red-500">Failed to load form</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to={`/forms/${formId}/edit`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{form.name}</CardTitle>
          {form.description && (
            <p className="text-gray-500">{form.description}</p>
          )}
        </CardHeader>
        <CardContent>
          {form.elements.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              This form has no elements yet. Add some elements in the editor.
            </p>
          ) : (
            <FormRenderer
              form={form}
              onSubmit={(data) => console.log('Preview submit:', data)}
              readOnly={false}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-center text-sm text-gray-400 mt-4">
        This is a preview. Submissions will not be saved.
      </p>
    </div>
  )
}
