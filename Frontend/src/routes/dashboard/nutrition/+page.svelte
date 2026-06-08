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
					kcal: Math.round(p.nutriments['energy-kcal_100g'])
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

	$effect(() => { loadLog(); });
</script>

<div class="page">
	<div class="header">
		<h2>{$t('nutrition.title')}</h2>
		<div class="total-badge">
			<span class="total-num">{totalKcal}</span>
			<span class="total-label">{$t('nutrition.kcal')} {$t('nutrition.totalDay').toLowerCase()}</span>
		</div>
	</div>

	<!-- Search -->
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

		<!-- Results -->
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

		<!-- Add form -->
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

	<!-- Daily log -->
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

	/* Search */
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

	/* Add form */
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

	/* Log */
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
</style>
