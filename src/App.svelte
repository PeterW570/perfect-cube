<script>
	import { onMount } from 'svelte';
	import { distanceBetweenPoints } from './utils';

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

	const getClientOffset = (event) => {
		const { pageX, pageY } = event.touches ? event.touches[0] : event;
		const x = pageX - canvasOffsets.x;
		const y = pageY - canvasOffsets.y;

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
		isDrawing = false;
	}

	function clearCanvas() {
		lineHistory = [];
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
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
		const closestCorner = findClosestCornerToViewer();
		const analysedLines = [];

		for (const [lineIdx, { start, end }] of Object.entries(lineHistory)) {
			const farCorner =
				lineIdx >= 3
					? null
					: distanceBetweenPoints(closestCorner, start) >
					  distanceBetweenPoints(closestCorner, end)
					? start
					: end;
			const rightMostPoint = start.x > end.x ? start : end;
			const leftMostPoint = start.x < end.x ? start : end;

			const gradient =
				(rightMostPoint.y - leftMostPoint.y) /
				(rightMostPoint.x - leftMostPoint.x);
			const yIntercept = start.y - gradient * start.x;

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

			let boundaryPointClosestToVP = null;
			if (farCorner) {
				boundaryPointClosestToVP =
					distanceBetweenPoints(lineStart, closestCorner) >
					distanceBetweenPoints(lineStart, farCorner)
						? lineStart
						: lineEnd;
			}

			analysedLines.push({
				start: lineStart,
				end: lineEnd,
				boundaryPointClosestToVP,
			});
		}

		const grouped = [];
		for (const {
			start,
			end,
			boundaryPointClosestToVP,
		} of analysedLines.slice(0, 3)) {
			const linesByClosenessToBoundaryPoint = analysedLines
				.slice(3)
				.map(({ start, end }) => {
					return {
						dist: Math.min(
							distanceBetweenPoints(
								boundaryPointClosestToVP,
								start
							),
							distanceBetweenPoints(boundaryPointClosestToVP, end)
						),
						start,
						end,
					};
				});
			linesByClosenessToBoundaryPoint.sort((a, b) => a.dist - b.dist);
			grouped.push(
				[{ start, end }].concat(
					linesByClosenessToBoundaryPoint
						.slice(0, 2)
						.map((line) => ({ start: line.start, end: line.end }))
				)
			);
		}

		const colours = ['red', 'orange', 'purple'];

		for (const [groupIdx, lines] of Object.entries(grouped)) {
			ctx.strokeStyle = colours[groupIdx];
			for (const { start, end } of lines) {
				drawLine({ start, end });
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
	<div class="instructions">
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
</main>

<style>
	* {
		position: relative;
		box-sizing: border-box;
	}

	main {
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
