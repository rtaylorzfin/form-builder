import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle } from 'lucide-react'
import { publicApi } from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FormRenderer from '@/components/preview/FormRenderer'
import MultiPageFormRenderer from '@/components/preview/MultiPageFormRenderer'

export default function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>()
  const [isSubmitted, setIsSubmitted] = useState(false)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: form, isLoading, error } = useQuery({
    queryKey: ['publicForm', formId],
    queryFn: () => publicApi.getForm(formId!),
    enabled: !!formId,
  })

  const { data: draft, isLoading: isDraftLoading } = useQuery({
    queryKey: ['publicFormDraft', formId],
    queryFn: () => publicApi.getDraft(formId!),
    enabled: !!formId && isAuthenticated(),
  })

  const submitMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      publicApi.submit(formId!, { data }),
    onSuccess: () => {
      setIsSubmitted(true)
    },
  })

  const saveDraftMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      publicApi.saveDraft(formId!, data),
  })

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const handleValuesChange = useCallback(
    (data: Record<string, unknown>) => {
      if (!isAuthenticated()) return

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }

      debounceTimer.current = setTimeout(() => {
        setDraftStatus('saving')
        saveDraftMutation.mutate(data, {
          onSuccess: () => setDraftStatus('saved'),
          onError: () => setDraftStatus('idle'),
        })
      }, 3000)
    },
    [isAuthenticated, saveDraftMutation, formId],
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

  if (isLoading || (isAuthenticated() && isDraftLoading)) {
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

  const hasMultiplePages = form.pages.length > 1
  const defaultValues = draft?.data as Record<string, unknown> | undefined

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{form.name}</CardTitle>
              {isAuthenticated() && draftStatus !== 'idle' && (
                <span className="text-sm text-gray-400">
                  {draftStatus === 'saving' ? 'Saving...' : 'Draft saved'}
                </span>
              )}
            </div>
            {form.description && (
              <p className="text-gray-500">{form.description}</p>
            )}
          </CardHeader>
          <CardContent>
            {hasMultiplePages ? (
              <MultiPageFormRenderer
                pages={form.pages}
                onSubmit={(data) => submitMutation.mutate(data)}
                isSubmitting={submitMutation.isPending}
                defaultValues={defaultValues}
                onValuesChange={isAuthenticated() ? handleValuesChange : undefined}
              />
            ) : (
              <FormRenderer
                form={form}
                onSubmit={(data) => submitMutation.mutate(data)}
                isSubmitting={submitMutation.isPending}
                defaultValues={defaultValues}
                onValuesChange={isAuthenticated() ? handleValuesChange : undefined}
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
