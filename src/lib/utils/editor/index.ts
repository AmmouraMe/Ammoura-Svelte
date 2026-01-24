/**
 * Editor Utilities
 *
 * Collection of utility modules for the page editor:
 * - historyManager: Undo/redo functionality with state management
 * - autoSaveManager: Automatic saving with configurable intervals
 * - keyboardShortcuts: Keyboard shortcut handling for editor actions
 * - componentDefaults: Default configurations for component types
 */

export { HistoryManager } from './historyManager';
export { AutoSaveManager } from './autoSaveManager';
export { KeyboardShortcutManager } from './keyboardShortcuts';
export type { KeyboardShortcutHandlers } from './keyboardShortcuts';
export { getDefaultConfig, getComponentLabel } from './componentDefaults';

// Deprecated: Use getComponentLabel instead
export { getComponentLabel as getWidgetLabel } from './componentDefaults';
