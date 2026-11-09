import { GameFormat, LegalActionDTO, PlayerStatus } from "@block52/poker-vm-sdk";
import { BaseHookReturn } from "../../types/index";

export interface PlayerLegalActionsResult extends BaseHookReturn {
    legalActions: LegalActionDTO[];
    isSmallBlindPosition: boolean;
    isBigBlindPosition: boolean;
    isDealerPosition: boolean;
    isPlayerTurn: boolean;
    playerStatus: PlayerStatus | null;
    playerSeat: number | null;
    sitInMethod: string | null;
    pendingSitOut: string | null;
    foldActionIndex: number | null;
    actionTurnIndex: number;
    isPlayerInGame: boolean;
}

export interface JoinTableOptions {
    amount: string;
    /** The seat a cash player picked. Ignored where seats are drawn (Sit & Go / tournament, ui#969). */
    seatNumber?: number;
    /**
     * The table's format (GameStateResponseDTO.format), which decides whether
     * the seat is chosen or drawn. Required, but may be undefined while the
     * table loads: joinTable then refuses to join rather than guess.
     */
    format: GameFormat | undefined;
}
