<script lang="ts" module>
	export interface LabelInterface {
		id: string;
		name: string;
		color: string;
	}

	export const labels: LabelInterface[] = [
		{ id: "ui", name: "UI Enhancement", color: "#a2eeef" },
		{ id: "bug", name: "Bug", color: "#d73a4a" },
		{ id: "feature", name: "Feature", color: "#0e8a16" },
		{ id: "documentation", name: "Documentation", color: "#534cb3" },
		{ id: "refactor", name: "Refactor", color: "#fcca42" },
		{ id: "performance", name: "Performance", color: "#fbca04" },
		{ id: "design", name: "Design", color: "#d876e3" },
		{ id: "security", name: "Security", color: "#6a737d" },
		{ id: "accessibility", name: "Accessibility", color: "#0052cc" },
		{ id: "testing", name: "Testing", color: "#008672" },
	];

	export type LabelId =
		| "ui"
		| "bug"
		| "feature"
		| "documentation"
		| "refactor"
		| "performance"
		| "design"
		| "security"
		| "accessibility"
		| "testing";

	export const LABELS_BY_ID: Record<string, LabelInterface> = Object.fromEntries(
		labels.map((l) => [l.id, l])
	);

	export function isLabelId(id: unknown): id is LabelId {
		return typeof id === "string" && id in LABELS_BY_ID;
	}

	export function resolveLabels(ids: readonly string[] | undefined): LabelInterface[] {
		if (!ids || ids.length === 0) return [];
		const result: LabelInterface[] = [];
		for (const id of ids) {
			const found = LABELS_BY_ID[id];
			if (found) result.push(found);
		}
		return result;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { cn, type WithElementRef } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		labels: itemLabels = [],
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		labels: LabelInterface[];
	} = $props();
</script>

{#if itemLabels && itemLabels.length > 0}
	<div bind:this={ref} class={cn("flex flex-wrap gap-1.5", className)} {...restProps}>
		{#each itemLabels as l (l.id)}
			<Badge
				variant="outline"
				class="gap-1.5 rounded-full border bg-background text-foreground px-2 py-0.5 text-[11px] font-medium"
			>
				<span
					class="size-2 shrink-0 rounded-full"
					style="background-color: {l.color};"
					aria-hidden="true"
				></span>
				{l.name}
			</Badge>
		{/each}
	</div>
{/if}
