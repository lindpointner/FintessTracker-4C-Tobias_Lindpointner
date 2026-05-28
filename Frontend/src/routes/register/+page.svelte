<script>
	import { goto } from '$app/navigation';
	import { user } from '$lib/userStore';
	import { t } from '$lib/i18n';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state('');
	let loading = $state(false);

	async function handleRegister() {
		if (!name || !email || !password || !confirmPassword) {
			error = $t('register.errorFields');
			return;
		}
		if (password !== confirmPassword) {
			error = $t('register.errorPasswords');
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('http://localhost:3000/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email, password })
			});

			if (response.ok) {
				const data = await response.json();
				user.set(data.user);
				goto('/dashboard');
			} else {
				const data = await response.json();
				error = data.message || $t('register.errorFailed');
			}
		} catch (err) {
			error = $t('register.errorNetwork');
		} finally {
			loading = false;
		}
	}
</script>

<div class="page">
	<div class="card">
		<h1>💪 FitnessTracker</h1>
		<p class="subtitle">{$t('register.title')}</p>

		<form onsubmit={(e) => { e.preventDefault(); handleRegister(); }}>
			<label for="name">{$t('register.name')}</label>
			<input type="text" id="name" bind:value={name} placeholder={$t('register.namePlaceholder')} disabled={loading} />

			<label for="email">{$t('register.email')}</label>
			<input type="email" id="email" bind:value={email} placeholder={$t('register.emailPlaceholder')} disabled={loading} />

			<label for="password">{$t('register.password')}</label>
			<input type="password" id="password" bind:value={password} placeholder={$t('register.passwordPlaceholder')} disabled={loading} />

			<label for="confirm-password">{$t('register.confirmPassword')}</label>
			<input type="password" id="confirm-password" bind:value={confirmPassword} placeholder={$t('register.confirmPlaceholder')} disabled={loading} />

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<button type="submit" disabled={loading}>
				{loading ? $t('register.loading') : $t('register.submit')}
			</button>
		</form>

		<p class="hint">{$t('register.hasAccount')} <a href="/login">{$t('register.loginLink')}</a></p>
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
