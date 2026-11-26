<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLLabelAttributes } from "svelte/elements";
	import { tv } from "tailwind-variants";

	export const labelVariants = tv({
		base: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
	});

	export type LabelProps = WithElementRef<HTMLLabelAttributes>;
</script>

<script lang="ts">
	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: LabelProps = $props();
</script>

<label
	bind:this={ref}
	data-slot="label"
	class={cn(labelVariants(), className)}
	{...restProps}
>
	{@render children?.()}
</label>
