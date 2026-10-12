import React, { useRef } from "react";
import { betFromTravel, SLIDER_TRAVEL_GRADIENT, sliderTravelColor } from "./sliderTravel";

export interface VerticalPillSliderProps {
    value: number;
    min: number;
    max: number;
    step: number;
    label: string;
    disabled?: boolean;
    invalid?: boolean;
    className?: string;
    onChange: (value: number) => void;
    onIncrement: () => void;
    onDecrement: () => void;
}

/** Frosted pill bet slider. Pink at the minus end, orange at the plus end.
 * The filled track samples that same gradient along the travel, so a mid-range
 * bet stays in the pink half instead of stretching the whole blend into the fill. */
export const VerticalPillSlider: React.FC<VerticalPillSliderProps> = ({
    value,
    min,
    max,
    step,
    label,
    disabled,
    invalid,
    className,
    onChange,
    onIncrement,
    onDecrement
}) => {
    const travelRef = useRef<HTMLDivElement>(null);
    const span = max - min;
    const pct = span <= 0 ? 0 : Math.min(1, Math.max(0, (value - min) / span));

    const fromPointer = (clientY: number) => {
        const el = travelRef.current;
        if (!el || disabled) return;
        const rect = el.getBoundingClientRect();
        const next = betFromTravel(clientY, rect.top, rect.height, min, max, step);
        if (next !== null) onChange(next);
    };

    return (
        <div className={`pill-slider${className ? ` ${className}` : ""}${invalid ? " pill-slider-invalid" : ""}`}>
            <button type="button" className="pill-cap pill-cap-plus" aria-label="Increase bet" disabled={disabled} onClick={onIncrement}>
                +
            </button>
            <div
                className="pill-track"
                ref={travelRef}
                role="slider"
                aria-label="Bet amount"
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-valuetext={label}
                aria-orientation="vertical"
                aria-disabled={disabled || undefined}
                onPointerDown={event => {
                    if (disabled) return;
                    fromPointer(event.nativeEvent.clientY);
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                }}
                onPointerMove={event => {
                    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) fromPointer(event.nativeEvent.clientY);
                }}
            >
                <div className="pill-rail" aria-hidden="true">
                    <div
                        className="pill-fill"
                        data-testid="pill-fill"
                        style={{
                            height: `${pct * 100}%`,
                            backgroundImage: SLIDER_TRAVEL_GRADIENT,
                            backgroundSize: pct > 0 ? `100% ${100 / pct}%` : "100% 100%",
                            backgroundRepeat: "no-repeat",
                            backgroundPosition: "center bottom"
                        }}
                    />
                </div>
                <div className="pill-thumb" data-testid="pill-thumb" style={{ bottom: `calc(11px + (100% - 22px) * ${pct})`, background: sliderTravelColor(pct) }} />
                <div className="pill-value">{label}</div>
            </div>
            <button type="button" className="pill-cap pill-cap-minus" aria-label="Decrease bet" disabled={disabled} onClick={onDecrement}>
                −
            </button>
        </div>
    );
};
