/**
 * A position with x, y coordinates
 * @typedef {object} Position
 * @property {number} x - The x coordinate
 * @property {number} y - The y coordinate
 */

/**
 * find the distance between two cartesian points
 * @exports
 * @param {Position} pointA
 * @param {Position} pointB
 * @returns {number} distance
 */
export function distanceBetweenPoints(pointA, pointB) {
	const diffX = pointB.x - pointA.x;
	const diffY = pointB.y - pointA.y;
	return Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
}

/**
 * find the distance from a point to a line
 * where the line if defined by two points
 * https://en.wikipedia.org/wiki/Distance_from_a_point_to_a_line
 * @exports
 * @param {object} opts
 * @param {Position} opts.point
 * @param {Position} opts.lineStart
 * @param {Position} opts.lineEnd
 * @returns {number} distance
 */
export function distanceFromPointToLine({ point, lineStart, lineEnd }) {
	const lineDiffX = lineEnd.x - lineStart.x;
	const lineDiffY = lineEnd.y - lineStart.y;
	const pointToStartDiffX = lineStart.x - point.x;
	const pointToStartDiffY = lineStart.y - point.y;

	const numerator = Math.abs(
		lineDiffX * pointToStartDiffY - pointToStartDiffX * lineDiffY
	);
	const denominator = Math.sqrt(
		Math.pow(lineDiffX, 2) + Math.pow(lineDiffY, 2)
	);

	return numerator / denominator;
}

/**
 * @typedef {object} EquationDef
 * @property {number|NaN} gradient
 * @property {number|NaN} yIntercept
 */

/**
 * given two points, calculate the equation of the line
 * that goes through them.
 * @exports
 * @param {object} opts
 * @param {Position} opts.start
 * @param {Position} opts.end
 * @returns {EquationDef}
 */
export function calculateEquation({ start, end }) {
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
 * check if two variables are equal
 * @param {any} x
 * @param {any} y
 * @returns {boolean} whether x & y are deep equal
 */
function deepEqual(x, y) {
	const bothAreObjects =
		x && y && typeof x === 'object' && typeof y === 'object';
	if (isNaN(x) || isNaN(y)) {
		return isNaN(x) && isNaN(y);
	} else if (bothAreObjects) {
		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);
		return (
			xKeys.length === yKeys.length &&
			xKeys.every((key) => deepEqual(x[key], y[key]))
		);
	} else {
		return x === y;
	}
}

/**
 * given line equations, find the intersection point
 * @exports
 * @throws
 * @param {LineAnalysis} lineA
 * @param {LineAnalysis} lineB
 * @returns {Position}
 */
export function findIntersection(
	{ gradient: a, yIntercept: c, start: startA },
	{ gradient: b, yIntercept: d, start: startB }
) {
	if (deepEqual(a, b)) {
		throw new Error('Lines Parallel');
	}

	if (isNaN(a)) {
		return {
			x: startA.x,
			y: b * startA.x + d,
		};
	} else if (isNaN(b)) {
		return {
			x: startB.x,
			y: a * startB.x + c,
		};
	} else {
		// https://en.wikipedia.org/wiki/Line–line_intersection#Given_two_line_equations
		const x = (d - c) / (a - b);
		const y = a * x + c;

		return {
			x,
			y,
		};
	}
}
