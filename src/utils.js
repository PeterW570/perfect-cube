/**
 * A position with x, y coordinates
 * @typedef {object} Position
 * @property {number} x - The x coordinate
 * @property {number} y - The y coordinate
 */

/**
 * find the distance between two cartesian points
 * @param {Position} pointA
 * @param {Position} pointB
 * @returns {number} distance
 */
export function distanceBetweenPoints(pointA, pointB) {
	const diffX = pointB.x - pointA.x;
	const diffY = pointB.y - pointA.y;
	return Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
}
