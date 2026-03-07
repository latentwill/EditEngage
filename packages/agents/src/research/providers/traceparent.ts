import { propagation, context } from '@opentelemetry/api';

export function injectTraceHeaders(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers);
}
