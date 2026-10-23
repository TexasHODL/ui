import { useEffect, useState } from "react";
import { formatCountdown, formatStartsAt } from "../../utils/scheduledSng";

export interface ScheduledStartCountdownProps {
    scheduledStartTime: number;
    minPlayers: number;
    maxPlayers: number;
    /**
     * Shared clock from the parent when the parent also drives phase (waiting
     * modal). When omitted the countdown ticks once a second on its own.
     */
    nowMs?: number;
    className?: string;
    testId?: string;
}

/**
 * Live "STARTS IN" countdown used on the sit-and-go waiting screen and on the
 * pre-join buy-in modal for scheduled tables (poker-vm#2680).
 */
export function ScheduledStartCountdown({
    scheduledStartTime,
    minPlayers,
    maxPlayers,
    nowMs: nowMsProp,
    className = "mb-4 bg-gray-700/80 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30 text-center",
    testId = "scheduled-start-panel"
}: ScheduledStartCountdownProps) {
    const [internalNowMs, setInternalNowMs] = useState(() => Date.now());
    const tickingInternally = nowMsProp === undefined;

    useEffect(() => {
        if (!tickingInternally) return;
        const id = setInterval(() => setInternalNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [tickingInternally]);

    const nowMs = nowMsProp ?? internalNowMs;

    return (
        <div className={className} data-testid={testId}>
            <div className="text-xs text-blue-300 font-semibold">STARTS IN</div>
            <div className="text-2xl text-white font-mono font-bold">{formatCountdown(scheduledStartTime, nowMs)}</div>
            <div className="text-xs text-gray-400">
                {formatStartsAt(scheduledStartTime, nowMs)} · needs {minPlayers} of {maxPlayers}, or starts early when full
            </div>
        </div>
    );
}