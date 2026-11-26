<script lang="ts">
	import {
		splitGraphemes,
		resolveAccessibleLabel,
		type FancyTextConfig
	} from '$lib/utils/fancy-text.ts';
	import { cn } from '$lib/utils.js';

	export interface FancyTextProps {
		config: FancyTextConfig;
		class?: string;
	}

	let { config, class: className }: FancyTextProps = $props();

	let activeWordIndex = $state(0);
	let tokens = $derived(config.mode === 'rotate' ? [] : splitGraphemes(config.text));
	let accessibleLabel = $derived(resolveAccessibleLabel(config, activeWordIndex));

	$effect(() => {
		if (config.mode !== 'rotate' || config.words.length <= 1) {
			activeWordIndex = 0;
			return;
		}
		if (
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
		) {
			return;
		}
		const wordCount = config.words.length;
		const interval = setInterval(() => {
			activeWordIndex = (activeWordIndex + 1) % wordCount;
		}, config.intervalMs ?? 3000);

		return () => clearInterval(interval);
	});
</script>

<span
	class={cn(
		'fancy-text-root inline-flex items-baseline pointer-events-none select-none',
		config.mode === 'letter-swap' && 'fancy-letter-swap',
		config.mode === 'breathing' && 'fancy-breathing',
		config.mode === 'rotate' && 'fancy-rotate',
		className
	)}
	data-mode={config.mode}
	data-direction={config.mode === 'letter-swap' ? (config.direction ?? 'up') : undefined}
	style:--stagger-ms="{config.mode !== 'rotate'
		? (config.staggerMs ?? (config.mode === 'letter-swap' ? 22 : 60))
		: 0}ms"
	style:--breathe-duration="{config.mode === 'breathing' ? (config.durationMs ?? 2400) : 0}ms"
	aria-label={accessibleLabel}
>
	{#if config.mode === 'rotate'}
		<span class="fancy-rotate-track" aria-hidden="true">
			{#key activeWordIndex}
				<span class="fancy-rotate-word">{accessibleLabel}</span>
			{/key}
		</span>
	{:else}
		{#each tokens as token (token.index)}
			<span
				class="fancy-char"
				data-char={token.displayChar}
				style:--char-index={token.index}
				aria-hidden="true"
			>
				{token.displayChar}
			</span>
		{/each}
	{/if}
</span>
