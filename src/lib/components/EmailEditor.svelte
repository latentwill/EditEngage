<script lang="ts">
  interface Props {
    subject: string;
    body: string;
    recipientCount?: number;
    onSubjectChange: (subject: string) => void;
    onBodyChange: (body: string) => void;
  }

  let {
    subject,
    body,
    recipientCount = 0,
    onSubjectChange,
    onBodyChange
  }: Props = $props();

  let previewMode: 'desktop' | 'mobile' = $state('desktop');

  let previewWidth = $derived(previewMode === 'desktop' ? '600px' : '320px');

  function sanitizeHtml(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<iframe[^>]*>/gi, '')
      .replace(/<\/iframe>/gi, '')
      .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '');
  }

  function handleSubjectInput(e: Event) {
    const target = e.target as HTMLInputElement;
    onSubjectChange(target.value);
  }

  function handleBodyInput(e: Event) {
    const target = e.target as HTMLTextAreaElement;
    onBodyChange(target.value);
  }
</script>

<div class="flex flex-col gap-4">
  <input
    data-testid="email-subject-input"
    type="text"
    class="input input-bordered w-full"
    value={subject}
    oninput={handleSubjectInput}
    placeholder="Email subject line"
  />

  <textarea
    data-testid="email-body-editor"
    class="textarea textarea-bordered w-full min-h-[200px]"
    value={body}
    oninput={handleBodyInput}
    placeholder="Email body"
  ></textarea>

  <div class="flex gap-2">
    <button
      data-testid="preview-desktop-btn"
      class="btn btn-sm"
      class:btn-active={previewMode === 'desktop'}
      onclick={() => previewMode = 'desktop'}
    >
      Desktop
    </button>
    <button
      data-testid="preview-mobile-btn"
      class="btn btn-sm"
      class:btn-active={previewMode === 'mobile'}
      onclick={() => previewMode = 'mobile'}
    >
      Mobile
    </button>
  </div>

  <div
    data-testid="email-preview"
    class="border border-base-300 rounded-lg p-4 mx-auto overflow-auto"
    style="width: {previewWidth}"
  >
    {@html sanitizeHtml(body)}
  </div>

  <div data-testid="recipient-count" class="text-sm text-base-content/70">
    Sending to {recipientCount} subscribers
  </div>
</div>
