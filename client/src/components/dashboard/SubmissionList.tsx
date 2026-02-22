import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Download, Pencil } from 'lucide-react'
import { submissionsApi, formsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface SubmissionListProps {
  formId: string
}

export default function SubmissionList({ formId }: SubmissionListProps) {
  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: () => formsApi.get(formId),
  })

  const { data: submissionsData, isLoading } = useQuery({
    queryKey: ['submissions', formId],
    queryFn: () => submissionsApi.list(formId, 0, 50),
  })

  const handleExport = async () => {
    const csv = await submissionsApi.export(formId)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form?.name || 'form'}-submissions.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading submissions...</div>
  }

  const submissions = submissionsData?.submissions || []
  const elements = form?.elements || []

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No submissions yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {submissionsData?.totalElements} total submission
          {submissionsData?.totalElements !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-b">
                Status
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-b">
                Submitted At
              </th>
              {elements.map((element) => (
                <th
                  key={element.id}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-b"
                >
                  {element.label}
                </th>
              ))}
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 border-b">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((submission) => (
              <tr key={submission.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm border-b">
                  <Badge variant={submission.status === 'SUBMITTED' ? 'success' : 'outline'}>
                    {submission.status || 'SUBMITTED'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm border-b">
                  {new Date(submission.submittedAt).toLocaleString()}
                </td>
                {elements.map((element) => (
                  <td key={element.id} className="px-4 py-3 text-sm border-b">
                    {formatValue(submission.data[element.fieldName])}
                  </td>
                ))}
                <td className="px-4 py-3 text-sm border-b">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/forms/${formId}/submissions/${submission.id}/edit`}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-'
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }
  if (Array.isArray(value)) {
    return `${value.length} item${value.length !== 1 ? 's' : ''}`
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
