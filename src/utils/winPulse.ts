/**
 * Seats that should show the gold win pulse.
 *
 * HODL resolves a winner's seat from this hand's previousActions when the
 * winner has already left (so the banner/history can still say "Seat 3"
 * instead of "Seat 0"). That seat is now empty, but `winners` stays in the
 * state until the next hand starts, so the pulse kept glowing on the vacant
 * "Take a seat" slot. block52/ui never resolves a departed winner's seat (it
 * falls back to seat 0), which is why its pulse disappears.
 *
 * Only pulse a seat while the winner is still sitting in it: an empty seat,
 * or a different player who took the seat, gets no pulse.
 */
export const winPulseSeats = (
    winnerInfo: ReadonlyArray<{ seat: number; address?: string }> | null | undefined,
    seatedBySeat: ReadonlyMap<number, { address?: string }>
): Set<number> => {
    const seats = new Set<number>();
    if (!winnerInfo) return seats;
    for (const w of winnerInfo) {
        const seated = seatedBySeat.get(w.seat);
        if (!seated) continue;
        if (w.address && seated.address && w.address.toLowerCase() !== seated.address.toLowerCase()) continue;
        seats.add(w.seat);
    }
    return seats;
};