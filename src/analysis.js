import {
	angleOfLineBetweenPoints,
	calculateEquation,
	distanceBetweenPoints,
	distanceFromPointToLine,
	findIntersection,
} from './utils';

/**
 * @typedef {object} LineEnds
 * @property {Position} start
 * @property {Position} end
 */

/**
 * @param {object} opts
 * @param {Position} opts.start
 * @param {Position} opts.end
 * @param {number|NaN} opts.gradient
 * @param {number|NaN} opts.yIntercept
 * @param {object} opts.canvasSize
 * @param {number} opts.canvasSize.height
 * @param {number} opts.canvasSize.width
 * @returns {LineEnds}
 */
function findExtendedLineEnds({
	start,
	end,
	gradient,
	yIntercept,
	canvasSize,
}) {
	if (isNaN(gradient)) {
		// draw a vertical guideline
		return {
			start: { x: start.x, y: 0 },
			end: { x: start.x, y: canvasSize.height },
		};
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

		return {
			start: pointsInBounds[0],
			end: pointsInBounds[1],
		};
	}
}

/**
 * @typedef {object} ClosenessDetails
 * @property {boolean} hasParallelLines
 * @property {number} minDistance
 * @property {number} maxDistance
 * @property {number} averageDistance
 * @property {number} averageRange
 * @property {number} angleDiffDegrees
 * @property {number[]} lineAngles - angles of the lines in degrees
 */

/**
 * @throws
 * @param {LineAnalysis[]} lines
 * @returns {ClosenessDetails}
 */
function intersectionClosenessForLines(lines) {
	let hasParallelLines = false;
	const intersectionDistances = [];
	const lineAngles = [];
	outer: for (const i in lines) {
		intersectionDistances.push([]);
		const angles = angleOfLineBetweenPoints({
			start: lines[i].boxStart,
			end: lines[i].boxEnd,
		});
		console.log(angles);
		lineAngles.push(angles);
		for (const j in lines) {
			if (i === j) continue;
			try {
				const intersectionPoint = findIntersection(lines[i], lines[j]);
				const distFromBox = Math.min(
					distanceBetweenPoints(lines[i].boxStart, intersectionPoint),
					distanceBetweenPoints(lines[i].boxEnd, intersectionPoint)
				);
				intersectionDistances[i].push(distFromBox);
			} catch {
				hasParallelLines = true;
			}
		}
	}

	let totalDist = 0;
	let minDist = null;
	let maxDist = null;
	let totalRange = 0;

	for (const distArr of intersectionDistances) {
		let totalDistForArr = 0;
		let min = null;
		let max = null;

		for (const dist of distArr) {
			totalDistForArr += dist;
			if (min === null || dist < min) min = dist;
			if (max === null || dist > max) max = dist;
		}

		if (minDist === null || min < minDist) minDist = min;
		if (maxDist === null || max > maxDist) maxDist = max;
		totalDist += totalDistForArr / distArr.length;
		totalRange += max - min / distArr.length;
	}

	// choose the angle closest to 0, and then pick the angles
	// closest to that for the remaining lines.
	// when edges are parallel, fall back to comparing angles of them
	// TODO: we should care about the direction of the lines
	// i.e. we care about where the V.P. is and that they're
	// pointing towards it. we also should care that the outside
	// edges point inwards towards the central edge(s)
	const firstAngle = Math.min(...lineAngles[0]);
	const anglesClosestToFirstAngle = lineAngles.map((angles) => {
		return angles.reduce((a, b) => {
			const absA = Math.abs(firstAngle - a);
			const absB = Math.abs(firstAngle - b);
			console.log(a, b, absA, absB);
			return absA < absB ? a : b;
		});
	});
	const maxAngle = Math.max(...anglesClosestToFirstAngle);
	const minAngle = Math.min(...anglesClosestToFirstAngle);

	return {
		minDistance: minDist,
		maxDistance: maxDist,
		averageDistance: totalDist / intersectionDistances.length,
		averageRange: totalRange / intersectionDistances.length,
		hasParallelLines,
		angleDiffDegrees: maxAngle - minAngle,
		lineAngles,
	};
}

/**
 * for two points to be considered connected
 * they must be closer than this distance
 * @const {number} MAX_CORNER_DISTANCE
 */
const MAX_CORNER_DISTANCE = 20;
const POINTS_ON_LINE = ['start', 'end'];

/**
 * build up the matrix of distances between each corner
 * on the cube. do it incrementally for each line drawn.
 * mutates the passed in matrix, and assumes lineIdxs are
 * passed in in the correct order
 *
 * @param {number[][]} matrix
 * @param {object} opts
 * @param {object[]} opts.lineHistory
 * @param {number} opts.lineIdx
 */
function incrementallyBuildCornerDistanceMatrix(
	matrix,
	{ lineHistory, lineIdx }
) {
	matrix.push([], []);
	// find distance between the two points on this line
	// to every point that has been analysed so far.
	currPointLoop: for (const currPointIdx in POINTS_ON_LINE) {
		const currCornerIdx = lineIdx * 2 + Number(currPointIdx);

		for (
			let compareLineIdx = 0;
			compareLineIdx <= lineIdx;
			compareLineIdx++
		) {
			for (const comparePointIdx in POINTS_ON_LINE) {
				const compCornerIdx =
					compareLineIdx * 2 + Number(comparePointIdx);
				if (currCornerIdx === matrix[currCornerIdx].length) {
					matrix[currCornerIdx].push(0);
					continue currPointLoop;
				} else {
					const dist = distanceBetweenPoints(
						lineHistory[lineIdx][POINTS_ON_LINE[currPointIdx]],
						lineHistory[compareLineIdx][
							POINTS_ON_LINE[comparePointIdx]
						]
					);
					matrix[currCornerIdx].push(dist);
					matrix[compCornerIdx].push(dist);
				}
			}
		}
	}
}

/**
 * @param {object} opts
 * @param {Position[]} opts.points
 * @param {Position} opts.lineStart
 * @param {Position} opts.lineEnd
 * @returns {number} average deviation
 */
function averagePointDeviation({ points, lineStart, lineEnd }) {
	const total = points.reduce(
		(subtotal, point) =>
			subtotal + distanceFromPointToLine({ point, lineStart, lineEnd }),
		0
	);
	return total / points.length;
}

/**
 * @typedef {object} LineAnalysis
 * @property {Position} start
 * @property {Position} end
 * @property {Position} boxStart
 * @property {Position} boxEnd
 * @property {number|NaN} gradient
 * @property {number|NaN} yIntercept
 * @property {number} averageDeviation
 */

/**
 * @typedef {object} Analysis
 * @property {LineAnalysis[]} analysedLines
 * @property {number[][]} cornerDistanceMatrix
 * @property {object[]} debugLineDetails
 * @property {object} debugProperties
 * @property {number} averageCornerDistance
 * @property {number} averageLineDeviation
 * @property {number} overallPerspectiveScore
 */

/**
 * @param {object} opts
 * @param {object[]} opts.lineHistory
 * @param {object} opts.canvasSize
 * @param {object} opts.debugProperties
 * @param {object[]} opts.debugProperties
 * @returns {Analysis}
 */
export function analyse({
	lineHistory,
	canvasSize,
	debugProperties = {},
	debugLineDetails = [],
}) {
	const analysedLines = [];
	let totalAverageLineDeviation = 0;
	let totalCornerDistance = 0;
	let cornerCount = 0;

	// first, build up the corner distance matrix
	// and calculate the extended lines to plot later
	const cornerDistanceMatrix = [];
	for (const [lineIdx, { start, end, points }] of Object.entries(
		lineHistory
	)) {
		incrementallyBuildCornerDistanceMatrix(cornerDistanceMatrix, {
			lineHistory,
			lineIdx,
		});

		const { gradient, yIntercept } = calculateEquation({ start, end });
		debugLineDetails[lineIdx].gradient = gradient;
		debugLineDetails[lineIdx].yIntercept = yIntercept;

		const { start: lineStart, end: lineEnd } = findExtendedLineEnds({
			start,
			end,
			gradient,
			yIntercept,
			canvasSize,
		});

		const averageDeviation = averagePointDeviation({
			points,
			lineStart,
			lineEnd,
		});
		debugLineDetails[lineIdx].averageDeviation = averageDeviation;
		totalAverageLineDeviation += averageDeviation;

		analysedLines.push({
			start: lineStart,
			end: lineEnd,
			boxStart: start,
			boxEnd: end,
			gradient,
			yIntercept,
			averageDeviation,
		});
	}

	// then map which lines are connected to which
	const lineConnectionMap = {};
	const cornerConnectionMap = {};
	const cornerIdxToLineIdx = (cornerIdx) => Math.floor(cornerIdx / 2);
	let needSecondPass = [];
	for (const cornerIdx in cornerDistanceMatrix) {
		const lineIdx = cornerIdxToLineIdx(cornerIdx);
		const distances = cornerDistanceMatrix[cornerIdx];
		const sortedDistances = Object.entries(distances)
			.filter(
				([idx, dist]) => idx != cornerIdx && dist < MAX_CORNER_DISTANCE
			)
			.sort((a, b) => {
				return a[1] - b[1];
			});

		if (sortedDistances.some((distances) => distances.length === 0)) {
			throw new Error('Corners not close enough');
		}

		// this will possibly include some that are later filtered
		// out by the second pass, but oh well
		const cornerDistancesForLine = sortedDistances.reduce(
			(total, curr) => total + curr[1],
			0
		);
		totalCornerDistance += cornerDistancesForLine;
		cornerCount += sortedDistances.length;
		debugLineDetails[lineIdx].averageCornerDistance =
			cornerDistancesForLine / sortedDistances.length;

		cornerConnectionMap[cornerIdx] = sortedDistances.map(([idx]) =>
			Number(idx)
		);

		if (cornerConnectionMap[cornerIdx].length > 2) {
			needSecondPass.push([cornerIdx, cornerConnectionMap[cornerIdx]]);
		} else {
			const cornerToLinesConnected = cornerConnectionMap[
				cornerIdx
			].map((idx) => cornerIdxToLineIdx(idx));
			lineConnectionMap[lineIdx] = (
				lineConnectionMap[lineIdx] || []
			).concat(cornerToLinesConnected);
			debugLineDetails[lineIdx].connections = lineConnectionMap[lineIdx];
		}
	}

	const otherEndCorner = (cornerIdx) =>
		cornerIdx % 2 ? cornerIdx - 1 : cornerIdx + 1;
	// if two separate corners are close together
	// try to use info about the other corner on the line
	// to filter down the connections.
	for (const [cornerIdx, connections] of needSecondPass) {
		const lineIdx = cornerIdxToLineIdx(cornerIdx);
		const otherEndConnections =
			cornerConnectionMap[otherEndCorner(Number(cornerIdx))];

		const secondOrderCornerConnections = otherEndConnections.flatMap(
			(idx) => cornerConnectionMap[otherEndCorner(idx)]
		);
		const secondOrderLineConnections = secondOrderCornerConnections.map(
			(idx) => cornerIdxToLineIdx(idx)
		);

		const thirdOrderCornerConnections = secondOrderCornerConnections.map(
			(idx) => cornerConnectionMap[otherEndCorner(idx)]
		);
		const thirdOrderLineConnections = thirdOrderCornerConnections.map(
			(corners) => corners.map((idx) => cornerIdxToLineIdx(idx))
		);
		const thirdOrderLineFrequencies = thirdOrderLineConnections.reduce(
			(acc, curr) => {
				for (const line of curr) {
					acc[line] = (acc[line] || 0) + 1;
				}
				return acc;
			},
			{}
		);

		const commonToThreeThirdOrder = Object.keys(thirdOrderLineFrequencies)
			.filter((key) => thirdOrderLineFrequencies[key] === 3)
			.map((a) => Number(a));

		lineConnectionMap[lineIdx] = (lineConnectionMap[lineIdx] || []).concat(
			connections
				.map((idx) => cornerIdxToLineIdx(idx))
				.filter((idx) => {
					if (commonToThreeThirdOrder.length === 2)
						return commonToThreeThirdOrder.includes(idx);
					else return !secondOrderLineConnections.includes(idx);
				})
		);
	}

	// group the lines such that each group contains edges
	// that are parallel on the cube
	const groupedConnections = [];
	let ungrouped = Array.from({ length: analysedLines.length }, (_, i) => i);
	const intersect = (a, b) => a.filter((el) => b.includes(el));
	while (ungrouped.length) {
		const lineIdx = ungrouped.shift();
		analysedLines[lineIdx].groupIdx = groupedConnections.length;
		debugLineDetails[lineIdx].groupIdx = groupedConnections.length;
		const group = [lineIdx];

		function findUngroupedConnections(toMatch) {
			const toMatchConnections = lineConnectionMap[toMatch];
			const matches = ungrouped.filter((idx) => {
				const ungroupedLineConnections = lineConnectionMap[idx];
				return (
					intersect(toMatchConnections, ungroupedLineConnections)
						.length === 2
				);
			});
			ungrouped = ungrouped.filter((a) => !matches.includes(a));
			return matches.concat(
				matches.flatMap((i) => findUngroupedConnections(i))
			);
		}
		const matches = findUngroupedConnections(lineIdx);
		group.push(...matches);
		for (const matchLineIdx of matches) {
			analysedLines[matchLineIdx].groupIdx = groupedConnections.length;
			debugLineDetails[matchLineIdx].groupIdx = groupedConnections.length;
		}
		groupedConnections.push(group);
	}

	let totalLinePerspectiveScore = 0;
	// for each group of lines, calculate their intersection closeness
	for (const [groupIdx, group] of Object.entries(groupedConnections)) {
		const closeness = intersectionClosenessForLines(
			group.map((idx) => analysedLines[idx])
		);

		if (closeness.hasParallelLines) {
			totalLinePerspectiveScore +=
				100 - Math.min(100, closeness.angleDiffDegrees);
		} else {
			totalLinePerspectiveScore +=
				100 -
				Math.min(
					100,
					closeness.averageRange / Math.sqrt(closeness.minDistance)
				);
		}
		if (!debugProperties.perspectiveScores)
			debugProperties.perspectiveScores = [];
		debugProperties.perspectiveScores.push({ groupIdx, closeness });
	}
	const overallPerspectiveScore =
		totalLinePerspectiveScore / groupedConnections.length;

	return {
		analysedLines,
		cornerDistanceMatrix,
		debugLineDetails,
		debugProperties,
		averageCornerDistance: totalCornerDistance / cornerCount,
		averageLineDeviation: totalAverageLineDeviation / analysedLines.length,
		overallPerspectiveScore,
	};
}
