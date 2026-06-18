let zoomLevel = $state(100);

const MIN = 50;
const MAX = 200;
const STEP = 10;

export function getZoomLevel(): number {
	return zoomLevel;
}

export function zoomIn(): void {
	zoomLevel = Math.min(zoomLevel + STEP, MAX);
}

export function zoomOut(): void {
	zoomLevel = Math.max(zoomLevel - STEP, MIN);
}

export function resetZoom(): void {
	zoomLevel = 100;
}
