import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { VehicleGrid } from '../components/VehicleGrid'
import * as telemetryApi from '../api/telemetry'
import { mockVehicleList } from '../__mocks__/api'

vi.mock('../api/telemetry')

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('VehicleGrid', () => {
  beforeEach(() => {
    vi.mocked(telemetryApi.telemetryApi.getVehicles).mockResolvedValue(mockVehicleList)
  })

  it('renders vehicle grid', async () => {
    render(<VehicleGrid />, { wrapper })
    expect(screen.getByText(/Vehicles/)).toBeInTheDocument()
  })

  it('displays vehicles', async () => {
    render(<VehicleGrid />, { wrapper })
    expect(await screen.findByText('v-01')).toBeInTheDocument()
  })

  it('filters by status', async () => {
    render(<VehicleGrid />, { wrapper })
    const statusSelect = await screen.findByDisplayValue('All')
    expect(statusSelect).toBeInTheDocument()
  })

  it('filters by search term', async () => {
    render(<VehicleGrid />, { wrapper })
    const searchInput = screen.getByPlaceholderText('Search by ID...')
    expect(searchInput).toBeInTheDocument()
  })
})
