import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Printer } from 'lucide-react'
import { formsApi, submissionsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SubmissionPrintView from '@/components/preview/SubmissionPrintView'

export default function SubmissionViewPage() {
  const { formId, submissionId } = useParams<{ formId: string; submissionId: string }>()

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Button variant="ghost" asChild>
          <Link to={`/forms/${formId}/submissions`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Submissions
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/forms/${formId}/submissions/${submissionId}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <Card className="print-card">
        <CardContent className="pt-6">
          <SubmissionPrintView form={form} submission={submission} />
        </CardContent>
      </Card>
    </div>
  )
}
