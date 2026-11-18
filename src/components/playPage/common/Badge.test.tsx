import { render, screen } from "@testing-library/react";
import Badge from "./Badge";
import { PreviewSeatActionsContext, type PinnedSeatAction } from "../../../context/PreviewSeatActionsContext";

jest.mock("../../../utils/colorConfig", () => ({
    colors: { accent: { success: "#55dda2" } }
}));

jest.mock("../../../context/GameStateContext", () => ({
    useGameStateContext: () => ({ gameFormat: "sit-and-go", gameState: { gameOptions: { bigBlind: "50" } } })
}));

jest.mock("../../../context/GameSettingsContext", () => ({
    useStacksInBigBlinds: () => false
}));

jest.mock("../../../hooks/player/usePlayerActionDropBox", () => ({
    usePlayerActionDropBox: () => ({ action: "", amount: "", isVisible: false, isTextHiding: false, isAnimatingOut: false })
}));

jest.mock("../../../hooks/notifications/useSeatJoinNotification", () => ({
    useSeatJoinNotification: () => ({ seatNumber: 1, isVisible: false, isTextHiding: false, isAnimatingOut: false })
}));

describe("Badge finished places", () => {
    it("writes the place into the stack pill and drops the equity chip", () => {
        const { container } = render(
            <Badge count={2} value={0} tournamentPlace={2} tournamentPayout="3360000" playerEquity={0} />
        );
        const pill = container.querySelector(".badge-container");
        expect(pill).toHaveClass("badge-finished-second");
        expect(pill).toHaveAttribute("data-finished-tone", "second");
        expect(screen.getByTestId("finished-seat-place")).toHaveTextContent("2nd");
        expect(screen.queryByText("0")).toBeNull();
        expect(screen.queryByText("0.0%")).toBeNull();
        expect(container.querySelector(".tournament-place")).toBeNull();
        expect(container.querySelector(".tournament-payout")).toBeNull();
        expect(container.querySelector(".seat-banner-shell")).toHaveClass("seat-banner-suppressed");
    });

    it("colours 1st, 3rd and 4th with their place tones", () => {
        const { container, rerender } = render(<Badge count={6} value={0} tournamentPlace={1} tournamentPayout="7000000" />);
        expect(container.querySelector(".badge-container")).toHaveClass("badge-finished-first");
        expect(screen.getByTestId("finished-seat-place")).toHaveTextContent("1st");

        rerender(<Badge count={3} value={0} tournamentPlace={3} tournamentPayout="1680000" playerEquity={100} />);
        expect(container.querySelector(".badge-container")).toHaveClass("badge-finished-third");
        expect(screen.getByTestId("finished-seat-place")).toHaveTextContent("3rd");
        expect(screen.queryByText("100.0%")).toBeNull();

        rerender(<Badge count={4} value={0} tournamentPlace={4} tournamentPayout="0" playerEquity={0} />);
        expect(container.querySelector(".badge-container")).toHaveClass("badge-finished-other");
        expect(screen.getByTestId("finished-seat-place")).toHaveTextContent("4th");
        expect(screen.queryByText("0.0%")).toBeNull();
    });

    it("shows Won in the action banner on the finishing hand and keeps the win% hidden", () => {
        const { container } = render(
            <Badge count={3} value={0} tournamentPlace={3} tournamentPayout="1680000" payoutInActionBanner playerEquity={100} />
        );
        expect(screen.getByTestId("finished-seat-payout-banner")).toHaveTextContent("Won $1.68");
        expect(container.querySelector(".seat-banner-shell")).toHaveAttribute("data-banner-mode", "payout");
        expect(container.querySelector(".seat-banner-shell")).not.toHaveClass("seat-banner-suppressed");
        expect(screen.getByTestId("finished-seat-place")).toHaveTextContent("3rd");
        expect(container.querySelector(".badge-container")).toHaveClass("badge-finished-third");
        expect(screen.queryByText("100.0%")).toBeNull();
        expect(screen.queryByText("$0.00")).toBeNull();
    });

    it("shows no amount for a zero payout, including on the finishing hand", () => {
        const { container } = render(
            <Badge count={4} value={0} tournamentPlace={4} tournamentPayout="0" payoutInActionBanner playerEquity={0} />
        );
        expect(screen.queryByTestId("finished-seat-payout-banner")).toBeNull();
        expect(screen.queryByText("$0.00")).toBeNull();
        expect(screen.queryByText(/Won/)).toBeNull();
        expect(container.querySelector(".seat-banner-shell")).toHaveClass("seat-banner-suppressed");
        expect(screen.getByTestId("finished-seat-place")).toHaveTextContent("4th");
    });

    it("draws an empty seat as a hollow pill with only the seat number", () => {
        const { container } = render(<Badge count={9} value={35000} empty />);
        const pill = screen.getByTestId("empty-seat-pill");
        expect(pill).toHaveClass("badge-empty");
        expect(pill.querySelector(".badge-number")).toHaveTextContent("9");
        expect(pill.querySelector(".badge-number")).toHaveStyle({ backgroundColor: "#b14cff" });
        expect(screen.queryByText("Empty")).toBeNull();
        expect(pill.querySelector(".empty-seat-value-spacer")?.parentElement).toHaveAttribute("aria-hidden", "true");
        expect(screen.queryByText("35,000")).toBeNull();
        expect(screen.queryByTestId("finished-seat-place")).toBeNull();
        expect(container.querySelector(".seat-banner-shell")).toBeNull();
    });

    it("leaves a seat that is still playing on the stack amount and the win% chip", () => {
        const { container } = render(<Badge count={1} value={4200} playerEquity={0} />);
        expect(container.querySelector(".badge-finished")).toBeNull();
        expect(screen.getByText("4,200")).toBeInTheDocument();
        expect(screen.getByText("0.0%")).toBeInTheDocument();
        expect(screen.queryByTestId("finished-seat-place")).toBeNull();
        expect(container.querySelector(".seat-banner-shell")).not.toHaveClass("seat-banner-suppressed");
    });
});

describe("Badge action banner width", () => {
    it("keeps a long action label inside the stack pill", () => {
        const pinned: PinnedSeatAction[] = [
            { action: "", amount: "", isVisible: false, isTextHiding: false, isAnimatingOut: false },
            { action: "RAISE TO", amount: "$1250.00", isVisible: true, isTextHiding: false, isAnimatingOut: false }
        ];
        const { container } = render(
            <PreviewSeatActionsContext.Provider value={pinned}>
                <Badge count={2} value={500} />
            </PreviewSeatActionsContext.Provider>
        );
        const pill = container.querySelector(".badge-container") as HTMLElement;
        const shell = container.querySelector(".seat-banner-shell") as HTMLElement;
        expect(shell).toHaveAttribute("data-banner-mode", "action");
        expect(shell).toHaveTextContent("RAISE TO");
        expect(shell).toHaveTextContent("$1250.00");
        expect(container.querySelector(".seat-banner-marquee")).not.toBeNull();
        expect(pill.contains(shell)).toBe(true);
    });
});
