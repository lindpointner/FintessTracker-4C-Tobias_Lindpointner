<script>
	import Chart from 'chart.js/auto';

	let { type = 'line', data, options = {}, height = 220 } = $props();
	let canvas;

	const darkDefaults = {
		plugins: {
			legend: {
				labels: { color: '#aaa', boxWidth: 12, font: { size: 12 } }
			}
		},
		scales: type === 'doughnut' ? {} : {
			x: {
				ticks: { color: '#888', font: { size: 11 } },
				grid: { color: '#2a3040' }
			},
			y: {
				ticks: { color: '#888', font: { size: 11 } },
				grid: { color: '#2a3040' },
				beginAtZero: true
			}
		}
	};

	function merge(base, extra) {
		const out = { ...base };
		for (const key of Object.keys(extra)) {
			if (extra[key] && typeof extra[key] === 'object' && !Array.isArray(extra[key]) && base[key]) {
				out[key] = merge(base[key], extra[key]);
			} else {
				out[key] = extra[key];
			}
		}
		return out;
	}

	$effect(() => {
		// Chart.js mutiert data → nie Svelte-Proxies übergeben
		const chart = new Chart(canvas, {
			type,
			data: $state.snapshot(data),
			options: merge(
				{ responsive: true, maintainAspectRatio: false, ...darkDefaults },
				$state.snapshot(options)
			)
		});
		return () => chart.destroy();
	});
</script>

<div class="chart-wrap" style="height: {height}px">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart-wrap {
		position: relative;
		width: 100%;
	}
</style>
