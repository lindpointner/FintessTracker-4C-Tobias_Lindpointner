<script>
	import { token } from '$lib/userStore';
	import { t, locale } from '$lib/i18n';

	const API = 'http://localhost:3000';
	const today = new Date().toISOString().split('T')[0];

	let query = $state('');
	let searchResults = $state([]);
	let searching = $state(false);
	let searchTimeout = null;
	let selected = $state(null); 
	let addAmount = $state('100');
	let addMealType = $state('snack');

	function onKeyUp() {
		clearTimeout(searchTimeout);
		if (!query.trim()) { searchResults = []; return; }
		searching = true;
		searchTimeout = setTimeout(searchFood, 400);
	}

	async function searchFood() {
		try {
			const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,brands`;
			const res = await fetch(url);
			const data = await res.json();
			searchResults = (data.products || [])
				.filter(p => p.product_name && p.nutriments?.['energy-kcal_100g'] != null)
				.map(p => ({
					name: p.product_name,
					brand: p.brands || '',
					kcal: Math.round(p.nutriments['energy-kcal_100g']),
					protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
					carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
					fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10
				}))
				.slice(0, 8);
		} catch {
			searchResults = [];
		}
		searching = false;
	}

	function selectFood(item) {
		selected = item;
		addAmount = '100';
		addMealType = 'snack';
	}

	function cancelAdd() {
		selected = null;
	}

	let log = $state([]);
	let logLoading = $state(true);

	async function loadLog() {
		logLoading = true;
		try {
			const res = await fetch(`${API}/api/nutrition?date=${today}`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) log = await res.json();
		} catch {}
		logLoading = false;
	}

	async function addEntry() {
		if (!selected || !addAmount) return;
		try {
			const res = await fetch(`${API}/api/nutrition`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({
					food_name: selected.name,
					calories_per_100g: selected.kcal,
					protein_per_100g: selected.protein || 0,
					carbs_per_100g: selected.carbs || 0,
					fat_per_100g: selected.fat || 0,
					amount_g: parseFloat(addAmount),
					meal_type: addMealType
				})
			});
			if (res.ok) {
				const entry = await res.json();
				log = [...log, entry];
				selected = null;
				query = '';
				searchResults = [];
			}
		} catch {}
	}

	async function removeEntry(id) {
		try {
			const res = await fetch(`${API}/api/nutrition/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) log = log.filter(e => e.id !== id);
		} catch {}
	}

	const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

	let grouped = $derived.by(() => {
		const map = {};
		for (const type of mealOrder) map[type] = [];
		for (const entry of log) {
			const t = mealOrder.includes(entry.meal_type) ? entry.meal_type : 'snack';
			map[t].push(entry);
		}
		return map;
	});

	let totalKcal = $derived(log.reduce((s, e) => s + (e.total_kcal || 0), 0));

	let addKcal = $derived.by(() => {
		if (!selected || !addAmount) return 0;
		return Math.round(selected.kcal * parseFloat(addAmount || 0) / 100);
	});

	const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

	const GLASS_ML = 250;
	const WATER_GOAL = 2000;
	const GLASS_COUNT = WATER_GOAL / GLASS_ML;

	let waterMl = $state(0);
	let filledGlasses = $derived(Math.round(waterMl / GLASS_ML));

	async function loadWater() {
		try {
			const res = await fetch(`${API}/api/water?date=${today}`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) {
				const data = await res.json();
				waterMl = data.total_ml || 0;
			}
		} catch {}
	}

	async function setWater(ml) {
		const prev = waterMl;
		waterMl = ml;
		try {
			const res = await fetch(`${API}/api/water`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({ total_ml: ml })
			});
			if (!res.ok) waterMl = prev;
		} catch {
			waterMl = prev;
		}
	}

	function toggleGlass(n) {
		const target = filledGlasses === n ? n - 1 : n;
		setWater(target * GLASS_ML);
	}

	$effect(() => { loadLog(); loadWater(); });
</script>

<div class="page">
	<div class="header">
		<h2>{$t('nutrition.title')}</h2>
		<div class="total-badge">
			<span class="total-num">{totalKcal}</span>
			<span class="total-label">{$t('nutrition.kcal')} {$t('nutrition.totalDay').toLowerCase()}</span>
		</div>
	</div>

	<div class="search-wrap">
		<div class="search-box">
			<svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
			<input
				type="text"
				bind:value={query}
				onkeyup={onKeyUp}
				placeholder={$t('nutrition.search')}
				autocomplete="off"
			/>
			{#if searching}
				<span class="searching-hint">{$t('nutrition.searching')}</span>
			{/if}
		</div>

		{#if searchResults.length > 0 && !selected}
			<ul class="results">
				{#each searchResults as item}
					<li>
						<button class="result-btn" onclick={() => selectFood(item)}>
							<div class="result-info">
								<span class="result-name">{item.name}</span>
								{#if item.brand}<span class="result-brand">{item.brand}</span>{/if}
							</div>
							<span class="result-kcal">{item.kcal} {$t('nutrition.kcalPer100g')}</span>
						</button>
					</li>
				{/each}
			</ul>
		{:else if query.trim() && !searching && searchResults.length === 0}
			<p class="no-results">{$t('nutrition.noResults')}</p>
		{/if}

		{#if selected}
			<div class="add-form">
				<div class="add-form-title">
					<strong>{selected.name}</strong>
					<span class="add-kcal-preview">{addKcal} kcal</span>
				</div>
				<div class="add-form-row">
					<div class="field">
						<label for="amount">{$t('nutrition.amount')}</label>
						<input id="amount" type="number" min="1" max="2000" bind:value={addAmount} />
					</div>
					<div class="field">
						<label for="meal">{$t('nutrition.mealType')}</label>
						<select id="meal" bind:value={addMealType}>
							<option value="breakfast">{$t('nutrition.breakfast')}</option>
							<option value="lunch">{$t('nutrition.lunch')}</option>
							<option value="dinner">{$t('nutrition.dinner')}</option>
							<option value="snack">{$t('nutrition.snack')}</option>
						</select>
					</div>
				</div>
				<div class="add-form-actions">
					<button class="btn-secondary" onclick={cancelAdd}>{$t('nutrition.cancel')}</button>
					<button class="btn-primary" onclick={addEntry}>{$t('nutrition.add')}</button>
				</div>
			</div>
		{/if}
	</div>

	<div class="water-card">
		<div class="water-head">
			<span class="water-title">💧 {$t('nutrition.water')}</span>
			<span class="water-amount">{(waterMl / 1000).toFixed(2)}<small> / 2 L</small></span>
		</div>
		<div class="glasses">
			{#each Array(GLASS_COUNT) as _, i}
				<button
					class="glass"
					class:filled={i < filledGlasses}
					onclick={() => toggleGlass(i + 1)}
					aria-label={`${(i + 1) * GLASS_ML} ml`}
					title={`${(i + 1) * GLASS_ML} ml`}
				>
					<svg viewBox="0 0 24 24" width="30" height="30">
						<path d="M6 4 H18 L16.4 20.3 A1.3 1.3 0 0 1 15.1 21.5 H8.9 A1.3 1.3 0 0 1 7.6 20.3 Z" />
					</svg>
				</button>
			{/each}
		</div>
		<div class="water-hint">{$t('nutrition.waterHint')}</div>
	</div>

	<div class="log">
		{#if logLoading}
			<p class="empty">Lädt...</p>
		{:else if log.length === 0}
			<p class="empty">{$t('nutrition.emptyLog')}</p>
		{:else}
			{#each mealOrder as mealType}
				{#if grouped[mealType].length > 0}
					<div class="meal-group">
						<div class="meal-header">
							<span>{mealIcons[mealType]} {$t(`nutrition.${mealType}`)}</span>
							<span class="meal-total">{grouped[mealType].reduce((s, e) => s + (e.total_kcal || 0), 0)} kcal</span>
						</div>
						{#each grouped[mealType] as entry (entry.id)}
							<div class="log-entry">
								<div class="entry-info">
									<span class="entry-name">{entry.name}</span>
									<span class="entry-amount">{entry.amount_g}g · {entry.calories_per_100g} kcal/100g</span>
								</div>
								<div class="entry-right">
									<span class="entry-kcal">{entry.total_kcal} kcal</span>
									<button class="delete-btn" onclick={() => removeEntry(entry.id)}>✕</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style>
	.page {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 700px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 { margin: 0; font-size: 22px; }

	.total-badge {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.total-num {
		font-size: 26px;
		font-weight: 700;
		color: #4a90e2;
		line-height: 1;
	}

	.total-label { font-size: 11px; color: #555; }

	.search-wrap {
		display: flex;
		flex-direction: column;
		gap: 0;
		position: relative;
	}

	.search-box {
		display: flex;
		align-items: center;
		gap: 10px;
		background: #1a1f2e;
		border: 1.5px solid #2a3040;
		border-radius: 10px;
		padding: 12px 16px;
		transition: border-color 0.2s;
	}

	.search-box:focus-within { border-color: #4a90e2; }

	.search-icon { color: #555; flex-shrink: 0; }

	.search-box input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: #e0e0e0;
		font-size: 15px;
		font-family: inherit;
	}

	.search-box input::placeholder { color: #444; }

	.searching-hint { font-size: 12px; color: #555; white-space: nowrap; }

	.results {
		list-style: none;
		margin: 4px 0 0;
		padding: 4px;
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.result-btn {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 12px;
		background: none;
		border: none;
		border-radius: 8px;
		color: #e0e0e0;
		font-family: inherit;
		cursor: pointer;
		text-align: left;
		transition: background 0.12s;
		gap: 12px;
	}

	.result-btn:hover { background: #232a3a; }

	.result-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

	.result-name { font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.result-brand { font-size: 11px; color: #555; }

	.result-kcal { font-size: 13px; color: #4a90e2; white-space: nowrap; flex-shrink: 0; }

	.no-results { margin: 8px 0 0; font-size: 13px; color: #555; padding-left: 4px; }

	.add-form {
		margin-top: 4px;
		background: #1a1f2e;
		border: 1px solid #2a4070;
		border-radius: 10px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.add-form-title {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 14px;
	}

	.add-kcal-preview { color: #4a90e2; font-size: 15px; font-weight: 700; }

	.add-form-row {
		display: flex;
		gap: 14px;
	}

	.field {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label { font-size: 13px; color: #aaa; }

	input[type="number"], select {
		padding: 9px 12px;
		background: #0f1419;
		border: 1.5px solid #2a3040;
		border-radius: 8px;
		color: #e0e0e0;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
	}

	input[type="number"]:focus, select:focus { border-color: #4a90e2; }

	select option { background: #1a1f2e; }

	.add-form-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}

	.btn-primary {
		padding: 8px 18px;
		background: #4a90e2;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-primary:hover { background: #357abd; }

	.btn-secondary {
		padding: 8px 18px;
		background: #232a3a;
		color: #aaa;
		border: 1px solid #2a3040;
		border-radius: 8px;
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}

	.btn-secondary:hover { background: #2e3850; color: #e0e0e0; }

	.log { display: flex; flex-direction: column; gap: 12px; }

	.empty { margin: 0; color: #555; font-size: 14px; }

	.meal-group {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		overflow: hidden;
	}

	.meal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 16px;
		background: #1e2438;
		font-size: 13px;
		font-weight: 600;
		color: #888;
	}

	.meal-total { color: #4a90e2; }

	.log-entry {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 11px 16px;
		border-top: 1px solid #1e2438;
		gap: 12px;
	}

	.entry-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

	.entry-name { font-size: 14px; color: #e0e0e0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.entry-amount { font-size: 12px; color: #555; }

	.entry-right {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.entry-kcal { font-size: 14px; font-weight: 600; color: #4a90e2; }

	.delete-btn {
		background: none;
		border: none;
		color: #444;
		font-size: 13px;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 6px;
		transition: color 0.15s, background 0.15s;
	}

	.delete-btn:hover {
		color: #e08080;
		background: rgba(220, 100, 100, 0.1);
	}

	.water-card {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.water-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.water-title { font-size: 14px; font-weight: 600; color: #888; }

	.water-amount {
		font-size: 18px;
		font-weight: 700;
		color: #4ab8e2;
	}

	.water-amount small { font-size: 12px; font-weight: 500; color: #555; }

	.glasses {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.glass {
		background: none;
		border: none;
		padding: 4px;
		cursor: pointer;
		color: #3a4256;
		transition: transform 0.12s, color 0.15s;
	}

	.glass:hover {
		transform: translateY(-2px) scale(1.05);
		color: #4ab8e2;
	}

	.glass svg { display: block; }

	.glass path {
		fill: rgba(74, 184, 226, 0);
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linejoin: round;
		transition: fill 0.2s, stroke 0.2s;
	}

	.glass.filled { color: #4ab8e2; }

	.glass.filled path {
		fill: rgba(74, 184, 226, 0.85);
		stroke: #6fc9ec;
	}

	.water-hint { font-size: 12px; color: #555; }

	@media (max-width: 640px) {
		.page {
			padding: 20px 16px;
			gap: 18px;
		}

		.add-form-row {
			flex-direction: column;
			gap: 10px;
		}

		.add-form-actions button { flex: 1; }

		.glasses { justify-content: space-between; }

		.log-entry { padding: 10px 12px; }
	}
</style>
