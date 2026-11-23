import { PlayerStatus } from "@block52/poker-vm-sdk";

/** Only a player still contesting a running hand needs the leave/fold warning. */
export function shouldWarnOnLeave(isGameInProgress: boolean, status: PlayerStatus | string | null | undefined): boolean {
    return isGameInProgress && (status === PlayerStatus.ACTIVE || status === PlayerStatus.ALL_IN);
}

/**
 * Is this seat out of the hand by its own choice — folded, or mucked at
 * showdown?
 *
 * Engine v1.0.18 (poker-vm#2586) added `PlayerStatus.MUCKED`: a beaten player
 * who declined to show at the sequenced showdown. Internally the engine still
 * treats them as folded, and so must the UI — dimmed seat, no chips in the
 * pot-odds count, excluded from all-in equity, "you're out" copy in the footer.
 * Every folded check goes through here so the two statuses cannot drift apart.
 */
export function hasFoldedOrMucked(status: PlayerStatus | string | null | undefined): boolean {
    return status === PlayerStatus.FOLDED || status === PlayerStatus.MUCKED;
}
