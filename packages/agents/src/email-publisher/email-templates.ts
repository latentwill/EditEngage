export type TemplateName = 'newsletter' | 'digest' | 'minimal';

const templates: Record<TemplateName, (content: string) => string> = {
  newsletter: (content: string) =>
    `<div class="newsletter-wrapper" style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:24px;line-height:1.6;">${content}</div>`,

  digest: (content: string) =>
    `<div class="digest-wrapper" style="max-width:600px;margin:0 auto;font-family:sans-serif;padding:12px;line-height:1.4;font-size:14px;border-left:3px solid #ccc;">${content}</div>`,

  minimal: (content: string) =>
    `<div class="minimal-wrapper">${content}</div>`
};

export function renderTemplate(name: TemplateName, content: string): string {
  return templates[name](content);
}
