import type { ReactNode } from "react";

/** Mobile action host. Children stay mounted so PokerActionPanel keeps its
 * automatic gameplay hooks. The portrait dock and the landscape column always
 * occupy layout space, on-turn and off-turn, so the felt does not move. */
export function MobileActionDock({ mode, children }: { mode: "overlay" | "column"; children: ReactNode }) {
    return (
        <div className={`mobile-action-slot mobile-action-slot-${mode}`} data-testid="mobile-action-slot" data-mode={mode}>
            <div className="mobile-action-content">{children}</div>
        </div>
    );
}
