import React, { useRef } from "react";
import { formatDisplayAmount, formatSliderInputValue, parseSliderInput } from "../../utils/numberUtils";
import { hasValue } from "../../utils/guards";
import type { RaiseSliderProps } from "./types";
import { betFromHorizontalTravel, DESKTOP_PILL_GRADIENT, desktopPillColor } from "./desktopPillTravel";
import "./desktopPillSlider.css";

export const RaiseSlider: React.FC<RaiseSliderProps> = ({
    value,
    min,
    max,
    step,
    formattedMax,
    displayOffset,
    isInvalid,
    disabled,
    isMobileLandscape,
    isTournament,
    onChange,
    onIncrement,
    onDecrement
}) => {
    const travelRef = useRef<HTMLDivElement>(null);
    const displayValue = value + displayOffset;
    const span = max - min;
    const pct = span <= 0 ? 0 : Math.min(1, Math.max(0, (value - min) / span));
    const percentage = pct * 100;

    // Tournaments show whole chips (no "$", no decimals); cash shows "$X.XX".
    const displayString = formatSliderInputValue(displayValue, isTournament);
    const handleInput = (raw: string) => {
        const next = parseSliderInput(raw, displayOffset, isTournament);
        if (hasValue(next)) onChange(next);
    };

    const inputFieldClassName = isInvalid
        ? "bg-gray-700/80 text-red-400 border-red-500 focus:border-red-600 focus:ring-1 focus:ring-red-500/50"
        : "bg-gray-700/80 text-white border-blue-500/30 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30";

    const fromPointer = (clientX: number) => {
        const el = travelRef.current;
        if (!el || disabled) return;
        const rect = el.getBoundingClientRect();
        const next = betFromHorizontalTravel(clientX, rect.left, rect.width, min, max, step);
        if (next !== null) onChange(next);
    };

    if (!isMobileLandscape) {
        return (
            <div className={`desktop-slider-row${isInvalid ? " desktop-slider-invalid" : ""}`}>
                <div className="desktop-pill">
                    <button type="button" className="desktop-pill-cap desktop-pill-cap-minus" aria-label="Decrease bet" onClick={onDecrement} disabled={disabled}>
                        −
                    </button>
                    <div
                        className="desktop-pill-track"
                        role="slider"
                        aria-label="Bet amount"
                        aria-valuemin={min}
                        aria-valuemax={max}
                        aria-valuenow={value}
                        aria-valuetext={displayString}
                        aria-orientation="horizontal"
                        aria-disabled={disabled || undefined}
                        tabIndex={disabled ? -1 : 0}
                        onPointerDown={event => {
                            if (disabled) return;
                            fromPointer(event.nativeEvent.clientX);
                            event.currentTarget.setPointerCapture?.(event.pointerId);
                        }}
                        onPointerMove={event => {
                            if (event.currentTarget.hasPointerCapture?.(event.pointerId)) fromPointer(event.nativeEvent.clientX);
                        }}
                        onKeyDown={event => {
                            if (disabled) return;
                            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                                event.preventDefault();
                                onIncrement();
                            } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                                event.preventDefault();
                                onDecrement();
                            }
                        }}
                    >
                        <div className="desktop-pill-rail" ref={travelRef} aria-hidden="true">
                            <div
                                className="desktop-pill-fill"
                                data-testid="desktop-pill-fill"
                                style={{
                                    width: `${pct * 100}%`,
                                    backgroundImage: DESKTOP_PILL_GRADIENT,
                                    backgroundSize: pct > 0 ? `${100 / pct}% 100%` : "100% 100%",
                                    backgroundRepeat: "no-repeat",
                                    backgroundPosition: "left center"
                                }}
                            />
                        </div>
                        <div
                            className="desktop-pill-thumb"
                            data-testid="desktop-pill-thumb"
                            style={{ left: `calc(10px + (100% - 20px) * ${pct} - 11px)`, background: desktopPillColor(pct) }}
                        />
                    </div>
                    <button type="button" className="desktop-pill-cap desktop-pill-cap-plus" aria-label="Increase bet" onClick={onIncrement} disabled={disabled}>
                        +
                    </button>
                </div>
                <input
                    type="text"
                    inputMode={isTournament ? "numeric" : "decimal"}
                    value={displayString}
                    onChange={event => handleInput(event.target.value)}
                    aria-label="Bet amount input"
                    className={`${inputFieldClassName} px-1 lg:px-2 py-1 rounded text-xs lg:text-sm w-[80px] lg:w-[100px] transition-all duration-200 border`}
                    disabled={disabled}
                />
            </div>
        );
    }

    return (
        <div
            className={`flex items-center bg-[#0f172a40] backdrop-blur-sm rounded-lg border border-[#3a546d]/50 shadow-inner ${
                isMobileLandscape ? "gap-1 px-1 py-0.5 h-8" : "space-x-2 lg:space-x-4 p-2 lg:p-3"
            }`}
        >
            {/* Min/Max text - placed first in mobile landscape */}
            {isMobileLandscape && (
                <div className="flex items-center text-[9px] text-gray-400 whitespace-nowrap">
                    <span>Min:{formatDisplayAmount(min, isTournament)}</span>
                    <span className="mx-1">/</span>
                    <span>Max:{formattedMax}</span>
                </div>
            )}

            {/* Decrement Button */}
            <button
                className={
                    isMobileLandscape
                        ? "btn-slider py-0.5 px-1.5 rounded border text-[10px] transition-all duration-200"
                        : "btn-slider py-1 px-2 lg:px-4 rounded-lg border text-xs lg:text-sm transition-all duration-200"
                }
                onClick={onDecrement}
                disabled={disabled}
            >
                -
            </button>

            {/* Slider with dynamic fill */}
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className={
                    isMobileLandscape
                        ? "flex-1 accent-[#64ffda] h-1 rounded-full transition-all duration-200"
                        : "flex-1 accent-[#64ffda] h-2 rounded-full transition-all duration-200"
                }
                style={{
                    background: `linear-gradient(to right, #64ffda 0%, #64ffda ${percentage}%, #1e293b ${percentage}%, #1e293b 100%)`
                }}
                disabled={disabled}
            />

            {/* Increment Button */}
            <button
                className={
                    isMobileLandscape
                        ? "btn-slider py-0.5 px-1.5 rounded border text-[10px] transition-all duration-200"
                        : "btn-slider py-1 px-2 lg:px-4 rounded-lg border text-xs lg:text-sm transition-all duration-200"
                }
                onClick={onIncrement}
                disabled={disabled}
            >
                +
            </button>

            {/* Inline Input Box - compact for mobile landscape */}
            {!isMobileLandscape && (
                <div className="flex flex-col items-end gap-1 min-w-0">
                    <input
                        type="text"
                        inputMode={isTournament ? "numeric" : "decimal"}
                        value={displayString}
                        onChange={(e) => handleInput(e.target.value)}
                        className={`${inputFieldClassName} px-1 lg:px-2 py-1 rounded text-xs lg:text-sm w-[80px] lg:w-[100px] transition-all duration-200 border`}
                        disabled={disabled}
                    />
                </div>
            )}

            {isMobileLandscape && (
                <input
                    type="text"
                    inputMode={isTournament ? "numeric" : "decimal"}
                    value={displayString}
                    onChange={(e) => handleInput(e.target.value)}
                    className={`${inputFieldClassName} px-1 py-0.5 rounded text-[10px] w-[50px] transition-all duration-200 border`}
                    disabled={disabled}
                />
            )}
        </div>
    );
};
