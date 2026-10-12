import type { ReactNode } from "react";

/** Mobile action host. Children stay mounted so PokerActionPanel keeps its
 * automatic gameplay hooks. Portrait overlays the felt (the slot takes no
 * flow height, so the table does not jump when a turn starts). Landscape is
 * a side column that only takes width while `data-has-actions` is set. */
export function MobileActionDock({ mode, children }: { mode: "overlay" | "column"; children: ReactNode }) {
    return (
        <div className={`mobile-action-slot mobile-action-slot-${mode}`} data-testid="mobile-action-slot" data-mode={mode}>
            <div className="mobile-action-content">{children}</div>
        </div>
    );
}
