import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import HomePage from '@/pages/HomePage'
import FormBuilderPage from '@/pages/FormBuilderPage'
import FormPreviewPage from '@/pages/FormPreviewPage'
import PublicFormPage from '@/pages/PublicFormPage'
import SubmissionsPage from '@/pages/SubmissionsPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="forms/:formId/edit" element={<FormBuilderPage />} />
          <Route path="forms/:formId/preview" element={<FormPreviewPage />} />
          <Route path="forms/:formId/submissions" element={<SubmissionsPage />} />
        </Route>
        <Route path="/f/:formId" element={<PublicFormPage />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
