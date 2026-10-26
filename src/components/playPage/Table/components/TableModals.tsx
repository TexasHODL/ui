/**
 * TableModals Component
 *
 * Encapsulates all modals and popups for the table:
 * - Game start countdown
 * - Sit & Go auto-join modal
 * - Sit & Go waiting modal
 * - Transaction popup
 * - Leave table modal
 */

import React from "react";
import { isSitAndGoFormat } from "../../../../utils/gameFormatUtils";
import { tournamentRegistrationClosed } from "../../../../utils/scheduledSng";
import GameStartCountdown from "../../common/GameStartCountdown";
import { SitAndGoAutoJoinModal, SitAndGoResultModal } from "../../../modals";
import SitAndGoWaitingModal from "../../SitAndGoWaitingModal";
import TransactionPopup from "../../common/TransactionPopup";
import { LeaveTableModal } from "../../../modals";

export interface TableModalsProps {
    /** Watch links never open an unsolicited entry prompt, even after refresh. */
    isWatchMode: boolean;
    hasOpenSeats: boolean;
    // Game Start Countdown
    showCountdown: boolean;
    gameStartTime: string | null;
    handleCountdownComplete: () => void;
    handleSkipCountdown: () => void;

    // Sit & Go Auto-Join Modal
    gameState: unknown | null;
    gameFormat: string | null | undefined;
    isUserAlreadyPlaying: boolean;
    tableId: string | undefined;
    onAutoJoinSuccess: () => void;

    // Sit & Go Waiting Modal
    isSitAndGoWaitingForPlayers: boolean;
    handleLeaveTableClick: () => void;

    // Transaction Popup
    recentTxHash: string | null;
    handleCloseTransactionPopup: () => void;

    // Leave Table Modal
    isLeaveModalOpen: boolean;
    handleLeaveModalClose: () => void;
    handleLeaveTableConfirm: () => Promise<void>;
    handleClaimWinnings: () => Promise<void>;
    currentPlayerStack: string;
    isInActiveHand: boolean;
}

export const TableModals: React.FC<TableModalsProps> = ({
    isWatchMode,
    hasOpenSeats,
    showCountdown,
    gameStartTime,
    handleCountdownComplete,
    handleSkipCountdown,
    gameState,
    gameFormat,
    isUserAlreadyPlaying,
    tableId,
    onAutoJoinSuccess,
    isSitAndGoWaitingForPlayers,
    recentTxHash,
    handleCloseTransactionPopup,
    isLeaveModalOpen,
    handleLeaveModalClose,
    handleLeaveTableConfirm,
    handleClaimWinnings,
    currentPlayerStack,
    isInActiveHand
}) => {
    const registrationClosed = tournamentRegistrationClosed(gameFormat, gameState);
    return (
        <>
            {/* Game Start Countdown Modal */}
            {showCountdown && gameStartTime && (!isWatchMode || isUserAlreadyPlaying) && (
                <GameStartCountdown gameStartTime={gameStartTime} onCountdownComplete={handleCountdownComplete} onSkip={handleSkipCountdown} />
            )}

            {/* Watch is an explicit choice to view the live game, not to buy in.
                Also protect direct links to full tables from an unusable prompt.
                Once the tournament has started, entry stays open only while
                late registration is open (poker-vm#2731). */}
            {!isWatchMode && hasOpenSeats && gameState && gameFormat && isSitAndGoFormat(gameFormat) && !isUserAlreadyPlaying && tableId && !registrationClosed && (
                <SitAndGoAutoJoinModal tableId={tableId} onJoinSuccess={onAutoJoinSuccess} />
            )}

            {/* Sit & Go Waiting Modal - Shows for Sit & Go games when user is playing but waiting for more players */}
            {isSitAndGoWaitingForPlayers && (
                <SitAndGoWaitingModal
                    tableId={tableId}
                    onLeaveConfirm={handleLeaveTableConfirm}
                    playerStack={currentPlayerStack}
                />
            )}

            {/* Only collection sends a settlement transaction. Spectating and
                returning to the lobby are viewing/navigation actions. */}
            {gameFormat && isSitAndGoFormat(gameFormat) && (
                <SitAndGoResultModal key={tableId} tableId={tableId} onClaim={handleClaimWinnings} />
            )}

            {/* Transaction Popup - Bottom Right */}
            <TransactionPopup txHash={recentTxHash} onClose={handleCloseTransactionPopup} />

            {/* Leave Table Modal — cash games only.
                SNG/Tournament players cannot leave an in-play tournament
                (frozen roster; the chain drops LEAVE from legal actions once a
                blind is posted — poker-vm#2343/#2349). Showing this generic
                modal after a bust-out let players wrongly leave, rebuy, and
                re-trigger the waiting modal for everyone (block52/ui#465). SNG
                leave/terminal flows are handled by SitAndGoWaitingModal
                (pre-start un-join) and SitAndGoResultModal (post-finish claim). */}
            {!(gameFormat && isSitAndGoFormat(gameFormat)) && (
                <LeaveTableModal
                    isOpen={isLeaveModalOpen}
                    onClose={handleLeaveModalClose}
                    onConfirm={handleLeaveTableConfirm}
                    playerStack={currentPlayerStack}
                    isInActiveHand={isInActiveHand}
                />
            )}
        </>
    );
};
