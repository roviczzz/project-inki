<script lang="ts">
	import BookOpen from "@lucide/svelte/icons/book-open";
	import Bug from "@lucide/svelte/icons/bug";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import LabelBadge, { labels } from "./label-badges.svelte";
</script>

<div class="flex w-full flex-col items-center justify-center gap-10 p-4">
	<div class="flex flex-col items-center gap-2 text-center">
		<h2 class="text-lg font-semibold">Label Badges</h2>
		<p class="text-sm text-muted-foreground">
			Demonstrating how labels can be displayed on items.
		</p>
	</div>

	<div class="w-full max-w-md space-y-4">
		<div class="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground">
			<div class="flex items-start justify-between">
				<p class="font-medium">Fix authentication flow redirect</p>
				<Bug class="size-5 shrink-0 text-red-500" />
			</div>
			<LabelBadge labels={[labels[1], labels[7]]} />
		</div>

		<div class="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground">
			<div class="flex items-start justify-between">
				<p class="font-medium">Implement new dashboard design</p>
				<Sparkles class="size-5 shrink-0 text-blue-500" />
			</div>
			<LabelBadge labels={[labels[2], labels[0], labels[6]]} />
		</div>

		<div class="flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground">
			<div class="flex items-start justify-between">
				<p class="font-medium">Update contribution guidelines</p>
				<BookOpen class="size-5 shrink-0 text-green-500" />
			</div>
			<LabelBadge labels={[labels[3]]} />
		</div>
	</div>
</div>
