<script>
	import { token } from '$lib/userStore';
	import { t, locale } from '$lib/i18n';

	const API = 'http://localhost:3000';

	function today() {
		return new Date().toISOString().split('T')[0];
	}

	let sleepEntries = $state([]);
	let sleepLoading = $state(true);
	let sleepDate = $state(today());
	let bedTime = $state('23:00');
	let wakeTime = $state('07:00');
	let quality = $state(3);
	let sleepSaving = $state(false);
	let sleepError = $state('');

	async function loadSleep() {
		sleepLoading = true;
		try {
			const res = await fetch(`${API}/api/sleep`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) sleepEntries = await res.json();
		} catch {}
		sleepLoading = false;
	}

	async function saveSleep() {
		if (!sleepDate || !bedTime || !wakeTime) {
			sleepError = $t('sleep.errorFields');
			return;
		}
		sleepError = '';
		sleepSaving = true;
		try {
			const res = await fetch(`${API}/api/sleep`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({ date: sleepDate, bed_time: bedTime, wake_time: wakeTime, quality })
			});
			const data = await res.json();
			if (!res.ok) {
				sleepError = data.message;
			} else {
				sleepEntries = [data, ...sleepEntries];
			}
		} catch {
			sleepError = 'Netzwerkfehler';
		}
		sleepSaving = false;
	}

	async function deleteSleep(id) {
		try {
			const res = await fetch(`${API}/api/sleep/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) sleepEntries = sleepEntries.filter(e => e.id !== id);
		} catch {}
	}

	function formatTime(min) {
		if (!min) return '0 min';
		const h = Math.floor(min / 60);
		const m = min % 60;
		if (h && m) return `${h} h ${m} min`;
		if (h) return `${h} h`;
		return `${m} min`;
	}

	function clockOf(datetime) {
		return (datetime || '').split(' ')[1] || '';
	}

	function fmtDate(d) {
		const date = new Date((d || '').replace(' ', 'T'));
		if (isNaN(date.getTime())) return '';
		return date.toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-US', {
			day: '2-digit',
			month: 'short',
			year: 'numeric'
		});
	}

	function stars(q) {
		return '★'.repeat(q) + '☆'.repeat(5 - q);
	}

	let photos = $state([]);
	let photosLoading = $state(true);
	let photoFile = $state(null);
	let photoDate = $state(today());
	let photoNote = $state('');
	let uploading = $state(false);
	let photoError = $state('');
	let fileInput;

	let compareMode = $state(false);
	let compare = $state([]);

	async function loadPhotos() {
		photosLoading = true;
		try {
			const res = await fetch(`${API}/api/photos`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) photos = await res.json();
		} catch {}
		photosLoading = false;
	}

	function onFileChange(e) {
		photoFile = e.target.files?.[0] || null;
	}

	async function uploadPhoto() {
		if (!photoFile) {
			photoError = $t('photos.errorFile');
			return;
		}
		photoError = '';
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('photo', photoFile);
			fd.append('date', photoDate);
			fd.append('note', photoNote.trim());
			const res = await fetch(`${API}/api/photos`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${$token}` },
				body: fd
			});
			const data = await res.json();
			if (!res.ok) {
				photoError = data.message || $t('photos.errorUpload');
			} else {
				photos = [data, ...photos];
				photoFile = null;
				photoNote = '';
				if (fileInput) fileInput.value = '';
			}
		} catch {
			photoError = 'Netzwerkfehler';
		}
		uploading = false;
	}

	async function deletePhoto(id) {
		try {
			const res = await fetch(`${API}/api/photos/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) {
				photos = photos.filter(p => p.id !== id);
				compare = compare.filter(c => c.id !== id);
			}
		} catch {}
	}

	function toggleCompareMode() {
		compareMode = !compareMode;
		compare = [];
	}

	function pickCompare(photo) {
		if (!compareMode) return;
		if (compare.find(c => c.id === photo.id)) {
			compare = compare.filter(c => c.id !== photo.id);
		} else if (compare.length < 2) {
			compare = [...compare, photo];
		}
	}

	let comparePair = $derived.by(() => {
		if (compare.length !== 2) return null;
		return [...compare].sort((a, b) => (a.date < b.date ? -1 : 1));
	});

	$effect(() => { loadSleep(); loadPhotos(); });
</script>

<div class="page">
	<h2>{$t('body.title')}</h2>

	<section class="card">
		<h3>😴 {$t('sleep.title')}</h3>

		<div class="sleep-form">
			<div class="field">
				<label for="s-date">{$t('sleep.date')}</label>
				<input id="s-date" type="date" bind:value={sleepDate} max={today()} />
			</div>
			<div class="field">
				<label for="s-bed">{$t('sleep.bedTime')}</label>
				<input id="s-bed" type="time" bind:value={bedTime} />
			</div>
			<div class="field">
				<label for="s-wake">{$t('sleep.wakeTime')}</label>
				<input id="s-wake" type="time" bind:value={wakeTime} />
			</div>
			<div class="field">
				<span class="field-label">{$t('sleep.quality')}</span>
				<div class="quality-btns">
					{#each [1, 2, 3, 4, 5] as q}
						<button class:active={quality === q} onclick={() => (quality = q)}>{q}</button>
					{/each}
				</div>
			</div>
		</div>

		{#if sleepError}<p class="msg error">{sleepError}</p>{/if}
		<button class="btn-primary" onclick={saveSleep} disabled={sleepSaving}>
			{sleepSaving ? $t('sleep.saving') : $t('sleep.save')}
		</button>

		<div class="sleep-list">
			{#if sleepLoading}
				<p class="empty">{$t('sleep.loading')}</p>
			{:else if sleepEntries.length === 0}
				<p class="empty">{$t('sleep.empty')}</p>
			{:else}
				{#each sleepEntries as e (e.id)}
					<div class="sleep-entry">
						<div class="sleep-info">
							<span class="sleep-date">{fmtDate(e.date)}</span>
							<span class="sleep-times">{clockOf(e.sleep_start)} → {clockOf(e.sleep_end)}</span>
						</div>
						<div class="sleep-right">
							<span class="sleep-duration">{formatTime(e.duration_min)}</span>
							<span class="sleep-stars" title="{$t('sleep.quality')}: {e.quality}/5">{stars(e.quality)}</span>
							<button class="delete-btn" onclick={() => deleteSleep(e.id)}>✕</button>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<section class="card">
		<div class="photos-head">
			<h3>📸 {$t('photos.title')}</h3>
			{#if photos.length >= 2}
				<button class="compare-toggle" class:active={compareMode} onclick={toggleCompareMode}>
					{$t('photos.compare')}
				</button>
			{/if}
		</div>

		<div class="upload-form">
			<input type="file" accept="image/*" onchange={onFileChange} bind:this={fileInput} />
			<div class="upload-row">
				<div class="field">
					<label for="ph-date">{$t('photos.date')}</label>
					<input id="ph-date" type="date" bind:value={photoDate} max={today()} />
				</div>
				<div class="field grow">
					<label for="ph-note">{$t('photos.note')}</label>
					<input id="ph-note" type="text" bind:value={photoNote} placeholder={$t('photos.notePlaceholder')} />
				</div>
			</div>
			{#if photoError}<p class="msg error">{photoError}</p>{/if}
			<button class="btn-primary" onclick={uploadPhoto} disabled={uploading}>
				{uploading ? $t('photos.uploading') : $t('photos.upload')}
			</button>
		</div>

		{#if compareMode}
			{#if comparePair}
				<div class="compare-panel">
					<div class="compare-side">
						<span class="compare-label before">{$t('photos.before')}</span>
						<img src={API + comparePair[0].file_path} alt={$t('photos.before')} />
						<span class="compare-date">{fmtDate(comparePair[0].date)}</span>
					</div>
					<div class="compare-side">
						<span class="compare-label after">{$t('photos.after')}</span>
						<img src={API + comparePair[1].file_path} alt={$t('photos.after')} />
						<span class="compare-date">{fmtDate(comparePair[1].date)}</span>
					</div>
				</div>
			{:else}
				<p class="compare-hint">{$t('photos.compareHint')}</p>
			{/if}
		{/if}

		<div class="gallery">
			{#if photosLoading}
				<p class="empty">{$t('photos.loading')}</p>
			{:else if photos.length === 0}
				<p class="empty">{$t('photos.empty')}</p>
			{:else}
				{#each photos as p (p.id)}
					<div
						class="photo"
						class:selectable={compareMode}
						class:selected={compare.find(c => c.id === p.id)}
						onclick={() => pickCompare(p)}
						onkeydown={(e) => { if (e.key === 'Enter') pickCompare(p); }}
						role={compareMode ? 'button' : undefined}
						tabindex={compareMode ? 0 : undefined}
					>
						<img src={API + p.file_path} alt={p.note || fmtDate(p.date)} loading="lazy" />
						<div class="photo-caption">
							<span class="photo-date">{fmtDate(p.date)}</span>
							{#if p.note}<span class="photo-note">{p.note}</span>{/if}
						</div>
						{#if !compareMode}
							<button class="photo-delete" onclick={(e) => { e.stopPropagation(); deletePhoto(p.id); }}>✕</button>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</section>
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

	h2 { margin: 0; font-size: 22px; }

	.card {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	h3 {
		margin: 0;
		font-size: 14px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label, .field-label { font-size: 13px; color: #aaa; }

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
		color-scheme: dark;
	}

	input:focus { border-color: #4a90e2; }

	.btn-primary {
		align-self: flex-start;
		padding: 9px 20px;
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

	.btn-primary:hover:not(:disabled) { background: #357abd; }
	.btn-primary:disabled { opacity: 0.6; cursor: default; }

	.msg {
		margin: 0;
		font-size: 13px;
		padding: 9px 12px;
		border-radius: 6px;
	}

	.error {
		color: #e08080;
		background: rgba(220, 100, 100, 0.1);
		border-left: 3px solid #e08080;
	}

	.empty { margin: 0; color: #555; font-size: 14px; }

	.sleep-form {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.quality-btns { display: flex; gap: 6px; }

	.quality-btns button {
		width: 36px;
		padding: 8px 0;
		background: #0f1419;
		border: 1px solid #2a3040;
		border-radius: 7px;
		color: #888;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.quality-btns button:hover { color: #ccc; border-color: #3a4256; }

	.quality-btns button.active {
		background: #1e3a5f;
		border-color: #2a4070;
		color: #4a90e2;
		font-weight: 600;
	}

	.sleep-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.sleep-entry {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		background: #0f1419;
		border: 1px solid #2a3040;
		border-radius: 10px;
		padding: 11px 14px;
	}

	.sleep-info { display: flex; flex-direction: column; gap: 2px; }

	.sleep-date { font-size: 14px; font-weight: 600; color: #e0e0e0; }

	.sleep-times { font-size: 12px; color: #888; }

	.sleep-right {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.sleep-duration {
		font-size: 13px;
		font-weight: 600;
		color: #4a90e2;
		white-space: nowrap;
	}

	.sleep-stars {
		font-size: 13px;
		color: #e0a040;
		letter-spacing: 1px;
		white-space: nowrap;
	}

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

	.photos-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}

	.compare-toggle {
		padding: 6px 14px;
		background: #0f1419;
		border: 1px solid #2a3040;
		border-radius: 999px;
		color: #888;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.compare-toggle:hover { color: #ccc; border-color: #3a4256; }

	.compare-toggle.active {
		background: #1e3a5f;
		border-color: #2a4070;
		color: #4a90e2;
		font-weight: 600;
	}

	.upload-form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.upload-row {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
	}

	.upload-row .grow { flex: 1; min-width: 160px; }

	input[type="file"] {
		padding: 8px;
		font-size: 13px;
		color: #aaa;
	}

	input[type="file"]::file-selector-button {
		padding: 7px 14px;
		margin-right: 10px;
		background: #232a3a;
		color: #ccc;
		border: 1px solid #2a3040;
		border-radius: 7px;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
	}

	.compare-hint { margin: 0; font-size: 13px; color: #4a90e2; }

	.compare-panel {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.compare-side {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.compare-side img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		border-radius: 10px;
		border: 1px solid #2a3040;
	}

	.compare-label {
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.compare-label.before { color: #e0a040; }
	.compare-label.after { color: #4caf80; }

	.compare-date { font-size: 12px; color: #888; }

	.gallery {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: 12px;
	}

	.photo {
		position: relative;
		background: #0f1419;
		border: 2px solid #2a3040;
		border-radius: 10px;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		transition: border-color 0.15s;
	}

	.photo.selectable { cursor: pointer; }

	.photo.selectable:hover { border-color: #3a4256; }

	.photo.selected { border-color: #4a90e2; }

	.photo img {
		width: 100%;
		aspect-ratio: 3 / 4;
		object-fit: cover;
		display: block;
	}

	.photo-caption {
		padding: 8px 10px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.photo-date { font-size: 12px; font-weight: 600; color: #e0e0e0; }

	.photo-note {
		font-size: 11px;
		color: #888;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.photo-delete {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 24px;
		height: 24px;
		background: rgba(15, 20, 25, 0.8);
		border: none;
		border-radius: 6px;
		color: #ccc;
		font-size: 12px;
		cursor: pointer;
		transition: color 0.15s, background 0.15s;
	}

	.photo-delete:hover {
		color: #fff;
		background: rgba(220, 100, 100, 0.8);
	}

	@media (max-width: 640px) {
		.page {
			padding: 20px 16px;
			gap: 18px;
		}

		.card { padding: 16px; }

		.sleep-form .field {
			flex: 1 1 40%;
			min-width: 130px;
		}

		.sleep-form input { width: 100%; box-sizing: border-box; }

		.btn-primary {
			align-self: stretch;
			text-align: center;
		}

		.sleep-entry {
			flex-wrap: wrap;
			padding: 10px 12px;
		}

		.sleep-right {
			width: 100%;
			justify-content: flex-end;
		}

		.gallery {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
