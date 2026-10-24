import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import BlindsPanel from "./BlindsPanel";
import type { BlindLevelInfo } from "../../hooks/game/useBlindLevel";

const mockUseBlindLevel = jest.fn<BlindLevelInfo, []>();

jest.mock("../../hooks/game/useBlindLevel", () => ({
    useBlindLevel: () => mockUseBlindLevel()
}));

const activeInfo = (overrides: Partial<BlindLevelInfo> = {}): BlindLevelInfo => ({
    level: 0,
    smallBlind: 50,
    bigBlind: 100,
    nextSmallBlind: 100,
    nextBigBlind: 200,
    currentBlindsFormatted: "50/100",
    nextBlindsFormatted: "100/200",
    secondsRemaining: 120,
    levelDurationSeconds: 300,
    isActive: true,
    hasTimer: true,
    ...overrides
});

describe("BlindsPanel", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
    });

    it("renders nothing for cash games (not SNG/tournament)", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo({ isActive: false }));
        const { container } = render(<BlindsPanel />);
        expect(container.firstChild).toBeNull();
    });

    it("shows the tab for SNG/tournament, closed by default", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo());
        render(<BlindsPanel />);
        expect(screen.getByTestId("blinds-panel-tab")).toBeInTheDocument();
        expect(screen.queryByTestId("blinds-panel")).not.toBeInTheDocument();
    });

    it("opens on tab click and closes on a second click (AC-2)", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo());
        render(<BlindsPanel />);
        const tab = screen.getByTestId("blinds-panel-tab");

        fireEvent.click(tab);
        expect(screen.getByTestId("blinds-panel")).toBeInTheDocument();

        fireEvent.click(tab);
        expect(screen.queryByTestId("blinds-panel")).not.toBeInTheDocument();
    });

    it("closes on Escape (AC-2)", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo());
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));
        expect(screen.getByTestId("blinds-panel")).toBeInTheDocument();

        fireEvent.keyDown(window, { key: "Escape" });
        expect(screen.queryByTestId("blinds-panel")).not.toBeInTheDocument();
    });

    it("closes on an outside click (AC-2)", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo());
        render(
            <div>
                <button data-testid="outside">felt</button>
                <BlindsPanel />
            </div>
        );
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));
        expect(screen.getByTestId("blinds-panel")).toBeInTheDocument();

        fireEvent.mouseDown(screen.getByTestId("outside"));
        expect(screen.queryByTestId("blinds-panel")).not.toBeInTheDocument();
    });

    it("highlights the current level and counts down to the next (AC-4)", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo());
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));

        expect(screen.getByTestId("blinds-row-current")).toHaveTextContent("1");
        expect(screen.getByTestId("blinds-row-next")).toHaveTextContent("2");
        // The header shows the current level big and what's next; the list repeats it.
        expect(screen.getByText("Level 1")).toBeInTheDocument();
        expect(screen.getByText("Next 100 / 200")).toBeInTheDocument();
        expect(screen.getAllByText("100 / 200").length).toBeGreaterThan(0);
        expect(screen.getByTestId("blinds-panel-countdown")).toHaveTextContent("2:00");
    });

    it("lists every level of this game's schedule with its minutes", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo({ secondsRemaining: 120, levelDurationSeconds: 300 }));
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));

        // Every level is 5 minutes: said once, no Min column.
        expect(screen.getByTestId("blinds-panel-level-length")).toHaveTextContent("5-minute levels");
        expect(screen.queryByText("Min")).not.toBeInTheDocument();
        expect(screen.getAllByTestId("blinds-row-upcoming")).toHaveLength(11);
        expect(screen.getByText("800 / 1,600")).toBeInTheDocument(); // level 5
        expect(screen.getByText("51,200 / 102,400")).toBeInTheDocument(); // level 11
        expect(screen.queryByTestId("blinds-panel-partial")).not.toBeInTheDocument();
    });

    it("keeps the levels already played in the list", () => {
        mockUseBlindLevel.mockReturnValue(
            activeInfo({ level: 2, smallBlind: 200, bigBlind: 400, nextSmallBlind: 400, nextBigBlind: 800 })
        );
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));

        expect(screen.getAllByTestId("blinds-row-past").map(el => el.textContent)).toEqual(["1", "2"]);
        expect(screen.getByText("50 / 100")).toBeInTheDocument();
        expect(screen.getByTestId("blinds-row-current")).toHaveTextContent("3");
    });

    it("adds an Ante column when the table's structure has antes", () => {
        mockUseBlindLevel.mockReturnValue(
            activeInfo({ blindStructure: { preset: "turbo" }, smallBlind: 25, bigBlind: 50, nextSmallBlind: 50, nextBigBlind: 100 })
        );
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));

        expect(screen.getByText("Ante")).toBeInTheDocument();
        expect(screen.getByText("400 / 800")).toBeInTheDocument();
        expect(screen.getByText("80")).toBeInTheDocument();
    });

    it("shows a Min column only when level lengths differ (custom tables)", () => {
        mockUseBlindLevel.mockReturnValue(
            activeInfo({
                blindStructure: {
                    progression: "table",
                    levels: [
                        { level: 0, smallBlind: "50", bigBlind: "100", ante: "0", durationMinutes: 4, isBreak: false },
                        { level: 1, smallBlind: "100", bigBlind: "200", ante: "0", durationMinutes: 6, isBreak: false }
                    ]
                }
            })
        );
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));

        expect(screen.getByText("Min")).toBeInTheDocument();
        expect(screen.queryByTestId("blinds-panel-level-length")).not.toBeInTheDocument();
    });

    it("says only current + next are known when the schedule can't be derived", () => {
        mockUseBlindLevel.mockReturnValue(activeInfo({ nextSmallBlind: 75, nextBigBlind: 150 }));
        render(<BlindsPanel />);
        fireEvent.click(screen.getByTestId("blinds-panel-tab"));

        expect(screen.getByTestId("blinds-panel-partial")).toHaveTextContent("Only the current and next levels are known");
        expect(screen.queryByTestId("blinds-panel-summary")).not.toBeInTheDocument();
    });
});
