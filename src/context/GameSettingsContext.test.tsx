
import { fireEvent, render, screen } from "@testing-library/react";
import { GameSettingsProvider, useGameSettings } from "./GameSettingsContext";

function Probe() {
    const { leftHandMode, toggleLeftHandMode } = useGameSettings();
    return <button onClick={toggleLeftHandMode}>{leftHandMode ? "left" : "right"}</button>;
}

describe("left-hand mode", () => {
    beforeEach(() => localStorage.clear());

    it("defaults to the right edge and persists the toggle", () => {
        const { unmount } = render(
            <GameSettingsProvider>
                <Probe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "right" })).toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "right" }));
        expect(localStorage.getItem("setting_lefthand")).toBe("true");
        unmount();

        render(
            <GameSettingsProvider>
                <Probe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "left" })).toBeInTheDocument();
    });
});
