import React from "react";
import { render, screen } from "@testing-library/react";
import { HoleCardFan } from "./HoleCardFan";

it("fans card wrappers without replacing the winning-card image animation", () => {
    const { container } = render(<HoleCardFan>
        <img src="king.svg" alt="King of clubs" className="animate-win-card" />
        <img src="queen.svg" alt="Queen of hearts" className="opacity-40" />
    </HoleCardFan>);
    expect(container.querySelectorAll(".hole-card-fan-slot")).toHaveLength(2);
    expect(screen.getByAltText("King of clubs")).toHaveClass("animate-win-card");
    expect(screen.getByAltText("King of clubs").parentElement).toHaveClass("hole-card-fan-slot");
    expect(screen.getByAltText("Queen of hearts")).toHaveClass("opacity-40");
});

it("uses the same pair layout for hidden opponents' cards", () => {
    render(<HoleCardFan><img src="back.svg" alt="Hidden first card" /><img src="back.svg" alt="Hidden second card" /></HoleCardFan>);
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getAllByRole("img").every(card => card.getAttribute("src") === "back.svg")).toBe(true);
});
