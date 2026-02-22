/**
 * @behavior Content editor page renders the correct specialized editor based on content_type
 * @business_rule Each content type (article, social_post, landing_page, email) has a dedicated
 * editor optimized for that format, while sharing consistent action buttons and status chrome
 */
import { render, screen } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

vi.mock('$env/static/private', () => ({
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key'
}));

// Mock fetch for API calls
globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

import ContentDetailPage from './[id]/+page.svelte';

function makeContent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'content-1',
    title: 'Test Content',
    body: { html: '<p>Hello world</p>' },
    meta_description: 'Test meta',
    tags: ['test'],
    content_type: 'article',
    status: 'in_review',
    published_at: null,
    published_url: null,
    destination_type: null,
    destination_config: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides
  };
}

describe('Content-Type Router', () => {
  it('should render default article editor for content_type "article"', () => {
    render(ContentDetailPage, {
      props: { data: { content: makeContent({ content_type: 'article' }) } }
    });
    expect(screen.getByTestId('content-detail-page')).toBeTruthy();
    expect(screen.getByTestId('content-title')).toBeTruthy();
    expect(screen.getByTestId('content-body')).toBeTruthy();
    expect(screen.queryByTestId('social-editor-textarea')).toBeNull();
    expect(screen.queryByTestId('landing-slug')).toBeNull();
    expect(screen.queryByTestId('email-subject-input')).toBeNull();
  });

  it('should render SocialPostEditor for content_type "social_post"', () => {
    render(ContentDetailPage, {
      props: {
        data: {
          content: makeContent({
            content_type: 'social_post',
            body: { html: 'Check out our new product!' }
          })
        }
      }
    });
    expect(screen.getByTestId('content-detail-page')).toBeTruthy();
    expect(screen.getByTestId('social-editor-textarea')).toBeTruthy();
  });

  it('should render LandingPageEditor for content_type "landing_page"', () => {
    render(ContentDetailPage, {
      props: {
        data: {
          content: makeContent({
            content_type: 'landing_page',
            body: {
              html: '',
              sections: [
                { id: 's1', type: 'header', label: 'Header', content: 'Welcome to {topic}' },
                { id: 's2', type: 'body', label: 'Body', content: 'Content here' }
              ],
              slug: '/best-{topic}-tools'
            }
          })
        }
      }
    });
    expect(screen.getByTestId('content-detail-page')).toBeTruthy();
    expect(screen.getByTestId('landing-slug')).toBeTruthy();
  });

  it('should render EmailEditor for content_type "email"', () => {
    render(ContentDetailPage, {
      props: {
        data: {
          content: makeContent({
            content_type: 'email',
            body: { html: '<p>Newsletter content</p>' },
            meta_description: 'Weekly Newsletter Subject'
          })
        }
      }
    });
    expect(screen.getByTestId('content-detail-page')).toBeTruthy();
    expect(screen.getByTestId('email-subject-input')).toBeTruthy();
    expect(screen.getByTestId('email-body-editor')).toBeTruthy();
  });

  it('should keep status badge and action buttons consistent across content types', () => {
    const types = ['article', 'social_post', 'landing_page', 'email'];
    for (const contentType of types) {
      const { unmount } = render(ContentDetailPage, {
        props: {
          data: {
            content: makeContent({
              content_type: contentType,
              body: contentType === 'landing_page'
                ? {
                    html: '',
                    sections: [{ id: 's1', type: 'header', label: 'H', content: 'test' }],
                    slug: '/test'
                  }
                : { html: '<p>content</p>' }
            })
          }
        }
      });
      expect(screen.getByTestId('content-status')).toBeTruthy();
      expect(screen.getByTestId('edit-btn')).toBeTruthy();
      expect(screen.getByTestId('approve-btn')).toBeTruthy();
      expect(screen.getByTestId('reject-btn')).toBeTruthy();
      unmount();
    }
  });
});
