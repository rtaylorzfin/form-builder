import { useParams } from 'react-router-dom'
import FormBuilder from '@/components/builder/FormBuilder'

export default function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>()

  if (!formId) {
    return <div className="container mx-auto px-4 py-8">Form not found</div>
  }

  return <FormBuilder formId={formId} />
}
