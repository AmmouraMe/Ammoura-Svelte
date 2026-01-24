<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { ComponentType, SvelteComponent } from 'svelte';
  import * as icons from 'lucide-svelte';
  import { X, Search } from 'lucide-svelte';

  export let value: string = '';
  export let placeholder: string = 'Select an icon (optional)';

  const dispatch = createEventDispatcher<{ change: string }>();

  let searchQuery = '';
  let isOpen = false;
  let filteredIcons: Array<{ name: string; component: ComponentType<SvelteComponent> }> = [];
  let selectedIcon = value;
  let activeCategory = 'popular';
  let searchInputRef: HTMLInputElement;

  // Get all available icons
  const allIcons = Object.entries(icons)
    .filter(([name]) => !name.includes('Lucide')) // Filter out Lucide internal components
    .map(([name, component]) => ({ name, component: component as ComponentType<SvelteComponent> }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Icon categories for better discoverability
  const iconCategories: Record<string, string[]> = {
    popular: [
      'ArrowRight',
      'ArrowLeft',
      'ChevronRight',
      'ChevronDown',
      'ExternalLink',
      'Download',
      'Upload',
      'Plus',
      'Check',
      'X',
      'Heart',
      'Star',
      'Send',
      'Mail',
      'Phone',
      'MessageCircle',
      'ShoppingCart',
      'CreditCard',
      'User',
      'Users'
    ],
    arrows: [
      'ArrowRight',
      'ArrowLeft',
      'ArrowUp',
      'ArrowDown',
      'ArrowUpRight',
      'ArrowDownRight',
      'ArrowUpLeft',
      'ArrowDownLeft',
      'ChevronRight',
      'ChevronLeft',
      'ChevronUp',
      'ChevronDown',
      'ChevronsRight',
      'ChevronsLeft',
      'ChevronsUp',
      'ChevronsDown',
      'MoveRight',
      'MoveLeft',
      'MoveUp',
      'MoveDown'
    ],
    actions: [
      'Download',
      'Upload',
      'Share',
      'Share2',
      'Copy',
      'Clipboard',
      'Save',
      'Edit',
      'Trash2',
      'RotateCcw',
      'RotateCw',
      'RefreshCw',
      'Play',
      'Pause',
      'Search',
      'ZoomIn',
      'ZoomOut',
      'Settings',
      'Maximize',
      'Minimize'
    ],
    commerce: [
      'ShoppingCart',
      'ShoppingBag',
      'CreditCard',
      'DollarSign',
      'Tag',
      'Gift',
      'Package',
      'Truck',
      'Store',
      'Receipt',
      'Wallet',
      'Percent',
      'BadgeDollarSign',
      'Banknote',
      'Coins',
      'CircleDollarSign'
    ],
    communication: [
      'Mail',
      'Phone',
      'MessageCircle',
      'MessageSquare',
      'Send',
      'Inbox',
      'AtSign',
      'Bell',
      'BellRing',
      'Video',
      'PhoneCall',
      'Voicemail',
      'Megaphone',
      'Radio'
    ],
    social: [
      'Heart',
      'ThumbsUp',
      'ThumbsDown',
      'Star',
      'Users',
      'User',
      'UserPlus',
      'UserCheck',
      'Share2',
      'Link',
      'ExternalLink',
      'Globe',
      'Smile',
      'Frown',
      'Meh'
    ],
    media: [
      'Play',
      'Pause',
      'PlayCircle',
      'PauseCircle',
      'SkipForward',
      'SkipBack',
      'FastForward',
      'Rewind',
      'Volume2',
      'VolumeX',
      'Music',
      'Image',
      'Camera',
      'Film',
      'Tv',
      'Youtube',
      'Mic',
      'Headphones'
    ],
    files: [
      'File',
      'FileText',
      'FilePlus',
      'FileCheck',
      'Folder',
      'FolderOpen',
      'FolderPlus',
      'Download',
      'Upload',
      'Paperclip',
      'Archive',
      'Book',
      'BookOpen',
      'FileCode',
      'FileImage'
    ],
    navigation: [
      'Home',
      'Menu',
      'MoreHorizontal',
      'MoreVertical',
      'Grid',
      'List',
      'Layout',
      'Compass',
      'Map',
      'MapPin',
      'Navigation',
      'Locate',
      'Target',
      'Crosshair'
    ],
    interface: [
      'Check',
      'X',
      'Plus',
      'Minus',
      'AlertCircle',
      'AlertTriangle',
      'Info',
      'HelpCircle',
      'Eye',
      'EyeOff',
      'Lock',
      'Unlock',
      'Key',
      'Shield',
      'ShieldCheck'
    ]
  };

  const categoryLabels: Record<string, string> = {
    popular: '⭐ Popular',
    arrows: '➡️ Arrows',
    actions: '⚡ Actions',
    commerce: '🛒 Commerce',
    communication: '💬 Communication',
    social: '👥 Social',
    media: '🎬 Media',
    files: '📁 Files',
    navigation: '🧭 Navigation',
    interface: '⚙️ Interface'
  };

  function getIconsForCategory(
    category: string
  ): Array<{ name: string; component: ComponentType<SvelteComponent> }> {
    const categoryNames = iconCategories[category] || [];
    return allIcons.filter((icon) => categoryNames.includes(icon.name));
  }

  function filterIcons(query: string): void {
    if (!query.trim()) {
      filteredIcons = getIconsForCategory(activeCategory);
      return;
    }

    const lowerQuery = query.toLowerCase();
    // Search all icons when there's a query
    filteredIcons = allIcons
      .filter((icon) => icon.name.toLowerCase().includes(lowerQuery))
      .slice(0, 50); // Limit to 50 results for performance
  }

  function selectIcon(iconName: string): void {
    selectedIcon = iconName;
    value = iconName;
    closeModal();
    dispatch('change', iconName);
  }

  function clearIcon(): void {
    selectedIcon = '';
    value = '';
    dispatch('change', '');
  }

  function openModal(): void {
    isOpen = true;
    filterIcons(searchQuery);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    // Focus search input after modal opens
    setTimeout(() => {
      searchInputRef?.focus();
    }, 100);
  }

  function closeModal(): void {
    isOpen = false;
    searchQuery = '';
    document.body.style.overflow = '';
  }

  function handleBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      closeModal();
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && isOpen) {
      closeModal();
    }
  }

  function handleCategoryChange(category: string): void {
    activeCategory = category;
    searchQuery = '';
    filterIcons('');
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
    filterIcons(''); // Initialize with popular icons
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  });

  $: filterIcons(searchQuery);

  // Sync external value changes
  $: if (value !== selectedIcon) {
    selectedIcon = value;
  }

  // Get the component for the selected icon
  $: SelectedIconComponent = selectedIcon
    ? allIcons.find((i) => i.name === selectedIcon)?.component
    : null;
</script>

<div class="button-icon-picker-container">
  <div class="picker-trigger-row">
    <button type="button" class="icon-picker-trigger" on:click={openModal}>
      {#if SelectedIconComponent}
        <span class="selected-icon">
          <svelte:component this={SelectedIconComponent} size={18} />
        </span>
        <span class="icon-name">{selectedIcon}</span>
      {:else}
        <span class="placeholder">{placeholder}</span>
      {/if}
      <span class="chevron" class:open={isOpen}>▼</span>
    </button>
    {#if selectedIcon}
      <button type="button" class="clear-btn" on:click={clearIcon} title="Remove icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
    {/if}
  </div>

  {#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click={handleBackdropClick}>
      <div class="icon-picker-modal" role="dialog" aria-modal="true" aria-label="Select an icon">
        <!-- Modal Header -->
        <div class="modal-header">
          <h3 class="modal-title">Select Icon</h3>
          <button type="button" class="modal-close" on:click={closeModal} title="Close">
            <X size={24} />
          </button>
        </div>

        <!-- Search Bar -->
        <div class="modal-search">
          <div class="search-input-wrapper">
            <Search size={18} class="search-icon" />
            <input
              bind:this={searchInputRef}
              type="text"
              placeholder="Search 1500+ icons..."
              bind:value={searchQuery}
              class="search-input"
            />
            {#if searchQuery}
              <button type="button" class="search-clear" on:click={() => (searchQuery = '')}>
                <X size={16} />
              </button>
            {/if}
          </div>
        </div>

        <!-- Category Tabs (only when not searching) -->
        {#if !searchQuery}
          <div class="category-tabs-wrapper">
            <div class="category-tabs">
              {#each Object.keys(iconCategories) as category}
                <button
                  type="button"
                  class="category-tab"
                  class:active={activeCategory === category}
                  on:click={() => handleCategoryChange(category)}
                >
                  {categoryLabels[category]}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Icon Grid -->
        <div class="icon-grid-wrapper">
          {#if searchQuery && filteredIcons.length > 0}
            <div class="result-count">
              {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} found
            </div>
          {/if}

          <div class="icon-grid">
            {#each filteredIcons as icon (icon.name)}
              <button
                type="button"
                class="icon-option"
                class:selected={selectedIcon === icon.name}
                on:click={() => selectIcon(icon.name)}
                title={icon.name}
              >
                <svelte:component this={icon.component} size={24} />
                <span class="icon-label">{icon.name}</span>
              </button>
            {/each}
            {#if filteredIcons.length === 0}
              <div class="no-results">
                {#if searchQuery}
                  <div class="no-results-icon">🔍</div>
                  <p>No icons found for "{searchQuery}"</p>
                  <p class="no-results-hint">Try a different search term</p>
                {:else}
                  <p>No icons in this category</p>
                {/if}
              </div>
            {/if}
          </div>
        </div>

        <!-- Selected Icon Preview (Mobile) -->
        {#if selectedIcon && SelectedIconComponent}
          <div class="selected-preview">
            <span class="preview-label">Selected:</span>
            <svelte:component this={SelectedIconComponent} size={20} />
            <span class="preview-name">{selectedIcon}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /* ===== TRIGGER BUTTON ===== */
  .button-icon-picker-container {
    position: relative;
    width: 100%;
  }

  .picker-trigger-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .icon-picker-trigger {
    flex: 1;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s;
    min-height: 38px;
  }

  .icon-picker-trigger:hover {
    border-color: var(--color-primary);
  }

  .selected-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
  }

  .icon-name {
    flex: 1;
    text-align: left;
    font-weight: 500;
  }

  .icon-picker-trigger .placeholder {
    color: var(--color-text-secondary);
    flex: 1;
    text-align: left;
  }

  .chevron {
    margin-left: auto;
    font-size: 0.625rem;
    color: var(--color-text-secondary);
    transition: transform 0.2s;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .clear-btn {
    padding: 0.5rem;
    background: transparent;
    border: 1px solid var(--color-border-secondary);
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clear-btn:hover {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.5);
    color: rgb(239, 68, 68);
  }

  /* ===== MODAL BACKDROP ===== */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 9999;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* ===== MODAL (Mobile First - Full Screen) ===== */
  .icon-picker-modal {
    background: var(--color-bg-primary);
    width: 100%;
    height: 90vh;
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.3s ease-out;
  }

  /* ===== MODAL HEADER ===== */
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
    flex-shrink: 0;
  }

  .modal-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .modal-close {
    padding: 0.5rem;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .modal-close:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  /* ===== SEARCH BAR ===== */
  .modal-search {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border-secondary);
    flex-shrink: 0;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search-input-wrapper :global(.search-icon) {
    position: absolute;
    left: 0.75rem;
    color: var(--color-text-tertiary);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    font-size: 1rem;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  .search-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .search-clear {
    position: absolute;
    right: 0.5rem;
    padding: 0.375rem;
    background: var(--color-bg-tertiary);
    border: none;
    border-radius: 50%;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .search-clear:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  /* ===== CATEGORY TABS ===== */
  .category-tabs-wrapper {
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border-secondary);
    background: var(--color-bg-secondary);
  }

  .category-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }

  .category-tabs::-webkit-scrollbar {
    display: none;
  }

  .category-tab {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .category-tab:hover {
    background: var(--color-bg-tertiary);
    color: var(--color-text-primary);
  }

  .category-tab.active {
    background: var(--color-primary);
    color: white;
  }

  /* ===== ICON GRID ===== */
  .icon-grid-wrapper {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .result-count {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border-secondary);
  }

  .icon-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    padding: 1rem;
  }

  .icon-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding: 0.75rem 0.5rem;
    border: 1px solid var(--color-border-secondary);
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all 0.15s;
    min-height: 70px;
  }

  .icon-option:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-tertiary);
    transform: scale(1.02);
  }

  .icon-option:active {
    transform: scale(0.98);
  }

  .icon-option.selected {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: white;
  }

  .icon-label {
    font-size: 0.65rem;
    text-align: center;
    line-height: 1.2;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ===== NO RESULTS ===== */
  .no-results {
    grid-column: 1 / -1;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--color-text-secondary);
  }

  .no-results-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .no-results p {
    margin: 0.25rem 0;
  }

  .no-results-hint {
    font-size: 0.875rem;
    color: var(--color-text-tertiary);
  }

  /* ===== SELECTED PREVIEW (Mobile) ===== */
  .selected-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border-top: 1px solid var(--color-border-secondary);
    background: var(--color-bg-secondary);
    flex-shrink: 0;
  }

  .preview-label {
    font-size: 0.75rem;
    color: var(--color-text-tertiary);
  }

  .preview-name {
    font-weight: 500;
    color: var(--color-primary);
  }

  /* ===== TABLET BREAKPOINT (768px+) ===== */
  @media (min-width: 768px) {
    .modal-backdrop {
      align-items: center;
    }

    .icon-picker-modal {
      width: 90%;
      max-width: 600px;
      height: auto;
      max-height: 80vh;
      border-radius: 12px;
      animation: scaleIn 0.2s ease-out;
    }

    .icon-grid {
      grid-template-columns: repeat(5, 1fr);
    }

    .category-tab {
      font-size: 0.75rem;
    }
  }

  /* ===== DESKTOP BREAKPOINT (1024px+) ===== */
  @media (min-width: 1024px) {
    .icon-picker-modal {
      max-width: 700px;
    }

    .icon-grid {
      grid-template-columns: repeat(6, 1fr);
      gap: 0.625rem;
    }

    .icon-option {
      padding: 0.875rem 0.5rem;
    }

    .icon-label {
      font-size: 0.7rem;
    }

    .selected-preview {
      display: none;
    }
  }
</style>
