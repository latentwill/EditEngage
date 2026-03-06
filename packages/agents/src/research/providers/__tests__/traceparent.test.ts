/**
 * @behavior When TS agents call the Python LLM service, they include a W3C traceparent header
 * @business_rule Cross-service trace propagation enables unified observability in Logfire
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockInject } = vi.hoisted(() => ({
  mockInject: vi.fn()
}));

vi.mock('@opentelemetry/api', () => ({
  propagation: {
    inject: mockInject
  },
  context: {
    active: vi.fn().mockReturnValue({})
  }
}));

import { injectTraceHeaders } from '../traceparent.js';

describe('W3C traceparent propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('injects traceparent header into provided headers object', () => {
    mockInject.mockImplementation((_context: unknown, carrier: Record<string, string>) => {
      carrier['traceparent'] = '00-trace123-span456-01';
    });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    injectTraceHeaders(headers);

    expect(headers['traceparent']).toBe('00-trace123-span456-01');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('calls propagation.inject with active context', () => {
    mockInject.mockImplementation(() => {});

    const headers: Record<string, string> = {};
    injectTraceHeaders(headers);

    expect(mockInject).toHaveBeenCalledTimes(1);
    expect(mockInject).toHaveBeenCalledWith(expect.anything(), headers);
  });

  it('returns headers unchanged when no active span exists', () => {
    mockInject.mockImplementation(() => {
      // No-op — no active span, so nothing injected
    });

    const headers: Record<string, string> = { 'Authorization': 'Bearer key' };
    injectTraceHeaders(headers);

    expect(headers).toEqual({ 'Authorization': 'Bearer key' });
  });
});
