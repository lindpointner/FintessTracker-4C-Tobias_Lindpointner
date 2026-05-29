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
</style>
