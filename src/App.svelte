<script>
	import { onMount } from 'svelte';

	let canvasEl;
	let ctx;

	let canvasOffsets = { x: 0, y: 0 };

	let startPosition = { x: 0, y: 0 };
	let endPosition = { x: 0, y: 0 };
	let isDrawing = false;

	const getClientOffset = (event) => {
		const { pageX, pageY } = event.touches ? event.touches[0] : event;
		const x = pageX - canvasOffsets.x;
		const y = pageY - canvasOffsets.y;

		return {
			x,
			y,
		};
	};

	function drawLine() {
		ctx.beginPath();
		ctx.moveTo(startPosition.x, startPosition.y);
		ctx.lineTo(endPosition.x, endPosition.y);
		ctx.stroke();
	}

	function onMouseDown(event) {
		startPosition = getClientOffset(event);
		isDrawing = true;
	}

	function onMouseMove(event) {
		if (!isDrawing) return;

		endPosition = getClientOffset(event);
		drawLine();
		startPosition = endPosition;
	}

	function onMouseUp(event) {
		isDrawing = false;
	}

	function clearCanvas() {
		ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
	}

	onMount(() => {
		ctx = canvasEl.getContext('2d');
		canvasOffsets.x = canvasEl.getBoundingClientRect().left;
		canvasOffsets.y = canvasEl.getBoundingClientRect().top;
		ctx.strokeStyle = '#000';
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.lineWidth = 1;
	});
</script>

<main>
	<div>
		<button on:click={clearCanvas}>Clear</button>
	</div>
	<div class="artboard">
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
</main>

<style>
	* {
		position: relative;
		box-sizing: border-box;
	}

	main {
		text-align: center;
		padding: 1em;
		max-width: 40em;
		margin: 0 auto;
	}

	.artboard > canvas {
		border: 1px solid #dadada;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
