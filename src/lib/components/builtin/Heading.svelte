<script lang="ts">
  import type { WidgetConfig, ColorTheme } from '$lib/types/pages';
  import type { SiteContext, UserInfo } from '$lib/utils/templateSubstitution';
  import { substituteTemplate, createUserContext } from '$lib/utils/templateSubstitution';
  import { resolveThemeColor } from '$lib/utils/editor/colorThemes';

  export let config: WidgetConfig;
  export let colorTheme: ColorTheme = 'vibrant';
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined;
  // When true, prevents navigation for links (used in builder preview)
  export let isEditable = false;

  $: rawHeading = config.heading || 'Heading';
  $: userContext = createUserContext(user);
  $: heading = siteContext
    ? substituteTemplate(rawHeading, { site: siteContext, user: userContext })
    : rawHeading;
  $: level = config.level || 2;
  $: alignment = config.alignment || 'left';
  $: textColor = resolveThemeColor(config.textColor, colorTheme, 'inherit', true);
  $: link = config.link || '';

  // Prevents link navigation when in edit mode (builder preview)
  function handleLinkClick(event: MouseEvent): void {
    if (isEditable) {
      event.preventDefault();
    }
  }
</script>

<div
  class="heading-widget"
  id={config.anchorName || undefined}
  style="text-align: {alignment}; color: {textColor};"
>
  {#if level === 1}
    <h1>
      {#if link}<a href={link} on:click={handleLinkClick}>{heading}</a>{:else}{heading}{/if}
    </h1>
  {:else if level === 2}
    <h2>
      {#if link}<a href={link} on:click={handleLinkClick}>{heading}</a>{:else}{heading}{/if}
    </h2>
  {:else if level === 3}
    <h3>
      {#if link}<a href={link} on:click={handleLinkClick}>{heading}</a>{:else}{heading}{/if}
    </h3>
  {:else if level === 4}
    <h4>
      {#if link}<a href={link} on:click={handleLinkClick}>{heading}</a>{:else}{heading}{/if}
    </h4>
  {:else if level === 5}
    <h5>
      {#if link}<a href={link} on:click={handleLinkClick}>{heading}</a>{:else}{heading}{/if}
    </h5>
  {:else}
    <h6>
      {#if link}<a href={link} on:click={handleLinkClick}>{heading}</a>{:else}{heading}{/if}
    </h6>
  {/if}
</div>

<style>
  .heading-widget {
    padding: 0.5rem 0;
    transition: color var(--transition-normal);
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 0;
    padding: 0;
    color: inherit;
  }

  h1 {
    font-size: 2.5rem;
  }

  h2 {
    font-size: 2rem;
  }

  h3 {
    font-size: 1.75rem;
  }

  h4 {
    font-size: 1.5rem;
  }

  h5 {
    font-size: 1.25rem;
  }

  h6 {
    font-size: 1rem;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }

    h2 {
      font-size: 1.75rem;
    }

    h3 {
      font-size: 1.5rem;
    }
  }
</style>
