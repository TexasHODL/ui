import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProvablyFairButton, ProvablyFairFrame } from "./ProvablyFairPanel";

jest.mock("../../../context/GameStateContext", () => ({
    useGameStateContext: () => ({
        gameState: { handNumber: 2, round: "preflop" },
        gameVariant: "holdem",
        gameName: "Friday game"
    })
}));

function renderShield(touch = false, enabled = true) {
    return render(
        <MemoryRouter initialEntries={["/table/0xtable"]}>
            <Routes>
                <Route
                    path="/table/:id"
                    element={
                        <ProvablyFairFrame enabled={enabled}>
                            <div className="roomTools">
                                <ProvablyFairButton touch={touch} />
                            </div>
                        </ProvablyFairFrame>
                    }
                />
            </Routes>
        </MemoryRouter>
    );
}

describe("Provably fair header shield", () => {
    it("is an icon button with an accessible name and tooltip", () => {
        renderShield();
        const button = screen.getByRole("button", { name: "Provably fair" });
        expect(button).toHaveAttribute("title", "Provably fair");
        expect(button).toHaveAttribute("aria-haspopup", "dialog");
        expect(button).toHaveAttribute("aria-expanded", "false");
        expect(button.textContent).toBe("");
        expect(button.querySelector("svg")).not.toBeNull();
        expect(screen.queryByText("Seed on chain")).not.toBeInTheDocument();
        expect(button.closest(".roomTools")).not.toBeNull();
    });

    it("uses a 44px phone hit target", () => {
        renderShield(true);
        expect(screen.getByRole("button", { name: "Provably fair" })).toHaveClass("shieldButtonTouch");
    });

    it("stays hidden in replay mode", () => {
        renderShield(false, false);
        expect(screen.queryByRole("button", { name: "Provably fair" })).not.toBeInTheDocument();
    });

    it("opens the same panel, and closes it from the shield, Escape, or a click outside", () => {
        renderShield();
        const button = screen.getByRole("button", { name: "Provably fair" });
        fireEvent.click(button);
        const panel = screen.getByTestId("provably-fair-panel");
        expect(panel).toHaveAttribute("aria-label", "Provably fair deal");
        expect(panel).toHaveTextContent("This hand #2");
        expect(panel).toHaveTextContent("opens when the hand ends");
        expect(panel).toHaveTextContent("Previous hand #1");
        expect(button).toHaveAttribute("aria-expanded", "true");

        fireEvent.click(within(panel).getByRole("button", { name: "How it works" }));
        expect(screen.getByTestId("provably-fair-how")).toHaveTextContent("poker/deck/v1");

        fireEvent.click(button);
        expect(screen.queryByTestId("provably-fair-panel")).not.toBeInTheDocument();

        fireEvent.click(button);
        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.queryByTestId("provably-fair-panel")).not.toBeInTheDocument();

        fireEvent.click(button);
        fireEvent.mouseDown(document.body);
        expect(screen.queryByTestId("provably-fair-panel")).not.toBeInTheDocument();
    });
});
