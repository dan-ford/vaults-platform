import { getTenantFromHost } from '@/server/tenant'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

// Mock the dependencies
jest.mock('next/headers')
jest.mock('@/lib/supabase/server')
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  cache: (fn: Function) => fn,
}))

describe('getTenantFromHost', () => {
  const mockHeaders = headers as jest.MockedFunction<typeof headers>
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return null when no tenant slug in headers', async () => {
    mockHeaders.mockResolvedValue({
      get: jest.fn().mockReturnValue(null),
    } as any)

    const result = await getTenantFromHost()
    expect(result).toBeNull()
  })

  it('should return tenant when valid slug is found', async () => {
    const mockTenant = {
      id: 'tenant-123',
      name: 'Test Tenant',
      slug: 'test-tenant',
      domain: null,
      branding: {},
      features: {},
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    }

    mockHeaders.mockResolvedValue({
      get: jest.fn().mockReturnValue('test-tenant'),
    } as any)

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockTenant,
              error: null,
            }),
          }),
        }),
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await getTenantFromHost()
    expect(result).toEqual(mockTenant)
    expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
  })

  it('should return null when tenant query fails', async () => {
    mockHeaders.mockResolvedValue({
      get: jest.fn().mockReturnValue('test-tenant'),
    } as any)

    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found'),
            }),
          }),
        }),
      }),
    }

    mockCreateClient.mockResolvedValue(mockSupabase as any)

    const result = await getTenantFromHost()
    expect(result).toBeNull()
  })
})