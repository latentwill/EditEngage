/**
 * @behavior SocialPostEditor provides a character-limited textarea with platform-specific
 * preview cards (LinkedIn, Twitter/X, Instagram), media thumbnails, and live character count
 * @business_rule Each social platform enforces different character limits (Twitter: 280,
 * LinkedIn: 3000, Instagram: 2200); users must see remaining characters and a visual
 * preview of how their post will appear on the target platform
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

describe('SocialPostEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render character-limited textarea with data-testid="social-editor-textarea"', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: 'Hello world',
        platform: 'twitter',
        onContentChange: vi.fn()
      }
    });

    const textarea = screen.getByTestId('social-editor-textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });

  it('should show LinkedIn preview when platform is "linkedin" with data-testid="linkedin-preview"', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: 'Check out my latest article',
        platform: 'linkedin',
        onContentChange: vi.fn()
      }
    });

    expect(screen.getByTestId('linkedin-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('twitter-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('instagram-preview')).not.toBeInTheDocument();
  });

  it('should show Twitter/X preview with 280 char limit and data-testid="twitter-preview"', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: 'A tweet',
        platform: 'twitter',
        onContentChange: vi.fn()
      }
    });

    expect(screen.getByTestId('twitter-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('linkedin-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('instagram-preview')).not.toBeInTheDocument();
  });

  it('should show Instagram caption preview with data-testid="instagram-preview"', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: 'Caption this!',
        platform: 'instagram',
        onContentChange: vi.fn()
      }
    });

    expect(screen.getByTestId('instagram-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('linkedin-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('twitter-preview')).not.toBeInTheDocument();
  });

  it('should show media attachment thumbnails when media prop provided with data-testid="media-preview"', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: 'Post with media',
        platform: 'twitter',
        media: [
          { url: 'https://example.com/img1.jpg', type: 'image' as const },
          { url: 'https://example.com/vid1.mp4', type: 'video' as const }
        ],
        onContentChange: vi.fn()
      }
    });

    expect(screen.getByTestId('media-preview')).toBeInTheDocument();
  });

  it('should enforce platform character limits (280 for twitter, 3000 for linkedin, 2200 for instagram)', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    const { unmount: u1 } = render(SocialPostEditor, {
      props: {
        content: '',
        platform: 'twitter',
        onContentChange: vi.fn()
      }
    });
    const twitterTextarea = screen.getByTestId('social-editor-textarea') as HTMLTextAreaElement;
    expect(twitterTextarea.maxLength).toBe(280);
    u1();

    const { unmount: u2 } = render(SocialPostEditor, {
      props: {
        content: '',
        platform: 'linkedin',
        onContentChange: vi.fn()
      }
    });
    const linkedinTextarea = screen.getByTestId('social-editor-textarea') as HTMLTextAreaElement;
    expect(linkedinTextarea.maxLength).toBe(3000);
    u2();

    render(SocialPostEditor, {
      props: {
        content: '',
        platform: 'instagram',
        onContentChange: vi.fn()
      }
    });
    const instagramTextarea = screen.getByTestId('social-editor-textarea') as HTMLTextAreaElement;
    expect(instagramTextarea.maxLength).toBe(2200);
  });

  it('should show remaining character count with data-testid="char-count"', async () => {
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: 'Hello', // 5 chars
        platform: 'twitter', // 280 limit
        onContentChange: vi.fn()
      }
    });

    const charCount = screen.getByTestId('char-count');
    expect(charCount).toBeInTheDocument();
    expect(charCount.textContent).toContain('275');
  });

  it('should call onContentChange when textarea content changes', async () => {
    const onContentChangeFn = vi.fn();
    const SocialPostEditor = (await import('./SocialPostEditor.svelte')).default;

    render(SocialPostEditor, {
      props: {
        content: '',
        platform: 'twitter',
        onContentChange: onContentChangeFn
      }
    });

    const textarea = screen.getByTestId('social-editor-textarea');
    await fireEvent.input(textarea, { target: { value: 'New content' } });

    expect(onContentChangeFn).toHaveBeenCalledWith('New content');
  });
});
