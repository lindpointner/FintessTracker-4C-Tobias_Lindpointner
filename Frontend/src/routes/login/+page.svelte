<script>
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);
	let showPassword = $state(false);
	let focusedInput = $state(null);

	let emailValid = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
	let passwordValid = $derived(password.length >= 6);

	async function handleLogin() {
		if (!emailValid || !passwordValid) {
			error = 'Füll bitte alle Felder richtig aus!';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (response.ok) {
				goto('/dashboard');
			} else {
				const data = await response.json();
				error = data.message || 'E-Mail oder Passwort falsch';
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
			<p>Schön, dass du wieder da bist</p>
		</div>

		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
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
						disabled={loading}
						onfocus={() => (focusedInput = 'email')}
						onblur={() => (focusedInput = null)}
					/>
				</div>
			</div>

			<div class="form-group">
				<label for="password">
					<span>Passwort</span>
				</label>
				<div class="input-wrapper" class:focused={focusedInput === 'password'} class:valid={passwordValid && password}>
					<span class="input-icon">🔒</span>
					<input
						type={showPassword ? 'text' : 'password'}
						id="password"
						bind:value={password}
						placeholder="Dein Passwort"
						disabled={loading}
						onfocus={() => (focusedInput = 'password')}
						onblur={() => (focusedInput = null)}
					/>
					<button
						type="button"
						class="toggle-pw"
						onclick={() => (showPassword = !showPassword)}
						disabled={!password || loading}
					>
						{showPassword ? '👁️' : '🙈'}
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
				disabled={loading || !emailValid || !passwordValid}
			>
				<span class="btn-content">
					{#if loading}
						<span class="spinner"></span>
						Einen Moment...
					{:else}
						Einloggen <span class="btn-arrow">→</span>
					{/if}
				</span>
			</button>
		</form>

		<p class="register-hint">
			Noch kein Account? <a href="/register">Jetzt registrieren</a>
		</p>
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

	.register-hint {
		text-align: center;
		margin-top: 20px;
		font-size: 13px;
		color: #777;
	}

	.register-hint a {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 600;
	}

	.register-hint a:hover {
		text-decoration: underline;
	}
</style>
