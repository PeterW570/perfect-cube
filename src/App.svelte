<script>
	import { onMount } from 'svelte';

	let canvasEl;
	let ctx;

	let canvasOffsets = { x: 0, y: 0 };
	let canvasSize = {};
	let offsetsSet = false;

	let startPosition = { x: 0, y: 0 };
	let endPosition = { x: 0, y: 0 };
	let isDrawing = false;

	let lineHistory = [];

	const getClientOffset = (event) => {
		const { pageX, pageY } = event.touches ? event.touches[0] : event;
		const x = pageX - canvasOffsets.x;
		const y = pageY - canvasOffsets.y;

		return {
			x,
			y,
		};
	};

	function drawLine({ start = startPosition, end = endPosition } = {}) {
		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();
	}

	function onMouseDown(event) {
		if (!offsetsSet) {
			const {
				left,
				top,
				height,
				width,
			} = canvasEl.getBoundingClientRect();
			canvasOffsets.x = left;
			canvasOffsets.y = top;
			canvasSize.height = height;
			canvasSize.width = width;
		}

		startPosition = getClientOffset(event);
		isDrawing = true;
		lineHistory.push([startPosition]);
	}

	function onMouseMove(event) {
		if (!isDrawing) return;

		endPosition = getClientOffset(event);
		drawLine();
		lineHistory[lineHistory.length - 1].push(endPosition);
		startPosition = endPosition;
	}

	function onMouseUp() {
		isDrawing = false;
	}

	function clearCanvas() {
		lineHistory = [];
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
	}

	function analyse() {
		ctx.strokeStyle = 'red';

		for (const line of lineHistory) {
			const start = line[0];
			const end = line[line.length - 1];

			const rightMostPoint = start.x > end.x ? start : end;
			const leftMostPoint = start.x < end.x ? start : end;

			const gradient =
				(rightMostPoint.y - leftMostPoint.y) /
				(rightMostPoint.x - leftMostPoint.x);
			const yIntercept = start.y - gradient * start.x;

			if (isNaN(gradient)) {
				// draw a vertical guideline
				drawLine({
					start: { x: start.x, y: 0 },
					end: { x: start.x, y: canvasSize.height },
				});
			} else {
				// find the two points that intersect the border
				// of the canvas, and draw guideline between
				const xZeroPoint = { x: 0, y: yIntercept };
				const xWidthPoint = {
					x: canvasSize.width,
					y: gradient * canvasSize.width + yIntercept,
				};
				const yZeroPoint = { x: (-1 * yIntercept) / gradient, y: 0 };
				const yHeightPoint = {
					x: (canvasSize.height - yIntercept) / gradient,
					y: canvasSize.height,
				};

				const pointsInBounds = [
					xZeroPoint,
					xWidthPoint,
					yZeroPoint,
					yHeightPoint,
				].filter(
					(point) =>
						point.x >= 0 &&
						point.x <= canvasSize.width &&
						point.y >= 0 &&
						point.y <= canvasSize.height
				);

				drawLine({ start: pointsInBounds[0], end: pointsInBounds[1] });
			}
		}

		ctx.strokeStyle = '#000';
	}

	onMount(() => {
		ctx = canvasEl.getContext('2d');
		ctx.strokeStyle = '#000';
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.lineWidth = 1;
	});
</script>

<main>
	<div>
		<button class="select-none" on:click={clearCanvas}>Clear</button>
		<button class="select-none" on:click={analyse}>Analyse</button>
	</div>
	<div class="artboard select-none">
		<canvas
			bind:this={canvasEl}
			on:mousedown={onMouseDown}
			on:touchstart={onMouseDown}
			on:mousemove={onMouseMove}
			on:touchmove={onMouseMove}
			on:mouseup={onMouseUp}
			on:touchend={onMouseUp}
			width="500"
			height="500"
		/>
	</div>
</main>

<style>
	* {
		position: relative;
		box-sizing: border-box;
	}

	main {
		text-align: center;
		padding: 1em;
		max-width: 40em;
		margin: 0 auto;
	}

	.select-none {
		user-select: none;
	}

	.artboard > canvas {
		border: 1px solid #dadada;
		touch-action: none;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
