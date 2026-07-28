<script lang="ts">
  import TranslationForm from '$lib/components/admin/TranslationForm.svelte';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;
</script>

<svelte:head>
  <title>Translate page: {data.page.title} - Admin</title>
</svelte:head>

<TranslationForm
  rows={data.rows}
  {form}
  heading={`Translate "${data.page.title}" into ${data.localeName}`}
  subheading={`Page ${data.page.slug} — blank fields fall back to the original text.`}
/>
