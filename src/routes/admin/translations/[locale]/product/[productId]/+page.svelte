<script lang="ts">
  import TranslationForm from '$lib/components/admin/TranslationForm.svelte';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Translate product: {data.product.name} - Admin</title>
</svelte:head>

<TranslationForm
  rows={data.rows}
  {form}
  heading={`Translate "${data.product.name}" into ${data.localeName}`}
  subheading="Blank fields fall back to the original text."
/>
