import React, { useState } from "react";
import { FaArrowLeft, FaCopy, FaQrcode, FaExpand, FaHistory, FaCog, FaEllipsisH, FaShare, FaRedo } from "react-icons/fa";
import { QRCodeSVG } from "qrcode.react";
import { Modal } from "../../../common/Modal";
import { NetworkSelector } from "../../../NetworkSelector";
import { ProfileAvatarButton } from "../../../profile";
import { displayTableName } from "../../../../utils/generatedTableName";
import { formatGameFormatDisplay, isSitAndGoFormat } from "../../../../utils/gameFormatUtils";
import { buildHandShareUrl, buildShareOnXUrl } from "../../../../utils/handReplay";
import { GameFormat, GameOptionsDTO, PlayerDTO } from "@block52/poker-vm-sdk";
import { useBlindLevel } from "../../../../hooks/game/useBlindLevel";
import styles from "./TableHeader.module.css";
import { ThemeToggle } from "../../../ThemeToggle";

export const formatBlindCountdown = (secondsRemaining: number): string => {
    // Negative = overtime (hand still running past the level end); show the
    // elapsed-over time with a leading minus, e.g. -0:10. (poker-vm#2292)
    const isOvertime = secondsRemaining < 0;
    const abs = Math.abs(secondsRemaining);
    const minutes = Math.floor(abs / 60);
    const seconds = abs % 60;
    return `${isOvertime ? "-" : ""}${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export interface TableHeaderProps {
    // Table info
    tableId: string;
    /** Optional ENS-style table name (poker-vm#337); a generated name is shown when absent. */
    tableName?: string;
    isMobileLandscape: boolean;

    // Game data
    gameFormat: GameFormat | null;
    gameOptions: GameOptionsDTO | null;
    tableActivePlayers: PlayerDTO[];

    // Wallet data
    publicKey: string | null;
    formattedAddress: string;
    isBalanceLoading: boolean;
    balanceFormatted: string;

    // Sub-header data
    formattedValues: {
        smallBlindFormatted: string;
        bigBlindFormatted: string;
        isTournamentStyle: boolean;
    };
    handNumber: number;
    actionCount: number;
    nextToAct: number;

    // Current user state
    currentPlayerData: PlayerDTO | null;

    // Sidebar state
    openSidebar: boolean;

    // Settings sidebar state
    openSettings: boolean;

    // Handlers
    handleLobbyClick: () => void;
    handleCopyTableLink: () => void;
    handleDepositClick: () => void;
    fetchAccountBalance: () => void;
    copyToClipboard: (text: string) => void;
    onCloseSideBar: () => void;
    onToggleSettings: () => void;
    handleLeaveTableClick: () => void;
    handleShareHand: () => void;
    onToggleFocus: () => void;
}

export const TableHeader: React.FC<TableHeaderProps> = ({
    tableId,
    tableName,
    isMobileLandscape,
    gameFormat,
    gameOptions,
    tableActivePlayers,
    publicKey,
    formattedAddress,
    isBalanceLoading,
    balanceFormatted,
    formattedValues,
    handNumber,
    actionCount,
    nextToAct,
    currentPlayerData,
    openSidebar,
    openSettings,
    handleLobbyClick,
    handleCopyTableLink,
    handleDepositClick,
    fetchAccountBalance,
    copyToClipboard,
    onCloseSideBar,
    onToggleSettings,
    handleLeaveTableClick,
    handleShareHand,
    onToggleFocus
}) => {
    const blindLevel = useBlindLevel();
    const [showQR, setShowQR] = useState(false);
    if (isMobileLandscape) return null;
    const tableUrl = window.location.origin + "/table/" + tableId;
    const title = displayTableName(tableName, tableId);
    const showLeave = currentPlayerData && !(gameFormat && isSitAndGoFormat(gameFormat));

    return (
        <header className={styles.roomHeader}>
            <div className={styles.roomMain}>
                <button className={styles.backButton} onClick={handleLobbyClick}>
                    <FaArrowLeft />
                    <span>Lobby</span>
                </button>
                <div className={styles.roomIdentity}>
                    <strong>{title}</strong>
                    <span>
                        {gameFormat ? formatGameFormatDisplay(gameFormat) : "Poker"}
                        {gameOptions && " · " + tableActivePlayers.length + "/" + gameOptions.maxPlayers + " seats"}
                    </span>
                </div>
                <div className={styles.roomTools}>
                    <ThemeToggle />
                    <details className={styles.walletMenu}>
                        <summary aria-label="Wallet options">
                            {isBalanceLoading ? "Loading…" : "$" + balanceFormatted}
                            <span> USDC</span>
                        </summary>
                        <div className={styles.popover}>
                            <p>GAME WALLET</p>
                            <span className={styles.address}>{formattedAddress}</span>
                            <button onClick={() => copyToClipboard(publicKey || "")}>
                                <FaCopy /> Copy address
                            </button>
                            <button onClick={fetchAccountBalance} disabled={isBalanceLoading}>
                                <FaRedo /> Refresh balance
                            </button>
                            <button onClick={handleDepositClick}>Add funds</button>
                        </div>
                    </details>
                    <button className={styles.toolButton} onClick={handleCopyTableLink} title="Copy table link">
                        <FaShare />
                        <span>Invite</span>
                    </button>
                    <button className={styles.toolButton} aria-label="Full screen" title="Table-only view — hide banners" onClick={onToggleFocus}>
                        <FaExpand />
                    </button>
                    <details className={styles.moreMenu}>
                        <summary aria-label="Table options">
                            <FaEllipsisH />
                        </summary>
                        <div className={styles.popover}>
                            <p>TABLE OPTIONS</p>
                            <button onClick={() => setShowQR(true)}>
                                <FaQrcode /> Invite by QR code
                            </button>
                            <button onClick={handleShareHand}>
                                <FaShare /> Share this hand
                            </button>
                            <a
                                href={buildShareOnXUrl(buildHandShareUrl(window.location.origin, tableId, handNumber))}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Share on X ↗
                            </a>
                            <span className={styles.diagnostics}>
                                Hand #{handNumber} · {actionCount} actions
                                <br />
                                {nextToAct > 0 ? "Next: seat " + nextToAct : "Waiting for the next action"}
                            </span>
                            <div className={styles.networkSection}>
                                <p>NETWORK</p>
                                <NetworkSelector />
                            </div>
                            {showLeave && (
                                <button className={styles.leaveTableButton} onClick={handleLeaveTableClick}>
                                    Leave table
                                </button>
                            )}
                        </div>
                    </details>
                    <ProfileAvatarButton title="Choose your avatar" />
                </div>
            </div>
            <div className={styles.roomStatus}>
                <div className={styles.stakes}>
                    <span>BLINDS</span>
                    <strong>
                        {blindLevel.isActive
                            ? blindLevel.currentBlindsFormatted
                            : (formattedValues.isTournamentStyle ? "" : "$") +
                              formattedValues.smallBlindFormatted +
                              " / " +
                              (formattedValues.isTournamentStyle ? "" : "$") +
                              formattedValues.bigBlindFormatted}
                    </strong>
                    {blindLevel.isActive && (
                        <small>
                            {blindLevel.level !== undefined && "Level " + (blindLevel.level + 1)}
                            {blindLevel.hasTimer && " · " + formatBlindCountdown(blindLevel.secondsRemaining) + " to next level"}
                        </small>
                    )}
                    <span className={styles.handNumber}>Hand #{handNumber}</span>
                    <span className={styles.nextToAct}>Next: Seat {nextToAct}</span>
                </div>
                <div className={styles.panelTabs} role="group" aria-label="Table panels">
                    <button
                        aria-controls="table-history-panel"
                        aria-expanded={openSidebar}
                        aria-pressed={openSidebar}
                        onClick={onCloseSideBar}
                        className={openSidebar ? styles.activeTool : ""}
                    >
                        <FaHistory />
                        <span>History</span>
                    </button>
                    <button
                        aria-controls="table-settings-panel"
                        aria-expanded={openSettings}
                        aria-pressed={openSettings}
                        onClick={onToggleSettings}
                        className={openSettings ? styles.activeTool : ""}
                    >
                        <FaCog />
                        <span>Settings</span>
                    </button>
                </div>
            </div>
            <Modal
                isOpen={showQR}
                onClose={() => setShowQR(false)}
                title="Invite to this table"
                titleIcon={<FaQrcode />}
                widthClass="w-80"
                patternId="hexagons-qr"
                scrollable={false}
            >
                <div className="flex flex-col items-center gap-4">
                    <p className="text-sm text-gray-400">Scan to open {title}.</p>
                    <div className="bg-white p-4 rounded-xl">
                        <QRCodeSVG value={tableUrl} size={220} />
                    </div>
                    <button onClick={handleCopyTableLink} className={styles.copyTableButton}>
                        Copy table link
                    </button>
                </div>
            </Modal>
        </header>
    );
};
