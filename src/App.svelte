<script>
	import ThemePicker from './ThemePicker.svelte';
	import { onMount } from 'svelte';
	import { analyse } from './analysis.js';

	let canvasEl;
	let ctx;

	let canvasOffsets = { x: 0, y: 0 };
	let canvasSize = {};
	let offsetsSet = false;

	let startPosition = { x: 0, y: 0 };
	let endPosition = { x: 0, y: 0 };
	let isDrawing = false;

	/**
	 * @typedef {object} LineDetails
	 * @property {Position} start
	 * @property {Position} end
	 * @property {Position[]} points
	 */
	/** @type {LineDetails[]} */
	let lineHistory = [];
	let debugLineDetails = [];
	let debugProperties = {};

	const getClientOffset = (event) => {
		const { clientX, clientY } = event.touches ? event.touches[0] : event;
		const x = clientX - canvasOffsets.x;
		const y = clientY - canvasOffsets.y;

		return {
			x,
			y,
		};
	};

	/**
	 * Assign the project to an employee.
	 * @param {Object} points - The points to draw a line between
	 * @param {Position} points.start - The start point.
	 * @param {Position} points.end - The end point.
	 */
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
		lineHistory.push({ start: startPosition, points: [startPosition] });
	}

	function onMouseMove(event) {
		if (!isDrawing) return;

		endPosition = getClientOffset(event);
		drawLine();
		lineHistory[lineHistory.length - 1].points.push(endPosition);
		startPosition = endPosition;
	}

	function onMouseUp() {
		const lastLine = lineHistory[lineHistory.length - 1];
		lastLine.end = lastLine.points[lastLine.points.length - 1];
		debugLineDetails = [
			...debugLineDetails,
			{ start: lastLine.start, end: lastLine.end },
		];
		isDrawing = false;
	}

	function reset() {
		lineHistory = [];
		debugLineDetails = [];
		debugProperties = {};
	}

	function clearCanvas() {
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
	}

	function onClickClear() {
		reset();
		clearCanvas();
	}

	function onClickAnalyse() {
		const {
			analysedLines,
			debugLineDetails: details,
			debugProperties: properties,
		} = analyse({
			lineHistory,
			canvasSize,
			debugProperties,
			debugLineDetails,
		});
		debugLineDetails = details;
		debugProperties = properties;

		const colours = ['red', 'orange', 'purple'];
		for (const { start, end, groupIdx } of analysedLines) {
			ctx.strokeStyle = colours[groupIdx];
			drawLine({ start, end });
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

<main class="flow">
	<div class="title-container flex">
		<h1>Perfect Cube</h1>
		<ThemePicker />
	</div>
	<div class="buttons text-center">
		<button class="select-none" on:click={onClickClear}>Clear</button>
		<button class="select-none" on:click={onClickAnalyse}>Analyse</button>
	</div>
	<div class="artboard select-none text-center">
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
	<div class="instructions flow">
		<h2>Instructions</h2>
		<ol>
			<!-- TODO: 1 point & 2 points perspective instructions -->
			<li>
				Visualise a box, and think of which corner is closest to you.
			</li>
			<li>
				Draw a line for each of the edges connected to that corner. Each
				edge should be drawn in a single stroke.
			</li>
			<li>
				Think of where the vanishing points are for each of the parallel
				edges on the box.
			</li>
			<li>
				Draw the remaining edges, converging at the vanishing points
			</li>
		</ol>
	</div>
	<div class="debug flow">
		<h2>Debug Info</h2>
		{#if debugProperties.closestCorner}
			<div>
				Closest: ({debugProperties.closestCorner.x}, {debugProperties
					.closestCorner.y})
			</div>
		{/if}
		<ol>
			{#each debugLineDetails as detail}
				<li>
					<div>
						<span class:highlight={detail.startIsNear}
							>({detail.start.x}, {detail.start.y})</span
						>
						-&gt;
						<span class:highlight={detail.startIsNear === false}
							>({detail.end.x}, {detail.end.y})</span
						>
					</div>
					<div>
						{#if detail.gradient}
							y = {detail.gradient || '?'} x + {detail.yIntercept ||
								'?'}
						{:else if detail.gradient !== undefined}
							x = {detail.start.x}
						{/if}
					</div>
					{#if detail.translatedFarCorner}
						<div>
							Translated Far Corner: ({detail.translatedFarCorner
								.x}, {detail.translatedFarCorner.y})
						</div>
					{/if}
					{#if detail.group !== undefined}
						<div class="bold">Group: {detail.group}</div>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</main>

<style>
	main {
		padding: 1em;
		max-width: 40em;
		margin: 0 auto;
	}

	.title-container {
		align-items: center;
		justify-content: space-between;
	}

	.artboard > canvas {
		border: 1px solid #dadada;
		touch-action: none;
		background-color: var(--canvas-background);
	}

	.debug {
		font-family: monospace;
	}

	.debug li {
		margin: 8px 0;
	}

	.highlight {
		color: orange;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
