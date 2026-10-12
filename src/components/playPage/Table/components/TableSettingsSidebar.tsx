/**
 * TableSettingsSidebar Component
 *
 * Displays a settings panel that can be toggled open/closed.
 * Contains toggle switches for in-game options.
 */

import React from "react";
import { useGameSettings } from "../../../../context/GameSettingsContext";
import type { TableStyleOption } from "./MobileTableHeader";

interface ToggleRowProps {
    label: string;
    description: string;
    checked: boolean;
    onToggle: () => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onToggle }) => (
    <div className="settings-toggle-row">
        <div className="flex-1">
            <p className="text-white text-xs font-semibold leading-tight">{label}</p>
            <p className="text-gray-400 text-[10px] mt-0.5 leading-snug">{description}</p>
        </div>
        <button
            role="switch"
            aria-label={label}
            aria-checked={checked}
            onClick={onToggle}
            className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-transparent ${
                checked ? "bg-purple-500" : "bg-gray-600"
            }`}
            title={checked ? "Enabled — click to disable" : "Disabled — click to enable"}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    checked ? "translate-x-5" : "translate-x-0"
                }`}
            />
        </button>
    </div>
);

export interface TableSettingsSidebarProps {
    isOpen: boolean;
    tableStyle?: TableStyleOption;
    onTableStyleChange?: (style: TableStyleOption) => void;
    onClose?: () => void;
}

export const TableSettingsSidebar: React.FC<TableSettingsSidebarProps> = ({ isOpen, tableStyle, onTableStyleChange, onClose }) => {
    const {
        turnNotificationSound,
        playerActionSounds,
        autoMuck,
        sitInOptions,
        preSelectCheck,
        toggleTurnNotificationSound,
        togglePlayerActionSounds,
        toggleAutoMuck,
        toggleSitInOptions,
        togglePreSelectCheck
    } = useGameSettings();

    return (
        <div
            id="table-settings-panel"
            role={isOpen ? "region" : undefined}
            aria-label={isOpen ? "Table settings" : undefined}
            className={`action-log-overlay ${isOpen ? "action-log-open settings-panel-width" : "action-log-closed"}`}
        >
            {/* Content is UNMOUNTED while closed. The closed container is width:0 +
                overflow:hidden, which hid the panel visually but left its five toggle
                switches in the DOM — focusable, screen-reader reachable, and rendering
                off-canvas past the viewport's right edge on phones. */}
            {isOpen && (
                <div className="table-panel-surface h-full bg-[#0b0b10] border-l border-white/10 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="settings-heading">
                        <span className="text-white font-semibold text-sm">Settings</span>
                        {onClose && (
                            <button onClick={onClose} aria-label="Close settings" className="w-9 h-9 rounded-lg text-gray-300 hover:bg-white/10">
                                ✕
                            </button>
                        )}
                    </div>

                    {/* Toggle list */}
                    <div className="settings-content">
                        {tableStyle && onTableStyleChange && (
                            <label className="settings-appearance">
                                Table appearance
                                <select
                                    aria-label="Table appearance"
                                    value={tableStyle}
                                    className="block w-full mt-2 p-3 rounded-lg border border-white/20 bg-[#181020] text-white"
                                    onChange={event => {
                                        const value = event.target.value;
                                        if (value === "modern" || value === "classic" || value === "nouns") onTableStyleChange(value);
                                    }}
                                >
                                    <option value="modern">Texas HODL</option>
                                    <option value="classic">Classic</option>
                                    <option value="nouns">Nouns</option>
                                </select>
                            </label>
                        )}
                        <ToggleRow
                            label="Turn Notification Sound"
                            description="Sound and tab flash when it’s your turn."
                            checked={turnNotificationSound}
                            onToggle={toggleTurnNotificationSound}
                        />
                        <ToggleRow
                            label="Player Action Sounds"
                            description="Sounds for bets, raises, calls, folds and checks."
                            checked={playerActionSounds}
                            onToggle={togglePlayerActionSounds}
                        />
                        <ToggleRow
                            label="Auto Muck"
                            description="Hide losing cards automatically at showdown."
                            checked={autoMuck}
                            onToggle={toggleAutoMuck}
                        />
                        <ToggleRow
                            label="Sit-In Options"
                            description="Choose next hand or next big blind. Off: join next hand."
                            checked={sitInOptions}
                            onToggle={toggleSitInOptions}
                        />
                        <ToggleRow
                            label="Pre-Select Check"
                            description="Queue a free check. Cancels if a bet lands; never folds."
                            checked={preSelectCheck}
                            onToggle={togglePreSelectCheck}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
