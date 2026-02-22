import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Eye, Trash2, BarChart2, ExternalLink } from 'lucide-react'
import { formsApi } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export default function FormList() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data: forms, isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: formsApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: formsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      toast({ title: 'Form deleted successfully' })
    },
    onError: () => {
      toast({ title: 'Failed to delete form', variant: 'destructive' })
    },
  })

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge variant="success">Published</Badge>
      case 'ARCHIVED':
        return <Badge variant="secondary">Archived</Badge>
      default:
        return <Badge variant="outline">Draft</Badge>
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading forms...</div>
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No forms yet. Create your first form to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {forms.map((form) => (
        <Card key={form.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{form.name}</CardTitle>
              {getStatusBadge(form.status)}
            </div>
            <CardDescription className="line-clamp-2">
              {form.description || 'No description'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-500 mb-4">
              {form.elementCount} element{form.elementCount !== 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/forms/${form.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/forms/${form.id}/preview`}>
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Link>
              </Button>
              {form.status === 'PUBLISHED' && (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/forms/${form.id}/submissions`}>
                      <BarChart2 className="h-4 w-4 mr-1" />
                      Submissions
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`/f/${form.id}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={() => handleDelete(form.id, form.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
