<script>
	import { token } from '$lib/userStore';
	import { t, locale } from '$lib/i18n';
	import { onDestroy } from 'svelte';

	const API = 'http://localhost:3000';

	const COMMON_EXERCISES = [
		'Bankdrücken', 'Kniebeugen', 'Kreuzheben', 'Schulterdrücken', 'Klimmzüge',
		'Bizeps-Curls', 'Trizepsdrücken', 'Rudern', 'Beinpresse', 'Latzug',
		'Liegestütze', 'Plank', 'Ausfallschritte', 'Wadenheben'
	];

	// ---------- Workouts ----------
	let workouts = $state([]);
	let loading = $state(true);
	let filter = $state('all'); // all | week | month
	let expanded = $state(null);

	let showModal = $state(false);
	let saving = $state(false);
	let formError = $state('');

	function blankExercise() {
		return { name: '', sets: 3, reps: 10, weight_kg: '' };
	}
	let form = $state({ title: '', duration_min: '', notes: '', exercises: [blankExercise()] });

	async function loadWorkouts() {
		loading = true;
		try {
			const res = await fetch(`${API}/api/workouts`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) workouts = await res.json();
		} catch {}
		loading = false;
	}

	function openModal() {
		form = { title: '', duration_min: '', notes: '', exercises: [blankExercise()] };
		formError = '';
		showModal = true;
	}

	function closeModal() {
		showModal = false;
	}

	function addExerciseRow() {
		form.exercises = [...form.exercises, blankExercise()];
	}

	function removeExerciseRow(i) {
		form.exercises = form.exercises.filter((_, idx) => idx !== i);
		if (form.exercises.length === 0) form.exercises = [blankExercise()];
	}

	async function saveWorkout() {
		if (!form.title.trim()) {
			formError = $t('workouts.errorTitle');
			return;
		}
		saving = true;
		try {
			const exercises = form.exercises
				.filter(e => e.name && e.name.trim())
				.map(e => ({
					name: e.name.trim(),
					sets: parseInt(e.sets) || 1,
					reps: parseInt(e.reps) || 0,
					weight_kg: e.weight_kg
				}));

			const res = await fetch(`${API}/api/workouts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({
					title: form.title.trim(),
					duration_min: parseInt(form.duration_min) || 0,
					notes: form.notes.trim(),
					exercises
				})
			});
			if (res.ok) {
				const w = await res.json();
				workouts = [w, ...workouts];
				showModal = false;
			}
		} catch {}
		saving = false;
	}

	async function deleteWorkout(id) {
		try {
			const res = await fetch(`${API}/api/workouts/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) {
				workouts = workouts.filter(w => w.id !== id);
				if (expanded === id) expanded = null;
			}
		} catch {}
	}

	function toggleExpand(id) {
		expanded = expanded === id ? null : id;
	}

	function wDate(w) {
		return new Date((w.date || '').replace(' ', 'T'));
	}

	let filtered = $derived.by(() => {
		if (filter === 'all') return workouts;
		const cutoff = new Date();
		if (filter === 'week') cutoff.setDate(cutoff.getDate() - 7);
		else cutoff.setMonth(cutoff.getMonth() - 1);
		return workouts.filter(w => wDate(w) >= cutoff);
	});

	let totalCount = $derived(workouts.length);
	let totalMin = $derived(workouts.reduce((s, w) => s + (w.duration_min || 0), 0));
	let weekCount = $derived.by(() => {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - 7);
		return workouts.filter(w => wDate(w) >= cutoff).length;
	});

	function formatTime(min) {
		if (!min) return '0 min';
		const h = Math.floor(min / 60);
		const m = min % 60;
		if (h && m) return `${h} h ${m} min`;
		if (h) return `${h} h`;
		return `${m} min`;
	}

	function formatDate(w) {
		const d = wDate(w);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-US', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function exerciseLine(ex) {
		let s = `${ex.sets}×${ex.reps}`;
		if (ex.weight_kg != null && ex.weight_kg !== 0) s += ` · ${ex.weight_kg} kg`;
		return s;
	}

	function hasDetail(w) {
		return (w.notes && w.notes.trim()) || (w.exercises && w.exercises.length > 0);
	}

	// ---------- Rest-Timer ----------
	const PRESETS = [60, 90, 120, 180];
	const RING = 2 * Math.PI * 52;

	let restDuration = $state(90);
	let remaining = $state(90);
	let running = $state(false);
	let timerId = null;

	let restFrac = $derived(restDuration > 0 ? remaining / restDuration : 0);
	let timerDone = $derived(remaining === 0);

	function tick() {
		remaining -= 1;
		if (remaining <= 0) {
			remaining = 0;
			stopTimer();
			notifyDone();
		}
	}

	function startTimer() {
		if (running) return;
		if (remaining <= 0) remaining = restDuration;
		running = true;
		timerId = setInterval(tick, 1000);
	}

	function stopTimer() {
		running = false;
		if (timerId) {
			clearInterval(timerId);
			timerId = null;
		}
	}

	function toggleTimer() {
		if (running) stopTimer();
		else startTimer();
	}

	function resetTimer() {
		stopTimer();
		remaining = restDuration;
	}

	function setPreset(s) {
		stopTimer();
		restDuration = s;
		remaining = s;
	}

	function notifyDone() {
		try {
			const Ctx = window.AudioContext || window.webkitAudioContext;
			const ctx = new Ctx();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.type = 'sine';
			osc.frequency.value = 880;
			gain.gain.setValueAtTime(0.18, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
			osc.start();
			osc.stop(ctx.currentTime + 0.4);
			setTimeout(() => ctx.close(), 600);
		} catch {}
		if (navigator.vibrate) navigator.vibrate(200);
	}

	function fmtClock(s) {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${String(sec).padStart(2, '0')}`;
	}

	onDestroy(() => stopTimer());

	$effect(() => { loadWorkouts(); });
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && showModal) closeModal(); }} />

<div class="page">
	<div class="header">
		<h2>{$t('workouts.title')}</h2>
		<button class="btn-primary" onclick={openModal}>+ {$t('workouts.add')}</button>
	</div>

	<!-- Stats -->
	<div class="stats">
		<div class="stat">
			<span class="stat-num">{totalCount}</span>
			<span class="stat-label">{$t('workouts.statTotal')}</span>
		</div>
		<div class="stat">
			<span class="stat-num">{formatTime(totalMin)}</span>
			<span class="stat-label">{$t('workouts.statTime')}</span>
		</div>
		<div class="stat">
			<span class="stat-num">{weekCount}</span>
			<span class="stat-label">{$t('workouts.statWeek')}</span>
		</div>
	</div>

	<!-- Rest timer -->
	<div class="timer-card">
		<div class="timer-head">
			<span class="timer-title">⏱️ {$t('workouts.restTimer')}</span>
			<div class="presets">
				{#each PRESETS as p}
					<button class:active={restDuration === p} onclick={() => setPreset(p)}>{p}s</button>
				{/each}
			</div>
		</div>
		<div class="timer-body">
			<div class="ring" class:done={timerDone}>
				<svg viewBox="0 0 120 120">
					<circle class="ring-track" cx="60" cy="60" r="52" />
					<circle
						class="ring-prog"
						cx="60"
						cy="60"
						r="52"
						style="stroke-dasharray:{RING}; stroke-dashoffset:{RING * (1 - restFrac)}"
					/>
				</svg>
				<span class="ring-time">{timerDone ? $t('workouts.done') : fmtClock(remaining)}</span>
			</div>
			<div class="timer-controls">
				<button class="btn-primary" onclick={toggleTimer}>
					{running ? $t('workouts.pause') : $t('workouts.start')}
				</button>
				<button class="btn-secondary" onclick={resetTimer}>{$t('workouts.reset')}</button>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="filters">
		<button class:active={filter === 'all'} onclick={() => (filter = 'all')}>{$t('workouts.filterAll')}</button>
		<button class:active={filter === 'week'} onclick={() => (filter = 'week')}>{$t('workouts.filterWeek')}</button>
		<button class:active={filter === 'month'} onclick={() => (filter = 'month')}>{$t('workouts.filterMonth')}</button>
	</div>

	<!-- List -->
	<div class="list">
		{#if loading}
			<p class="empty">{$t('workouts.loading')}</p>
		{:else if filtered.length === 0}
			<p class="empty">{$t('workouts.empty')}</p>
		{:else}
			{#each filtered as w (w.id)}
				<div class="workout">
					<div class="workout-main">
						<div class="workout-info">
							<span class="workout-title">{w.title}</span>
							<span class="workout-meta">
								{formatDate(w)}{#if w.exercises && w.exercises.length} · {w.exercises.length} {$t('workouts.exercises')}{/if}
							</span>
						</div>
						<div class="workout-right">
							{#if w.duration_min}
								<span class="duration-badge">{formatTime(w.duration_min)}</span>
							{/if}
							{#if hasDetail(w)}
								<button class="link-btn" onclick={() => toggleExpand(w.id)}>
									{expanded === w.id ? $t('workouts.collapse') : $t('workouts.view')}
								</button>
							{/if}
							<button class="delete-btn" onclick={() => deleteWorkout(w.id)}>✕</button>
						</div>
					</div>

					{#if expanded === w.id}
						<div class="workout-detail">
							{#if w.exercises && w.exercises.length > 0}
								<span class="detail-label">{$t('workouts.exercises')}</span>
								<ul class="exercise-list">
									{#each w.exercises as ex}
										<li>
											<span class="ex-name">{ex.name}</span>
											<span class="ex-meta">{exerciseLine(ex)}</span>
										</li>
									{/each}
								</ul>
							{/if}
							{#if w.notes && w.notes.trim()}
								<p class="notes">{w.notes}</p>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<!-- Add modal -->
{#if showModal}
	<div class="modal-overlay">
		<button class="modal-backdrop" aria-label={$t('workouts.cancel')} onclick={closeModal}></button>
		<div class="modal">
			<h3>{$t('workouts.modalTitle')}</h3>

			<div class="modal-scroll">
				<div class="field">
					<label for="w-title">{$t('workouts.fieldTitle')}</label>
					<input
						id="w-title"
						type="text"
						bind:value={form.title}
						placeholder={$t('workouts.fieldTitlePlaceholder')}
						autocomplete="off"
					/>
				</div>

				<div class="field">
					<label for="w-duration">{$t('workouts.fieldDuration')}</label>
					<input id="w-duration" type="number" min="0" bind:value={form.duration_min} placeholder="0" />
				</div>

				<!-- Exercise builder -->
				<div class="field">
					<span class="field-label">{$t('workouts.exercises')}</span>
					<div class="ex-head">
						<span>{$t('workouts.exercise')}</span>
						<span>{$t('workouts.sets')}</span>
						<span>{$t('workouts.reps')}</span>
						<span>{$t('workouts.weight')}</span>
						<span></span>
					</div>
					{#each form.exercises as ex, i (i)}
						<div class="ex-row">
							<input
								type="text"
								class="ex-name-input"
								list="exercise-options"
								bind:value={ex.name}
								placeholder={$t('workouts.exercisePlaceholder')}
								autocomplete="off"
							/>
							<input type="number" min="1" max="20" bind:value={ex.sets} title={$t('workouts.sets')} />
							<input type="number" min="0" bind:value={ex.reps} title={$t('workouts.reps')} />
							<input type="number" min="0" step="0.5" bind:value={ex.weight_kg} placeholder="–" title={$t('workouts.weight')} />
							<button class="ex-remove" onclick={() => removeExerciseRow(i)} aria-label="✕">✕</button>
						</div>
					{/each}
					<button class="add-ex-btn" onclick={addExerciseRow}>+ {$t('workouts.addExercise')}</button>
				</div>

				<div class="field">
					<label for="w-notes">{$t('workouts.fieldNotes')}</label>
					<textarea
						id="w-notes"
						rows="2"
						bind:value={form.notes}
						placeholder={$t('workouts.fieldNotesPlaceholder')}
					></textarea>
				</div>
			</div>

			{#if formError}
				<p class="form-error">{formError}</p>
			{/if}

			<div class="modal-actions">
				<button class="btn-secondary" onclick={closeModal}>{$t('workouts.cancel')}</button>
				<button class="btn-primary" onclick={saveWorkout} disabled={saving}>
					{saving ? $t('workouts.saving') : $t('workouts.save')}
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
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	h2 { margin: 0; font-size: 22px; }

	/* Stats */
	.stats {
		display: flex;
		gap: 12px;
	}

	.stat {
		flex: 1;
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-num {
		font-size: 22px;
		font-weight: 700;
		color: #4a90e2;
		line-height: 1.1;
	}

	.stat-label { font-size: 12px; color: #888; }

	/* Rest timer */
	.timer-card {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.timer-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.timer-title { font-size: 14px; font-weight: 600; color: #888; }

	.presets { display: flex; gap: 6px; }

	.presets button {
		padding: 5px 10px;
		background: #0f1419;
		border: 1px solid #2a3040;
		border-radius: 7px;
		color: #888;
		font-size: 12px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.presets button:hover { color: #ccc; border-color: #3a4256; }

	.presets button.active {
		background: #1e3a5f;
		border-color: #2a4070;
		color: #4a90e2;
		font-weight: 600;
	}

	.timer-body {
		display: flex;
		align-items: center;
		gap: 20px;
	}

	.ring {
		position: relative;
		width: 120px;
		height: 120px;
		flex-shrink: 0;
	}

	.ring svg { width: 120px; height: 120px; }

	.ring-track {
		fill: none;
		stroke: #2a3040;
		stroke-width: 8;
	}

	.ring-prog {
		fill: none;
		stroke: #4a90e2;
		stroke-width: 8;
		stroke-linecap: round;
		transform: rotate(-90deg);
		transform-origin: 60px 60px;
		transition: stroke-dashoffset 1s linear, stroke 0.3s;
	}

	.ring.done .ring-prog { stroke: #46c46a; }

	.ring-time {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 26px;
		font-weight: 700;
		color: #e0e0e0;
		font-variant-numeric: tabular-nums;
	}

	.ring.done .ring-time { color: #46c46a; font-size: 20px; }

	.timer-controls {
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex: 1;
	}

	.timer-controls .btn-primary,
	.timer-controls .btn-secondary {
		width: 100%;
		text-align: center;
	}

	/* Filters */
	.filters {
		display: flex;
		gap: 6px;
	}

	.filters button {
		padding: 7px 14px;
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 8px;
		color: #888;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.filters button:hover { background: #232a3a; color: #ccc; }

	.filters button.active {
		background: #1e3a5f;
		border-color: #2a4070;
		color: #4a90e2;
		font-weight: 600;
	}

	/* List */
	.list { display: flex; flex-direction: column; gap: 10px; }

	.empty { margin: 0; color: #555; font-size: 14px; }

	.workout {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		overflow: hidden;
	}

	.workout-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 16px;
		gap: 12px;
	}

	.workout-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }

	.workout-title {
		font-size: 15px;
		font-weight: 600;
		color: #e0e0e0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.workout-meta { font-size: 12px; color: #555; }

	.workout-right {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
	}

	.duration-badge {
		font-size: 13px;
		font-weight: 600;
		color: #4a90e2;
		background: #1e2f47;
		padding: 4px 10px;
		border-radius: 999px;
		white-space: nowrap;
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

	.workout-detail {
		padding: 14px 16px;
		border-top: 1px solid #1e2438;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.detail-label {
		font-size: 12px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

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

	.notes {
		margin: 0;
		font-size: 14px;
		color: #aaa;
		line-height: 1.5;
		white-space: pre-wrap;
	}

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
		max-width: 460px;
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

	label, .field-label { font-size: 13px; color: #aaa; }

	input, textarea {
		padding: 9px 12px;
		background: #0f1419;
		border: 1.5px solid #2a3040;
		border-radius: 8px;
		color: #e0e0e0;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
		resize: vertical;
	}

	input:focus, textarea:focus { border-color: #4a90e2; }

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
