import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { formsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import SubmissionList from '@/components/dashboard/SubmissionList'

export default function SubmissionsPage() {
  const { formId } = useParams<{ formId: string }>()

  const { data: form, isLoading } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsApi.get(formId!),
    enabled: !!formId,
  })

  if (!formId) {
    return <div className="container mx-auto px-4 py-8">Form not found</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forms
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          {isLoading ? 'Loading...' : form?.name} - Submissions
        </h1>
        {form?.description && (
          <p className="text-gray-500 mt-1">{form.description}</p>
        )}
      </div>

      <SubmissionList formId={formId} />
    </div>
  )
}
