/**
 * BlindsPanel (ui#794)
 *
 * A small, non-modal "Blinds" tab + floating panel for SNG/tournament tables.
 * Shows this game's whole blind schedule: every level from the starting blinds to
 * a dozen levels ahead (level · SB/BB · ante when the structure has one · minutes),
 * with the current level highlighted and a countdown to the next. Hidden for cash
 * games.
 *
 * Non-modal: the wrapper paints no backdrop, so gameplay underneath stays
 * clickable. Dismisses on a second tab click, a click elsewhere, or Esc.
 *
 * The schedule comes from the table's own blind structure (or its doubling),
 * expanded level by level as the engine plays it (see buildBlindLadder).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useBlindLevel } from "../../hooks/game/useBlindLevel";
import { buildBlindLadder, formatBlindCountdown } from "../../utils/blindStructure";
import { isNullish } from "../../utils/guards";
import { formatChipCount } from "../../utils/potDisplayUtils";
import styles from "./BlindsPanel.module.css";
import { SettingsPanelShell } from "./Table/components/SettingsPanelShell";
import { MobileDrawerShell } from "./Table/components/MobileDrawerShell";

const STORAGE_KEY = "b52.blindsPanel.open";

const readStoredOpen = (): boolean => {
    try {
        return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
        return false;
    }
};

const writeStoredOpen = (open: boolean): void => {
    try {
        localStorage.setItem(STORAGE_KEY, open ? "true" : "false");
    } catch {
        // Private mode / blocked storage — remembering open/closed is optional.
    }
};

/** "800/1,600" → "800 / 1,600": spaced slash reads cleaner in a list. */
const spacedBlinds = (formatted: string): string => formatted.replace("/", " / ");

interface BlindsPanelProps {
    /** Hide the floating "Blinds" tab (mobile opens the panel from the burger menu instead). */
    hideTab?: boolean;
    /** Bump to open the panel from elsewhere (e.g. the mobile menu's Blinds item). */
    openSignal?: number;
    /** "sidebar" (PC): render in the Settings side panel shell with Settings typography. */
    variant?: "floating" | "sidebar" | "drawer";
    /** Controlled open state (PC side panel). When set, the remembered open state and openSignal are ignored. */
    isOpen?: boolean;
    /** Controlled close request (header ✕ or Esc). */
    onClose?: () => void;
}

const BlindsPanel: React.FC<BlindsPanelProps> = ({ hideTab = false, openSignal = 0, variant = "floating", isOpen: controlledOpen, onClose }) => {
    const blindLevel = useBlindLevel();
    const controlled = controlledOpen !== undefined;
    const [localOpen, setIsOpen] = useState<boolean>(() => (controlled ? false : readStoredOpen()));
    const isOpen = controlled ? controlledOpen : localOpen;

    useEffect(() => {
        if (!controlled && openSignal > 0) setIsOpen(true);
    }, [openSignal, controlled]);
    const rootRef = useRef<HTMLDivElement>(null);
    const currentRowRef = useRef<HTMLSpanElement>(null);

    const close = useCallback(() => (controlled ? onClose?.() : setIsOpen(false)), [controlled, onClose]);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    // Persist open/closed (default closed) within the session.
    useEffect(() => {
        if (!controlled) writeStoredOpen(localOpen);
    }, [localOpen, controlled]);

    // Dismiss on Esc or a click anywhere outside the tab/panel. The mousedown
    // listener does not preventDefault, so the underlying click still reaches
    // gameplay — the panel stays non-modal (AC-3).
    useEffect(() => {
        if (!isOpen) return;

        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
        };
        const handlePointer = (e: MouseEvent) => {
            // Controlled (PC side panel): the parent keeps panels exclusive; no click-outside close.
            if (controlled) return;
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                close();
            }
        };

        window.addEventListener("keydown", handleKey);
        document.addEventListener("mousedown", handlePointer);
        return () => {
            window.removeEventListener("keydown", handleKey);
            document.removeEventListener("mousedown", handlePointer);
        };
    }, [isOpen, close, controlled]);

    // Open on the level in play: past levels sit above it in the scrollable list.
    useEffect(() => {
        if (isOpen) currentRowRef.current?.scrollIntoView?.({ block: "nearest" });
    }, [isOpen]);

    // Cash games have fixed blinds — no structure to show (AC-1).
    if (!blindLevel.isActive) {
        return null;
    }

    const { rows, hasFullSchedule, hasAnte } = buildBlindLadder(blindLevel);
    // When every level is the same length, say it once ("3-minute levels") instead
    // of repeating it down a column; a Min column appears only when lengths vary.
    const lengths = new Set(rows.map(row => row.minutes));
    const uniformMinutes = lengths.size === 1 ? rows[0]?.minutes : undefined;
    const showMinColumn = isNullish(uniformMinutes) && rows.some(row => !isNullish(row.minutes));
    const columns = ["auto", "1fr", hasAnte ? "auto" : "", showMinColumn ? "auto" : ""].filter(Boolean).join(" ");
    const current = rows.find(row => row.isCurrent);
    const next = rows.find(row => row.isNext);

    if (variant === "sidebar" || variant === "drawer") {
        const label = "text-white text-xs font-semibold leading-tight";
        const desc = "text-gray-400 text-[12px] mt-0.5 leading-snug";
        const sub = [current && current.ante > 0 ? `Ante ${formatChipCount(current.ante)}` : "", next ? `Next ${next.isBreak ? "Break" : spacedBlinds(next.blindsFormatted)}` : ""].filter(Boolean).join(" · ");
        const body = (
        <div role="dialog" aria-label="Blind structure" data-testid="blinds-panel">
            {!isNullish(current) && (
                <div className="settings-toggle-row">
                    <div className="min-w-0">
                        <div className={label}>
                            {isNullish(current.level) ? "Now" : `Level ${current.level}`}: {spacedBlinds(current.blindsFormatted)}
                        </div>
                        {sub && <div className={desc}>{sub}</div>}
                    </div>
                    {blindLevel.hasTimer && (
                        <span
                            className={`text-xs font-semibold tabular-nums ${blindLevel.secondsRemaining < 0 ? `text-red-400 ${styles.countdownOvertime}` : "text-gray-300"}`}
                            data-testid="blinds-panel-countdown"
                        >
                            {formatBlindCountdown(blindLevel.secondsRemaining)}
                        </span>
                    )}
                </div>
            )}
            <div className={variant === "drawer" ? "settings-blinds-list settings-blinds-list-flow" : "settings-blinds-list"} style={{ gridTemplateColumns: columns }}>
                <span className={desc}>Lvl</span>
                <span className={desc}>Blinds</span>
                {hasAnte && <span className={desc}>Ante</span>}
                {showMinColumn && <span className={desc}>Min</span>}
                {rows.map((row, index) => {
                    const cell = `text-xs ${row.isCurrent ? "text-white font-semibold" : row.isPast ? "text-gray-400" : "text-gray-300"}`;
                    const testId = row.isCurrent ? "blinds-row-current" : row.isNext ? "blinds-row-next" : row.isPast ? "blinds-row-past" : "blinds-row-upcoming";
                    return (
                        <React.Fragment key={isNullish(row.level) ? `row-${index}` : row.level}>
                            <span ref={row.isCurrent ? currentRowRef : undefined} className={cell} data-testid={testId}>
                                {isNullish(row.level) ? (row.isCurrent ? "Now" : "Next") : row.level}
                            </span>
                            <span className={cell}>{row.isBreak ? "Break" : spacedBlinds(row.blindsFormatted)}</span>
                            {hasAnte && <span className={cell}>{row.ante > 0 && !row.isBreak ? formatChipCount(row.ante) : "—"}</span>}
                            {showMinColumn && <span className={cell}>{isNullish(row.minutes) ? "—" : row.minutes}</span>}
                        </React.Fragment>
                    );
                })}
            </div>
            {!isNullish(uniformMinutes) && (
                <div className={`settings-blinds-note ${desc}`} data-testid="blinds-panel-level-length">
                    {uniformMinutes}-minute levels
                </div>
            )}
            {!hasFullSchedule && (
                <div className={`settings-blinds-note ${desc}`} data-testid="blinds-panel-partial">
                    Only the current and next levels are known for this table.
                </div>
            )}
        </div>
        );
        if (variant === "drawer") {
            // Mobile: the burger-menu drawer's frame; the whole drawer scrolls.
            return (
                <div ref={rootRef} data-testid="blinds-panel-root">
                    {isOpen && (
                        <MobileDrawerShell title="Blinds" closeLabel="Close blinds" onClose={close} testId="blinds-drawer">
                            <div className="px-4">{body}</div>
                        </MobileDrawerShell>
                    )}
                </div>
            );
        }
        return (
            <div ref={rootRef} data-testid="blinds-panel-root">
                <SettingsPanelShell id="table-blinds-panel" isOpen={isOpen} title="Blinds" regionLabel="Blinds" closeLabel="Close blinds" onClose={close}>
                    {body}
                </SettingsPanelShell>
            </div>
        );
    }

    return (
        <div ref={rootRef} className={styles.root} data-testid="blinds-panel-root">
            {!hideTab && (
            <button
                type="button"
                onClick={toggle}
                className={`${styles.tab} ${isOpen ? styles.tabOpen : ""}`}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                title="Show blind structure"
                data-testid="blinds-panel-tab"
            >
                Blinds
            </button>
            )}

            {isOpen && (
                <div className={styles.panel} role="dialog" aria-label="Blind structure" data-testid="blinds-panel">
                    {/* Where you are now: the current level, big, and what's next. */}
                    {!isNullish(current) && (
                        <div className={styles.hero}>
                            <div className={styles.heroTop}>
                                <span className={styles.heroLevel}>{isNullish(current.level) ? "Now" : `Level ${current.level}`}</span>
                                {blindLevel.hasTimer && (
                                    <span className={styles.heroTimer}>
                                        <span
                                            className={`${styles.countdown} ${blindLevel.secondsRemaining < 0 ? styles.countdownOvertime : ""}`}
                                            data-testid="blinds-panel-countdown"
                                        >
                                            {formatBlindCountdown(blindLevel.secondsRemaining)}
                                        </span>
                                    </span>
                                )}
                            </div>
                            <div className={styles.heroBlinds}>{spacedBlinds(current.blindsFormatted)}</div>
                            {current.ante > 0 && <div className={styles.heroSub}>Ante {formatChipCount(current.ante)}</div>}
                            {!isNullish(next) && <div className={styles.heroSub}>Next {next.isBreak ? "Break" : spacedBlinds(next.blindsFormatted)}</div>}
                        </div>
                    )}

                    <div className={styles.list} style={{ gridTemplateColumns: columns }}>
                        <span className={`${styles.colHead} ${styles.right}`}>Lvl</span>
                        <span className={`${styles.colHead} ${styles.right}`}>Blinds</span>
                        {hasAnte && <span className={`${styles.colHead} ${styles.right}`}>Ante</span>}
                        {showMinColumn && <span className={`${styles.colHead} ${styles.right}`}>Min</span>}

                        {rows.map((row, index) => {
                            const state = row.isCurrent ? styles.rowCurrent : row.isPast ? styles.rowPast : "";
                            const stripe = index % 2 === 1 ? styles.rowStripe : "";
                            const cell = `${styles.cell} ${styles.right} ${stripe} ${state}`;
                            const testId = row.isCurrent ? "blinds-row-current" : row.isNext ? "blinds-row-next" : row.isPast ? "blinds-row-past" : "blinds-row-upcoming";
                            return (
                                <React.Fragment key={isNullish(row.level) ? `row-${index}` : row.level}>
                                    <span ref={row.isCurrent ? currentRowRef : undefined} className={`${cell} ${styles.lvl}`} data-testid={testId}>
                                        {isNullish(row.level) ? (row.isCurrent ? "Now" : "Next") : row.level}
                                    </span>
                                    <span className={`${cell} ${styles.blinds}`}>{row.isBreak ? "Break" : spacedBlinds(row.blindsFormatted)}</span>
                                    {hasAnte && <span className={cell}>{row.ante > 0 && !row.isBreak ? formatChipCount(row.ante) : "—"}</span>}
                                    {showMinColumn && <span className={cell}>{isNullish(row.minutes) ? "—" : row.minutes}</span>}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {!isNullish(uniformMinutes) && (
                        <div className={styles.footer} data-testid="blinds-panel-level-length">
                            {uniformMinutes}-minute levels
                        </div>
                    )}
                    {!hasFullSchedule && (
                        <div className={styles.footer} data-testid="blinds-panel-partial">
                            Only the current and next levels are known for this table.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default BlindsPanel;
