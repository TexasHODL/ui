import type { ReactNode } from "react";
import { FaClock } from "react-icons/fa";

interface ScheduledStartCardProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    children: ReactNode;
}

/**
 * Sit & Go scheduled start. The pages still decide when it is shown and still
 * own the time and minimum-player fields passed as children.
 */
export function ScheduledStartCard({ checked, onChange, children }: ScheduledStartCardProps) {
    return (
        <section className={checked ? "scheduled-start scheduled-start-on" : "scheduled-start"} data-testid="scheduled-start-toggle">
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
                    <span>Start at a set time — with whoever has registered, or earlier when full</span>
                </span>
                <span className="scheduled-start-track" aria-hidden="true">
                    <span />
                </span>
            </button>
            {checked && <div className="scheduled-start-fields">{children}</div>}
        </section>
    );
}
