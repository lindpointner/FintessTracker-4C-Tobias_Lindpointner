<script>
	import { user, token } from "$lib/userStore";
	import { t } from "$lib/i18n";

	const API = 'http://localhost:3000';

	let stats = $state(null);

	async function loadStats() {
		try {
			const res = await fetch(`${API}/api/stats?days=7`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) stats = await res.json();
		} catch {}
	}

	$effect(() => { loadStats(); });

	const sections = [
		{ href: '/dashboard/workouts', icon: '🏋️', title: 'nav.workouts', desc: 'dashboard.descWorkouts' },
		{ href: '/dashboard/plans', icon: '📋', title: 'nav.plans', desc: 'dashboard.descPlans' },
		{ href: '/dashboard/body', icon: '😴', title: 'nav.body', desc: 'dashboard.descBody' },
		{ href: '/dashboard/nutrition', icon: '🍽️', title: 'nav.nutrition', desc: 'dashboard.descNutrition' },
		{ href: '/dashboard/stats', icon: '📊', title: 'nav.stats', desc: 'dashboard.descStats' },
		{ href: '/dashboard/profile', icon: '👤', title: 'nav.profile', desc: 'dashboard.descProfile' }
	];
</script>

<div class="page">
	<h2>{$t('dashboard.greeting')}, {$user?.name}!</h2>

	{#if stats}
		<div class="tiles">
			<div class="tile">
				<span class="tile-icon">🔥</span>
				<span class="tile-num">{stats.streak.current}</span>
				<span class="tile-label">{$t('stats.streakCurrent')}</span>
			</div>
			<div class="tile">
				<span class="tile-icon">🏋️</span>
				<span class="tile-num">{stats.workouts.thisWeek}</span>
				<span class="tile-label">{$t('dashboard.workoutsWeek')}</span>
			</div>
			<div class="tile">
				<span class="tile-icon">🍽️</span>
				<span class="tile-num">{stats.nutrition.todayKcal} <small>kcal</small></span>
				<span class="tile-label">{$t('dashboard.kcalToday')}</span>
			</div>
			<div class="tile">
				<span class="tile-icon">💧</span>
				<span class="tile-num">{(stats.water.todayMl / 1000).toFixed(2)} <small>L</small></span>
				<span class="tile-label">{$t('dashboard.waterToday')}</span>
			</div>
		</div>
	{/if}

	<div class="sections">
		{#each sections as s (s.href)}
			<a class="section-card" href={s.href}>
				<span class="section-icon">{s.icon}</span>
				<div class="section-text">
					<span class="section-title">{$t(s.title)}</span>
					<span class="section-desc">{$t(s.desc)}</span>
				</div>
				<span class="section-arrow">›</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.page {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 900px;
		margin: 0 auto;
	}

	h2 { margin: 0; font-size: 22px; }

	/* Stat tiles */
	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
		gap: 12px;
	}

	.tile {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tile-icon { font-size: 20px; }

	.tile-num {
		font-size: 26px;
		font-weight: 700;
		color: #4a90e2;
		line-height: 1.1;
	}

	.tile-num small {
		font-size: 14px;
		font-weight: 500;
		color: #888;
	}

	.tile-label { font-size: 12px; color: #888; }

	/* Section quick links */
	.sections {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 12px;
	}

	.section-card {
		display: flex;
		align-items: center;
		gap: 14px;
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 18px;
		text-decoration: none;
		transition: border-color 0.15s, background 0.15s, transform 0.15s;
	}

	.section-card:hover {
		background: #1e2438;
		border-color: #2a4070;
		transform: translateY(-1px);
	}

	.section-icon { font-size: 26px; }

	.section-text {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
		flex: 1;
	}

	.section-title {
		font-size: 15px;
		font-weight: 600;
		color: #e0e0e0;
	}

	.section-desc { font-size: 12px; color: #888; }

	.section-arrow {
		font-size: 22px;
		color: #4a90e2;
	}
</style>
