import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ContentEditor from './ContentEditor.svelte';

const mockContent = {
  id: 'c1',
  title: 'Test Article',
  body: { html: '<p>Article body</p>' },
  meta_description: 'A test article',
  tags: ['seo', 'test'],
  content_type: 'article' as const,
  status: 'draft' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('ContentEditor', () => {
  it('renders title input with content title', () => {
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    const input = screen.getByTestId('editor-title-input') as HTMLInputElement;
    expect(input.value).toBe('Test Article');
  });

  it('renders body editor', () => {
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    expect(screen.getByTestId('editor-body')).toBeTruthy();
  });

  it('renders action buttons', () => {
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    expect(screen.getByTestId('editor-save-btn')).toBeTruthy();
    expect(screen.getByTestId('editor-approve-btn')).toBeTruthy();
    expect(screen.getByTestId('editor-reject-btn')).toBeTruthy();
  });

  it('renders close button', () => {
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    expect(screen.getByTestId('editor-close-btn')).toBeTruthy();
  });

  it('renders tags', () => {
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    expect(screen.getByText('seo')).toBeTruthy();
    expect(screen.getByText('test')).toBeTruthy();
  });

  it('calls onApprove when approve button clicked', async () => {
    const onApprove = vi.fn();
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove,
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await fireEvent.click(screen.getByTestId('editor-approve-btn'));
    expect(onApprove).toHaveBeenCalledWith('c1');
  });

  it('calls onSave when save button clicked', async () => {
    const onSave = vi.fn();
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave,
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    await fireEvent.click(screen.getByTestId('editor-save-btn'));
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose,
      },
    });
    await fireEvent.click(screen.getByTestId('editor-close-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows word count and reading time', () => {
    render(ContentEditor, {
      props: {
        content: mockContent,
        onSave: vi.fn(),
        onApprove: vi.fn(),
        onReject: vi.fn(),
        onClose: vi.fn(),
      },
    });
    expect(screen.getByTestId('editor-word-count')).toBeTruthy();
    expect(screen.getByTestId('editor-reading-time')).toBeTruthy();
  });
});
