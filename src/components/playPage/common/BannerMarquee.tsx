import React, { useCallback, useLayoutEffect, useRef, useState } from "react";

type BannerMarqueeProps = {
    children: React.ReactNode;
    className?: string;
};

/** Scrolls overflowing banner text in a seamless loop, with a pause at the start.
 *  When the line fits, it stays centred and still. Reduced motion drops the
 *  scroll and ellipsises instead. */
export const BannerMarquee: React.FC<BannerMarqueeProps> = ({ children, className }) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const itemRef = useRef<HTMLSpanElement>(null);
    const [overflows, setOverflows] = useState(false);

    const measure = useCallback(() => {
        const root = rootRef.current;
        const item = itemRef.current;
        if (!root || !item) return;
        setOverflows(item.scrollWidth - root.clientWidth > 1);
    }, []);

    useLayoutEffect(() => {
        measure();
        const root = rootRef.current;
        const item = itemRef.current;
        const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        if (ro && root) ro.observe(root);
        if (ro && item) ro.observe(item);
        window.addEventListener("resize", measure);
        return () => {
            ro?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [measure, children]);

    return (
        <div
            ref={rootRef}
            className={`seat-banner-marquee${className ? ` ${className}` : ""}`}
            data-overflow={overflows ? "true" : "false"}
            data-testid="seat-banner-marquee"
        >
            <div className="seat-banner-marquee-track">
                <span ref={itemRef} className="seat-banner-marquee-item">
                    {children}
                </span>
                {overflows && (
                    <span className="seat-banner-marquee-item" aria-hidden="true">
                        {children}
                    </span>
                )}
            </div>
        </div>
    );
};

export default BannerMarquee;
