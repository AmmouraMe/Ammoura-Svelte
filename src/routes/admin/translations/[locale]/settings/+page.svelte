<script lang="ts">
  import TranslationForm from '$lib/components/admin/TranslationForm.svelte';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Translate store details - Admin</title>
</svelte:head>

<TranslationForm
  rows={data.rows}
  {form}
  heading={`Translate store details into ${data.localeName}`}
  subheading="Store name and tagline are substituted wherever your pages use them."
/>
