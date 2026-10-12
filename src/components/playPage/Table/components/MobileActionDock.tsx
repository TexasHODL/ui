import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

export const MOBILE_ACTION_DOCK_MIN_HEIGHT = { portrait: 160, landscape: 96 };

/** Normal-flow action space: never overlay the seat ring. Keep the largest
 * observed control height until the viewport changes to avoid turn-by-turn jumps.
 * Children stay mounted: PokerActionPanel owns automatic gameplay hooks. */
export function MobileActionDock({ portrait, children }: { portrait: boolean; children: ReactNode }) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [reserved, setReserved] = useState(0);
    const minimum = MOBILE_ACTION_DOCK_MIN_HEIGHT[portrait ? "portrait" : "landscape"];

    useLayoutEffect(() => {
        const content = contentRef.current;
        if (!content) return;
        let peak = minimum;
        let width = window.innerWidth;
        let height = window.innerHeight;
        const measure = () => {
            if (width !== window.innerWidth || height !== window.innerHeight) {
                peak = minimum;
                width = window.innerWidth;
                height = window.innerHeight;
            }
            peak = Math.max(peak, Math.ceil(content.getBoundingClientRect().height) + 12);
            setReserved(peak);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(content);
        window.addEventListener("resize", measure);
        return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
    }, [minimum]);

    return (
        <div className="mobile-action-slot" data-testid="mobile-action-slot" style={{ minHeight: Math.max(minimum, reserved) }}>
            <div ref={contentRef} className="mobile-action-content">{children}</div>
        </div>
    );
}
