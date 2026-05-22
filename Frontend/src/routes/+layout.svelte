<script>
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';

	let { children } = $props();

	let isDashboard = $derived($page.url.pathname.startsWith('/dashboard'));
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isDashboard}
	<nav>
		<span class="logo">FitnessTracker</span>
		<div class="tabs">
			<a href="/dashboard" class:active={$page.url.pathname === '/dashboard'}>Übersicht</a>
			<a href="/dashboard/workouts" class:active={$page.url.pathname === '/dashboard/workouts'}>Workouts</a>
			<a href="/dashboard/stats" class:active={$page.url.pathname === '/dashboard/stats'}>Statistiken</a>
			<a href="/dashboard/profile" class:active={$page.url.pathname === '/dashboard/profile'}>Profil</a>
		</div>
	</nav>
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
</style>
