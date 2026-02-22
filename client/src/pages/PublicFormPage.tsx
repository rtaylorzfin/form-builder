import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle } from 'lucide-react'
import { publicApi } from '@/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormRenderer from '@/components/preview/FormRenderer'
import MultiPageFormRenderer from '@/components/preview/MultiPageFormRenderer'

export default function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>()
  const [isSubmitted, setIsSubmitted] = useState(false)

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['publicForm', formId],
    queryFn: () => publicApi.getForm(formId!),
    enabled: !!formId,
  })

  const submitMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      publicApi.submit(formId!, { data }),
    onSuccess: () => {
      setIsSubmitted(true)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading form...</p>
      </div>
    )
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <p className="text-red-500">
              This form is not available. It may not be published yet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Thank you!</h2>
            <p className="text-gray-500">Your response has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasMultiplePages = form.pages && form.pages.length > 1

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{form.name}</CardTitle>
            {form.description && (
              <p className="text-gray-500">{form.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {hasMultiplePages ? (
              <MultiPageFormRenderer
                pages={form.pages!}
                onSubmit={(data) => submitMutation.mutate(data)}
                isSubmitting={submitMutation.isPending}
              />
            ) : (
              <FormRenderer
                form={form}
                onSubmit={(data) => submitMutation.mutate(data)}
                isSubmitting={submitMutation.isPending}
              />
            )}
            {submitMutation.isError && (
              <p className="text-red-500 text-center mt-4">
                Failed to submit form. Please try again.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
