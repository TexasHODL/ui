import React from "react";
import "./HoleCardFan.css";

/** Angle the wrappers, not the images, so winning-card lift animations still work. */
export function HoleCardFan({ children }: { children: React.ReactNode }) {
    return <div className="hole-card-fan">{React.Children.toArray(children).map((card, index) =>
        <span className="hole-card-fan-slot" key={index}>{card}</span>
    )}</div>;
}
