import React from "react";
import { Modal } from "../common";
import { escrowStatement, formatUsdc, type TournamentLobbyCard } from "../../utils/tournamentLobby";

interface TournamentRegisterModalProps {
    card: TournamentLobbyCard | null;
    mode: "register" | "unregister";
    busy: boolean;
    error: string | null;
    onConfirm: () => void;
    onClose: () => void;
}

/** Confirms a registration or an unregistration and says exactly where the buy-in goes (no promise of a full refund). */
export const TournamentRegisterModal: React.FC<TournamentRegisterModalProps> = ({ card, mode, busy, error, onConfirm, onClose }) => {
    if (!card) return null;
    const statement = escrowStatement(card.cost);
    const registering = mode === "register";
    return (
        <Modal
            isOpen
            onClose={onClose}
            title={registering ? "Register for tournament" : "Unregister from tournament"}
            error={error}
            isProcessing={busy}
            widthClass="w-[28rem]"
            className="theme-dialog"
            patternId="hexagons-tournament-register"
        >
            <div className="text-sm space-y-3" data-testid="tournament-escrow-statement">
                <div className="flex justify-between gap-3">
                    <span className="text-gray-400 min-w-0">{registering ? "Buy-in" : "Buy-in paid"}</span>
                    <span className="text-white font-medium shrink-0 whitespace-nowrap">{formatUsdc(card.cost.gross)}</span>
                </div>
                {card.cost.entryFee > 0n && (
                    <div className="flex justify-between gap-3">
                        <span className="text-gray-400 min-w-0">Entry fee (to the creator, inside the buy-in)</span>
                        <span className="shrink-0 whitespace-nowrap">{formatUsdc(card.cost.entryFee)}</span>
                    </div>
                )}
                {card.cost.protocolCut > 0n && (
                    <div className="flex justify-between gap-3">
                        <span className="text-gray-400 min-w-0">Protocol fee (inside the buy-in)</span>
                        <span className="shrink-0 whitespace-nowrap">{formatUsdc(card.cost.protocolCut)}</span>
                    </div>
                )}
                <div className="flex justify-between gap-3">
                    <span className="text-gray-400 min-w-0">{registering ? "Held in escrow for the prize pool" : "Returned to you"}</span>
                    <span className="shrink-0 whitespace-nowrap">{formatUsdc(card.cost.net)}</span>
                </div>
                <p className="text-xs text-gray-400">{registering ? statement.register : statement.unregister}</p>
                {registering && (
                    <p className="text-xs text-gray-400">
                        You can unregister until the tournament starts. If fewer than {card.minEntrants} players have registered by then, it is cancelled and only the {formatUsdc(card.cost.net)} held in escrow is returned.
                    </p>
                )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 mt-5">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="hodl-secondary min-h-[44px] px-4 py-2 rounded-lg text-sm"
                    data-testid="tournament-modal-cancel"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={busy}
                    className="hodl-primary min-h-[44px] px-4 py-2 rounded-lg text-sm"
                    data-testid="tournament-modal-confirm"
                >
                    {busy ? "Waiting for the chain…" : registering ? `Pay ${formatUsdc(card.cost.gross)} and register` : "Unregister"}
                </button>
            </div>
        </Modal>
    );
};
