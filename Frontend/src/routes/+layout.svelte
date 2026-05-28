<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { locale, t } from '$lib/i18n';

	let { children } = $props();

	let isDashboard = $derived($page.url.pathname.startsWith('/dashboard'));

	function toggleLocale() {
		locale.update(l => (l === 'de' ? 'en' : 'de'));
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isDashboard}
	<nav>
		<span class="logo">FitnessTracker</span>
		<div class="tabs">
			<a href="/dashboard" class:active={$page.url.pathname === '/dashboard'}>{$t('nav.overview')}</a>
			<a href="/dashboard/workouts" class:active={$page.url.pathname === '/dashboard/workouts'}>{$t('nav.workouts')}</a>
			<a href="/dashboard/stats" class:active={$page.url.pathname === '/dashboard/stats'}>{$t('nav.stats')}</a>
			<a href="/dashboard/profile" class:active={$page.url.pathname === '/dashboard/profile'}>{$t('nav.profile')}</a>
		</div>
		<button class="lang-btn" onclick={toggleLocale}>{$locale === 'de' ? '🇬🇧 EN' : '🇩🇪 DE'}</button>
	</nav>
{:else}
	<button class="lang-btn lang-fixed" onclick={toggleLocale}>{$locale === 'de' ? '🇬🇧 EN' : '🇩🇪 DE'}</button>
{/if}

{@render children()}

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
		background: #0f1419;
		color: #e0e0e0;
		min-height: 100vh;
	}

	nav {
		display: flex;
		align-items: center;
		gap: 32px;
		padding: 0 32px;
		height: 56px;
		background: #1a1f2e;
		border-bottom: 1px solid #2a3040;
	}

	.logo {
		font-weight: 700;
		font-size: 15px;
		white-space: nowrap;
	}

	.tabs {
		display: flex;
		gap: 4px;
		flex: 1;
	}

	.tabs a {
		padding: 8px 14px;
		border-radius: 8px;
		color: #888;
		font-size: 14px;
		text-decoration: none;
		transition: background 0.15s, color 0.15s;
	}

	.tabs a:hover {
		background: #232a3a;
		color: #ccc;
	}

	.tabs a.active {
		background: #1e3a5f;
		color: #4a90e2;
		font-weight: 600;
	}

	.lang-btn {
		padding: 6px 12px;
		background: #232a3a;
		border: 1px solid #2a3040;
		border-radius: 8px;
		color: #ccc;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.lang-btn:hover {
		background: #2e3850;
		color: #e0e0e0;
	}

	.lang-fixed {
		position: fixed;
		top: 16px;
		right: 16px;
		z-index: 100;
	}
</style>
