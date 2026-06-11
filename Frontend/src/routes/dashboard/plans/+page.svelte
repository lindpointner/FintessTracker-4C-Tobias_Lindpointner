<script>
	import { token } from '$lib/userStore';
	import { t } from '$lib/i18n';
	import { goto } from '$app/navigation';

	const API = 'http://localhost:3000';

	const COMMON_EXERCISES = [
		'Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken', 'Klimmzüge',
		'Bizeps-Curls', 'Trizepsdrücken', 'Rudern', 'Beinpresse', 'Latzug',
		'Liegestütze', 'Plank', 'Ausfallschritte', 'Wadenheben'
	];

	let plans = $state([]);
	let loading = $state(true);
	let expanded = $state(null);

	let showModal = $state(false);
	let saving = $state(false);
	let formError = $state('');
	let editingId = $state(null);

	function blankExercise() {
		return { name: '', sets: 3, reps: 10, weight_kg: '' };
	}

	function blankDay(n) {
		return { name: '', day_number: n, exercises: [blankExercise()] };
	}

	let form = $state({ name: '', description: '', days: [blankDay(1)] });

	async function loadPlans() {
		loading = true;
		try {
			const res = await fetch(`${API}/api/plans`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) plans = await res.json();
		} catch {}
		loading = false;
	}

	function openModal(plan = null) {
		if (plan) {
			editingId = plan.id;
			form = {
				name: plan.name,
				description: plan.description || '',
				days: plan.days.length
					? plan.days.map(d => ({
							name: d.name || '',
							day_number: d.day_number,
							exercises: d.exercises.length
								? d.exercises.map(e => ({
										name: e.name,
										sets: e.sets,
										reps: e.reps,
										weight_kg: e.weight_kg ?? ''
									}))
								: [blankExercise()]
						}))
					: [blankDay(1)]
			};
		} else {
			editingId = null;
			form = { name: '', description: '', days: [blankDay(1)] };
		}
		formError = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function addDay() {
		form.days = [...form.days, blankDay(form.days.length + 1)];
	}

	function removeDay(i) {
		form.days = form.days.filter((_, idx) => idx !== i);
		if (form.days.length === 0) form.days = [blankDay(1)];
	}

	function addExerciseRow(day) {
		day.exercises = [...day.exercises, blankExercise()];
	}

	function removeExerciseRow(day, i) {
		day.exercises = day.exercises.filter((_, idx) => idx !== i);
		if (day.exercises.length === 0) day.exercises = [blankExercise()];
	}

	async function savePlan() {
		if (!form.name.trim()) {
			formError = $t('plans.errorName');
			return;
		}
		saving = true;
		try {
			const body = {
				name: form.name.trim(),
				description: form.description.trim(),
				days: form.days.map((d, i) => ({
					day_number: i + 1,
					name: d.name.trim(),
					exercises: d.exercises
						.filter(e => e.name && e.name.trim())
						.map(e => ({
							name: e.name.trim(),
							sets: parseInt(e.sets) || 3,
							reps: parseInt(e.reps) || 10,
							weight_kg: e.weight_kg
						}))
				}))
			};

			const res = await fetch(editingId ? `${API}/api/plans/${editingId}` : `${API}/api/plans`, {
				method: editingId ? 'PUT' : 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const p = await res.json();
				if (editingId) plans = plans.map(x => (x.id === p.id ? p : x));
				else plans = [p, ...plans];
				showModal = false;
			}
		} catch {}
		saving = false;
	}

	async function deletePlan(id) {
		try {
			const res = await fetch(`${API}/api/plans/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) {
				plans = plans.filter(p => p.id !== id);
				if (expanded === id) expanded = null;
			}
		} catch {}
	}

	function toggleExpand(id) {
		expanded = expanded === id ? null : id;
	}

	function startWorkout(plan, day) {
		goto(`/dashboard/workouts?plan=${plan.id}&day=${day.id}`);
	}

	function exerciseLine(ex) {
		let s = `${ex.sets}×${ex.reps}`;
		if (ex.weight_kg != null && ex.weight_kg !== 0) s += ` · ${ex.weight_kg} kg`;
		return s;
	}

	function dayLabel(day) {
		return day.name?.trim() ? day.name : `${$t('plans.day')} ${day.day_number}`;
	}

	$effect(() => { loadPlans(); });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && showModal) closeModal(); }} />

<div class="page">
	<div class="header">
		<h2>{$t('plans.title')}</h2>
		<button class="btn-primary" onclick={() => openModal()}>+ {$t('plans.add')}</button>
	</div>

	<div class="list">
		{#if loading}
			<p class="empty">{$t('plans.loading')}</p>
		{:else if plans.length === 0}
			<p class="empty">{$t('plans.empty')}</p>
		{:else}
			{#each plans as plan (plan.id)}
				<div class="plan">
					<div class="plan-main">
						<div class="plan-info">
							<span class="plan-title">{plan.name}</span>
							<span class="plan-meta">
								{plan.days.length}
								{plan.days.length === 1 ? $t('plans.day') : $t('plans.days')}{#if plan.description}&nbsp;· {plan.description}{/if}
							</span>
						</div>
						<div class="plan-right">
							<button class="link-btn" onclick={() => toggleExpand(plan.id)}>
								{expanded === plan.id ? $t('plans.collapse') : $t('plans.view')}
							</button>
							<button class="link-btn" onclick={() => openModal(plan)}>{$t('plans.edit')}</button>
							<button class="delete-btn" onclick={() => deletePlan(plan.id)}>✕</button>
						</div>
					</div>

					{#if expanded === plan.id}
						<div class="plan-detail">
							{#each plan.days as day (day.id)}
								<div class="day">
									<div class="day-head">
										<span class="day-name">{dayLabel(day)}</span>
										<button class="start-btn" onclick={() => startWorkout(plan, day)}>
											▶ {$t('plans.startWorkout')}
										</button>
									</div>
									{#if day.exercises.length > 0}
										<ul class="exercise-list">
											{#each day.exercises as ex (ex.id)}
												<li>
													<span class="ex-name">{ex.name}</span>
													<span class="ex-meta">{exerciseLine(ex)}</span>
												</li>
											{/each}
										</ul>
									{:else}
										<p class="empty">{$t('plans.noExercises')}</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Create/edit modal -->
{#if showModal}
	<div class="modal-overlay">
		<button class="modal-backdrop" aria-label={$t('plans.cancel')} onclick={closeModal}></button>
		<div class="modal">
			<h3>{editingId ? $t('plans.modalTitleEdit') : $t('plans.modalTitleAdd')}</h3>

			<div class="modal-scroll">
				<div class="field">
					<label for="pl-name">{$t('plans.name')}</label>
					<input
						id="pl-name"
						type="text"
						bind:value={form.name}
						placeholder={$t('plans.namePlaceholder')}
						autocomplete="off"
					/>
				</div>

				<div class="field">
					<label for="pl-desc">{$t('plans.description')}</label>
					<input id="pl-desc" type="text" bind:value={form.description} autocomplete="off" />
				</div>

				{#each form.days as day, di (di)}
					<div class="day-block">
						<div class="day-block-head">
							<input
								type="text"
								class="day-name-input"
								bind:value={day.name}
								placeholder="{$t('plans.day')} {di + 1} – {$t('plans.dayNamePlaceholder')}"
								autocomplete="off"
							/>
							<button class="ex-remove" onclick={() => removeDay(di)} aria-label="✕">✕</button>
						</div>

						<div class="ex-head">
							<span>{$t('workouts.exercise')}</span>
							<span>{$t('workouts.sets')}</span>
							<span>{$t('workouts.reps')}</span>
							<span>{$t('workouts.weight')}</span>
							<span></span>
						</div>
						{#each day.exercises as ex, i (i)}
							<div class="ex-row">
								<input
									type="text"
									list="exercise-options"
									bind:value={ex.name}
									placeholder={$t('workouts.exercisePlaceholder')}
									autocomplete="off"
								/>
								<input type="number" min="1" max="20" bind:value={ex.sets} title={$t('workouts.sets')} />
								<input type="number" min="0" bind:value={ex.reps} title={$t('workouts.reps')} />
								<input type="number" min="0" step="0.5" bind:value={ex.weight_kg} placeholder="–" title={$t('workouts.weight')} />
								<button class="ex-remove" onclick={() => removeExerciseRow(day, i)} aria-label="✕">✕</button>
							</div>
						{/each}
						<button class="add-ex-btn" onclick={() => addExerciseRow(day)}>+ {$t('workouts.addExercise')}</button>
					</div>
				{/each}

				<button class="add-ex-btn add-day-btn" onclick={addDay}>+ {$t('plans.addDay')}</button>
			</div>

			{#if formError}
				<p class="form-error">{formError}</p>
			{/if}

			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeModal}>{$t('plans.cancel')}</button>
				<button class="btn-primary" onclick={savePlan} disabled={saving}>
					{saving ? $t('plans.saving') : $t('plans.save')}
				</button>
			</div>
		</div>
	</div>

	<datalist id="exercise-options">
		{#each COMMON_EXERCISES as name}
			<option value={name}></option>
		{/each}
	</datalist>
{/if}

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

	/* List */
	.list { display: flex; flex-direction: column; gap: 10px; }

	.empty { margin: 0; color: #555; font-size: 14px; }

	.plan {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		overflow: hidden;
	}

	.plan-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		gap: 12px;
	}

	.plan-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

	.plan-title {
		font-size: 15px;
		font-weight: 600;
		color: #e0e0e0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.plan-meta {
		font-size: 12px;
		color: #555;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.plan-right {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.link-btn {
		background: none;
		border: none;
		color: #888;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		padding: 4px 6px;
		border-radius: 6px;
		transition: color 0.15s, background 0.15s;
	}

	.link-btn:hover { color: #4a90e2; background: #232a3a; }

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

	.plan-detail {
		padding: 14px 16px;
		border-top: 1px solid #1e2438;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.day {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.day-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.day-name {
		font-size: 12px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.start-btn {
		background: #1e3a5f;
		border: 1px solid #2a4070;
		color: #4a90e2;
		font-size: 12px;
		font-weight: 600;
		font-family: inherit;
		cursor: pointer;
		padding: 5px 12px;
		border-radius: 999px;
		transition: background 0.15s;
		white-space: nowrap;
	}

	.start-btn:hover { background: #24477a; }

	.exercise-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.exercise-list li {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		font-size: 14px;
	}

	.ex-name { color: #e0e0e0; }

	.ex-meta { color: #4a90e2; font-size: 13px; white-space: nowrap; }

	/* Buttons */
	.btn-primary {
		padding: 8px 16px;
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
	.btn-primary:disabled { opacity: 0.6; cursor: default; }

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

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		z-index: 200;
	}

	.modal-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		border: none;
		padding: 0;
		margin: 0;
		cursor: default;
	}

	.modal {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 500px;
		max-height: 85vh;
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 14px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.modal h3 { margin: 0; font-size: 18px; }

	.modal-scroll {
		display: flex;
		flex-direction: column;
		gap: 14px;
		overflow-y: auto;
		padding-right: 4px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label { font-size: 13px; color: #aaa; }

	input {
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

	input:focus { border-color: #4a90e2; }

	/* Day blocks in modal */
	.day-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
		background: #161b28;
		border: 1px solid #232a3a;
		border-radius: 10px;
		padding: 12px;
	}

	.day-block-head {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.day-name-input { flex: 1; }

	/* Exercise builder */
	.ex-head,
	.ex-row {
		display: grid;
		grid-template-columns: 1fr 52px 52px 64px 26px;
		gap: 6px;
		align-items: center;
	}

	.ex-head {
		margin-bottom: -4px;
	}

	.ex-head span {
		font-size: 11px;
		color: #555;
		padding-left: 2px;
	}

	.ex-row input {
		padding: 8px 8px;
		font-size: 13px;
	}

	.ex-row input[type="number"] {
		text-align: center;
		padding: 8px 4px;
	}

	.ex-remove {
		background: none;
		border: none;
		color: #444;
		font-size: 12px;
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
		transition: color 0.15s, background 0.15s;
	}

	.ex-remove:hover {
		color: #e08080;
		background: rgba(220, 100, 100, 0.1);
	}

	.add-ex-btn {
		margin-top: 2px;
		padding: 8px;
		background: #0f1419;
		border: 1px dashed #2a4070;
		border-radius: 8px;
		color: #4a90e2;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s;
	}

	.add-ex-btn:hover { background: #16203a; }

	.add-day-btn {
		border-style: solid;
		font-weight: 600;
	}

	.form-error {
		margin: 0;
		font-size: 13px;
		color: #e08080;
	}

	.modal-actions {
		display: flex;
		gap: 10px;
		justify-content: flex-end;
	}
</style>
