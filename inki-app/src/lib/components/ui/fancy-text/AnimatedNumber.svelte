<script lang="ts">
	import { untrack } from 'svelte';
	import { stepTickerValue } from '$lib/utils/fancy-text.ts';

	export interface AnimatedNumberProps {
		value: number;
		durationMs?: number;
		decimals?: number;
		suffix?: string;
	}

	let { value, durationMs = 220, decimals = 0, suffix = '' }: AnimatedNumberProps = $props();

	let animatedValue = $state<number | null>(null);

	$effect(() => {
		const target = value;
		const startValue = untrack(() => animatedValue ?? target);
		if (startValue === target) {
			animatedValue = target;
			return;
		}
		if (
			typeof window === 'undefined' ||
			window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
			durationMs <= 0
		) {
			animatedValue = target;
			return;
		}

		const startTime = performance.now();
		let frameId = 0;

		function tick(now: number) {
			const t = Math.min(1, (now - startTime) / durationMs);
			animatedValue = stepTickerValue(startValue, target, t, decimals);
			if (t < 1) {
				frameId = requestAnimationFrame(tick);
			}
		}

		frameId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frameId);
	});
</script>

{animatedValue ?? value}{suffix}
