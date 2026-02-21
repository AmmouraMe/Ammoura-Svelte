<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { themeStore } from '$lib/stores/theme';
  import { toastStore } from '$lib/stores/toast';
  import type { Theme } from '$lib/types/theme';
  import type { ColorThemeDefinition } from '$lib/types/pages';

  interface UserPreferences {
    user_id: string;
    site_id: string;
    color_scheme: Theme;
    light_theme_id: string | null;
    dark_theme_id: string | null;
  }

  interface SiteDefaults {
    light_theme_id: string;
    dark_theme_id: string;
  }

  let loading = true;
  let saving = false;
  let themes: ColorThemeDefinition[] = [];
  let preferences: UserPreferences | null = null;
  let siteDefaults: SiteDefaults | null = null;
  let initialized = false;
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  let isInternalChange = false;

  // Local state for the form
  let colorScheme: Theme = 'system';
  let selectedLightTheme: string | null = null;
  let selectedDarkTheme: string | null = null;

  // Subscribe to themeStore to sync external changes (e.g., from navbar toggle)
  const unsubscribe = themeStore.subscribe((storeTheme) => {
    // Only sync if initialized and the change came from outside this component
    if (initialized && !isInternalChange && storeTheme !== colorScheme) {
      colorScheme = storeTheme;
      scheduleAutoSave();
    }
  });

  onDestroy(() => {
    unsubscribe();
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  $: lightThemes = themes.filter((t) => t.mode === 'light');
  $: darkThemes = themes.filter((t) => t.mode === 'dark');

  // Calculate effective themes (user's choice or site default)
  $: effectiveLightTheme = selectedLightTheme || siteDefaults?.light_theme_id || 'vibrant';
  $: effectiveDarkTheme = selectedDarkTheme || siteDefaults?.dark_theme_id || 'midnight';

  // Get theme by ID
  function _getTheme(id: string): ColorThemeDefinition | undefined {
    return themes.find((t) => t.id === id);
  }

  onMount(async () => {
    await loadPreferences();
  });

  async function loadPreferences(): Promise<void> {
    try {
      loading = true;
      const response = await fetch('/api/user/theme-preferences');
      if (!response.ok) throw new Error('Failed to load preferences');

      const data = (await response.json()) as {
        preferences: UserPreferences;
        themes: ColorThemeDefinition[];
        siteDefaults: SiteDefaults;
      };

      themes = data.themes;
      preferences = data.preferences;
      siteDefaults = data.siteDefaults;

      // Initialize local state from preferences
      colorScheme = preferences.color_scheme;
      selectedLightTheme = preferences.light_theme_id;
      selectedDarkTheme = preferences.dark_theme_id;
      initialized = true;
    } catch (error) {
      console.error('Error loading theme preferences:', error);
      toastStore.error('Failed to load theme preferences');
    } finally {
      loading = false;
    }
  }

  async function savePreferences(): Promise<void> {
    try {
      saving = true;
      const response = await fetch('/api/user/theme-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          color_scheme: colorScheme,
          light_theme_id: selectedLightTheme,
          dark_theme_id: selectedDarkTheme
        })
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      // Update stored preferences to match current state
      if (preferences) {
        preferences = {
          ...preferences,
          color_scheme: colorScheme,
          light_theme_id: selectedLightTheme,
          dark_theme_id: selectedDarkTheme
        };
      }

      // Reload layout data so the new theme colors are applied immediately
      await invalidateAll();
    } catch (error) {
      console.error('Error saving theme preferences:', error);
      toastStore.error('Failed to save theme preferences');
    } finally {
      saving = false;
    }
  }

  // Debounced auto-save when preferences change
  function scheduleAutoSave(): void {
    if (!initialized) return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      savePreferences();
    }, 500);
  }

  function selectLightTheme(themeId: string): void {
    selectedLightTheme = themeId === siteDefaults?.light_theme_id ? null : themeId;
    scheduleAutoSave();
  }

  function selectDarkTheme(themeId: string): void {
    selectedDarkTheme = themeId === siteDefaults?.dark_theme_id ? null : themeId;
    scheduleAutoSave();
  }

  function setColorScheme(scheme: Theme): void {
    colorScheme = scheme;
    // Mark as internal change to prevent subscription loop
    isInternalChange = true;
    themeStore.setTheme(colorScheme);
    // Reset after a tick to allow subscription to process
    setTimeout(() => {
      isInternalChange = false;
    }, 0);
    scheduleAutoSave();
  }
</script>

<div class="theme-preferences">
  <h2>Theme Preferences</h2>
  <p class="description">
    Customize your viewing experience. Choose your preferred color scheme and themes.
  </p>

  {#if loading}
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Loading theme preferences...</p>
    </div>
  {:else}
    <!-- Color Scheme Mode -->
    <section class="preference-section">
      <h3>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          />
        </svg>
        Color Scheme
      </h3>
      <p class="section-description">
        Choose how the site should appear. System will follow your device's settings.
      </p>

      <div class="color-scheme-options">
        <button
          type="button"
          class="scheme-option"
          class:selected={colorScheme === 'light'}
          on:click={() => setColorScheme('light')}
        >
          <div class="scheme-icon light-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </div>
          <span class="scheme-label">Light</span>
          <span class="scheme-hint">Always use light theme</span>
        </button>

        <button
          type="button"
          class="scheme-option"
          class:selected={colorScheme === 'dark'}
          on:click={() => setColorScheme('dark')}
        >
          <div class="scheme-icon dark-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </div>
          <span class="scheme-label">Dark</span>
          <span class="scheme-hint">Always use dark theme</span>
        </button>

        <button
          type="button"
          class="scheme-option"
          class:selected={colorScheme === 'system'}
          on:click={() => setColorScheme('system')}
        >
          <div class="scheme-icon system-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          <span class="scheme-label">System</span>
          <span class="scheme-hint">Match your device</span>
        </button>
      </div>
    </section>

    <!-- Light Theme Selection -->
    <section class="preference-section">
      <h3>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
        </svg>
        Preferred Light Theme
      </h3>
      <p class="section-description">Select which light theme to use when in light mode.</p>

      <div class="theme-grid">
        {#each lightThemes as theme (theme.id)}
          <button
            type="button"
            class="theme-card"
            class:selected={effectiveLightTheme === theme.id}
            class:is-default={!selectedLightTheme && theme.id === siteDefaults?.light_theme_id}
            on:click={() => selectLightTheme(theme.id)}
          >
            <div class="theme-preview" style="background: {theme.colors.background}">
              <div class="preview-header" style="background: {theme.colors.primary}"></div>
              <div class="preview-content">
                <div class="preview-text" style="background: {theme.colors.text}"></div>
                <div
                  class="preview-text short"
                  style="background: {theme.colors.textSecondary}"
                ></div>
              </div>
              <div class="preview-dots">
                <span class="dot" style="background: {theme.colors.primary}"></span>
                <span class="dot" style="background: {theme.colors.secondary}"></span>
                <span class="dot" style="background: {theme.colors.accent}"></span>
              </div>
            </div>
            <div class="theme-info">
              <span class="theme-name">{theme.name}</span>
              {#if !selectedLightTheme && theme.id === siteDefaults?.light_theme_id}
                <span class="default-badge">Site Default</span>
              {:else if selectedLightTheme === theme.id}
                <span class="selected-badge">Your Choice</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>

    <!-- Dark Theme Selection -->
    <section class="preference-section">
      <h3>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
        Preferred Dark Theme
      </h3>
      <p class="section-description">Select which dark theme to use when in dark mode.</p>

      <div class="theme-grid">
        {#each darkThemes as theme (theme.id)}
          <button
            type="button"
            class="theme-card"
            class:selected={effectiveDarkTheme === theme.id}
            class:is-default={!selectedDarkTheme && theme.id === siteDefaults?.dark_theme_id}
            on:click={() => selectDarkTheme(theme.id)}
          >
            <div class="theme-preview" style="background: {theme.colors.background}">
              <div class="preview-header" style="background: {theme.colors.primary}"></div>
              <div class="preview-content">
                <div class="preview-text" style="background: {theme.colors.text}"></div>
                <div
                  class="preview-text short"
                  style="background: {theme.colors.textSecondary}"
                ></div>
              </div>
              <div class="preview-dots">
                <span class="dot" style="background: {theme.colors.primary}"></span>
                <span class="dot" style="background: {theme.colors.secondary}"></span>
                <span class="dot" style="background: {theme.colors.accent}"></span>
              </div>
            </div>
            <div class="theme-info">
              <span class="theme-name">{theme.name}</span>
              {#if !selectedDarkTheme && theme.id === siteDefaults?.dark_theme_id}
                <span class="default-badge">Site Default</span>
              {:else if selectedDarkTheme === theme.id}
                <span class="selected-badge">Your Choice</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>

    <!-- Auto-save indicator -->
    {#if saving}
      <div class="auto-save-indicator">
        <span class="saving-spinner"></span>
        <span>Saving...</span>
      </div>
    {/if}
  {/if}
</div>

<style>
  .theme-preferences {
    background: var(--color-bg-primary);
    border: 1px solid var(--color-border-primary);
    border-radius: 12px;
    padding: var(--spacing-lg);
  }

  .theme-preferences h2 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: 1.25rem;
    color: var(--color-text-primary);
  }

  .description {
    margin: 0 0 var(--spacing-lg) 0;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    gap: var(--spacing-md);
    color: var(--color-text-secondary);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-border-primary);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .preference-section {
    margin-bottom: var(--spacing-xl);
    padding-bottom: var(--spacing-lg);
    border-bottom: 1px solid var(--color-border-primary);
  }

  .preference-section:last-of-type {
    border-bottom: none;
    margin-bottom: var(--spacing-md);
  }

  .preference-section h3 {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0 0 var(--spacing-xs) 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .preference-section h3 svg {
    color: var(--color-primary);
  }

  .section-description {
    margin: 0 0 var(--spacing-md) 0;
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  /* Color Scheme Options */
  .color-scheme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: var(--spacing-md);
  }

  .scheme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-lg);
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border-primary);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .scheme-option:hover {
    border-color: var(--color-primary);
    background: var(--color-bg-tertiary);
  }

  .scheme-option.selected {
    border-color: var(--color-primary);
    background: rgba(var(--color-primary-rgb, 139, 92, 246), 0.1);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 139, 92, 246), 0.15);
  }

  .scheme-icon {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
  }

  .scheme-option.selected .scheme-icon {
    color: var(--color-primary);
  }

  .light-icon {
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #f59e0b;
  }

  .dark-icon {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    color: #a78bfa;
  }

  .system-icon {
    background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    color: #475569;
  }

  .scheme-label {
    font-weight: 600;
    color: var(--color-text-primary);
    font-size: 0.95rem;
  }

  .scheme-hint {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  /* Theme Grid */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--spacing-md);
  }

  .theme-card {
    display: flex;
    flex-direction: column;
    background: var(--color-bg-secondary);
    border: 2px solid var(--color-border-primary);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 0;
  }

  .theme-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .theme-card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 139, 92, 246), 0.2);
  }

  .theme-card.is-default {
    border-color: var(--color-success);
  }

  .theme-preview {
    height: 100px;
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .preview-header {
    height: 8px;
    border-radius: 4px;
    opacity: 0.9;
  }

  .preview-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--spacing-xs);
  }

  .preview-text {
    height: 6px;
    border-radius: 3px;
    opacity: 0.6;
  }

  .preview-text.short {
    width: 60%;
    opacity: 0.4;
  }

  .preview-dots {
    display: flex;
    gap: 4px;
    justify-content: center;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .theme-info {
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border-primary);
  }

  .theme-name {
    font-weight: 500;
    font-size: 0.85rem;
    color: var(--color-text-primary);
    text-align: center;
  }

  .default-badge,
  .selected-badge {
    font-size: 0.7rem;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
  }

  .default-badge {
    background: var(--color-bg-success-light, rgba(16, 185, 129, 0.1));
    color: var(--color-success);
  }

  .selected-badge {
    background: rgba(var(--color-primary-rgb, 139, 92, 246), 0.1);
    color: var(--color-primary);
  }

  /* Auto-save indicator */
  .auto-save-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    color: var(--color-text-secondary);
    font-size: 0.85rem;
  }

  .saving-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid var(--color-border-primary);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .theme-preferences {
      padding: var(--spacing-md);
    }

    .color-scheme-options {
      grid-template-columns: 1fr;
    }

    .scheme-option {
      flex-direction: row;
      justify-content: flex-start;
      text-align: left;
      padding: var(--spacing-md);
    }

    .scheme-icon {
      width: 40px;
      height: 40px;
    }

    .theme-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .theme-preview {
      height: 80px;
    }
  }

  @media (max-width: 480px) {
    .theme-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
