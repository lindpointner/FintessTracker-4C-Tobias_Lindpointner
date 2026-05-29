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

	// Maps BMI value to bar position (%) respecting the flex segment widths
	// Segments: under(flex 3, <18.5) | normal(flex 6.5, 18.5-25) | over(flex 5, 25-30) | obese(flex 10, ≥30)
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
				body: JSON.stringify({ weight_kg: w, height_cm: h })
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

	<!-- Account -->
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

	<!-- Password -->
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

	<!-- Body / BMI -->
	<section class="card">
		<h3>{$t('profile.body')}</h3>
		{#if lastMeasurement}
			<p class="last-measurement">
				{$t('profile.lastMeasurement')}: {lastMeasurement.weight_kg} kg · {lastMeasurement.height_cm} cm · BMI {lastMeasurement.bmi}
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
</style>
