<script>
	import { goto } from '$app/navigation';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let success = $state(false);
	let loading = $state(false);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let focusedInput = $state(null);

	let nameValid = $derived(name.length >= 2);
	let emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
	let passwordValid = $derived(password.length >= 6);
	let passwordsMatch = $derived(password === confirmPassword && password.length > 0);

	let passwordStrength = $derived(() => {
		let s = 0;
		if (password.length >= 6) s++;
		if (password.length >= 10) s++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
		if (/\d/.test(password)) s++;
		if (/[!@#$%^&*]/.test(password)) s++;
		return s;
	});

	const strengthLabels = ['Sehr schwach', 'Schwach', 'Ok', 'Gut', 'Stark', 'Super stark'];
	const strengthColors = ['#c85050', '#d97050', '#d9a550', '#b5d950', '#70c070', '#50b050'];

	async function handleRegister() {
		if (!nameValid || !emailValid || !passwordValid || !passwordsMatch) {
			error = 'Füll bitte alle Felder richtig aus!';
			return;
		}

		loading = true;
		error = '';
		success = false;

		try {
			const response = await fetch('/api/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			if (response.ok) {
				success = true;
				setTimeout(() => goto('/dashboard'), 2000);
			} else {
				const data = await response.json();
				error = data.message || 'Registrierung hat nicht geklappt';
			}
		} catch (err) {
			error = 'Da ist was schiefgelaufen – versuch es nochmal';
			console.error(err);
		} finally {
			loading = false;
		}
	}
</script>

<div class="page">
	<div class="bg-elements">
		<div class="blob blob-1"></div>
		<div class="blob blob-2"></div>
	</div>

	<div class="card">
		<div class="header">
			<div class="icon-circle">💪</div>
			<h1>FitnessTracker</h1>
			<p>Erstell jetzt deinen Account</p>
		</div>

		{#if success}
			<div class="success-message">
				<span>✅</span>
				<div>
					<strong>Du bist dabei!</strong>
					<p>Du wirst weitergeleitet...</p>
				</div>
			</div>
		{/if}

		<form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
			<div class="form-group">
				<label for="name">
					<span>Dein Name</span>
					{#if name && nameValid}<span class="badge valid">✓</span>{/if}
				</label>
				<div class="input-wrapper" class:focused={focusedInput === 'name'} class:valid={nameValid && name}>
					<span class="input-icon">👤</span>
					<input
						type="text"
						id="name"
						bind:value={name}
						placeholder="Max Mustermann"
						disabled={loading || success}
						onfocus={() => (focusedInput = 'name')}
						onblur={() => (focusedInput = null)}
					/>
				</div>
			</div>

			<div class="form-group">
				<label for="email">
					<span>E-Mail</span>
					{#if email && emailValid}<span class="badge valid">✓</span>{/if}
				</label>
				<div class="input-wrapper" class:focused={focusedInput === 'email'} class:valid={emailValid && email}>
					<span class="input-icon">@</span>
					<input
						type="email"
						id="email"
						bind:value={email}
						placeholder="deine@email.com"
						disabled={loading || success}
						onfocus={() => (focusedInput = 'email')}
						onblur={() => (focusedInput = null)}
					/>
				</div>
			</div>

			<div class="form-group">
				<label for="password">
					<span>Passwort</span>
					{#if password}
						<span class="strength-label" style="color: {strengthColors[Math.min(passwordStrength(), 5)]}">
							{strengthLabels[Math.min(passwordStrength(), 5)]}
						</span>
					{/if}
				</label>
				<div class="input-wrapper" class:focused={focusedInput === 'password'} class:valid={passwordValid}>
					<span class="input-icon">🔒</span>
					<input
						type={showPassword ? 'text' : 'password'}
						id="password"
						bind:value={password}
						placeholder="Mind. 6 Zeichen"
						disabled={loading || success}
						onfocus={() => (focusedInput = 'password')}
						onblur={() => (focusedInput = null)}
					/>
					<button
						type="button"
						class="toggle-pw"
						onclick={() => (showPassword = !showPassword)}
						disabled={!password || loading || success}
					>
						{showPassword ? '👁️' : '🙈'}
					</button>
				</div>
				{#if password}
					<div class="strength-bar">
						<div class="strength-fill" style="width: {(passwordStrength() / 5) * 100}%; background: {strengthColors[Math.min(passwordStrength(), 5)]}"></div>
					</div>
				{/if}
			</div>

			<div class="form-group">
				<label for="confirm-password">
					<span>Passwort wiederholen</span>
					{#if confirmPassword && passwordsMatch}<span class="badge valid">✓</span>{/if}
				</label>
				<div class="input-wrapper" class:focused={focusedInput === 'confirm'} class:valid={passwordsMatch && confirmPassword}>
					<span class="input-icon">🔒</span>
					<input
						type={showConfirmPassword ? 'text' : 'password'}
						id="confirm-password"
						bind:value={confirmPassword}
						placeholder="Nochmal eingeben"
						disabled={loading || success}
						onfocus={() => (focusedInput = 'confirm')}
						onblur={() => (focusedInput = null)}
					/>
					<button
						type="button"
						class="toggle-pw"
						onclick={() => (showConfirmPassword = !showConfirmPassword)}
						disabled={!confirmPassword || loading || success}
					>
						{showConfirmPassword ? '👁️' : '🙈'}
					</button>
				</div>
			</div>

			{#if error}
				<div class="error-message">
					<span>⚠️</span>
					{error}
				</div>
			{/if}

			<button
				type="submit"
				class="btn-primary"
				disabled={loading || success || !nameValid || !emailValid || !passwordValid || !passwordsMatch}
			>
				<span class="btn-content">
					{#if loading}
						<span class="spinner"></span>
						Einen Moment...
					{:else if success}
						<span>✓</span> Erfolgreich!
					{:else}
						Account erstellen <span class="btn-arrow">→</span>
					{/if}
				</span>
			</button>
		</form>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
		background: linear-gradient(135deg, #0f1419 0%, #1a1f2e 100%);
		min-height: 100vh;
	}

	.page {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 20px;
		position: relative;
	}

	.bg-elements {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		opacity: 0.05;
		filter: blur(80px);
	}

	.blob-1 {
		width: 400px;
		height: 400px;
		background: #4a90e2;
		top: -100px;
		right: -100px;
		animation: float 20s ease-in-out infinite;
	}

	.blob-2 {
		width: 300px;
		height: 300px;
		background: #f5576c;
		bottom: -50px;
		left: -100px;
		animation: float 25s ease-in-out infinite 2s;
	}

	@keyframes float {
		0%, 100% { transform: translate(0, 0); }
		50% { transform: translate(30px, 30px); }
	}

	.card {
		background: rgba(26, 31, 46, 0.95);
		backdrop-filter: blur(10px);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 0 60px rgba(74, 144, 226, 0.1);
		padding: 40px;
		width: 100%;
		max-width: 420px;
		max-height: 90vh;
		overflow-y: auto;
		animation: slideUp 0.5s ease-out;
		position: relative;
		z-index: 1;
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(30px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.header {
		text-align: center;
		margin-bottom: 28px;
	}

	.icon-circle {
		width: 60px;
		height: 60px;
		background: linear-gradient(135deg, rgba(74, 144, 226, 0.2), rgba(245, 87, 108, 0.2));
		border: 1px solid rgba(74, 144, 226, 0.3);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 30px;
		margin: 0 auto 14px;
		animation: pulse 3s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { box-shadow: 0 0 0 0 rgba(74, 144, 226, 0.3); }
		50% { box-shadow: 0 0 0 10px rgba(74, 144, 226, 0); }
	}

	.header h1 {
		margin: 0;
		font-size: 26px;
		color: #e0e0e0;
		font-weight: 700;
	}

	.header p {
		margin: 6px 0 0;
		color: #999;
		font-size: 14px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}

	label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
		font-weight: 600;
		color: #aaa;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.badge.valid {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		font-size: 11px;
		font-weight: 700;
		background: rgba(100, 200, 100, 0.2);
		color: #70c070;
		border: 1px solid #70c070;
	}

	.strength-label {
		font-size: 11px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		background: rgba(15, 20, 25, 0.8);
		border: 1.5px solid #3a4556;
		border-radius: 10px;
		transition: all 0.3s ease;
		overflow: hidden;
	}

	.input-wrapper.focused {
		border-color: #4a90e2;
		background: rgba(15, 20, 25, 1);
		box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
	}

	.input-wrapper.valid {
		border-color: #70c070;
	}

	.input-icon {
		padding: 0 12px;
		color: #666;
		font-size: 15px;
		flex-shrink: 0;
	}

	.input-wrapper.focused .input-icon {
		color: #4a90e2;
	}

	input {
		flex: 1;
		padding: 12px 0;
		background: transparent;
		border: none;
		font-size: 14px;
		color: #e0e0e0;
		font-family: inherit;
		outline: none;
	}

	input::placeholder {
		color: #555;
	}

	input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-pw {
		padding: 0 12px;
		background: none;
		border: none;
		color: #666;
		cursor: pointer;
		font-size: 15px;
		flex-shrink: 0;
	}

	.toggle-pw:hover:not(:disabled) {
		color: #999;
	}

	.toggle-pw:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.strength-bar {
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.strength-fill {
		height: 100%;
		transition: width 0.3s ease, background 0.3s ease;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(220, 100, 100, 0.15);
		color: #e08080;
		padding: 12px 14px;
		border-radius: 8px;
		font-size: 13px;
		border-left: 3px solid #e08080;
		animation: shake 0.4s ease;
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		25% { transform: translateX(-8px); }
		75% { transform: translateX(8px); }
	}

	.success-message {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		background: rgba(100, 200, 100, 0.15);
		color: #70c070;
		padding: 14px;
		border-radius: 8px;
		border-left: 3px solid #70c070;
		margin-bottom: 14px;
		font-size: 13px;
	}

	.success-message strong {
		display: block;
		margin-bottom: 2px;
	}

	.success-message p {
		margin: 0;
		font-size: 12px;
		opacity: 0.85;
	}

	.btn-primary {
		padding: 13px 28px;
		background: linear-gradient(135deg, #4a90e2 0%, #357abd 100%);
		color: #fff;
		border: 1px solid rgba(74, 144, 226, 0.5);
		border-radius: 10px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		margin-top: 8px;
	}

	.btn-content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.btn-arrow {
		transition: transform 0.3s ease;
		display: inline-block;
	}

	.btn-primary:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 8px 20px rgba(74, 144, 226, 0.4);
	}

	.btn-primary:hover:not(:disabled) .btn-arrow {
		transform: translateX(4px);
	}

	.btn-primary:active:not(:disabled) {
		transform: translateY(0);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		display: inline-block;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
