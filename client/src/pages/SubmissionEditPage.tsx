import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { formsApi, submissionsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import FormRenderer from '@/components/preview/FormRenderer'

export default function SubmissionEditPage() {
  const { formId, submissionId } = useParams<{ formId: string; submissionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsApi.get(formId!),
    enabled: !!formId,
  })

  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ['submission', formId, submissionId],
    queryFn: () => submissionsApi.get(formId!, submissionId!),
    enabled: !!formId && !!submissionId,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      submissionsApi.update(formId!, submissionId!, { data, status: 'SUBMITTED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', formId] })
      toast({ title: 'Submission updated successfully' })
      navigate(`/forms/${formId}/submissions`)
    },
    onError: () => {
      toast({ title: 'Failed to update submission', variant: 'destructive' })
    },
  })

  if (formLoading || submissionLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    )
  }

  if (!form || !submission) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">Submission not found.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to={`/forms/${formId}/submissions`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Submission</CardTitle>
          <p className="text-gray-500 text-sm">
            {form.name} — Submitted {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <FormRenderer
            form={form}
            onSubmit={(data) => updateMutation.mutate(data)}
            isSubmitting={updateMutation.isPending}
            defaultValues={submission.data as Record<string, unknown>}
            submitLabel="Update Submission"
          />
        </CardContent>
      </Card>
    </div>
  )
}
