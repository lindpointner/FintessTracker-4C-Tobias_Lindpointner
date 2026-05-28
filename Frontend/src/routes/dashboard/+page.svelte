<script>
	import { user } from "$lib/userStore";
	import { t } from "$lib/i18n";
</script>

<div class="page">
	<h2>{$t('dashboard.greeting')}, {$user?.name}!</h2>
</div>

<style>
	.page {
		padding: 32px;
		display: flex;
		flex-direction: column;
		gap: 24px;
		max-width: 900px;
	}

	h2 { margin: 0; font-size: 22px; }
	h3 { margin: 0 0 12px; font-size: 15px; color: #aaa; }

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 16px;
	}

	.card {
		background: #1a1f2e;
		border: 1px solid #2a3040;
		border-radius: 12px;
		padding: 20px;
	}

	.value {
		margin: 0 0 6px;
		font-size: 28px;
		font-weight: 700;
		color: #4a90e2;
	}

	.label, .empty {
		margin: 0;
		font-size: 13px;
		color: #666;
	}
</style>
