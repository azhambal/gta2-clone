/**
 * Debug Module
 * Система режимов запуска для отладки
 */

export { DebugMode, type DebugLaunchConfig, DEBUG_MODE_PRESETS } from './DebugTypes.js';
export { getDebugModeManager, resetDebugModeManager, DebugModeManager } from './DebugModeManager.js';
