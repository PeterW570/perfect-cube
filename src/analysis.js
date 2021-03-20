import {
	deepEqual,
	distanceBetweenPoints,
	findTranslationBetweenPoints,
	translatePoint,
} from './utils';

/**
 * find the closest corner to the viewer
 * assumes that the first three lines are connected to it
 * as stated in the instructions
 *
 * @returns {Position}
 */
function findClosestCornerToViewer(lineHistory) {
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

export function analyse({
	lineHistory,
	canvasSize,
	debugProperties = {},
	debugLineDetails = [],
}) {
	// find the common point of the first three lines
	// this is the corner closest to the viewer
	const closestCorner = findClosestCornerToViewer(lineHistory);
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
			debugLineDetails[lineIdx].startIsNear = deepEqual(farCorner, end);
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

			debugLineDetails[lineIdx].translatedFarCorner = translatedFarCorner;

			// now find which corner of the initial edges this far
			// corner is closest to. this is its group
			const { cornerIdx } = initialLinesFarCorners
				.map((point, cornerIdx) => {
					return {
						cornerIdx,
						dist: distanceBetweenPoints(point, translatedFarCorner),
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

	return {
		analysedLines,
		debugLineDetails,
		debugProperties,
	};
}
