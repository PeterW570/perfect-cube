import {
	deepEqual,
	distanceBetweenPoints,
	findTranslationBetweenPoints,
	translatePoint,
} from './utils';

/**
 * @typedef {object} EquationDef
 * @property {number|NaN} gradient
 * @property {number|NaN} yIntercept
 */

/**
 * given two points, calculate the equation of the line
 * that goes through them.
 * @param {object} opts
 * @param {Position} opts.start
 * @param {Position} opts.end
 * @returns {EquationDef} object with
 */
function calulateEquation({ start, end }) {
	const rightMostPoint = start.x > end.x ? start : end;
	const leftMostPoint = start.x < end.x ? start : end;

	const gradient =
		(rightMostPoint.y - leftMostPoint.y) /
		(rightMostPoint.x - leftMostPoint.x);
	const yIntercept = start.y - gradient * start.x;

	return {
		gradient,
		yIntercept,
	};
}

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
 * for two points to be considered connected
 * they must be closer than this distance
 * @const {number} MAX_CORNER_DISTANCE
 */
const MAX_CORNER_DISTANCE = 10;
const POINTS_ON_LINE = ['start', 'end'];

/**
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
 * @typedef {object} Analysis
 * @property {object[]} analysedLines
 * @property {number[][]} cornerDistanceMatrix
 * @property {object[]} debugLineDetails
 * @property {object} debugProperties
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

	const cornerDistanceMatrix = [];
	for (const [lineIdx, { start, end }] of Object.entries(lineHistory)) {
		incrementallyBuildCornerDistanceMatrix(cornerDistanceMatrix, {
			lineHistory,
			lineIdx,
		});

		const { gradient, yIntercept } = calulateEquation({ start, end });
		debugLineDetails[lineIdx].gradient = gradient;
		debugLineDetails[lineIdx].yIntercept = yIntercept;

		const { start: lineStart, end: lineEnd } = findExtendedLineEnds({
			start,
			end,
			gradient,
			yIntercept,
			canvasSize,
		});

		analysedLines.push({
			start: lineStart,
			end: lineEnd,
		});
	}

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

		cornerConnectionMap[cornerIdx] = sortedDistances.map(([idx]) =>
			Number(idx)
		);
		const cornerToLinesConnected = cornerConnectionMap[
			cornerIdx
		].map((idx) => cornerIdxToLineIdx(idx));
		if (cornerToLinesConnected.length > 2) {
			needSecondPass.push([cornerIdx, cornerConnectionMap[cornerIdx]]);
		} else {
			lineConnectionMap[lineIdx] = (
				lineConnectionMap[lineIdx] || []
			).concat(cornerToLinesConnected);
			debugLineDetails[lineIdx].connections = lineConnectionMap[lineIdx];
		}
	}

	const otherEndCorner = (cornerIdx) =>
		cornerIdx % 2 ? cornerIdx - 1 : cornerIdx + 1;
	// if one end of the line is close to another line's corner
	// try to use info about the other corner to filter down
	// the connections.
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

		const commonToThree = Object.keys(thirdOrderLineFrequencies)
			.filter((key) => thirdOrderLineFrequencies[key] === 3)
			.map((a) => Number(a));
		const commonToFewerThanThree = Object.keys(thirdOrderLineFrequencies)
			.filter((key) => thirdOrderLineFrequencies[key] < 3)
			.map((a) => Number(a));

		lineConnectionMap[lineIdx] = (lineConnectionMap[lineIdx] || []).concat(
			connections
				.map((idx) => cornerIdxToLineIdx(idx))
				.filter((idx) => {
					if (commonToThree.length === 2)
						return commonToThree.includes(idx);
					else return !secondOrderLineConnections.includes(idx);
				})
		);
	}

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

	return {
		analysedLines,
		cornerDistanceMatrix,
		debugLineDetails,
		debugProperties,
	};
}
