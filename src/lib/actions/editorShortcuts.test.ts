/**
 * @behavior Editor keyboard shortcuts enable rapid content review through key combinations
 * @business_rule Power users can approve, reject, navigate, and save without using the mouse,
 * while shortcuts don't interfere with normal text editing in inputs/textareas
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost:54321',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key'
}));

describe('Editor Shortcuts', () => {
	let callbacks: {
		onApprove: ReturnType<typeof vi.fn>;
		onReject: ReturnType<typeof vi.fn>;
		onNext: ReturnType<typeof vi.fn>;
		onPrev: ReturnType<typeof vi.fn>;
		onSave: ReturnType<typeof vi.fn>;
		onBack: ReturnType<typeof vi.fn>;
	};
	let cleanup: { destroy: () => void };
	let node: HTMLDivElement;

	beforeEach(async () => {
		vi.resetModules();
		callbacks = {
			onApprove: vi.fn(),
			onReject: vi.fn(),
			onNext: vi.fn(),
			onPrev: vi.fn(),
			onSave: vi.fn(),
			onBack: vi.fn()
		};
		node = document.createElement('div');
		document.body.appendChild(node);

		const { editorShortcuts } = await import('./editorShortcuts.js');
		cleanup = editorShortcuts(node, callbacks);
	});

	afterEach(() => {
		cleanup.destroy();
		document.body.removeChild(node);
	});

	function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
		document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
	}

	it('Cmd+Enter triggers approve', () => {
		fireKey('Enter', { metaKey: true });
		expect(callbacks.onApprove).toHaveBeenCalled();
	});

	it('Ctrl+Enter triggers approve', () => {
		fireKey('Enter', { ctrlKey: true });
		expect(callbacks.onApprove).toHaveBeenCalled();
	});

	it('Cmd+Backspace triggers reject', () => {
		fireKey('Backspace', { metaKey: true });
		expect(callbacks.onReject).toHaveBeenCalled();
	});

	it('Cmd+ArrowRight triggers next', () => {
		fireKey('ArrowRight', { metaKey: true });
		expect(callbacks.onNext).toHaveBeenCalled();
	});

	it('Cmd+ArrowLeft triggers prev', () => {
		fireKey('ArrowLeft', { metaKey: true });
		expect(callbacks.onPrev).toHaveBeenCalled();
	});

	it('Cmd+S triggers save draft', () => {
		fireKey('s', { metaKey: true });
		expect(callbacks.onSave).toHaveBeenCalled();
	});

	it('Escape triggers back to feed', () => {
		fireKey('Escape');
		expect(callbacks.onBack).toHaveBeenCalled();
	});

	it('should NOT trigger Cmd+Backspace when textarea is focused', () => {
		const textarea = document.createElement('textarea');
		node.appendChild(textarea);
		textarea.focus();
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Backspace', metaKey: true, bubbles: true })
		);
		expect(callbacks.onReject).not.toHaveBeenCalled();
		node.removeChild(textarea);
	});

	it('should NOT trigger Cmd+ArrowRight when textarea is focused', () => {
		const textarea = document.createElement('textarea');
		node.appendChild(textarea);
		textarea.focus();
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight', metaKey: true, bubbles: true })
		);
		expect(callbacks.onNext).not.toHaveBeenCalled();
		node.removeChild(textarea);
	});

	it('should NOT trigger Cmd+ArrowLeft when input is focused', () => {
		const input = document.createElement('input');
		node.appendChild(input);
		input.focus();
		input.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft', metaKey: true, bubbles: true })
		);
		expect(callbacks.onPrev).not.toHaveBeenCalled();
		node.removeChild(input);
	});

	it('should NOT trigger Escape when input is focused', () => {
		const input = document.createElement('input');
		node.appendChild(input);
		input.focus();
		input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(callbacks.onBack).not.toHaveBeenCalled();
		node.removeChild(input);
	});

	it('should STILL trigger Cmd+Enter when textarea is focused (global shortcut)', () => {
		const textarea = document.createElement('textarea');
		node.appendChild(textarea);
		textarea.focus();
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true })
		);
		expect(callbacks.onApprove).toHaveBeenCalled();
		node.removeChild(textarea);
	});

	it('should STILL trigger Cmd+S when input is focused (global shortcut)', () => {
		const input = document.createElement('input');
		node.appendChild(input);
		input.focus();
		input.dispatchEvent(
			new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true })
		);
		expect(callbacks.onSave).toHaveBeenCalled();
		node.removeChild(input);
	});

	it('destroy removes event listener', () => {
		cleanup.destroy();
		fireKey('Enter', { metaKey: true });
		expect(callbacks.onApprove).not.toHaveBeenCalled();
		// Re-create cleanup so afterEach doesn't error
		// We need to re-import since we already destroyed
		cleanup = { destroy: () => {} };
	});

	it('plain keys without meta/ctrl do not trigger shortcuts', () => {
		fireKey('Enter');
		fireKey('Backspace');
		fireKey('ArrowRight');
		fireKey('ArrowLeft');
		fireKey('s');
		expect(callbacks.onApprove).not.toHaveBeenCalled();
		expect(callbacks.onReject).not.toHaveBeenCalled();
		expect(callbacks.onNext).not.toHaveBeenCalled();
		expect(callbacks.onPrev).not.toHaveBeenCalled();
		expect(callbacks.onSave).not.toHaveBeenCalled();
	});
});
