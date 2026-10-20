import { readFileSync } from "fs";
import { join } from "path";
import { render, screen } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import PlayerChipDisplay from "./PlayerChipDisplay";
import Badge from "../../common/Badge";
import { useShowAllDealerButtons } from "../../../../context/ShowAllDealerButtonsContext";

const chipAmounts: Record<number, string> = { 1: "2000000", 2: "0" };
jest.mock("../../../../hooks/player/usePlayerChipData", () => ({
    usePlayerChipData: (seat: number) => ({ chipAmount: chipAmounts[seat] ?? "0" })
}));
jest.mock("../../../../utils/colorConfig", () => ({ colors: { accent: { success: "#22c55e" } } }));
jest.mock("../../../../context/GameStateContext", () => ({ useGameStateContext: () => ({ gameFormat: "cash" }) }));
jest.mock("../../../../hooks/player/usePlayerActionDropBox", () => ({
    usePlayerActionDropBox: () => ({ action: "", amount: "", isVisible: false, isTextHiding: false, isAnimatingOut: false })
}));
jest.mock("../../../../hooks/notifications/useSeatJoinNotification", () => ({
    useSeatJoinNotification: () => ({ isVisible: false, isAnimatingOut: false, isTextHiding: false })
}));

describe("dealer button beside the bet", () => {
    it("draws the button inside the seat's bet group, on the left by default", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={1} left="500px" top="400px" bottom="0px" side="bottom" isTournament={false} isDealer />);
        const group = container.querySelector(".chip-position");
        const button = container.querySelector(".dealer-button");
        expect(button?.parentElement).toBe(group);
        expect(button).toHaveAttribute("data-dealer-button", "1");
        expect(button).toHaveAttribute("data-dealer-side", "left");
        expect(screen.getByAltText("Dealer Button")).toBeInTheDocument();
        expect((group as HTMLElement).style.transform).toBe("translate(-50%, -50%)");
    });

    it("puts it on the right of the chips for a left-arc seat, still centred on the spot", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={1} left="100px" top="250px" bottom="0px" side="left" isTournament={false} isDealer />);
        expect(container.querySelector(".dealer-button")).toHaveAttribute("data-dealer-side", "right");
        expect((container.querySelector(".chip-position") as HTMLElement).style.transform).toBe("translate(-50%, -50%)");
    });

    it("keeps the button on the left for a right-arc seat", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={1} left="900px" top="250px" bottom="0px" side="right" isTournament={false} isDealer />);
        expect(container.querySelector(".dealer-button")).toHaveAttribute("data-dealer-side", "left");
        expect((container.querySelector(".chip-position") as HTMLElement).style.transform).toBe("translate(-50%, -50%)");
    });

    it("keeps the button in the same spot when the dealer has no bet", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={2} left="500px" top="400px" bottom="0px" side="bottom" isTournament={false} isDealer />);
        expect(container.querySelector(".bet-group-empty")).not.toBeNull();
        expect(container.querySelector(".dealer-button")).not.toBeNull();
        expect(container.querySelector("img[alt$='chip']")).toBeNull();
    });

    it("renders nothing for a seat with no bet that is not the dealer", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={2} left="0px" top="0px" bottom="0px" side="top" isTournament={false} />);
        expect(container.firstChild).toBeNull();
    });

    it("sizes the button as one chip", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={1} left="0px" top="0px" bottom="0px" side="top" isTournament={false} isDealer />);
        const button = container.querySelector(".dealer-button") as HTMLElement;
        const chip = container.querySelector("img[alt$='chip']") as HTMLElement;
        expect(button.style.width).toBe(chip.style.width);
        expect(button.style.height).toBe(chip.style.height);
    });

    it("no longer draws a dealer button on the seat badge", () => {
        const { container } = render(<Badge count={4} value={100} color="#468dce" />);
        expect(container.querySelector(".dealer-badge-button, .dealer-button")).toBeNull();
    });

    it("keeps the show-every-seat override off unless a preview provider turns it on", () => {
        const { result } = renderHook(() => useShowAllDealerButtons());
        expect(result.current).toBe(false);
    });

    it("centres the button on the bet group's middle line beside it", () => {
        const css = readFileSync(join(__dirname, "DealerButtonDisplay.css"), "utf8");
        expect(css).toMatch(/\.dealer-button \{[^}]*top: 50%;[^}]*transform: translateY\(-50%\)/);
        expect(css).toContain("right: calc(100% + var(--dealer-gap))");
        expect(css).toContain("left: calc(100% + var(--dealer-gap))");
    });
    it("keeps the dealer button outside the chips+amount group so it can't shift the group's centre", () => {
        const { container } = render(<PlayerChipDisplay seatIndex={1} left="500px" top="250px" bottom="0px" side="bottom" isTournament={false} isDealer />);
        const anchor = container.querySelector(".chip-position") as HTMLElement;
        const button = container.querySelector(".dealer-button") as HTMLElement;
        // The button is the anchor's direct child next to the group (absolutely
        // positioned by DealerButtonDisplay.css), never inside the group itself.
        expect(button.parentElement).toBe(anchor);
        expect(anchor.firstElementChild).not.toBe(button);
        expect(anchor.firstElementChild?.contains(button)).toBe(false);
        expect(anchor.style.left).toBe("500px");
        expect(anchor.style.transform).toBe("translate(-50%, -50%)");
    });
});
