import { readFileSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import Badge from "./Badge";
import { useShowAllDealerButtons } from "../../../context/ShowAllDealerButtonsContext";

jest.mock("../../../utils/colorConfig", () => ({
    colors: { accent: { success: "#22c55e" } }
}));

jest.mock("../../../context/GameStateContext", () => ({
    useGameStateContext: () => ({ gameFormat: "cash" })
}));

jest.mock("../../../hooks/player/usePlayerActionDropBox", () => ({
    usePlayerActionDropBox: () => ({
        action: "",
        amount: "",
        isVisible: false,
        isTextHiding: false,
        isAnimatingOut: false
    })
}));

jest.mock("../../../hooks/notifications/useSeatJoinNotification", () => ({
    useSeatJoinNotification: () => ({
        isVisible: false,
        isAnimatingOut: false,
        isTextHiding: false
    })
}));

describe("dealer button on the seat badge", () => {
    it("anchors the button inside the seat-number circle when this seat is the dealer", () => {
        const { container } = render(<Badge count={4} value={100} color="#468dce" isDealer />);
        const badge = container.querySelector(".badge-number");
        const button = container.querySelector(".dealer-badge-button");
        expect(badge).not.toBeNull();
        expect(button?.parentElement).toBe(badge);
        expect(button).toHaveAttribute("data-dealer-button", "4");
        expect(screen.getByAltText("Dealer Button")).toBeInTheDocument();
    });

    it("draws no button on the other seats", () => {
        const { container } = render(<Badge count={2} value={100} color="#468dce" />);
        expect(container.querySelector(".dealer-badge-button")).toBeNull();
    });

    it("keeps the show-every-seat override off unless a preview provider turns it on", () => {
        const { result } = renderHook(() => useShowAllDealerButtons());
        expect(result.current).toBe(false);
    });

    it("places the disc up and to the left at 45 degrees with a 3px screen gap", () => {
        const css = readFileSync(join(__dirname, "Badge.css"), "utf8");
        const rule = css.slice(css.indexOf(".dealer-badge-button {"), css.indexOf(".dealer-badge-button img"));
        expect(rule).toContain("--dealer-gap: calc(3px / var(--table-zoom, 1))");
        expect(rule).toContain("/ 1.414213562");
        expect(rule).toContain("right: calc(50% + var(--dealer-shift))");
        expect(rule).toContain("bottom: calc(50% + var(--dealer-shift))");
        expect(rule).toContain("z-index: 50");
    });
});
