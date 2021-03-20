<script>
	const STORAGE_KEY = 'user-color-scheme';
	let theme;

	function setTheme(toSet) {
		theme = toSet;
		localStorage.setItem(STORAGE_KEY, theme);
		document.documentElement.setAttribute('data-theme', theme);
	}

	function onChangeTheme(e) {
		setTheme(e.currentTarget.value);
	}

	setTheme(localStorage.getItem(STORAGE_KEY) || 'auto');
</script>

<div class="theme-radios flex hr-flow">
	<div class="text-center">
		<input
			type="radio"
			id="light-theme-radio"
			name="theme"
			value="light"
			bind:group={theme}
			on:change={onChangeTheme}
		/>
		<label for="light-theme-radio">Light</label>
	</div>
	<div class="text-center">
		<input
			type="radio"
			id="dark-theme-radio"
			name="theme"
			value="dark"
			bind:group={theme}
			on:change={onChangeTheme}
		/>
		<label for="dark-theme-radio">Dark</label>
	</div>
	<div class="text-center">
		<input
			type="radio"
			id="auto-theme-radio"
			name="theme"
			value="auto"
			bind:group={theme}
			on:change={onChangeTheme}
		/>
		<label for="auto-theme-radio">Auto</label>
	</div>
</div>

<style>
	label {
		text-transform: uppercase;
		font-size: 0.7rem;
	}
</style>
