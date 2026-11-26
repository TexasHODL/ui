import type {
    MoveIntentDTO as SdkMoveIntentDTO,
    TournamentEntrantDTO as SdkTournamentEntrantDTO,
    TournamentOptionsDTO as SdkTournamentOptionsDTO,
    TournamentStateDTO as SdkTournamentStateDTO,
    TournamentTableDTO as SdkTournamentTableDTO
} from "@block52/poker-vm-sdk";

/**
 * Tournament engine types come from the SDK. Keep the UI's existing optional
 * name fields while inheriting SDK updates such as lateRegistrationLevels.
 */
export type MoveIntentDTO = SdkMoveIntentDTO;
export type TournamentEntrantDTO = SdkTournamentEntrantDTO;
export type TournamentTableDTO = SdkTournamentTableDTO;
export type TournamentOptionsDTO = SdkTournamentOptionsDTO & { name?: string };
export type TournamentStateDTO = Omit<SdkTournamentStateDTO, "options"> & {
    name?: string;
    options: TournamentOptionsDTO;
};

/** Response of the tournament query: the state is a JSON string. */
export type TournamentResponse = { tournament: string };
