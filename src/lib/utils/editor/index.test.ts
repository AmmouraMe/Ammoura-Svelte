/**
 * Tests for editor utilities index exports
 */

import { describe, it, expect } from 'vitest';
import {
  HistoryManager,
  AutoSaveManager,
  KeyboardShortcutManager,
  getDefaultConfig,
  getComponentLabel,
  getWidgetLabel
} from './index';

describe('Editor Utils Index', () => {
  describe('HistoryManager', () => {
    it('should be exported and instantiable', () => {
      const manager = new HistoryManager([]);
      expect(manager).toBeDefined();
      expect(typeof manager.saveState).toBe('function');
      expect(typeof manager.undo).toBe('function');
      expect(typeof manager.redo).toBe('function');
    });
  });

  describe('AutoSaveManager', () => {
    it('should be exported and instantiable', () => {
      const manager = new AutoSaveManager(
        async () => {},
        () => true
      );
      expect(manager).toBeDefined();
      expect(typeof manager.start).toBe('function');
      expect(typeof manager.stop).toBe('function');
      expect(typeof manager.autoSave).toBe('function');
    });
  });

  describe('KeyboardShortcutManager', () => {
    it('should be exported and instantiable', () => {
      const handlers = {
        undo: () => {},
        redo: () => {},
        save: () => {},
        preview: () => {},
        delete: () => {}
      };
      const manager = new KeyboardShortcutManager(handlers);
      expect(manager).toBeDefined();
      expect(typeof manager.attach).toBe('function');
      expect(typeof manager.detach).toBe('function');
      expect(typeof manager.updateHandlers).toBe('function');
    });
  });

  describe('getDefaultConfig', () => {
    it('should be exported and return config', () => {
      const config = getDefaultConfig('text');
      expect(config).toBeDefined();
      expect(config.text).toBe('Enter your text here');
    });
  });

  describe('getComponentLabel', () => {
    it('should be exported and return label', () => {
      const label = getComponentLabel('hero');
      expect(label).toBe('Hero');
    });
  });

  describe('getWidgetLabel (deprecated)', () => {
    it('should be exported and work same as getComponentLabel', () => {
      const label = getWidgetLabel('hero');
      expect(label).toBe('Hero');
    });
  });
});
