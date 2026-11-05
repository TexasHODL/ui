import type { ReactNode } from "react";
import { FaClock } from "react-icons/fa";
import { SIT_AND_GO_SCHEDULE_DESCRIPTION } from "../../utils/createGameType";

interface ScheduledStartCardProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    children: ReactNode;
    /** A Tournament always has a start time, so the switch stays on and cannot be turned off. */
    locked?: boolean;
    testId?: string;
    description?: string;
}

/**
 * Sit & Go scheduled start. The pages still decide when it is shown and still
 * own the time and minimum-player fields passed as children. A locked card is
 * the Tournament start: the same layout, with the time always visible. Turning
 * the switch on creates a tournament (SDK 1.24 refuses a start time on a sit-and-go).
 */
export function ScheduledStartCard({ checked, onChange, children, locked = false, testId, description }: ScheduledStartCardProps) {
    const on = locked || checked;
    return (
        <section className={on ? "scheduled-start scheduled-start-on" : "scheduled-start"} data-testid={testId ?? "scheduled-start-toggle"}>
            {locked ? (
                <div className="scheduled-start-toggle scheduled-start-locked">
                    <span className="scheduled-start-icon" aria-hidden="true">
                        <FaClock />
                    </span>
                    <span className="scheduled-start-copy">
                        <strong>Scheduled start</strong>
                        <span>{description ?? "A tournament starts at this time with at least the minimum registered, never earlier"}</span>
                    </span>
                </div>
            ) : (
                <button
                    type="button"
                    role="switch"
                    aria-checked={checked}
                    className="scheduled-start-toggle"
                    onClick={() => onChange(!checked)}
                >
                    <span className="scheduled-start-icon" aria-hidden="true">
                        <FaClock />
                    </span>
                    <span className="scheduled-start-copy">
                        <strong>Scheduled start</strong>
                        <span>{description ?? SIT_AND_GO_SCHEDULE_DESCRIPTION}</span>
                    </span>
                    <span className="scheduled-start-track" aria-hidden="true">
                        <span />
                    </span>
                </button>
            )}
            {on && <div className="scheduled-start-fields">{children}</div>}
        </section>
    );
}
