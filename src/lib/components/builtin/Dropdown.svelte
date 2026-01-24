<script lang="ts">
  import type { WidgetConfig, PageComponent } from '$lib/types/pages';
  import { ChevronDown, User } from 'lucide-svelte';
  import { fly } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import FrontendComponentRenderer from '$lib/components/FrontendComponentRenderer.svelte';
  import {
    substituteTemplate,
    createUserContext,
    type SiteContext
  } from '$lib/utils/templateSubstitution';

  // User type for visibility checking
  interface UserInfo {
    id?: number | string;
    email?: string;
    name?: string;
    role?: string;
    roles?: string[];
  }

  export let config: WidgetConfig;
  export let siteContext: SiteContext | undefined = undefined;
  export let user: UserInfo | null | undefined = undefined; // For visibility filtering of children

  // Create user context for template substitution
  $: userContext = createUserContext(user);

  // Fallback site context for template substitution
  const fallbackSite: SiteContext = {
    name: '',
    tagline: '',
    description: '',
    email: '',
    supportEmail: '',
    phone: '',
    currency: ''
  };

  // Reactive template variables
  $: templateVars = {
    site: siteContext || fallbackSite,
    user: userContext
  };

  // Helper function to substitute templates in text
  function sub(text: string, vars: typeof templateVars): string {
    if (!text) return text;
    return substituteTemplate(text, vars);
  }

  // Dropdown trigger configuration
  $: triggerLabel = sub(config.triggerLabel || config.label || 'Menu', templateVars);
  $: triggerIcon = config.triggerIcon || '';
  $: showChevron = config.showChevron !== false;
  $: triggerVariant = (config.triggerVariant as 'text' | 'button' | 'icon') || 'text';

  // Menu styling
  $: menuWidth = config.menuWidth || 'auto';
  $: menuAlign = (config.menuAlign as 'left' | 'right' | 'center') || 'left';
  $: menuBackground = config.menuBackground || 'var(--color-bg-primary)';
  $: menuBorderRadius = config.menuBorderRadius || 8;
  $: menuShadow = config.menuShadow !== false;
  $: menuPadding = config.menuPadding || { top: 8, right: 8, bottom: 8, left: 8 };

  // Get children from config
  $: children = (config.children as PageComponent[]) || [];

  // State
  let isOpen = false;
  let dropdownRef: HTMLDivElement;

  function toggleDropdown(): void {
    isOpen = !isOpen;
  }

  function closeDropdown(): void {
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  }

  // Use Svelte action for click outside detection
  function clickOutside(node: HTMLElement) {
    const handleClick = (event: MouseEvent) => {
      if (!node.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('click', handleClick, true);
    return {
      destroy() {
        document.removeEventListener('click', handleClick, true);
      }
    };
  }
</script>

<div
  class="dropdown-container"
  class:open={isOpen}
  bind:this={dropdownRef}
  use:clickOutside
  id={config.anchorName || undefined}
>
  <!-- Trigger Button -->
  <button
    type="button"
    class="dropdown-trigger variant-{triggerVariant}"
    on:click={toggleDropdown}
    on:keydown={handleKeydown}
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    {#if triggerIcon}
      <span class="trigger-icon">
        {#if triggerIcon === 'user'}
          <User size={18} />
        {:else}
          {triggerIcon}
        {/if}
      </span>
    {/if}
    {#if triggerVariant !== 'icon'}
      <span class="trigger-label">{triggerLabel}</span>
    {/if}
    {#if showChevron}
      <span class="trigger-chevron" class:rotated={isOpen}>
        <ChevronDown size={16} />
      </span>
    {/if}
  </button>

  <!-- Dropdown Menu -->
  {#if isOpen}
    <div
      class="dropdown-menu align-{menuAlign}"
      class:has-shadow={menuShadow}
      style="
        min-width: {typeof menuWidth === 'number' ? `${menuWidth}px` : menuWidth};
        background: {menuBackground};
        border-radius: {menuBorderRadius}px;
        padding: {menuPadding.top}px {menuPadding.right}px {menuPadding.bottom}px {menuPadding.left}px;
      "
      role="menu"
      transition:fly={{ y: -8, duration: 200, easing: quintOut }}
    >
      {#if children.length > 0}
        {#each children as child (child.id)}
          <div class="dropdown-item" role="menuitem">
            <FrontendComponentRenderer
              type={child.type}
              config={child.config || {}}
              {siteContext}
              {user}
            />
          </div>
        {/each}
      {:else}
        <div class="dropdown-empty">
          <span>No menu items</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .dropdown-container {
    position: relative;
    display: inline-block;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    color: inherit;
    transition: all 0.2s ease;
  }

  .dropdown-trigger:hover {
    opacity: 0.8;
  }

  .dropdown-trigger.variant-button {
    background: var(--color-primary);
    color: white;
    border-radius: 6px;
  }

  .dropdown-trigger.variant-icon {
    padding: 0.5rem;
    border-radius: 50%;
  }

  .dropdown-trigger.variant-icon:hover {
    background: var(--color-bg-secondary);
  }

  .trigger-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .trigger-label {
    font-weight: 500;
  }

  .trigger-chevron {
    display: flex;
    align-items: center;
    transition: transform 0.2s ease;
  }

  .trigger-chevron.rotated {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    margin-top: 4px;
    z-index: 1000;
    border: 1px solid var(--color-border-secondary);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dropdown-menu.align-left {
    left: 0;
  }

  .dropdown-menu.align-right {
    right: 0;
  }

  .dropdown-menu.align-center {
    left: 50%;
    transform: translateX(-50%);
  }

  .dropdown-menu.has-shadow {
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }

  .dropdown-item {
    width: 100%;
  }

  .dropdown-empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
  }
</style>
