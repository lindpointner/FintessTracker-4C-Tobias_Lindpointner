<script>
	import { token } from '$lib/userStore';
	import { t, locale } from '$lib/i18n';
	import StatChart from '$lib/StatChart.svelte';

	const API = 'http://localhost:3000';
	const WATER_GOAL = 2000;

	let stats = $state(null);
	let loading = $state(true);
	let days = $state(30);

	async function loadStats(d) {
		loading = true;
		try {
			const res = await fetch(`${API}/api/stats?days=${d}`, {
				headers: { Authorization: `Bearer ${$token}` }
			});
			if (res.ok) stats = await res.json();
		} catch {}
		loading = false;
	}

	$effect(() => { loadStats(days); });

	function formatTime(min) {
		if (!min) return '0 min';
		const h = Math.floor(min / 60);
		const m = min % 60;
		if (h && m) return `${h} h ${m} min`;
		if (h) return `${h} h`;
		return `${m} min`;
	}

	function fmtDate(d) {
		const date = new Date((d || '').replace(' ', 'T'));
		if (isNaN(date.getTime())) return '';
		return date.toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-US', {
			day: '2-digit',
			month: 'short'
		});
	}

	function bmiCategory(bmi) {
		if (bmi == null) return '';
		if (bmi < 18.5) return $t('profile.bmiUnderweight');
		if (bmi < 25) return $t('profile.bmiNormal');
		if (bmi < 30) return $t('profile.bmiOverweight');
		return $t('profile.bmiObese');
	}

	let workoutChart = $derived.by(() => {
		if (!stats || stats.workouts.perWeek.length === 0) return null;
		return {
			labels: stats.workouts.perWeek.map(w => fmtDate(w.weekStart)),
			datasets: [{
				label: $t('stats.workoutsPerWeek'),
				data: stats.workouts.perWeek.map(w => w.count),
				backgroundColor: '#4a90e2',
				borderRadius: 6
			}]
		};
	});

	let bodyChart = $derived.by(() => {
		if (!stats || stats.body.history.length < 2) return null;
		const datasets = [
			{
				label: `${$t('stats.weight')} (kg)`,
				data: stats.body.history.map(m => m.weight_kg),
				borderColor: '#4a90e2',
				backgroundColor: 'rgba(74, 144, 226, 0.15)',
				tension: 0.3,
				yAxisID: 'y'
			},
			{
				label: $t('stats.bmi'),
				data: stats.body.history.map(m => m.bmi),
				borderColor: '#e0a040',
				backgroundColor: 'rgba(224, 160, 64, 0.15)',
				tension: 0.3,
				yAxisID: 'y1'
			}
		];
		if (stats.body.history.some(m => m.body_fat_percent != null)) {
			datasets.push({
				label: `${$t('stats.bodyFat')} (%)`,
				data: stats.body.history.map(m => m.body_fat_percent),
				borderColor: '#4caf80',
				backgroundColor: 'rgba(76, 175, 128, 0.15)',
				tension: 0.3,
				spanGaps: true,
				yAxisID: 'y1'
			});
		}
		return {
			labels: stats.body.history.map(m => fmtDate(m.date)),
			datasets
		};
	});

	const bodyChartOptions = {
		scales: {
			y: { beginAtZero: false },
			y1: {
				position: 'right',
				beginAtZero: false,
				ticks: { color: '#e0a040', font: { size: 11 } },
				grid: { drawOnChartArea: false }
			}
		}
	};

	let kcalChart = $derived.by(() => {
		if (!stats || stats.nutrition.perDay.length === 0) return null;
		return {
			labels: stats.nutrition.perDay.map(r => fmtDate(r.date)),
			datasets: [{
				label: $t('nutrition.kcal'),
				data: stats.nutrition.perDay.map(r => r.kcal),
				borderColor: '#4a90e2',
				backgroundColor: 'rgba(74, 144, 226, 0.15)',
				fill: true,
				tension: 0.3
			}]
		};
	});

	let hasMacros = $derived(
		stats != null &&
		(stats.nutrition.macros.protein_g > 0 ||
			stats.nutrition.macros.carbs_g > 0 ||
			stats.nutrition.macros.fat_g > 0)
	);

	let macroChart = $derived.by(() => {
		if (!hasMacros) return null;
		return {
			labels: [$t('stats.protein'), $t('stats.carbs'), $t('stats.fat')],
			datasets: [{
				data: [
					stats.nutrition.macros.protein_g,
					stats.nutrition.macros.carbs_g,
					stats.nutrition.macros.fat_g
				],
				backgroundColor: ['#4a90e2', '#4caf80', '#e0a040'],
				borderColor: '#1a1f2e',
				borderWidth: 2
			}]
		};
	});

	let sleepChart = $derived.by(() => {
		if (!stats || !stats.sleep.perDay || stats.sleep.perDay.length === 0) return null;
		return {
			labels: stats.sleep.perDay.map(r => fmtDate(r.date)),
			datasets: [{
				label: $t('stats.sleepChart'),
				data: stats.sleep.perDay.map(r => +(r.duration_min / 60).toFixed(1)),
				backgroundColor: '#9a7ae2',
				borderRadius: 6
			}]
		};
	});

	let waterChart = $derived.by(() => {
		if (!stats || stats.water.perDay.length === 0) return null;
		return {
			labels: stats.water.perDay.map(r => fmtDate(r.date)),
			datasets: [{
				label: 'ml',
				data: stats.water.perDay.map(r => r.ml),
				backgroundColor: '#4ab8e2',
				borderRadius: 6
			}]
		};
	});
</script>

<div class="page">
	<div class="header">
		<h2>{$t('stats.title')}</h2>
		<div class="filters">
			<button class:active={days === 7} onclick={() => (days = 7)}>{$t('stats.days7')}</button>
			<button class:active={days === 30} onclick={() => (days = 30)}>{$t('stats.days30')}</button>
			<button class:active={days === 90} onclick={() => (days = 90)}>{$t('stats.days90')}</button>
		</div>
	</div>

	{#if loading && !stats}
		<p class="empty">{$t('stats.loading')}</p>
	{:else if stats}
		<div class="streak-banner">
			<div class="streak-main">
				<span class="streak-flame">🔥</span>
				<div class="streak-info">
					<span class="streak-num">{stats.streak.current}
						<small>{stats.streak.current === 1 ? $t('stats.streakDay') : $t('stats.streakDays')}</small>
					</span>
					<span class="streak-label">{$t('stats.streakCurrent')}</span>
				</div>
			</div>
			<div class="streak-side">
				<div class="streak-stat">
					<span class="streak-side-num">{stats.streak.longest}</span>
					<span class="streak-label">{$t('stats.streakLongest')}</span>
				</div>
				<div class="streak-stat">
					<span class="streak-side-num">{stats.streak.activeDays30}</span>
					<span class="streak-label">{$t('stats.activeDays')}</span>
				</div>
			</div>
		</div>

		<div class="section">
			<h3>🏋️ {$t('stats.sectionWorkouts')}</h3>
			<div class="stats">
				<div class="stat">
					<span class="stat-num">{stats.workouts.total}</span>
					<span class="stat-label">{$t('stats.totalWorkouts')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{formatTime(stats.workouts.totalMin)}</span>
					<span class="stat-label">{$t('stats.trainingTime')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{stats.workouts.thisWeek}</span>
					<span class="stat-label">{$t('stats.thisWeek')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{stats.workouts.avgPerWeek}</span>
					<span class="stat-label">{$t('stats.avgPerWeek')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{stats.workouts.volumeKg.toLocaleString($locale === 'de' ? 'de-DE' : 'en-US')} kg</span>
					<span class="stat-label">{$t('stats.volume')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{stats.workouts.totalSets}</span>
					<span class="stat-label">{$t('stats.sets')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{stats.workouts.avgRestSec ?? 0} s</span>
					<span class="stat-label">{$t('stats.avgRest')}</span>
				</div>
			</div>
			{#if workoutChart}
				<span class="chart-title">{$t('stats.workoutsPerWeek')}</span>
				<StatChart type="bar" data={workoutChart} height={200} />
			{:else}
				<p class="empty">{$t('stats.noWorkouts')}</p>
			{/if}
		</div>

		<div class="section">
			<h3>⚖️ {$t('stats.sectionBody')}</h3>
			{#if stats.body.latest}
				<div class="stats">
					<div class="stat">
						<span class="stat-num">{stats.body.latest.weight_kg} kg</span>
						<span class="stat-label">{$t('stats.weight')}</span>
					</div>
					<div class="stat">
						<span class="stat-num">{stats.body.latest.bmi}</span>
						<span class="stat-label">{$t('stats.bmi')} · {bmiCategory(stats.body.latest.bmi)}</span>
					</div>
					{#if stats.body.latest.body_fat_percent != null}
						<div class="stat">
							<span class="stat-num">{stats.body.latest.body_fat_percent} %</span>
							<span class="stat-label">{$t('stats.bodyFat')}</span>
						</div>
					{/if}
				</div>
			{/if}
			{#if bodyChart}
				<span class="chart-title">{$t('stats.weightTrend')}</span>
				<StatChart type="line" data={bodyChart} options={bodyChartOptions} height={220} />
			{:else}
				<p class="empty">{$t('stats.noBodyData')}</p>
			{/if}
		</div>

		<div class="section">
			<h3>🍽️ {$t('stats.sectionNutrition')}</h3>
			<div class="stats">
				<div class="stat">
					<span class="stat-num">{stats.nutrition.todayKcal} kcal</span>
					<span class="stat-label">{$t('stats.todayKcal')}</span>
				</div>
				<div class="stat">
					<span class="stat-num">{stats.nutrition.avgKcal} kcal</span>
					<span class="stat-label">{$t('stats.avgKcal')}</span>
				</div>
			</div>
			{#if kcalChart}
				<span class="chart-title">{$t('stats.kcalOverTime')}</span>
				<StatChart type="line" data={kcalChart} height={200} />
				{#if macroChart}
					<span class="chart-title">{$t('stats.macros')} (g)</span>
					<div class="doughnut-wrap">
						<StatChart type="doughnut" data={macroChart} height={200} />
					</div>
				{:else}
					<p class="empty">{$t('stats.macroHint')}</p>
				{/if}
			{:else}
				<p class="empty">{$t('stats.noNutritionData')}</p>
			{/if}
		</div>

		<div class="section">
			<h3>💧 {$t('stats.sectionWater')}</h3>
			<div class="stats">
				<div class="stat">
					<span class="stat-num water-num">{(stats.water.todayMl / 1000).toFixed(2)} / {WATER_GOAL / 1000} L</span>
					<span class="stat-label">{$t('stats.todayWater')}</span>
				</div>
				<div class="stat">
					<span class="stat-num water-num">{((stats.water.avgMl || 0) / 1000).toFixed(2)} L</span>
					<span class="stat-label">{$t('stats.avgWater')}</span>
				</div>
			</div>
			{#if waterChart}
				<StatChart type="bar" data={waterChart} height={200} />
			{:else}
				<p class="empty">{$t('stats.noWaterData')}</p>
			{/if}
		</div>

		<div class="section">
			<h3>😴 {$t('stats.sectionSleep')}</h3>
			{#if stats.sleep.count > 0}
				<div class="stats">
					<div class="stat">
						<span class="stat-num">{formatTime(stats.sleep.avgDurationMin)}</span>
						<span class="stat-label">{$t('stats.avgSleep')}</span>
					</div>
					<div class="stat">
						<span class="stat-num">{stats.sleep.avgQuality} / 5</span>
						<span class="stat-label">{$t('stats.avgQuality')}</span>
					</div>
					<div class="stat">
						<span class="stat-num">{stats.sleep.count}</span>
						<span class="stat-label">{$t('stats.sleepEntries')}</span>
					</div>
				</div>
				{#if sleepChart}
					<span class="chart-title">{$t('stats.sleepChart')}</span>
					<StatChart type="bar" data={sleepChart} height={200} />
				{/if}
			{:else}
				<p class="empty">{$t('stats.noSleepData')}</p>
			{/if}
		</div>

		<div class="section">
			<h3>📋 {$t('stats.sectionPlans')}</h3>
			{#if stats.plans.count > 0}
				<ul class="plan-list">
					{#each stats.plans.list as plan (plan.id)}
						<li>
							<span class="plan-name">{plan.name}</span>
							{#if plan.description}<span class="plan-desc">{plan.description}</span>{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<p class="empty">{$t('stats.noPlans')}</p>
			{/if}
		</div>

		<div class="section">
			<h3>📸 {$t('stats.sectionPhotos')}</h3>
			{#if stats.photos.count > 0}
				<div class="stats">
					<div class="stat">
						<span class="stat-num">{stats.photos.count}</span>
						<span class="stat-label">{$t('stats.photosCount')}</span>
					</div>
					{#if stats.photos.latest}
						<div class="stat">
							<span class="stat-num">{fmtDate(stats.photos.latest.date)}</span>
							<span class="stat-label">{$t('stats.latestPhoto')}{#if stats.photos.latest.note} · {stats.photos.latest.note}{/if}</span>
						</div>
					{/if}
				</div>
			{:else}
				<p class="empty">{$t('stats.noPhotos')}</p>
			{/if}
		</div>
	{/if}
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

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	h2 { margin: 0; font-size: 22px; }

	.filters {
		display: flex;
		gap: 6px;
	}

	.filters button {
		padding: 7px 14px;
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 8px;
		color: #888;
		font-size: 13px;
		font-family: inherit;
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.filters button:hover { background: #232a3a; color: #ccc; }

	.filters button.active {
		background: #1e3a5f;
		border-color: #2a4070;
		color: #4a90e2;
		font-weight: 600;
	}

	.streak-banner {
		background: linear-gradient(135deg, #1e2438 0%, #1a1f2e 100%);
		border: 1px solid #2a4070;
		border-radius: 12px;
		padding: 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}

	.streak-main {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.streak-flame { font-size: 38px; }

	.streak-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.streak-num {
		font-size: 32px;
		font-weight: 700;
		color: #e0a040;
		line-height: 1;
	}

	.streak-num small {
		font-size: 14px;
		font-weight: 500;
		color: #888;
	}

	.streak-side {
		display: flex;
		gap: 28px;
	}

	.streak-stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		align-items: flex-end;
	}

	.streak-side-num {
		font-size: 22px;
		font-weight: 700;
		color: #4a90e2;
		line-height: 1.1;
	}

	.streak-label { font-size: 12px; color: #888; }

	.section {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 18px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.section h3 {
		margin: 0;
		font-size: 13px;
		font-weight: 600;
		color: #888;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.chart-title {
		font-size: 12px;
		color: #555;
	}

	.doughnut-wrap {
		max-width: 320px;
		align-self: center;
		width: 100%;
	}

	.stats {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.stat {
		flex: 1;
		min-width: 130px;
		background: #0f1419;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.stat-num {
		font-size: 20px;
		font-weight: 700;
		color: #4a90e2;
		line-height: 1.1;
		white-space: nowrap;
	}

	.water-num { color: #4ab8e2; }

	.stat-label { font-size: 12px; color: #888; }

	.empty { margin: 0; color: #555; font-size: 14px; }

	.plan-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.plan-list li {
		background: #0f1419;
		border: 1px solid #2a3040;
		border-radius: 10px;
		padding: 12px 14px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.plan-name { font-size: 14px; font-weight: 600; color: #e0e0e0; }

	.plan-desc { font-size: 12px; color: #888; }

	@media (max-width: 640px) {
		.page {
			padding: 20px 16px;
			gap: 18px;
		}

		.streak-banner { padding: 16px; }

		.streak-side {
			width: 100%;
			justify-content: space-between;
			gap: 16px;
		}

		.streak-stat { align-items: flex-start; }

		.section { padding: 14px; }

		.stat {
			min-width: 0;
			flex: 1 1 40%;
			padding: 12px 14px;
		}

		.stat-num {
			font-size: 17px;
			white-space: normal;
		}
	}
</style>
