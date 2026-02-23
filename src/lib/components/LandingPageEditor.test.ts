/**
 * @behavior LandingPageEditor renders a tabbed editor for landing page sections,
 * showing editable textareas per section in Edit mode and assembled HTML in Preview mode.
 * Template variables like {topic} are visually highlighted with copper text.
 * @business_rule Landing pages are built from template sections with variable placeholders;
 * editors must see the resolved slug, edit individual sections, and preview the assembled result.
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

import LandingPageEditor from './LandingPageEditor.svelte';

function createSections() {
  return [
    {
      id: 'sec-1',
      type: 'header' as const,
      label: 'Header Section',
      content: 'Welcome to {topic} tools',
      variables: { topic: 'SEO' }
    },
    {
      id: 'sec-2',
      type: 'body' as const,
      label: 'Body Section',
      content: 'Learn about the best practices',
    },
    {
      id: 'sec-3',
      type: 'cta' as const,
      label: 'Call to Action',
      content: 'Get started with {topic} today',
      variables: { topic: 'SEO' }
    }
  ];
}

describe('LandingPageEditor', () => {
  it('should render sections from template structure with data-testid="section-{type}"', () => {
    render(LandingPageEditor, {
      props: {
        sections: createSections(),
        slug: '/best-{topic}-tools',
        onSectionChange: vi.fn()
      }
    });

    expect(screen.getByTestId('section-header')).toBeInTheDocument();
    expect(screen.getByTestId('section-body')).toBeInTheDocument();
    expect(screen.getByTestId('section-cta')).toBeInTheDocument();
  });

  it('should show resolved slug at top with data-testid="landing-slug"', () => {
    render(LandingPageEditor, {
      props: {
        sections: createSections(),
        slug: '/best-{topic}-tools',
        onSectionChange: vi.fn()
      }
    });

    const slugEl = screen.getByTestId('landing-slug');
    expect(slugEl).toBeInTheDocument();
    expect(slugEl.textContent).toContain('/best-{topic}-tools');
  });

  it('should highlight template variables with a visual indicator with data-testid="template-var"', () => {
    render(LandingPageEditor, {
      props: {
        sections: createSections(),
        slug: '/best-{topic}-tools',
        onSectionChange: vi.fn()
      }
    });

    const templateVars = screen.getAllByTestId('template-var');
    expect(templateVars.length).toBeGreaterThan(0);
    expect(templateVars[0].textContent).toBe('{topic}');
    expect(templateVars[0].classList.contains('text-primary')).toBe(true);
  });

  it('should render preview tab with full page render with data-testid="preview-tab" and data-testid="landing-preview"', async () => {
    render(LandingPageEditor, {
      props: {
        sections: createSections(),
        slug: '/best-{topic}-tools',
        onSectionChange: vi.fn()
      }
    });

    const previewTab = screen.getByTestId('preview-tab');
    expect(previewTab).toBeInTheDocument();

    await fireEvent.click(previewTab);

    const preview = screen.getByTestId('landing-preview');
    expect(preview).toBeInTheDocument();
    expect(preview.textContent).toContain('Welcome to {topic} tools');
    expect(preview.textContent).toContain('Learn about the best practices');
    expect(preview.textContent).toContain('Get started with {topic} today');
  });

  it('should render edit tab by default with data-testid="edit-tab"', () => {
    render(LandingPageEditor, {
      props: {
        sections: createSections(),
        slug: '/best-{topic}-tools',
        onSectionChange: vi.fn()
      }
    });

    const editTab = screen.getByTestId('edit-tab');
    expect(editTab).toBeInTheDocument();
    // Edit tab should be active by default
    expect(editTab.classList.contains('tab-active')).toBe(true);
    // Sections should be visible (edit mode is default)
    expect(screen.getByTestId('section-header')).toBeInTheDocument();
  });

  it('should call onSectionChange when section content is edited', async () => {
    const changeSpy = vi.fn();
    render(LandingPageEditor, {
      props: {
        sections: createSections(),
        slug: '/best-{topic}-tools',
        onSectionChange: changeSpy
      }
    });

    const textareas = screen.getAllByRole('textbox');
    await fireEvent.input(textareas[0], { target: { value: 'Updated header content' } });

    expect(changeSpy).toHaveBeenCalledWith('sec-1', 'Updated header content');
  });
});
