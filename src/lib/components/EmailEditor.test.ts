/**
 * @behavior EmailEditor provides a subject line input, rich body editor,
 * desktop/mobile preview toggle, and recipient count display for composing
 * email campaigns
 * @business_rule Email campaigns must be previewable at both desktop (600px)
 * and mobile (320px) widths before sending; editors must clearly show who
 * will receive the email
 */
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';

vi.mock('$env/static/public', () => ({
  PUBLIC_SUPABASE_URL: 'http://localhost:54321',
  PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

import EmailEditor from './EmailEditor.svelte';

describe('EmailEditor', () => {
  const defaultProps = {
    subject: 'Weekly Newsletter',
    body: '<p>Hello subscribers</p>',
    recipientCount: 142,
    onSubjectChange: vi.fn(),
    onBodyChange: vi.fn()
  };

  it('should render subject line editor with data-testid="email-subject-input"', () => {
    render(EmailEditor, { props: defaultProps });

    const input = screen.getByTestId('email-subject-input');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('Weekly Newsletter');
  });

  it('should render email body editor with data-testid="email-body-editor"', () => {
    render(EmailEditor, { props: defaultProps });

    const editor = screen.getByTestId('email-body-editor');
    expect(editor).toBeInTheDocument();
    expect((editor as HTMLTextAreaElement).value).toBe('<p>Hello subscribers</p>');
  });

  it('should toggle between desktop and mobile preview', () => {
    render(EmailEditor, { props: defaultProps });

    const desktopBtn = screen.getByTestId('preview-desktop-btn');
    const mobileBtn = screen.getByTestId('preview-mobile-btn');
    expect(desktopBtn).toBeInTheDocument();
    expect(mobileBtn).toBeInTheDocument();
  });

  it('should show desktop preview at 600px width with data-testid="email-preview"', () => {
    render(EmailEditor, { props: defaultProps });

    const preview = screen.getByTestId('email-preview');
    expect(preview).toBeInTheDocument();
    expect(preview.style.width).toBe('600px');
  });

  it('should show mobile preview at 320px width when mobile selected', async () => {
    render(EmailEditor, { props: defaultProps });

    const mobileBtn = screen.getByTestId('preview-mobile-btn');
    await fireEvent.click(mobileBtn);

    const preview = screen.getByTestId('email-preview');
    expect(preview.style.width).toBe('320px');
  });

  it('should show recipient count with data-testid="recipient-count"', () => {
    render(EmailEditor, { props: defaultProps });

    const count = screen.getByTestId('recipient-count');
    expect(count).toBeInTheDocument();
    expect(count.textContent).toContain('142');
    expect(count.textContent).toContain('subscribers');
  });

  it('should call onSubjectChange when subject is edited', async () => {
    const onSubjectChange = vi.fn();
    render(EmailEditor, {
      props: { ...defaultProps, onSubjectChange }
    });

    const input = screen.getByTestId('email-subject-input');
    await fireEvent.input(input, { target: { value: 'New Subject' } });

    expect(onSubjectChange).toHaveBeenCalledWith('New Subject');
  });

  it('should call onBodyChange when body is edited', async () => {
    const onBodyChange = vi.fn();
    render(EmailEditor, {
      props: { ...defaultProps, onBodyChange }
    });

    const editor = screen.getByTestId('email-body-editor');
    await fireEvent.input(editor, { target: { value: '<p>Updated body</p>' } });

    expect(onBodyChange).toHaveBeenCalledWith('<p>Updated body</p>');
  });
});
