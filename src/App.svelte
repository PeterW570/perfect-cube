<script>
	import ThemePicker from './ThemePicker.svelte';
	import { onMount } from 'svelte';
	import {
		deepEqual,
		distanceBetweenPoints,
		findTranslationBetweenPoints,
		translatePoint,
	} from './utils';

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

	/**
	 * find the closest corner to the viewer
	 * assumes that the first three lines are connected to it
	 * as stated in the instructions
	 *
	 * @returns {Position}
	 */
	function findClosestCornerToViewer() {
		const startAndEndArr = (line) => [line.start, line.end];
		const distancesToPoints = [];
		for (const lineAPoint of startAndEndArr(lineHistory[0])) {
			for (const lineBPoint of startAndEndArr(lineHistory[1])) {
				const dist = distanceBetweenPoints(lineAPoint, lineBPoint);
				distancesToPoints.push([dist, lineAPoint, lineBPoint]);
			}
		}
		distancesToPoints.sort((a, b) => a[0] - b[0]);
		return distancesToPoints[0][1];
	}

	function analyse() {
		// find the common point of the first three lines
		// this is the corner closest to the viewer
		const closestCorner = findClosestCornerToViewer();
		const analysedLines = [];

		debugProperties.closestCorner = closestCorner;

		const initialLinesFarCorners = [];
		for (const [lineIdx, { start, end }] of Object.entries(lineHistory)) {
			if (lineIdx < 3) {
				// for the first three edges, find the point furthest
				// from the common point
				const farCorner =
					distanceBetweenPoints(closestCorner, start) >
					distanceBetweenPoints(closestCorner, end)
						? start
						: end;
				initialLinesFarCorners.push(farCorner);
				debugLineDetails[lineIdx].group = lineIdx;
				debugLineDetails[lineIdx].startIsNear = deepEqual(
					farCorner,
					end
				);
			}

			const rightMostPoint = start.x > end.x ? start : end;
			const leftMostPoint = start.x < end.x ? start : end;

			const gradient =
				(rightMostPoint.y - leftMostPoint.y) /
				(rightMostPoint.x - leftMostPoint.x);
			const yIntercept = start.y - gradient * start.x;

			debugLineDetails[lineIdx].gradient = gradient;
			debugLineDetails[lineIdx].yIntercept = yIntercept;

			let lineStart;
			let lineEnd;
			if (isNaN(gradient)) {
				// draw a vertical guideline
				lineStart = { x: start.x, y: 0 };
				lineEnd = { x: start.x, y: canvasSize.height };
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

				lineStart = pointsInBounds[0];
				lineEnd = pointsInBounds[1];
			}

			let groupIdx = lineIdx < 3 ? lineIdx : null;
			if (lineIdx >= 3) {
				/**
				 * try to group the edges together into parallel
				 * edges of the cube. we do this by finding which of
				 * the initial three edges this edge is connected to,
				 * and then translating back along that edge.
				 * this edge should then be overlaid onto the edge its
				 * grouped with
				 */

				// find which far corner from an original edge
				// this edge is closest (connected) to.
				const { nearCorner, farCorner } = initialLinesFarCorners
					.flatMap((point, cornerIdx) => {
						return [
							{
								cornerIdx,
								dist: distanceBetweenPoints(point, start),
								nearCorner: start,
								farCorner: end,
							},
							{
								cornerIdx,
								dist: distanceBetweenPoints(point, end),
								nearCorner: end,
								farCorner: start,
							},
						];
					})
					.sort((a, b) => a.dist - b.dist)[0];

				debugLineDetails[lineIdx].startIsNear = deepEqual(
					nearCorner,
					start
				);

				// then translate the other corner by the diff between the
				// connected and the closest corner.
				// this essentially overlays the edge onto one of the
				// initial three edges
				const translatedFarCorner = translatePoint(
					farCorner,
					findTranslationBetweenPoints(nearCorner, closestCorner)
				);

				debugLineDetails[
					lineIdx
				].translatedFarCorner = translatedFarCorner;

				// now find which corner of the initial edges this far
				// corner is closest to. this is its group
				const { cornerIdx } = initialLinesFarCorners
					.map((point, cornerIdx) => {
						return {
							cornerIdx,
							dist: distanceBetweenPoints(
								point,
								translatedFarCorner
							),
						};
					})
					.sort((a, b) => a.dist - b.dist)[0];

				debugLineDetails[lineIdx].group = cornerIdx;
				groupIdx = cornerIdx;
			}

			analysedLines.push({
				start: lineStart,
				end: lineEnd,
				groupIdx,
			});
		}

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
		<button class="select-none" on:click={analyse}>Analyse</button>
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
