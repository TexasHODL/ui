
import { fireEvent, render, screen } from "@testing-library/react";
import { GameSettingsProvider, useGameSettings } from "./GameSettingsContext";

function Probe() {
    const { leftHandMode, toggleLeftHandMode } = useGameSettings();
    return <button onClick={toggleLeftHandMode}>{leftHandMode ? "left" : "right"}</button>;
}

function CheckFoldProbe() {
    const { preSelectCheck, togglePreSelectCheck } = useGameSettings();
    return (
        <button onClick={togglePreSelectCheck} aria-pressed={preSelectCheck}>
            {preSelectCheck ? "on" : "off"}
        </button>
    );
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

describe("pre-select check/fold", () => {
    beforeEach(() => localStorage.clear());

    it("is on when nothing is saved", () => {
        render(
            <GameSettingsProvider>
                <CheckFoldProbe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "on" })).toHaveAttribute("aria-pressed", "true");
        expect(localStorage.getItem("setting_preselectcheck")).toBeNull();
    });

    it("stays off when the player has saved false", () => {
        localStorage.setItem("setting_preselectcheck", "false");
        render(
            <GameSettingsProvider>
                <CheckFoldProbe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "off" })).toHaveAttribute("aria-pressed", "false");
    });

    it("keeps an explicit off across a reload", () => {
        const { unmount } = render(
            <GameSettingsProvider>
                <CheckFoldProbe />
            </GameSettingsProvider>
        );
        fireEvent.click(screen.getByRole("button", { name: "on" }));
        expect(localStorage.getItem("setting_preselectcheck")).toBe("false");
        unmount();

        render(
            <GameSettingsProvider>
                <CheckFoldProbe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "off" })).toBeInTheDocument();
    });
});

function PotAsChipsProbe() {
    const { potAsChips, togglePotAsChips } = useGameSettings();
    return (
        <button onClick={togglePotAsChips} aria-pressed={potAsChips}>
            {potAsChips ? "chips" : "text"}
        </button>
    );
}

describe("pot as chips (ui#772)", () => {
    beforeEach(() => localStorage.clear());

    it("is off by default, so the pot stays as plain text", () => {
        render(
            <GameSettingsProvider>
                <PotAsChipsProbe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "text" })).toHaveAttribute("aria-pressed", "false");
    });

    it("toggles on and back off, persisting each change", () => {
        render(
            <GameSettingsProvider>
                <PotAsChipsProbe />
            </GameSettingsProvider>
        );
        fireEvent.click(screen.getByRole("button", { name: "text" }));
        expect(localStorage.getItem("setting_potaschips")).toBe("true");
        expect(screen.getByRole("button", { name: "chips" })).toHaveAttribute("aria-pressed", "true");
        fireEvent.click(screen.getByRole("button", { name: "chips" }));
        expect(localStorage.getItem("setting_potaschips")).toBe("false");
    });

    it("remembers the choice across a reload", () => {
        localStorage.setItem("setting_potaschips", "true");
        render(
            <GameSettingsProvider>
                <PotAsChipsProbe />
            </GameSettingsProvider>
        );
        expect(screen.getByRole("button", { name: "chips" })).toBeInTheDocument();
    });
});

