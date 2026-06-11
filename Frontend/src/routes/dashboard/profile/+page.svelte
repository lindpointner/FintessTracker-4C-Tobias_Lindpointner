<script>
	import { user, token } from '$lib/userStore';
	import { t } from '$lib/i18n';

	let name = $state($user?.name ?? '');
	let email = $state($user?.email ?? '');
	let accountMsg = $state('');
	let accountError = $state('');
	let accountLoading = $state(false);

	async function saveAccount() {
		if (!name || !email) { accountError = $t('profile.errorFields'); return; }
		accountError = '';
		accountMsg = '';
		accountLoading = true;
		try {
			const res = await fetch('http://localhost:3000/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({ name, email })
			});
			const data = await res.json();
			if (!res.ok) { accountError = data.message; return; }
			user.set(data.user);
			token.set(data.token);
			accountMsg = $t('profile.successAccount');
		} catch {
			accountError = 'Netzwerkfehler';
		} finally {
			accountLoading = false;
		}
	}

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let pwMsg = $state('');
	let pwError = $state('');
	let pwLoading = $state(false);

	async function savePassword() {
		if (!currentPassword || !newPassword || !confirmPassword) { pwError = $t('profile.errorFields'); return; }
		if (newPassword !== confirmPassword) { pwError = $t('profile.errorPasswords'); return; }
		if (newPassword.length < 6) { pwError = $t('profile.errorPasswordLength'); return; }
		pwError = '';
		pwMsg = '';
		pwLoading = true;
		try {
			const res = await fetch('http://localhost:3000/api/profile/password', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({ currentPassword, newPassword })
			});
			const data = await res.json();
			if (!res.ok) { pwError = data.message; return; }
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			pwMsg = $t('profile.successPassword');
		} catch {
			pwError = 'Netzwerkfehler';
		} finally {
			pwLoading = false;
		}
	}

	let weight = $state('');
	let height = $state('');
	let bodyMsg = $state('');
	let bodyError = $state('');
	let bodyLoading = $state(false);
	let lastMeasurement = $state(null);

	let bmi = $derived.by(() => {
		const w = parseFloat(weight);
		const h = parseFloat(height);
		if (!w || !h || h <= 0) return null;
		return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
	});

	let bmiCategory = $derived.by(() => {
		if (bmi === null) return null;
		if (bmi < 18.5) return { key: 'profile.bmiUnderweight', color: '#4a90e2' };
		if (bmi < 25)   return { key: 'profile.bmiNormal',      color: '#4caf80' };
		if (bmi < 30)   return { key: 'profile.bmiOverweight',  color: '#e0a040' };
		return           { key: 'profile.bmiObese',              color: '#e06060' };
	});

	let bmiBarPercent = $derived.by(() => {
		if (bmi === null) return 0;
		const total = 24.5;
		if (bmi <= 18.5) return Math.min((bmi / 18.5) * (3 / total) * 100, (3 / total) * 100);
		if (bmi <= 25)   return ((3 + (bmi - 18.5) / 6.5 * 6.5) / total) * 100;
		if (bmi <= 30)   return ((9.5 + (bmi - 25) / 5 * 5) / total) * 100;
		return Math.min(((14.5 + (bmi - 30) / 20 * 10) / total) * 100, 100);
	});

	async function loadLatestMeasurement() {
		try {
			const res = await fetch('http://localhost:3000/api/profile', {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) {
				const data = await res.json();
				if (data.measurement) {
					lastMeasurement = data.measurement;
					weight = String(data.measurement.weight_kg);
					height = String(data.measurement.height_cm);
				}
			}
		} catch {}
	}

	let gender = $state('m');
	let neck = $state('');
	let waist = $state('');
	let hip = $state('');

	let bodyFat = $derived.by(() => {
		const h = parseFloat(height);
		const n = parseFloat(neck);
		const w = parseFloat(waist);
		const hi = parseFloat(hip);
		if (!h || !n || !w) return null;

		let value;
		if (gender === 'm') {
			if (w - n <= 0) return null;
			value = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
		} else {
			if (!hi || w + hi - n <= 0) return null;
			value = 495 / (1.29579 - 0.35004 * Math.log10(w + hi - n) + 0.221 * Math.log10(h)) - 450;
		}
		if (!Number.isFinite(value) || value < 2 || value > 70) return null;
		return Math.round(value * 10) / 10;
	});

	let bodyFatCategory = $derived.by(() => {
		if (bodyFat === null) return null;
		const limits = gender === 'm' ? [6, 18, 25] : [14, 25, 32];
		if (bodyFat < limits[0]) return { key: 'profile.bfLow', color: '#4a90e2' };
		if (bodyFat < limits[1]) return { key: 'profile.bfFit', color: '#4caf80' };
		if (bodyFat < limits[2]) return { key: 'profile.bfAverage', color: '#e0a040' };
		return { key: 'profile.bfHigh', color: '#e06060' };
	});

	async function saveMeasurement() {
		const w = parseFloat(weight);
		const h = parseFloat(height);
		if (!w || !h) { bodyError = $t('profile.errorFields'); return; }
		bodyError = '';
		bodyMsg = '';
		bodyLoading = true;
		try {
			const res = await fetch('http://localhost:3000/api/profile/measurements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${$token}` },
				body: JSON.stringify({ weight_kg: w, height_cm: h, body_fat_percent: bodyFat })
			});
			const data = await res.json();
			if (!res.ok) { bodyError = data.message; return; }
			lastMeasurement = data;
			bodyMsg = $t('profile.successMeasurement');
		} catch {
			bodyError = 'Netzwerkfehler';
		} finally {
			bodyLoading = false;
		}
	}

	$effect(() => { loadLatestMeasurement(); });
</script>

<div class="page">
	<h2>{$t('profile.title')}</h2>

	<section class="card">
		<h3>{$t('profile.account')}</h3>
		<div class="fields">
			<div class="field">
				<label for="p-name">{$t('profile.name')}</label>
				<input id="p-name" type="text" bind:value={name} disabled={accountLoading} />
			</div>
			<div class="field">
				<label for="p-email">{$t('profile.email')}</label>
				<input id="p-email" type="email" bind:value={email} disabled={accountLoading} />
			</div>
		</div>
		{#if accountError}<p class="msg error">{accountError}</p>{/if}
		{#if accountMsg}<p class="msg success">{accountMsg}</p>{/if}
		<button onclick={saveAccount} disabled={accountLoading}>{$t('profile.saveAccount')}</button>
	</section>

	<section class="card">
		<h3>{$t('profile.password')}</h3>
		<div class="fields">
			<div class="field">
				<label for="p-cur">{$t('profile.currentPassword')}</label>
				<input id="p-cur" type="password" bind:value={currentPassword} disabled={pwLoading} />
			</div>
			<div class="field">
				<label for="p-new">{$t('profile.newPassword')}</label>
				<input id="p-new" type="password" bind:value={newPassword} disabled={pwLoading} />
			</div>
			<div class="field">
				<label for="p-conf">{$t('profile.confirmPassword')}</label>
				<input id="p-conf" type="password" bind:value={confirmPassword} disabled={pwLoading} />
			</div>
		</div>
		{#if pwError}<p class="msg error">{pwError}</p>{/if}
		{#if pwMsg}<p class="msg success">{pwMsg}</p>{/if}
		<button onclick={savePassword} disabled={pwLoading}>{$t('profile.savePassword')}</button>
	</section>

	<section class="card">
		<h3>{$t('profile.body')}</h3>
		{#if lastMeasurement}
			<p class="last-measurement">
				{$t('profile.lastMeasurement')}: {lastMeasurement.weight_kg} kg · {lastMeasurement.height_cm} cm · BMI {lastMeasurement.bmi}{#if lastMeasurement.body_fat_percent != null} · {$t('profile.bodyFatResult')} {lastMeasurement.body_fat_percent} %{/if}
			</p>
		{/if}
		<div class="fields body-fields">
			<div class="field">
				<label for="p-weight">{$t('profile.weight')}</label>
				<input id="p-weight" type="number" min="20" max="300" step="0.1" bind:value={weight} disabled={bodyLoading} />
			</div>
			<div class="field">
				<label for="p-height">{$t('profile.height')}</label>
				<input id="p-height" type="number" min="100" max="250" step="0.1" bind:value={height} disabled={bodyLoading} />
			</div>
		</div>

		{#if bmi !== null}
			<div class="bmi-display">
				<span class="bmi-label">{$t('profile.bmi')}</span>
				<span class="bmi-value" style="color: {bmiCategory.color}">{bmi}</span>
				<span class="bmi-cat" style="color: {bmiCategory.color}">{$t(bmiCategory.key)}</span>
			</div>
			<div class="bmi-bar">
				<div class="bmi-segments">
					<div class="seg seg-under">&lt; 18.5</div>
					<div class="seg seg-normal">18.5 – 24.9</div>
					<div class="seg seg-over">25 – 29.9</div>
					<div class="seg seg-obese">≥ 30</div>
				</div>
				<div
					class="bmi-marker"
					style="left: {bmiBarPercent}%"
				></div>
			</div>
		{/if}

		<h3 class="subhead">{$t('profile.bodyFatTitle')}</h3>
		<div class="fields body-fields">
			<div class="field">
				<label for="p-gender">{$t('profile.gender')}</label>
				<select id="p-gender" bind:value={gender} disabled={bodyLoading}>
					<option value="m">{$t('profile.male')}</option>
					<option value="f">{$t('profile.female')}</option>
				</select>
			</div>
			<div class="field">
				<label for="p-neck">{$t('profile.neck')}</label>
				<input id="p-neck" type="number" min="15" max="80" step="0.5" bind:value={neck} disabled={bodyLoading} />
			</div>
			<div class="field">
				<label for="p-waist">{$t('profile.waist')}</label>
				<input id="p-waist" type="number" min="40" max="220" step="0.5" bind:value={waist} disabled={bodyLoading} />
			</div>
			{#if gender === 'f'}
				<div class="field">
					<label for="p-hip">{$t('profile.hip')}</label>
					<input id="p-hip" type="number" min="40" max="220" step="0.5" bind:value={hip} disabled={bodyLoading} />
				</div>
			{/if}
		</div>

		{#if bodyFat !== null}
			<div class="bmi-display">
				<span class="bmi-label">{$t('profile.bodyFatResult')}</span>
				<span class="bmi-value" style="color: {bodyFatCategory.color}">{bodyFat} %</span>
				<span class="bmi-cat" style="color: {bodyFatCategory.color}">{$t(bodyFatCategory.key)}</span>
			</div>
		{:else}
			<p class="last-measurement">{$t('profile.bodyFatHint')}</p>
		{/if}

		{#if bodyError}<p class="msg error">{bodyError}</p>{/if}
		{#if bodyMsg}<p class="msg success">{bodyMsg}</p>{/if}
		<button onclick={saveMeasurement} disabled={bodyLoading}>{$t('profile.saveMeasurement')}</button>
	</section>
</div>

<style>
	.page {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 600px;
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

	.fields {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.body-fields {
		flex-direction: row;
		gap: 16px;
	}

	.body-fields .field {
		flex: 1;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	label {
		font-size: 13px;
		color: #aaa;
	}

	input {
		padding: 10px 13px;
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
	input:disabled { opacity: 0.5; }

	select {
		padding: 10px 13px;
		background: #0f1419;
		border: 1.5px solid #2a3040;
		border-radius: 8px;
		color: #e0e0e0;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
	}

	select:focus { border-color: #4a90e2; }
	select:disabled { opacity: 0.5; }

	.subhead {
		margin-top: 8px;
		padding-top: 16px;
		border-top: 1px solid #232a3a;
	}

	button {
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

	button:hover:not(:disabled) { background: #357abd; }
	button:disabled { opacity: 0.5; cursor: not-allowed; }

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

	.success {
		color: #4caf80;
		background: rgba(76, 175, 128, 0.1);
		border-left: 3px solid #4caf80;
	}

	.last-measurement {
		margin: 0;
		font-size: 13px;
		color: #666;
	}

	.bmi-display {
		display: flex;
		align-items: baseline;
		gap: 10px;
	}

	.bmi-label {
		font-size: 13px;
		color: #888;
	}

	.bmi-value {
		font-size: 32px;
		font-weight: 700;
		line-height: 1;
	}

	.bmi-cat {
		font-size: 14px;
		font-weight: 600;
	}

	.bmi-bar {
		position: relative;
	}

	.bmi-segments {
		display: flex;
		height: 8px;
		border-radius: 4px;
		overflow: hidden;
		gap: 2px;
	}

	.seg {
		display: flex;
		align-items: flex-end;
		justify-content: center;
		font-size: 9px;
		color: transparent;
		height: 8px;
		border-radius: 2px;
	}

	.seg-under  { background: #4a90e2; flex: 3; }
	.seg-normal { background: #4caf80; flex: 6.5; }
	.seg-over   { background: #e0a040; flex: 5; }
	.seg-obese  { background: #e06060; flex: 10; }

	.bmi-marker {
		position: absolute;
		top: -3px;
		width: 4px;
		height: 14px;
		background: #fff;
		border-radius: 2px;
		transform: translateX(-50%);
		box-shadow: 0 0 4px rgba(0,0,0,0.5);
	}

	@media (max-width: 640px) {
		.page {
			padding: 20px 16px;
			gap: 18px;
		}

		.card { padding: 16px; }

		.body-fields {
			flex-wrap: wrap;
			gap: 12px;
		}

		.body-fields .field {
			flex: 1 1 40%;
			min-width: 120px;
		}

		button {
			align-self: stretch;
		}
	}
</style>
