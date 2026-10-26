/**
 * Seconds left in the current blind level, the same value the table header's
 * "to next level" countdown shows (useBlindLevel). Negative while the level is
 * overdue (a hand running past the level end). Undefined when the table has no
 * blind timer (cash games, or levelStartTime / blindLevelDuration missing).
 */
export function blindLevelSecondsRemaining(
    gameOptions: { levelStartTime?: number | null; blindLevelDuration?: number | null } | null | undefined,
    nowMs: number
): number | undefined {
    const startTime = gameOptions?.levelStartTime;
    const durationMinutes = gameOptions?.blindLevelDuration;
    const levelDurationSeconds = durationMinutes ? durationMinutes * 60 : 0;
    if (levelDurationSeconds <= 0 || typeof startTime !== "number" || !(startTime > 0)) return undefined;
    // `startTime` is the CURRENT level's start, so remaining = duration - elapsed in level (poker-vm#2292).
    // Not clamped: overtime goes negative.
    const elapsedInLevelSeconds = Math.floor((nowMs - startTime) / 1000);
    return levelDurationSeconds - elapsedInLevelSeconds;
}