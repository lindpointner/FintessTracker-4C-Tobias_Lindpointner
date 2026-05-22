<script>
	import { goto } from '$app/navigation';
	import { user } from '$lib/userStore';

	let email = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleLogin() {
		if (!email || !password) {
			error = 'Bitte alle Felder ausfüllen';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('http://localhost:3000/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (response.ok) {
				const data = await response.json();
				user.set(data.user);
				goto('/dashboard');
			} else {
				const data = await response.json();
				error = data.message || 'E-Mail oder Passwort falsch';
			}
		} catch (err) {
			error = 'Da ist was schiefgelaufen – versuch es nochmal';
		} finally {
			loading = false;
		}
	}
</script>

<div class="page">
	<div class="card">
		<h1>💪 FitnessTracker</h1>
		<p class="subtitle">Einloggen</p>

		<form onsubmit={(e) => { e.preventDefault(); handleLogin(); }}>
			<label for="email">E-Mail</label>
			<input type="email" id="email" bind:value={email} placeholder="deine@email.com" disabled={loading} />

			<label for="password">Passwort</label>
			<input type="password" id="password" bind:value={password} placeholder="Dein Passwort" disabled={loading} />

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<button type="submit" disabled={loading}>
				{loading ? 'Lädt...' : 'Einloggen'}
			</button>
		</form>

		<p class="hint">Noch kein Account? <a href="/register">Registrieren</a></p>
	</div>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #0f1419;
		min-height: 100vh;
	}

	.page {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		padding: 20px;
	}

	.card {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 36px;
		width: 100%;
		max-width: 380px;
	}

	h1 {
		margin: 0 0 4px;
		font-size: 22px;
		color: #e0e0e0;
		text-align: center;
	}

	.subtitle {
		margin: 0 0 24px;
		color: #888;
		font-size: 14px;
		text-align: center;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	label {
		font-size: 13px;
		color: #aaa;
		margin-bottom: -4px;
	}

	input {
		padding: 11px 14px;
		background: #0f1419;
		border: 1.5px solid #2a3040;
		border-radius: 8px;
		color: #e0e0e0;
		font-size: 14px;
		font-family: inherit;
		outline: none;
		transition: border-color 0.2s;
	}

	input:focus {
		border-color: #4a90e2;
	}

	input:disabled {
		opacity: 0.5;
	}

	.error {
		margin: 0;
		color: #e08080;
		font-size: 13px;
		background: rgba(220, 100, 100, 0.1);
		padding: 10px 12px;
		border-radius: 6px;
		border-left: 3px solid #e08080;
	}

	button {
		margin-top: 6px;
		padding: 12px;
		background: #4a90e2;
		color: #fff;
		border: none;
		border-radius: 8px;
		font-size: 15px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover:not(:disabled) {
		background: #357abd;
	}

	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hint {
		margin: 18px 0 0;
		text-align: center;
		font-size: 13px;
		color: #777;
	}

	.hint a {
		color: #4a90e2;
		text-decoration: none;
		font-weight: 600;
	}

	.hint a:hover {
		text-decoration: underline;
	}
</style>
