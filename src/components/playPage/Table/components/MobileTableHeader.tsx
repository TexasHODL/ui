/**
 * MobileTableHeader Component
 *
 * Phone replacement for TableHeader. The top row stays 44px: back, table name,
 * blinds / hand / next-to-act when they fit, theme, balance, table settings, menu.
 * A 22px text row appears only when that status does not fit beside the name.
 * History is a floating overlay owned by TableSidebar, not part of this chrome.
 * Everything else lives in the hamburger drawer. Leave table stays visible
 * (inline or on the slim row) and opens the existing confirmation dialog.
 */

import React, { useLayoutEffect, useRef, useState } from "react";
import { FaBars, FaLayerGroup, FaCopy, FaExpand, FaQrcode, FaRedo, FaShare, FaTimes } from "react-icons/fa";
import { IoSettingsOutline } from "react-icons/io5";
import { LuPanelLeftOpen, LuPanelLeftClose } from "react-icons/lu";
import { RxExit } from "react-icons/rx";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../../../common/Modal";
import { NetworkSelector } from "../../../NetworkSelector";
import { ProfileAvatarButton } from "../../../profile";
import { TopUpModal } from "../../../modals";
import { displayTableName } from "../../../../utils/generatedTableName";
import { formatGameFormatDisplay, formatTableGameDisplay, isSitAndGoFormat } from "../../../../utils/gameFormatUtils";
import { displayGameFormat } from "../../../../utils/createGameType";
import { buildHandShareUrl, buildShareOnXUrl } from "../../../../utils/handReplay";
import { GameFormat, GameOptionsDTO, GameVariant, LegalActionDTO, NonPlayerActionType, PlayerDTO } from "@block52/poker-vm-sdk";
import { useBlindLevel } from "../../../../hooks/game/useBlindLevel";
import { useTableTopUp } from "../../../../hooks/game/useTableTopUp";
import { useGameStateContext } from "../../../../context/GameStateContext";
import { tournamentRegistrationClosed } from "../../../../utils/scheduledSng";
import { useSitOutIntent } from "../../../../context/SitOutIntentContext";
import type { NetworkEndpoints } from "../../../../context/NetworkContext";
import { formatBlindCountdown } from "./TableHeader";
import styles from "./TableHeader.module.css";
import { TableSettingsOptions } from "./TableSettingsSidebar";
import { ThemeToggle } from "../../../ThemeToggle";
import SngPayoutPanel from "../../SngPayoutPanel";
import { MobileDrawerShell } from "./MobileDrawerShell";

export type TableStyleOption = "modern" | "classic" | "nouns";

export interface MobileTableHeaderProps {
    tableId: string;
    tableName?: string;
    currentNetwork: NetworkEndpoints;

    // Game data
    gameFormat: GameFormat | null;
    gameVariant?: GameVariant;
    gameOptions: GameOptionsDTO | null;
    tableActivePlayers: PlayerDTO[];

    // Wallet data
    publicKey: string | null;
    formattedAddress: string;
    isBalanceLoading: boolean;
    balanceFormatted: string;

    // Status strip data
    formattedValues: {
        smallBlindFormatted: string;
        bigBlindFormatted: string;
        isTournamentStyle: boolean;
    };
    handNumber: number;
    nextToAct: number;

    // Current user state
    currentPlayerData: PlayerDTO | null;
    isCurrentUserSeated: boolean;
    legalActions: LegalActionDTO[];
    currentStack: string;
    minBuyIn: string;
    maxBuyIn: string;
    walletBalance: string;

    // Sidebar state
    openSidebar: boolean;
    openSettings: boolean;

    // Table style (the fixed bottom-left selector is hidden on mobile)
    tableStyle: TableStyleOption;
    onCycleTableStyle: () => void;
    /** Sets the felt from the menu's Felt dropdown (same setter as the settings sidebar). */
    onTableStyleChange?: (style: TableStyleOption) => void;

    // Handlers
    onToggleFocus: () => void;
    handleLobbyClick: () => void;
    handleCopyTableLink: () => void;
    fetchAccountBalance: () => void;
    copyToClipboard: (text: string) => void;
    onCloseSideBar: () => void;
    onToggleSettings: () => void;
    handleLeaveTableClick: () => void;
    handleShareHand: () => void;
    /** Opens the latest completed hand's replay in a new tab; absent in replay mode. */
    handleOpenReplay?: () => void;
    replayHand?: number | null;
    /** Opens the blind-structure panel; the item shows only on SNG/tournament tables. */
    onOpenBlinds?: () => void;
}

/** Shared row styling: every drawer item is a ≥44px tap target. */
// PC Settings label size (text-xs = 14px, semibold); the row stays a 44px tap target.
const menuRowClass = "w-full min-h-[44px] flex items-center gap-3 px-4 text-xs font-semibold text-left text-white transition-colors duration-150 hover:bg-white/10";

export const MobileTableHeader: React.FC<MobileTableHeaderProps> = ({
    tableId,
    tableName,
    currentNetwork,
    gameFormat,
    gameVariant,
    gameOptions,
    tableActivePlayers,
    publicKey,
    formattedAddress,
    isBalanceLoading,
    balanceFormatted,
    formattedValues,
    handNumber,
    nextToAct,
    currentPlayerData,
    isCurrentUserSeated,
    legalActions,
    currentStack,
    minBuyIn,
    maxBuyIn,
    walletBalance,
    openSidebar,
    openSettings,
    tableStyle,
    onTableStyleChange,
    onToggleFocus,
    handleLobbyClick,
    handleCopyTableLink,
    fetchAccountBalance,
    copyToClipboard,
    onCloseSideBar,
    handleLeaveTableClick,
    handleShareHand,
    handleOpenReplay,
    replayHand = null,
    onOpenBlinds
}) => {
    const blindLevel = useBlindLevel();
    const [menuOpen, setMenuOpen] = useState(false);
    const [tableSettingsOpen, setTableSettingsOpen] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [showTopUp, setShowTopUp] = useState(false);
    const tableUrl = `${window.location.origin}/table/${tableId}`;

    const isSNG = gameFormat !== null && isSitAndGoFormat(gameFormat);
    const canTopUp = legalActions.some(a => a.action === NonPlayerActionType.TOP_UP);
    const showTopUpEntry = isCurrentUserSeated && !isSNG;
    const { topUp } = useTableTopUp(tableId, currentNetwork);

    // Same gating as TableHeader: no Leave for SNG (roster frozen once play
    // starts, poker-vm#2343; SNG leave/claim lives in the SNG modals, ui#465).
    const showLeaveTable = !!currentPlayerData && !isSNG;
    // Sit-out lives here on phones rather than pinned over the felt (#684).
    const { nextHandChecked, toggleNextHand, nextBbQueued, toggleNextBb, canSitOut } = useSitOutIntent();
    const isTableFull = !!gameOptions?.maxPlayers && tableActivePlayers.length >= gameOptions.maxPlayers;
    const { gameState: liveGameState, gameFormat: liveGameFormat } = useGameStateContext();
    const registrationClosed = tournamentRegistrationClosed(liveGameFormat ?? gameFormat, liveGameState);
    const rowRef = useRef<HTMLDivElement>(null);
    const toolsRef = useRef<HTMLDivElement>(null);
    const probeRef = useRef<HTMLDivElement>(null);
    const [statusInline, setStatusInline] = useState(false);

    // The probe is out of flow, so the decision cannot flip-flop as the row
    // grows and shrinks. jsdom reports no width, which keeps the slim row.
    useLayoutEffect(() => {
        const row = rowRef.current;
        const tools = toolsRef.current;
        const probe = probeRef.current;
        if (!row || !tools || !probe) return;
        const measure = () => {
            const computed = getComputedStyle(row);
            const padLeft = parseFloat(computed.paddingLeft) || 0;
            const padRight = parseFloat(computed.paddingRight) || 0;
            const gap = 8;
            const minName = 64;
            const available = row.clientWidth - padLeft - padRight - tools.offsetWidth - minName - gap * 2;
            const fits = probe.scrollWidth > 0 && probe.scrollWidth <= available + 0.5;
            setStatusInline(current => (current === fits ? current : fits));
        };
        measure();
        if (typeof ResizeObserver === "undefined") return;
        const observer = new ResizeObserver(measure);
        observer.observe(row);
        observer.observe(tools);
        observer.observe(probe);
        return () => observer.disconnect();
    }, [
        handNumber,
        nextToAct,
        showLeaveTable,
        formattedValues.smallBlindFormatted,
        formattedValues.bigBlindFormatted,
        blindLevel.isActive,
        blindLevel.level,
        blindLevel.currentBlindsFormatted,
        blindLevel.secondsRemaining,
        blindLevel.hasTimer
    ]);

    const renderStatus = (compactText: boolean) => {
        const textClass = `${compactText ? "text-[12px] leading-[22px]" : "text-[13px]"} font-semibold whitespace-nowrap ${styles.secondaryText}`;
        return (
            <>
                <span className={textClass}>
                    {blindLevel.isActive ? (
                        <>
                            {blindLevel.level !== undefined && `L${blindLevel.level + 1} `}
                            {blindLevel.currentBlindsFormatted}
                            {blindLevel.hasTimer && (
                                <>
                                    {" ("}
                                    <span className={blindLevel.secondsRemaining < 0 ? "text-red-500" : "text-yellow-300"}>
                                        {formatBlindCountdown(blindLevel.secondsRemaining)}
                                    </span>
                                    {")"}
                                </>
                            )}
                        </>
                    ) : (
                        `$${formattedValues.smallBlindFormatted} / $${formattedValues.bigBlindFormatted}`
                    )}
                </span>
                <span className={textClass}>Hand #{handNumber}</span>
                {!showLeaveTable && <span className={textClass}>Next: Seat {nextToAct}</span>}
                {showLeaveTable && (
                    <button type="button" className={styles.visibleLeaveButton} onClick={handleLeaveTableClick}>
                        <RxExit aria-hidden="true" /> Leave table
                    </button>
                )}
            </>
        );
    };

    const closeMenuAnd = (action: () => void) => () => {
        setMenuOpen(false);
        setTableSettingsOpen(false);
        action();
    };

    /** Right-hand drawer shell shared by the burger menu ("Table settings") and the gear drawer ("Settings"). */
    const renderDrawer = (title: string, closeLabel: string, onClose: () => void, testId: string, children: React.ReactNode) => (
        <MobileDrawerShell title={title} closeLabel={closeLabel} onClose={onClose} testId={testId}>
            {children}
        </MobileDrawerShell>
    );


    return (
        <div className="mobile-table-chrome flex-shrink-0">
            {/* 44px row. viewport-fit=cover extends the page under the notch;
                the safe-area paddings keep the content clear of it. Status joins
                this row when the probe says it fits; otherwise it drops to the
                22px row below. The theme control always stays here. */}
            <div
                ref={rowRef}
                className={`mobile-header-row w-full min-h-[44px] flex items-center relative z-[100] border-b-2 ${styles.headerRoot}`}
                style={{
                    paddingTop: "env(safe-area-inset-top)",
                    paddingLeft: "calc(env(safe-area-inset-left) + 12px)",
                    paddingRight: "env(safe-area-inset-right)"
                }}
            >
                <button className="mobile-header-name text-white text-sm font-bold cursor-pointer truncate min-h-[44px] text-left" onClick={handleLobbyClick}>
                    <span className="mr-2 text-purple-300" aria-hidden="true">
                        ←
                    </span>
                    <span className="sr-only">Back to lobby from </span>
                    {displayTableName(tableName, tableId)}
                </button>
                {statusInline && <div className={`mobile-status-inline ${styles.mobileStatus}`}>{renderStatus(false)}</div>}
                <div ref={toolsRef} className="mobile-header-tools">
                    <ThemeToggle />
                    {/* Balance — money on the table, wanted at a glance; tap to refresh */}
                    <button
                        onClick={fetchAccountBalance}
                        disabled={isBalanceLoading}
                        className="min-h-[44px] flex items-center px-2 disabled:opacity-50"
                        title="Refresh balance"
                    >
                        {isBalanceLoading ? (
                            <span className="text-xs text-gray-300">Loading...</span>
                        ) : (
                            <span className="text-white font-medium text-xs whitespace-nowrap">
                                ${balanceFormatted}
                                <span className="text-[11px] ml-1 text-gray-400">USDC</span>
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => {
                            setMenuOpen(false);
                            setTableSettingsOpen(true);
                        }}
                        className="w-11 h-11 flex items-center justify-center text-white hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-300"
                        title="Settings"
                        aria-label="Open settings"
                    >
                        <IoSettingsOutline size={18} aria-hidden="true" />
                    </button>
                    <button
                        onClick={() => {
                            setTableSettingsOpen(false);
                            setMenuOpen(true);
                        }}
                        className="w-11 h-11 flex items-center justify-center text-white hover:opacity-80"
                        title="Menu"
                        aria-label="Open menu"
                    >
                        <FaBars size={18} />
                    </button>
                    <ProfileAvatarButton title="Choose your avatar" />
                </div>
                <div ref={probeRef} className={`mobile-status-probe ${styles.mobileStatus}`} aria-hidden="true" inert>
                    {renderStatus(false)}
                </div>
            </div>

            {!statusInline && (
                <div
                    className={`mobile-status-fallback sub-header z-[1] ${styles.subHeaderRoot} ${styles.mobileStatus}`}
                    style={{ paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
                >
                    {renderStatus(true)}
                </div>
            )}

            {/* Table settings drawer — table info, network, address, sharing, action log */}
            {tableSettingsOpen &&
                renderDrawer(
                    "Settings",
                    "Close settings",
                    () => setTableSettingsOpen(false),
                    "table-settings-drawer",
                    <>
                            {/* Game info (read-only) */}
                            {gameOptions && (
                                <div className="px-4 py-2 border-b border-white/10">
                                    <span className={`text-xs font-semibold ${styles.brandText}`}>
                                        {gameFormat ? `${displayGameFormat(gameFormat, gameOptions.scheduledStartTime, formatGameFormatDisplay)} • ` : ""}
                                        {formatTableGameDisplay(gameVariant, gameOptions.bettingLimit)}
                                        <span className={`ml-1 ${styles.secondaryText}`}>
                                            ({tableActivePlayers.length}/{gameOptions.maxPlayers} Players)
                                        </span>
                                    </span>
                                </div>
                            )}

                            {/* Network */}
                            <div className="px-4 py-2 flex items-center gap-3 border-b border-white/10">
                                <span className="text-xs text-gray-400">Network</span>
                                <NetworkSelector />
                            </div>

                            {/* Wallet address (tap to copy) + avatar */}
                            <button className={menuRowClass} onClick={() => copyToClipboard(publicKey || "")} title="Copy full address">
                                <FaCopy size={14} className={styles.brandText} />
                                <span className={`font-mono text-xs truncate ${styles.brandText}`}>{formattedAddress}</span>
                            </button>

                            {/* Sharing */}
                            <button className={menuRowClass} onClick={closeMenuAnd(handleCopyTableLink)}>
                                <FaCopy size={14} />
                                <span>Copy Table Link</span>
                            </button>
                            <button className={menuRowClass} onClick={closeMenuAnd(() => setShowQR(true))}>
                                <FaQrcode size={14} />
                                <span>Share via QR Code</span>
                            </button>
                            <button className={menuRowClass} onClick={closeMenuAnd(handleShareHand)}>
                                <FaShare size={14} />
                                <span>Share this hand</span>
                            </button>
                            <a
                                href={buildShareOnXUrl(buildHandShareUrl(window.location.origin, tableId, handNumber))}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={menuRowClass}
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                <span>Share on X</span>
                            </a>

                            <button className={menuRowClass} onClick={closeMenuAnd(onCloseSideBar)}>
                                {openSidebar ? <LuPanelLeftOpen size={16} /> : <LuPanelLeftClose size={16} />}
                                <span>Action log</span>
                            </button>
                    </>
                )}

            {/* Hamburger drawer */}
            {menuOpen &&
                renderDrawer(
                    "Table settings",
                    "Close table settings",
                    () => setMenuOpen(false),
                    "table-menu-drawer",
                    <>
                            {/* SNG payout structure first (self-gates to Sit & Go; mobile has no footer for it). */}
                            <div className="mobile-menu-payouts empty:hidden px-4 pt-2 pb-1 [&>div]:w-full">
                                <SngPayoutPanel />
                            </div>
                            {onOpenBlinds && blindLevel.isActive && (
                                <button className={menuRowClass} onClick={closeMenuAnd(onOpenBlinds)} data-testid="open-blinds">
                                    <FaLayerGroup size={14} />
                                    <span>Blinds</span>
                                </button>
                            )}
                            {handleOpenReplay && (
                                <button className={menuRowClass} onClick={closeMenuAnd(handleOpenReplay)} disabled={replayHand === null} data-testid="open-replay">
                                    <FaRedo size={14} />
                                    <span>{replayHand === null ? "Replay (no completed hand yet)" : `Replay hand #${replayHand}`}</span>
                                </button>
                            )}
    
    
                            {/* Table-only view — moved here from the header row */}
                            <button className={menuRowClass} onClick={closeMenuAnd(onToggleFocus)} title="Table-only view — hide banners">
                                <FaExpand size={14} aria-hidden="true" />
                                <span>Full screen</span>
                            </button>
                            {/* Top-up — disabled while in the current hand, same rule as the
                                desktop button (#597): enablement comes from the TOP_UP legal action. */}
                            {showTopUpEntry && (
                                <button
                                    className={`${menuRowClass} ${canTopUp ? "" : "opacity-50 cursor-not-allowed"}`}
                                    onClick={canTopUp ? closeMenuAnd(() => setShowTopUp(true)) : undefined}
                                    title={canTopUp ? "Add chips for the next hand" : "You can top up between hands — not while you're in the current hand."}
                                >
                                    <span>💰</span>
                                    <span>Top-Up Chips</span>
                                </button>
                            )}

                            {/* Sit-out intents (#684). Queued conditions, not immediate
                                actions: "next hand" fires at the next hand boundary,
                                "next big blind" holds you in until the BB comes round
                                again. Both may be ticked (#763). Shown whenever the
                                engine allows sitting out. */}
                            {canSitOut && (
                                <>
                                    <button className={menuRowClass} onClick={toggleNextHand} role="switch" aria-checked={nextHandChecked}>
                                        <span className="text-xs text-gray-400">Sit out</span>
                                        <span className={nextHandChecked ? "text-amber-300" : undefined}>{nextHandChecked ? "☑ " : "☐ "}Next hand</span>
                                    </button>
                                    <button className={menuRowClass} onClick={toggleNextBb} role="switch" aria-checked={nextBbQueued}>
                                        <span className="text-xs text-gray-400">Sit out</span>
                                        <span className={nextBbQueued ? "text-amber-300" : undefined}>{nextBbQueued ? "☑ " : "☐ "}Next big blind</span>
                                    </button>
                                </>
                            )}

                            {/* In-game settings, inline (formerly a separate Settings panel).
                            Theme stays in the header row. */}
                        <div className="mobile-menu-settings px-4 py-2 border-t border-white/10" role="group" aria-label="Settings">
                            <p className="text-[12px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Settings</p>
                            <TableSettingsOptions
                                showTheme={false}
                                tableStyle={tableStyle}
                                onTableStyleChange={onTableStyleChange}
                                appearanceLabel="Felt"
                                showSeatToggle
                            />
                        </div>

                        {/* Spectating hint. Non-interactive: the only way to sit is
                                tapping an open seat, and this is what tells a first-time
                                player that (#684). */}
                            {!isCurrentUserSeated && (
                                <div className={`${menuRowClass} cursor-default hover:bg-transparent`}>
                                    <span className="animate-pulse w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                    <span className="text-blue-300 text-xs">
                                        {registrationClosed ? "You’re watching" : isTableFull ? "Spectating — the table is full" : "Spectating — tap an open seat to join"}
                                    </span>
                                </div>
                            )}

                            <div className="flex-1" />

                            {/* Destructive action, isolated at the bottom of the menu */}
                            {showLeaveTable && (
                                <button
                                    className={`${menuRowClass} border-t border-white/10 text-red-400 hover:bg-red-500/10 ${styles.leaveTableButton}`}
                                    onClick={closeMenuAnd(handleLeaveTableClick)}
                                >
                                    <RxExit size={16} />
                                    <span className="font-semibold">Leave Table</span>
                                </button>
                            )}
                    </>
                )}

            {/* QR Code Modal */}
            <Modal
                isOpen={showQR}
                onClose={() => setShowQR(false)}
                title="Scan to Join Table"
                titleIcon={<FaQrcode size={16} />}
                widthClass="w-80"
                patternId="hexagons-qr-mobile"
                scrollable={false}
            >
                <div className="flex flex-col items-center gap-4">
                    <div className="bg-white p-4 rounded-xl">
                        <QRCodeSVG value={tableUrl} size={240} />
                    </div>
                    <button
                        onClick={() => setShowQR(false)}
                        className="w-full py-2 rounded-lg bg-gray-700 text-white text-sm font-semibold hover:bg-gray-600 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* Top-Up Modal — rendered outside the drawer so it survives the drawer closing */}
            {showTopUp && (
                <TopUpModal
                    tableId={tableId}
                    currentStack={currentStack}
                    minBuyIn={minBuyIn}
                    maxBuyIn={maxBuyIn}
                    walletBalance={walletBalance}
                    onClose={() => setShowTopUp(false)}
                    onTopUp={async (amount: string) => {
                        await topUp(amount);
                        setShowTopUp(false);
                    }}
                />
            )}
        </div>
    );
};
