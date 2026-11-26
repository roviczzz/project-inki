import type { Component } from 'svelte';
import Bold from '@lucide/svelte/icons/bold';
import Italic from '@lucide/svelte/icons/italic';
import Code from '@lucide/svelte/icons/code';
import Heading1 from '@lucide/svelte/icons/heading-1';
import Heading2 from '@lucide/svelte/icons/heading-2';
import Heading3 from '@lucide/svelte/icons/heading-3';
import Quote from '@lucide/svelte/icons/quote';
import List from '@lucide/svelte/icons/list';
import ListOrdered from '@lucide/svelte/icons/list-ordered';
import Strikethrough from '@lucide/svelte/icons/strikethrough';

export type FormatCommandId =
	| 'h1'
	| 'h2'
	| 'h3'
	| 'bold'
	| 'italic'
	| 'strikethrough'
	| 'codeblock'
	| 'blockquote'
	| 'bullet'
	| 'number';

export type ExecCommandSpec =
	| {
			readonly kind: 'command';
			readonly command:
				| 'bold'
				| 'italic'
				| 'strikeThrough'
				| 'insertUnorderedList'
				| 'insertOrderedList';
	  }
	| { readonly kind: 'block'; readonly tag: '<h1>' | '<h2>' | '<h3>' | '<blockquote>' }
	| { readonly kind: 'codeblock' };

export interface ToolbarAction {
	readonly id: FormatCommandId;
	readonly label: string;
	readonly menuLabel: string;
	readonly shortcut?: string;
	readonly icon: Component<{ class?: string }>;
	readonly placement: 'inline' | 'overflow';
	readonly inlineGroup: 1 | 2 | null;
	readonly contextGroup: 1 | 2 | 3 | null;
	readonly spec: ExecCommandSpec;
}

export const TOOLBAR_ACTIONS: readonly ToolbarAction[] = [
	{
		id: 'h1',
		label: 'Heading 1',
		menuLabel: 'Header 1',
		icon: Heading1,
		placement: 'inline',
		inlineGroup: 1,
		contextGroup: 2,
		spec: { kind: 'block', tag: '<h1>' }
	},
	{
		id: 'h2',
		label: 'Heading 2',
		menuLabel: 'Header 2',
		icon: Heading2,
		placement: 'inline',
		inlineGroup: 1,
		contextGroup: 2,
		spec: { kind: 'block', tag: '<h2>' }
	},
	{
		id: 'h3',
		label: 'Heading 3',
		menuLabel: 'Header 3',
		icon: Heading3,
		placement: 'inline',
		inlineGroup: 1,
		contextGroup: 2,
		spec: { kind: 'block', tag: '<h3>' }
	},
	{
		id: 'bold',
		label: 'Bold',
		menuLabel: 'Bold',
		shortcut: 'Ctrl+B',
		icon: Bold,
		placement: 'inline',
		inlineGroup: 2,
		contextGroup: 1,
		spec: { kind: 'command', command: 'bold' }
	},
	{
		id: 'italic',
		label: 'Italic',
		menuLabel: 'Italic',
		shortcut: 'Ctrl+I',
		icon: Italic,
		placement: 'inline',
		inlineGroup: 2,
		contextGroup: 1,
		spec: { kind: 'command', command: 'italic' }
	},
	{
		id: 'strikethrough',
		label: 'Strikethrough',
		menuLabel: 'Strikethrough',
		icon: Strikethrough,
		placement: 'inline',
		inlineGroup: 2,
		contextGroup: null,
		spec: { kind: 'command', command: 'strikeThrough' }
	},
	{
		id: 'codeblock',
		label: 'Code Block',
		menuLabel: 'Code Block',
		icon: Code,
		placement: 'overflow',
		inlineGroup: null,
		contextGroup: 1,
		spec: { kind: 'codeblock' }
	},
	{
		id: 'blockquote',
		label: 'Blockquote',
		menuLabel: 'Blockquote',
		icon: Quote,
		placement: 'overflow',
		inlineGroup: null,
		contextGroup: 3,
		spec: { kind: 'block', tag: '<blockquote>' }
	},
	{
		id: 'bullet',
		label: 'Bullet List',
		menuLabel: 'Bullet List',
		icon: List,
		placement: 'overflow',
		inlineGroup: null,
		contextGroup: 3,
		spec: { kind: 'command', command: 'insertUnorderedList' }
	},
	{
		id: 'number',
		label: 'Numbered List',
		menuLabel: 'Numbered List',
		icon: ListOrdered,
		placement: 'overflow',
		inlineGroup: null,
		contextGroup: 3,
		spec: { kind: 'command', command: 'insertOrderedList' }
	}
];

export const INLINE_TOOLBAR_GROUPS: readonly (readonly ToolbarAction[])[] = [
	TOOLBAR_ACTIONS.filter((a) => a.placement === 'inline' && a.inlineGroup === 1),
	TOOLBAR_ACTIONS.filter((a) => a.placement === 'inline' && a.inlineGroup === 2)
];

export const OVERFLOW_TOOLBAR_ACTIONS: readonly ToolbarAction[] = TOOLBAR_ACTIONS.filter(
	(a) => a.placement === 'overflow'
);

export const CONTEXT_MENU_GROUPS: readonly (readonly ToolbarAction[])[] = [
	TOOLBAR_ACTIONS.filter((a) => a.contextGroup === 1),
	TOOLBAR_ACTIONS.filter((a) => a.contextGroup === 2),
	TOOLBAR_ACTIONS.filter((a) => a.contextGroup === 3)
];

const ACTION_BY_ID = new Map<FormatCommandId, ToolbarAction>(
	TOOLBAR_ACTIONS.map((a) => [a.id, a])
);

export function runFormatCommand(id: FormatCommandId, selection: Selection | null): boolean {
	const action = ACTION_BY_ID.get(id);
	if (!action) return false;

	const { spec } = action;
	switch (spec.kind) {
		case 'command':
			return document.execCommand(spec.command);
		case 'block':
			return document.execCommand('formatBlock', false, spec.tag);
		case 'codeblock': {
			if (!selection || selection.rangeCount === 0) return false;
			const text = selection.getRangeAt(0).toString();
			if (!text) return false;
			const html = text.includes('\n')
				? `<pre><code>${text}</code></pre>`
				: `<code>${text}</code>`;
			return document.execCommand('insertHTML', false, html);
		}
	}
}
