import React from "react";
import type { EmptySeatVariant } from "../../../utils/emptySeatPreview";

interface EmptySeatMarkProps {
    variant: EmptySeatVariant;
    seat: number;
    /** A seat the viewer can still buy into. Option D says so; the others do not. */
    joinable: boolean;
}

/**
 * Stand-in for the empty rail bar. Rendered only while `?emptySeat=` is set.
 */
export const EmptySeatMark: React.FC<EmptySeatMarkProps> = ({ variant, seat, joinable }) => {
    if (variant === "b") {
        return <span className="vacant-seat-avatar">{seat}</span>;
    }
    if (variant === "c") {
        return <span className="vacant-seat-chip">{seat}</span>;
    }
    if (variant === "d") {
        if (!joinable) return <span className="vacant-seat-dot" />;
        return (
            <>
                <span className="vacant-seat-num">{seat}</span>
                <span className="vacant-seat-ghost">Sit here</span>
            </>
        );
    }
    return (
        <>
            <span className="vacant-seat-num">{seat}</span>
            <span className="vacant-seat-ghost">Empty</span>
        </>
    );
};
