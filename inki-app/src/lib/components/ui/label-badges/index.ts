import LabelBadge, {
	LABELS_BY_ID,
	type LabelId,
	type LabelInterface,
	isLabelId,
	labels,
	resolveLabels,
} from "./label-badges.svelte";
import DemoOne from "./demo.svelte";

export default LabelBadge;
export {
	LabelBadge,
	DemoOne,
	labels,
	LABELS_BY_ID,
	isLabelId,
	resolveLabels,
	type LabelInterface,
	type LabelId,
};
