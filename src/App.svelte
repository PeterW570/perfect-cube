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
	let cornerDistanceMatrix = [];
	let debugLineDetails = [];
	let debugProperties = {};

	let cornerClosenessScore = null;
	let straightnessScore = null;
	let perspectiveScore = null;
	let overallScore = null;

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
		cornerDistanceMatrix = [];
		debugLineDetails = [];
		debugProperties = {};

		cornerClosenessScore = null;
		straightnessScore = null;
		perspectiveScore = null;
		overallScore = null;
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
			cornerDistanceMatrix: cornerDists,
			debugLineDetails: details,
			debugProperties: properties,
			averageCornerDistance,
			averageLineDeviation,
			overallPerspectiveScore,
		} = analyse({
			lineHistory,
			canvasSize,
			debugProperties,
			debugLineDetails,
		});
		cornerDistanceMatrix = cornerDists;
		debugLineDetails = details;
		debugProperties = properties;

		debugProperties.rawAvCornerDistance = averageCornerDistance;
		debugProperties.rawAvLineDeviation = averageLineDeviation;

		cornerClosenessScore =
			100 - Math.min(100, Math.pow(averageCornerDistance, 2));

		// TODO: tweak to be more sensitive when box is smaller
		straightnessScore =
			100 - Math.min(100, Math.pow(averageLineDeviation, 3) * 2);

		// TODO: handle parallel lines
		perspectiveScore = overallPerspectiveScore;
		overallScore =
			(cornerClosenessScore + straightnessScore + perspectiveScore) / 3;

		const colours = ['red', 'orange', 'purple'];
		for (const { start, end, groupIdx } of analysedLines) {
			ctx.strokeStyle = colours[groupIdx] || 'red';
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
	<div class="scores">
		<h2>Score</h2>
		<ul class="score-items">
			<li class="score-item">
				<span class="score-key">Corner Closeness</span>
				<span class="score-value"
					>{cornerClosenessScore?.toFixed(1) ?? '-'}</span
				>
			</li>
			<li class="score-item">
				<span class="score-key">Straightness</span>
				<span class="score-value"
					>{straightnessScore?.toFixed(1) ?? '-'}</span
				>
			</li>
			<li class="score-item">
				<span class="score-key">Perspective</span><span
					class="score-value"
					>{perspectiveScore?.toFixed(1) ?? '-'}</span
				>
			</li>
			<li class="score-item">
				<span class="score-key">Overall</span><span class="score-value"
					>{overallScore?.toFixed(1) ?? '-'}</span
				>
			</li>
		</ul>
	</div>
	<div class="notes flow">
		<h2>Notes</h2>
		<ul>
			<li>Draw each edge with a single stroke.</li>
			<li>
				Think of where the vanishing points are for each of the parallel
				edges on the box.
			</li>
		</ul>
	</div>
	<div class="debug flow">
		<h2>Debug Info</h2>
		{#if cornerDistanceMatrix.length === 0}
			<p>Click Analyse to get debug info</p>
		{/if}
		{#if debugProperties.rawAvCornerDistance !== undefined}
			<p>
				Raw Av. Corner Distance: {debugProperties.rawAvCornerDistance.toFixed(
					3
				)}
			</p>
		{/if}
		{#if debugProperties.rawAvLineDeviation !== undefined}
			<p>
				Raw Av. Line Deviation: {debugProperties.rawAvLineDeviation.toFixed(
					3
				)}
			</p>
		{/if}
		{#if debugProperties.perspectiveScores}
			<p class="bold">Closeness</p>
			<ul>
				{#each debugProperties.perspectiveScores as perspectiveScores}
					<li>
						<div class="bold">
							Group: {perspectiveScores.groupIdx}
						</div>
						<div>
							minDistance: {perspectiveScores.closeness
								.minDistance}
						</div>
						<div>
							maxDistance: {perspectiveScores.closeness
								.maxDistance}
						</div>
						<div>
							averageDistance: {perspectiveScores.closeness
								.averageDistance}
						</div>
						<div>
							averageRange: {perspectiveScores.closeness
								.averageRange}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
		<table>
			{#each cornerDistanceMatrix as row}
				<tr>
					{#each row as distance}
						<td>{distance.toFixed(2)}</td>
					{/each}
				</tr>
			{/each}
		</table>
		<ol>
			{#each debugLineDetails as detail}
				<li>
					<div>
						<span
							>({detail.start.x.toFixed(2)}, {detail.start.y.toFixed(
								2
							)})</span
						>
						-&gt;
						<span
							>({detail.end.x.toFixed(2)}, {detail.end.y.toFixed(
								2
							)})</span
						>
					</div>
					<div>
						{#if detail.gradient}
							y = {detail.gradient.toFixed(2) || '?'} x + {detail.yIntercept.toFixed(
								2
							) || '?'}
						{:else if detail.gradient !== undefined}
							x = {detail.start.x.toFixed(2)}
						{/if}
					</div>
					{#if detail.connections}
						<div>
							Connections: {detail.connections.map(
								(idx) => idx + 1
							)}
						</div>
					{/if}
					{#if detail.averageDeviation !== undefined}
						<div>
							Av. Deviation: {detail.averageDeviation.toFixed(3)}
						</div>
					{/if}
					{#if detail.averageCornerDistance !== undefined}
						<div>
							Av. Corner Dist: {detail.averageCornerDistance.toFixed(
								3
							)}
						</div>
					{/if}
					{#if detail.groupIdx !== undefined}
						<div class="bold">Group: {detail.groupIdx}</div>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</main>

<style>
	main {
		padding: 1em;
		max-width: 50em;
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

	.debug > :not(:first-child) {
		font-family: monospace;
	}

	.debug li {
		margin: 8px 0;
	}

	.score-items {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
	}

	.score-item {
		display: flex;
		flex-flow: column-reverse;
		align-items: center;
		font-size: 2rem;
		font-weight: bold;
		margin: 1rem;
		flex-grow: 1;
	}

	.score-key {
		font-size: 0.75rem;
		font-weight: normal;
		text-transform: uppercase;
		margin: 0.5rem;
	}

	table {
		border-collapse: separate;
		border-spacing: 1em 0.1em;

		display: block;
		overflow-x: auto;
		white-space: nowrap;
	}
</style>
