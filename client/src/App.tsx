import { Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import ProtectedRoute from '@/components/ProtectedRoute'
import HomePage from '@/pages/HomePage'
import FormBuilderPage from '@/pages/FormBuilderPage'
import FormPreviewPage from '@/pages/FormPreviewPage'
import PublicFormPage from '@/pages/PublicFormPage'
import SubmissionsPage from '@/pages/SubmissionsPage'
import SubmissionEditPage from '@/pages/SubmissionEditPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<HomePage />} />
          <Route path="forms/:formId/edit" element={<FormBuilderPage />} />
          <Route path="forms/:formId/preview" element={<FormPreviewPage />} />
          <Route path="forms/:formId/submissions" element={<SubmissionsPage />} />
          <Route path="forms/:formId/submissions/:submissionId/edit" element={<SubmissionEditPage />} />
        </Route>
        <Route path="/f/:formId" element={<PublicFormPage />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
