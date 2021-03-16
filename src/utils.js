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
 * find offset between two cartesian points
 * i.e. what to translate pointA by to get to pointB
 * @exports
 * @param {Position} pointA
 * @param {Position} pointB
 * @returns {Position} translate
 */
export function findTranslationBetweenPoints(pointA, pointB) {
	return {
		x: pointB.x - pointA.x,
		y: pointB.y - pointA.y,
	};
}

/**
 * translate a point by x and y offsets
 * @exports
 * @param {Position} pointToTranslate
 * @param {Position} translation
 * @returns {Position} translatedPoint
 */
export function translatePoint(pointToTranslate, translation) {
	return {
		x: pointToTranslate.x + translation.x,
		y: pointToTranslate.y + translation.y,
	};
}

/**
 * check if two variables are equal
 * @exports
 * @param {any} x
 * @param {any} y
 * @returns {boolean} whether x & y are deep equal
 */
export function deepEqual(x, y) {
	const bothAreObjects =
		x && y && typeof x === 'object' && typeof y === 'object';
	if (bothAreObjects) {
		const xKeys = Object.keys(x);
		const yKeys = Object.keys(y);
		return (
			xKeys.length === yKeys.length &&
			xKeys.every((key) => deepEqual(x[key], y[key]))
		);
	} else return x === y;
}
