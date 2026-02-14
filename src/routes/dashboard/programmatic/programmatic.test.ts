/**
 * @behavior Template management UI renders template list, validates template creation,
 * handles CSV data source upload, previews templates with sample data, and saves
 * templates via API
 * @business_rule Programmatic SEO requires templates with variable slug patterns and
 * data sources to generate unique pages at scale; templates must be validated before
 * saving to ensure correct variable substitution
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables
vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

vi.mock('$lib/server/supabase', () => ({
  createServerSupabaseClient: vi.fn(),
  createServiceRoleClient: vi.fn()
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockTemplates = [
  {
    id: 'tmpl-1',
    project_id: 'proj-1',
    name: 'City Landing Pages',
    slug_pattern: '/best-{service}-in-{city}',
    body_template: '<h1>Best {service} in {city}</h1><p>{description}</p>',
    variables: ['service', 'city', 'description'],
    data_source: {
      columns: ['service', 'city', 'description'],
      row_count: 150
    },
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'tmpl-2',
    project_id: 'proj-1',
    name: 'Product Comparison Pages',
    slug_pattern: '/{product}-vs-{competitor}',
    body_template: '<h1>{product} vs {competitor}</h1><p>{comparison_text}</p>',
    variables: ['product', 'competitor', 'comparison_text'],
    data_source: {
      columns: ['product', 'competitor', 'comparison_text'],
      row_count: 45
    },
    created_at: '2026-01-20T14:00:00Z',
    updated_at: '2026-01-20T14:00:00Z'
  }
];

describe('Template List Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all project templates with name and slug pattern', async () => {
    const TemplatePage = (await import('./+page.svelte')).default;

    render(TemplatePage, {
      props: {
        data: { templates: mockTemplates }
      }
    });

    const templateItems = screen.getAllByTestId('template-item');
    expect(templateItems).toHaveLength(2);

    expect(screen.getByText('City Landing Pages')).toBeInTheDocument();
    expect(screen.getByText('Product Comparison Pages')).toBeInTheDocument();

    expect(screen.getByText('/best-{service}-in-{city}')).toBeInTheDocument();
    expect(screen.getByText('/{product}-vs-{competitor}')).toBeInTheDocument();
  });
});

describe('Create Template Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates slug pattern contains at least one variable in curly braces', async () => {
    const CreateTemplatePage = (await import('./[id]/+page.svelte')).default;

    render(CreateTemplatePage, {
      props: {
        data: { template: null, mode: 'create' }
      }
    });

    // Fill in template name
    const nameInput = screen.getByLabelText(/template name/i);
    await fireEvent.input(nameInput, { target: { value: 'My Template' } });

    // Fill in slug pattern WITHOUT variables
    const slugInput = screen.getByLabelText(/slug pattern/i);
    await fireEvent.input(slugInput, { target: { value: '/static-page' } });

    // Try to save
    const saveButton = screen.getByRole('button', { name: /save template/i });
    await fireEvent.click(saveButton);

    // Should show validation error
    expect(screen.getByText(/slug pattern must contain at least one variable/i)).toBeInTheDocument();
  });
});

describe('Data Source Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts CSV upload and extracts column headers as variables', async () => {
    const CreateTemplatePage = (await import('./[id]/+page.svelte')).default;

    render(CreateTemplatePage, {
      props: {
        data: { template: null, mode: 'create' }
      }
    });

    // Create a mock CSV file
    const csvContent = 'city,service,description\nNew York,plumbing,Best plumbing services\nLos Angeles,roofing,Top roofing pros';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });

    const fileInput = screen.getByTestId('csv-upload');
    await fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file processing
    await vi.waitFor(() => {
      const variableTags = screen.getAllByTestId('variable-tag');
      expect(variableTags).toHaveLength(3);
    });

    expect(screen.getByText('city')).toBeInTheDocument();
    expect(screen.getByText('service')).toBeInTheDocument();
    expect(screen.getByText('description')).toBeInTheDocument();
  });
});

describe('Template Preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders template with sample data row substituted', async () => {
    const CreateTemplatePage = (await import('./[id]/+page.svelte')).default;

    render(CreateTemplatePage, {
      props: {
        data: {
          template: {
            id: 'tmpl-1',
            name: 'City Landing Pages',
            slug_pattern: '/best-{service}-in-{city}',
            body_template: '<h1>Best {service} in {city}</h1><p>{description}</p>',
            variables: ['service', 'city', 'description'],
            data_source: {
              columns: ['service', 'city', 'description'],
              rows: [
                { service: 'plumbing', city: 'New York', description: 'Best plumbing services' },
                { service: 'roofing', city: 'Los Angeles', description: 'Top roofing pros' }
              ],
              row_count: 2
            }
          },
          mode: 'edit'
        }
      }
    });

    // Click preview button
    const previewButton = screen.getByRole('button', { name: /preview/i });
    await fireEvent.click(previewButton);

    const previewArea = screen.getByTestId('template-preview');
    expect(previewArea).toBeInTheDocument();

    // Preview should show the first row's data substituted
    expect(previewArea.textContent).toContain('Best plumbing in New York');
    expect(previewArea.textContent).toContain('Best plumbing services');
  });
});

describe('Save Template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { id: 'tmpl-new' } })
    });
  });

  it('calls POST /api/v1/templates with complete config on save', async () => {
    const CreateTemplatePage = (await import('./[id]/+page.svelte')).default;

    render(CreateTemplatePage, {
      props: {
        data: { template: null, mode: 'create' }
      }
    });

    // Fill in template name
    const nameInput = screen.getByLabelText(/template name/i);
    await fireEvent.input(nameInput, { target: { value: 'City Pages' } });

    // Fill in slug pattern with variable
    const slugInput = screen.getByLabelText(/slug pattern/i);
    await fireEvent.input(slugInput, { target: { value: '/best-{service}-in-{city}' } });

    // Fill in body template
    const bodyInput = screen.getByLabelText(/body template/i);
    await fireEvent.input(bodyInput, {
      target: { value: '<h1>Best {service} in {city}</h1>' }
    });

    // Upload CSV to set variables
    const csvContent = 'service,city\nplumbing,New York';
    const file = new File([csvContent], 'data.csv', { type: 'text/csv' });
    const fileInput = screen.getByTestId('csv-upload');
    await fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for CSV processing
    await vi.waitFor(() => {
      expect(screen.getAllByTestId('variable-tag')).toHaveLength(2);
    });

    // Click save
    const saveButton = screen.getByRole('button', { name: /save template/i });
    await fireEvent.click(saveButton);

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/templates',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'City Pages',
          slug_pattern: '/best-{service}-in-{city}',
          body_template: '<h1>Best {service} in {city}</h1>',
          variables: ['service', 'city'],
          data_source: {
            columns: ['service', 'city'],
            rows: [{ service: 'plumbing', city: 'New York' }],
            row_count: 1
          }
        })
      })
    );
  });
});
