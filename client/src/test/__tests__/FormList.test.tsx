import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import FormList from '@/components/dashboard/FormList'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('FormList', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'test-token', user: { id: '1', email: 'admin@test.com', name: 'Admin', role: 'ADMIN' } })
  })

  it('shows loading state', () => {
    renderWithProviders(<FormList />)
    expect(screen.getByText('Loading forms...')).toBeInTheDocument()
  })

  it('renders form cards after loading', async () => {
    renderWithProviders(<FormList />)
    expect(await screen.findByText('Contact Form')).toBeInTheDocument()
    expect(screen.getByText('Survey')).toBeInTheDocument()
  })

  it('displays form descriptions', async () => {
    renderWithProviders(<FormList />)
    expect(await screen.findByText('A simple contact form')).toBeInTheDocument()
    expect(screen.getByText('Employee satisfaction survey')).toBeInTheDocument()
  })

  it('shows element counts', async () => {
    renderWithProviders(<FormList />)
    await screen.findByText('Contact Form')
    expect(screen.getByText('3 elements')).toBeInTheDocument()
    expect(screen.getByText('5 elements')).toBeInTheDocument()
  })

  it('shows status badges', async () => {
    renderWithProviders(<FormList />)
    await screen.findByText('Contact Form')
    expect(screen.getByText('Published')).toBeInTheDocument()
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  describe('admin actions', () => {
    it('shows Edit button for admin', async () => {
      renderWithProviders(<FormList />)
      await screen.findByText('Contact Form')
      const editButtons = screen.getAllByText('Edit')
      expect(editButtons.length).toBeGreaterThan(0)
    })

    it('shows Import Form button for admin', async () => {
      renderWithProviders(<FormList />)
      await screen.findByText('Contact Form')
      expect(screen.getByText('Import Form')).toBeInTheDocument()
    })

    it('shows Submissions link for published forms', async () => {
      renderWithProviders(<FormList />)
      await screen.findByText('Contact Form')
      expect(screen.getByText('Submissions')).toBeInTheDocument()
    })
  })

  describe('user role', () => {
    beforeEach(() => {
      useAuthStore.setState({ token: 'test-token', user: { id: '2', email: 'user@test.com', name: 'User', role: 'USER' } })
    })

    it('hides Edit button for non-admin', async () => {
      renderWithProviders(<FormList />)
      await screen.findByText('Contact Form')
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    })

    it('hides Import Form button for non-admin', async () => {
      renderWithProviders(<FormList />)
      await screen.findByText('Contact Form')
      expect(screen.queryByText('Import Form')).not.toBeInTheDocument()
    })

    it('shows Fill Form for published forms', async () => {
      renderWithProviders(<FormList />)
      await screen.findByText('Contact Form')
      expect(screen.getByText('Fill Form')).toBeInTheDocument()
    })
  })
})
