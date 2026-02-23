export interface EditorShortcutCallbacks {
	onApprove: () => void;
	onReject: () => void;
	onNext: () => void;
	onPrev: () => void;
	onSave: () => void;
	onBack: () => void;
}

export function editorShortcuts(
	node: HTMLElement,
	callbacks: EditorShortcutCallbacks
): { destroy: () => void } {
	function handleKeydown(e: KeyboardEvent) {
		const target = e.target as HTMLElement;
		const isEditing =
			target.tagName === 'INPUT' ||
			target.tagName === 'TEXTAREA' ||
			target.isContentEditable;

		const metaKey = e.metaKey || e.ctrlKey;

		if (metaKey && e.key === 'Enter') {
			e.preventDefault();
			callbacks.onApprove();
		} else if (metaKey && e.key === 'Backspace') {
			if (!isEditing) {
				e.preventDefault();
				callbacks.onReject();
			}
		} else if (metaKey && e.key === 'ArrowRight') {
			if (!isEditing) {
				e.preventDefault();
				callbacks.onNext();
			}
		} else if (metaKey && e.key === 'ArrowLeft') {
			if (!isEditing) {
				e.preventDefault();
				callbacks.onPrev();
			}
		} else if (metaKey && e.key === 's') {
			e.preventDefault();
			callbacks.onSave();
		} else if (e.key === 'Escape') {
			if (!isEditing) {
				callbacks.onBack();
			}
		}
	}

	document.addEventListener('keydown', handleKeydown);

	return {
		destroy() {
			document.removeEventListener('keydown', handleKeydown);
		}
	};
}
