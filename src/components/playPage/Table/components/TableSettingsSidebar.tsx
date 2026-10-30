/**
 * TableSettingsSidebar Component
 *
 * Displays a settings panel that can be toggled open/closed.
 * Contains toggle switches for in-game options.
 */

import React, { useEffect, useState } from "react";
import { SettingsPanelShell } from "./SettingsPanelShell";
import { useGameSettings } from "../../../../context/GameSettingsContext";
import { useBlindLevel } from "../../../../hooks/game/useBlindLevel";
import { ThemeToggle } from "../../../ThemeToggle";
import type { TableStyleOption } from "./MobileTableHeader";
import {
    CHIP_STYLE_IDS,
    CHIP_STYLE_LABELS,
    DEALER_STYLE_LABELS,
    DECK_IDS,
    DECK_LABELS,
    STYLE_IDS,
    isChipStyleId,
    isDeckId,
    isStyleId,
    setTableStyle
} from "../../../../theme/tableStyles";
import { useTableStyles } from "../../../../theme/useTableStyles";
import { getViewportMode } from "../../../../config/stageGeometry";

const SELECT_CLASS = "block w-full mt-2 p-3 rounded-lg border border-white/20 bg-[#181020] text-white";

interface StyleSelectProps {
    label: string;
    value: string;
    options: readonly { value: string; label: string }[];
    onChange: (value: string) => void;
}

const StyleSelect: React.FC<StyleSelectProps> = ({ label, value, options, onChange }) => (
    <label className="settings-appearance">
        {label}
        <select aria-label={label} value={value} className={SELECT_CLASS} onChange={event => onChange(event.target.value)}>
            {options.map(option => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    </label>
);

const DECK_OPTIONS = DECK_IDS.map(id => ({ value: id, label: DECK_LABELS[id] }));
const CHIP_OPTIONS = CHIP_STYLE_IDS.map(id => ({ value: id, label: CHIP_STYLE_LABELS[id] }));
const DEALER_OPTIONS = STYLE_IDS.map(id => ({ value: id, label: DEALER_STYLE_LABELS[id] }));

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
            <p className="text-gray-400 text-[12px] mt-0.5 leading-snug">{description}</p>
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

/** PC Settings row that opens the existing blind-structure panel; only on tables with a blind structure. */
const BlindsRow: React.FC<{ onOpen: () => void }> = ({ onOpen }) => {
    const blindLevel = useBlindLevel();
    if (!blindLevel.isActive) return null;
    return (
        <button type="button" className="settings-toggle-row w-full text-left" onClick={onOpen} data-testid="settings-open-blinds">
            <div className="flex-1">
                <p className="text-white text-xs font-semibold leading-tight">Blinds</p>
                <p className="text-gray-400 text-[12px] mt-0.5 leading-snug">Show the blind structure and next level.</p>
            </div>
            <span className="text-gray-300 text-xs font-semibold" aria-hidden="true">
                View &rsaquo;
            </span>
        </button>
    );
};

export interface TableSettingsOptionsProps {
    tableStyle?: TableStyleOption;
    onTableStyleChange?: (style: TableStyleOption) => void;
    /** The theme toggle; off where the host chrome already shows it (mobile header). */
    showTheme?: boolean;
    /** Label for the table appearance dropdown (the mobile menu calls it "Felt"). */
    appearanceLabel?: string;
    /** Adds the 6 o'clock seat-orientation toggle (PC sidebar and mobile menu). */
    showSeatToggle?: boolean;
}

/** The settings controls themselves, shared by the sidebar and the mobile Table menu. */
export const TableSettingsOptions: React.FC<TableSettingsOptionsProps> = ({
    tableStyle,
    onTableStyleChange,
    showTheme = true,
    appearanceLabel = "Table appearance",
    showSeatToggle = false
}) => {
    const {
        turnNotificationSound,
        playerActionSounds,
        autoMuck,
        sitInOptions,
        preSelectCheck,
        leftHandMode,
        winCelebration,
        potAsChips,
        showMainPot,
        toggleTurnNotificationSound,
        togglePlayerActionSounds,
        toggleAutoMuck,
        toggleSitInOptions,
        togglePreSelectCheck,
        toggleLeftHandMode,
        toggleWinCelebration,
        togglePotAsChips,
        toggleShowMainPot,
        seatAtBottom,
        toggleSeatAtBottom
    } = useGameSettings();
    const tableStyles = useTableStyles();
    // Same classifier as the betting UI (PokerActionPanel): only mobile landscape
    // has left/right edge controls, so hide this row elsewhere. Preference stays stored.
    const [viewportMode, setViewportMode] = useState(getViewportMode);
    useEffect(() => {
        const onResize = () => setViewportMode(getViewportMode());
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
    const showLeftHandMode = viewportMode === "mobile-landscape";

    return (
        <>
            {showTheme && (
                <div className="settings-theme-row">
                    <ThemeToggle />
                </div>
            )}
            {tableStyle && onTableStyleChange && (
                <label className="settings-appearance">
                    {appearanceLabel}
                    <select
                        aria-label={appearanceLabel}
                        value={tableStyle}
                        className={SELECT_CLASS}
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
            <StyleSelect label="Cards" value={tableStyles.deck} options={DECK_OPTIONS} onChange={value => isDeckId(value) && setTableStyle("deck", value)} />
            <StyleSelect
                label="Chips"
                value={tableStyles.chips}
                options={CHIP_OPTIONS}
                onChange={value => isChipStyleId(value) && setTableStyle("chips", value)}
            />
            <StyleSelect
                label="Dealer button"
                value={tableStyles.dealer}
                options={DEALER_OPTIONS}
                onChange={value => isStyleId(value) && setTableStyle("dealer", value)}
            />
            {showSeatToggle && (
                <ToggleRow
                    label="Seat me at 6 o'clock"
                    description="Rotate the table so your seat is at the bottom. A view preference only."
                    checked={seatAtBottom}
                    onToggle={toggleSeatAtBottom}
                />
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
                label="Win Celebration"
                description="Play the gold-chip celebration on the winning seat. Off = calmer table; the pot still awards."
                checked={winCelebration}
                onToggle={toggleWinCelebration}
            />
            <ToggleRow
                label="Pot as Chips"
                description="Show the pot as a chip stack with the amount. Off keeps plain text."
                checked={potAsChips}
                onToggle={togglePotAsChips}
            />
            <ToggleRow
                label="Show Main Pot"
                description="Show the main pot next to the total pot once there are side pots or bets in the round. Off by default: only the total pot is shown."
                checked={showMainPot}
                onToggle={toggleShowMainPot}
            />
            <ToggleRow label="Auto Muck" description="Hide losing cards automatically at showdown." checked={autoMuck} onToggle={toggleAutoMuck} />
            <ToggleRow
                label="Sit-In Options"
                description="Choose next hand or next big blind. Off: join next hand."
                checked={sitInOptions}
                onToggle={toggleSitInOptions}
            />
            <ToggleRow
                label="Pre-Select Check/Fold"
                description="Show a Check/Fold box before your turn. It checks if checking is free, or folds if someone bets first."
                checked={preSelectCheck}
                onToggle={togglePreSelectCheck}
            />
            {showLeftHandMode && (
                <ToggleRow
                    label="Left-hand mode"
                    description="Landscape controls sit on the left edge. Off: right edge."
                    checked={leftHandMode}
                    onToggle={toggleLeftHandMode}
                />
            )}
        </>
    );
};

export interface TableSettingsSidebarProps {
    isOpen: boolean;
    tableStyle?: TableStyleOption;
    onTableStyleChange?: (style: TableStyleOption) => void;
    onClose?: () => void;
    /** PC only: table-only full screen state and toggle (the header "..." menu no longer has it). */
    fullScreen?: boolean;
    onToggleFullScreen?: () => void;
    /** PC only: opens the blinds panel (shown only on tables with a blind structure). */
    onOpenBlinds?: () => void;
}

export const TableSettingsSidebar: React.FC<TableSettingsSidebarProps> = ({
    isOpen,
    tableStyle,
    onTableStyleChange,
    onClose,
    fullScreen = false,
    onToggleFullScreen,
    onOpenBlinds
}) => {
    return (
        <SettingsPanelShell id="table-settings-panel" isOpen={isOpen} title="Settings" regionLabel="Table settings" closeLabel="Close settings" onClose={onClose}>
            {onToggleFullScreen && (
                <ToggleRow
                    label="Full screen"
                    description="Table-only view: hides the banners. Press Esc or Show controls to exit."
                    checked={fullScreen}
                    onToggle={onToggleFullScreen}
                />
            )}
            {onOpenBlinds && <BlindsRow onOpen={onOpenBlinds} />}
            <TableSettingsOptions tableStyle={tableStyle} onTableStyleChange={onTableStyleChange} showSeatToggle />
        </SettingsPanelShell>
    );
};
