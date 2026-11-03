import React, { useLayoutEffect, useRef, useState } from "react";
import "./FitText.css";

type FitTextProps = {
    children: React.ReactNode;
    className?: string;
    /** Smallest font scale before switching to a marquee (0..1). */
    minScale?: number;
};

type FitState = { scale: number; scroll: number };

/**
 * Keeps a label on one line inside its container: shrinks the font to fit
 * (down to minScale), then scrolls the text back and forth if it still
 * overflows. Short labels render unchanged. With reduced motion the
 * overflow is clipped with an ellipsis instead of scrolling.
 */
export const FitText: React.FC<FitTextProps> = ({ children, className = "", minScale = 0.7 }) => {
    const wrapRef = useRef<HTMLSpanElement>(null);
    const innerRef = useRef<HTMLSpanElement>(null);
    const [fit, setFit] = useState<FitState>({ scale: 1, scroll: 0 });

    useLayoutEffect(() => {
        const wrap = wrapRef.current;
        const inner = innerRef.current;
        if (!wrap || !inner) return;
        const measure = () => {
            const prev = inner.style.fontSize;
            inner.style.fontSize = "";
            const natural = inner.scrollWidth;
            inner.style.fontSize = prev;
            const avail = wrap.clientWidth;
            if (!natural || !avail || natural <= avail) {
                setFit(f => (f.scale === 1 && f.scroll === 0 ? f : { scale: 1, scroll: 0 }));
                return;
            }
            const scale = Math.max(minScale, avail / natural);
            const scroll = Math.max(0, Math.ceil(natural * scale - avail));
            setFit(f => (Math.abs(f.scale - scale) < 0.005 && f.scroll === scroll ? f : { scale, scroll }));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(wrap);
        return () => ro.disconnect();
    }, [children, minScale]);

    const marquee = fit.scroll > 0;
    const style = {
        fontSize: fit.scale < 1 ? `${fit.scale}em` : undefined,
        "--fit-scroll": `${-fit.scroll}px`,
        "--fit-duration": `${Math.max(3, 2 + fit.scroll / 15)}s`
    } as React.CSSProperties;

    return (
        <span ref={wrapRef} className={`fit-text ${marquee ? "fit-text-marquee" : ""} ${className}`}>
            <span ref={innerRef} className="fit-text-inner" style={style}>
                {children}
            </span>
        </span>
    );
};

export default FitText;