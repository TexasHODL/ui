import { LegalActionDTO, PlayerStatus } from "@block52/poker-vm-sdk";
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
    seatNumber?: number;
}
