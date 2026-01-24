<script context="module" lang="ts">
  /**
   * Dropdown option type
   */
  export interface DropdownOption {
    value: string;
    label: string;
    icon?: string;
    group?: string;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { ChevronDown } from 'lucide-svelte';

  /**
   * Reusable dropdown component
   * Used for selecting from a list of options throughout the admin interface
   */
  export let options: DropdownOption[] = [];
  export let value: string = '';
  export let name: string = '';
  export let placeholder: string = 'Select...';
  export let label: string = '';
  export let description: string = '';
  export let disabled: boolean = false;
  export let required: boolean = false;
  export let error: string = '';
  export let size: 'small' | 'medium' | 'large' = 'medium';
  export let searchable: boolean = false;
  export let onChange: ((value: string) => void) | undefined = undefined;

  const dispatch = createEventDispatcher<{ change: string }>();

  let isOpen = false;
  let highlightedIndex = -1;
  let searchQuery = '';
  let dropdownRef: HTMLDivElement;
  let triggerRef: HTMLButtonElement;
  let listboxRef: HTMLUListElement;

  // Find the selected option based on current value
  $: selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  $: filteredOptions =
    searchable && searchQuery
      ? options.filter((opt) => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

  // Group options if they have group property
  $: groupedOptions = filteredOptions.reduce(
    (acc, option) => {
      const group = option.group || '';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(option);
      return acc;
    },
    {} as Record<string, DropdownOption[]>
  );

  $: hasGroups = Object.keys(groupedOptions).some((g) => g !== '');

  function toggleDropdown(): void {
    if (disabled) return;
    isOpen = !isOpen;
    if (isOpen) {
      highlightedIndex = -1;
      searchQuery = '';
    }
  }

  function openDropdown(): void {
    if (disabled || isOpen) return;
    isOpen = true;
    highlightedIndex = -1;
    searchQuery = '';
  }

  function closeDropdown(): void {
    isOpen = false;
    highlightedIndex = -1;
    searchQuery = '';
  }

  function selectOption(option: DropdownOption): void {
    if (option.disabled) return;

    value = option.value;
    closeDropdown();

    if (onChange) {
      onChange(option.value);
    }
    dispatch('change', option.value);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          const option = filteredOptions[highlightedIndex];
          if (!option.disabled) {
            selectOption(option);
          }
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          closeDropdown();
          triggerRef?.focus();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          moveHighlight(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          moveHighlight(-1);
        }
        break;
      case 'Tab':
        if (isOpen) {
          closeDropdown();
        }
        break;
    }
  }

  function moveHighlight(direction: number): void {
    const enabledOptions = filteredOptions.filter((opt) => !opt.disabled);
    if (enabledOptions.length === 0) return;

    let newIndex = highlightedIndex + direction;

    // Skip disabled options
    while (
      newIndex >= 0 &&
      newIndex < filteredOptions.length &&
      filteredOptions[newIndex].disabled
    ) {
      newIndex += direction;
    }

    // Wrap around or clamp
    if (newIndex < 0) {
      newIndex = 0;
    } else if (newIndex >= filteredOptions.length) {
      newIndex = filteredOptions.length - 1;
    }

    // Skip to first non-disabled if current is disabled
    while (newIndex < filteredOptions.length && filteredOptions[newIndex].disabled) {
      newIndex++;
    }

    if (newIndex < filteredOptions.length) {
      highlightedIndex = newIndex;
    }
  }

  function handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    searchQuery = target.value;
    highlightedIndex = -1;
  }

  // Click outside action
  function clickOutside(node: HTMLElement): { destroy: () => void } {
    const handleClick = (event: MouseEvent): void => {
      if (node && !node.contains(event.target as Node) && isOpen) {
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

<div class="dropdown-wrapper" class:has-error={!!error} bind:this={dropdownRef} use:clickOutside>
  {#if label}
    <label class="dropdown-label" for="{name || 'dropdown'}-trigger">
      {label}
      {#if required}
        <span class="required-indicator">*</span>
      {/if}
    </label>
  {/if}

  {#if description}
    <p class="dropdown-description">{description}</p>
  {/if}

  <div class="dropdown-container">
    <button
      type="button"
      id="{name || 'dropdown'}-trigger"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={isOpen}
      aria-controls="{name || 'dropdown'}-listbox"
      aria-disabled={disabled}
      class="dropdown-trigger size-{size}"
      class:is-open={isOpen}
      class:is-disabled={disabled}
      bind:this={triggerRef}
      on:click={toggleDropdown}
      on:keydown={handleKeydown}
    >
      <span class="trigger-content">
        {#if selectedOption}
          {#if selectedOption.icon}
            <span class="option-icon">{selectedOption.icon}</span>
          {/if}
          <span class="selected-label">{selectedOption.label}</span>
        {:else}
          <span class="placeholder">{placeholder}</span>
        {/if}
      </span>
      <span class="dropdown-arrow" class:is-open={isOpen}>
        <ChevronDown size={16} />
      </span>
    </button>

    <!-- Hidden input for form integration -->
    <input type="hidden" {name} {value} {required} />

    {#if isOpen}
      <ul
        role="listbox"
        id="{name || 'dropdown'}-listbox"
        class="dropdown-menu"
        bind:this={listboxRef}
        aria-label={label || 'Options'}
      >
        {#if searchable}
          <li class="search-container">
            <input
              type="text"
              class="search-input"
              placeholder="Search..."
              value={searchQuery}
              on:input={handleSearchInput}
              on:keydown={handleKeydown}
            />
          </li>
        {/if}

        {#if filteredOptions.length === 0}
          <li class="no-results">No options found</li>
        {:else if hasGroups}
          {#each Object.entries(groupedOptions) as [group, groupOptions]}
            {#if group}
              <li class="group-header">{group}</li>
            {/if}
            {#each groupOptions as option, _index}
              {@const globalIndex = filteredOptions.indexOf(option)}
              <li
                role="option"
                aria-selected={option.value === value}
                aria-disabled={option.disabled}
                class="dropdown-option"
                class:is-highlighted={globalIndex === highlightedIndex}
                class:is-selected={option.value === value}
                class:is-disabled={option.disabled}
                data-highlighted={globalIndex === highlightedIndex}
                on:click={() => selectOption(option)}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!option.disabled) selectOption(option);
                  }
                }}
                on:mouseenter={() => {
                  if (!option.disabled) highlightedIndex = globalIndex;
                }}
              >
                {#if option.icon}
                  <span class="option-icon">{option.icon}</span>
                {/if}
                <span class="option-label">{option.label}</span>
              </li>
            {/each}
          {/each}
        {:else}
          {#each filteredOptions as option, index}
            <li
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled}
              class="dropdown-option"
              class:is-highlighted={index === highlightedIndex}
              class:is-selected={option.value === value}
              class:is-disabled={option.disabled}
              data-highlighted={index === highlightedIndex}
              on:click={() => selectOption(option)}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!option.disabled) selectOption(option);
                }
              }}
              on:mouseenter={() => {
                if (!option.disabled) highlightedIndex = index;
              }}
            >
              {#if option.icon}
                <span class="option-icon">{option.icon}</span>
              {/if}
              <span class="option-label">{option.label}</span>
            </li>
          {/each}
        {/if}
      </ul>
    {/if}
  </div>

  {#if error}
    <p class="error-message">{error}</p>
  {/if}
</div>

<style>
  .dropdown-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .dropdown-wrapper.has-error .dropdown-trigger {
    border-color: var(--color-error, #ef4444);
  }

  .dropdown-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: 0.25rem;
  }

  .required-indicator {
    color: var(--color-error, #ef4444);
    margin-left: 0.125rem;
  }

  .dropdown-description {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }

  .dropdown-container {
    position: relative;
    width: 100%;
  }

  .dropdown-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: var(--color-bg-secondary, #1a1a2e);
    border: 1px solid var(--color-border-primary, #2a2a4a);
    border-radius: 6px;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
    text-align: left;
    color: var(--color-text-primary);
    font-family: inherit;
  }

  .dropdown-trigger:hover:not(.is-disabled) {
    border-color: var(--color-border-secondary, #3a3a5a);
  }

  .dropdown-trigger:focus {
    outline: none;
    border-color: var(--color-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .dropdown-trigger.is-open {
    border-color: var(--color-primary, #6366f1);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .dropdown-trigger.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--color-bg-tertiary, #242444);
  }

  /* Size variants */
  .dropdown-trigger.size-small {
    padding: 0.375rem 0.625rem;
    font-size: 0.8125rem;
  }

  .dropdown-trigger.size-medium {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
  }

  .dropdown-trigger.size-large {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }

  .trigger-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    min-width: 0;
  }

  .selected-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .placeholder {
    color: var(--color-text-tertiary, #6b7280);
  }

  .dropdown-arrow {
    display: flex;
    align-items: center;
    color: var(--color-text-secondary);
    transition: transform 0.2s ease;
    flex-shrink: 0;
  }

  .dropdown-arrow.is-open {
    transform: rotate(180deg);
  }

  .dropdown-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    max-height: 280px;
    overflow-y: auto;
    background: var(--color-bg-secondary, #1a1a2e);
    border: 1px solid var(--color-border-secondary, #3a3a5a);
    border-radius: 6px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.2),
      0 2px 4px -1px rgba(0, 0, 0, 0.1);
    z-index: 100;
    margin: 0;
    padding: 0.25rem;
    list-style: none;
  }

  .search-container {
    padding: 0.25rem;
    border-bottom: 1px solid var(--color-border-primary, #2a2a4a);
    margin-bottom: 0.25rem;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: var(--color-bg-primary, #0f0f1a);
    border: 1px solid var(--color-border-primary, #2a2a4a);
    border-radius: 4px;
    color: var(--color-text-primary);
    font-size: 0.875rem;
    font-family: inherit;
  }

  .search-input::placeholder {
    color: var(--color-text-tertiary, #6b7280);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary, #6366f1);
  }

  .no-results {
    padding: 0.75rem;
    text-align: center;
    color: var(--color-text-tertiary, #6b7280);
    font-size: 0.875rem;
  }

  .group-header {
    padding: 0.5rem 0.75rem 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-tertiary, #6b7280);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .dropdown-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
    color: var(--color-text-primary);
    font-size: 0.875rem;
  }

  .dropdown-option:hover:not(.is-disabled),
  .dropdown-option.is-highlighted {
    background: var(--color-bg-tertiary, #242444);
  }

  .dropdown-option.is-selected {
    background: rgba(99, 102, 241, 0.15);
    color: var(--color-primary, #6366f1);
  }

  .dropdown-option.is-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .option-icon {
    flex-shrink: 0;
    font-size: 1rem;
    line-height: 1;
  }

  .option-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .error-message {
    font-size: 0.8125rem;
    color: var(--color-error, #ef4444);
    margin: 0.25rem 0 0 0;
  }

  /* Scrollbar styling */
  .dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }

  .dropdown-menu::-webkit-scrollbar-track {
    background: transparent;
  }

  .dropdown-menu::-webkit-scrollbar-thumb {
    background: var(--color-border-secondary, #3a3a5a);
    border-radius: 3px;
  }

  .dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: var(--color-text-tertiary, #6b7280);
  }
</style>
