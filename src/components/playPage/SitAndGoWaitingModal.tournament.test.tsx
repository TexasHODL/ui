import { render, screen, waitFor } from "@testing-library/react";
import SitAndGoWaitingModal from "./SitAndGoWaitingModal";
import { startTournament } from "../../hooks/playerActions/startTournament";

const mockTable = {
    gameOptions: {
        scheduledStartTime: Date.now() + 5 * 60 * 1000,
        minPlayers: 2,
        maxPlayers: 6,
        startingStack: "1500",
        waitForStartTime: true
    },
    emptySeatIndexes: [] as number[],
    playerCount: 6
};

jest.mock("../../hooks/game/useGameOptions", () => ({
    useGameOptions: () => ({ gameOptions: mockTable.gameOptions })
}));
jest.mock("../../hooks/game/useVacantSeatData", () => ({
    useVacantSeatData: () => ({ emptySeatIndexes: mockTable.emptySeatIndexes })
}));
jest.mock("../../context/GameStateContext", () => ({
    useGameStateContext: () => ({
        gameState: { players: Array.from({ length: mockTable.playerCount }, (_, seat) => ({ seat })) }
    })
}));
jest.mock("../../context/NetworkContext", () => ({ useNetwork: () => ({ currentNetwork: { name: "fixture" } }) }));
jest.mock("../../hooks/playerActions/usePlayerLegalActions", () => ({ usePlayerLegalActions: () => ({ legalActions: [] }) }));
jest.mock("../../hooks/playerActions/startTournament", () => ({ startTournament: jest.fn(() => Promise.resolve()) }));
jest.mock("../../utils/gameFormatUtils", () => ({ getGameTypeMnemonic: () => "6-Max" }));
jest.mock("../../utils/numberUtils", () => ({ formatSitAndGoStackString: (value: string) => value }));

const start = startTournament as jest.Mock;

beforeEach(() => {
    start.mockClear();
    mockTable.gameOptions = {
        scheduledStartTime: Date.now() + 5 * 60 * 1000,
        minPlayers: 2,
        maxPlayers: 6,
        startingStack: "1500",
        waitForStartTime: true
    };
    mockTable.emptySeatIndexes = [];
    mockTable.playerCount = 6;
});

it("keeps a full table that holds for its start time on the waiting modal", () => {
    render(<SitAndGoWaitingModal tableId="fixture" />);
    expect(screen.getByRole("heading", { name: "Table Full" })).toBeInTheDocument();
    expect(screen.getByText("Every seat is taken.")).toBeInTheDocument();
    expect(screen.getByText("Minimum reached, waiting for the start time")).toBeInTheDocument();
    expect(screen.getByText("You are registered: 6 of 6 seats taken")).toBeInTheDocument();
    expect(screen.getByText("Starts at the start time with at least the minimum")).toBeInTheDocument();
    expect(screen.getByTestId("scheduled-start-panel")).not.toHaveTextContent("starts early");
    expect(start).not.toHaveBeenCalled();
});

it("sends START by itself once the start time has passed with the minimum registered", async () => {
    mockTable.gameOptions = {
        ...mockTable.gameOptions,
        scheduledStartTime: Date.now() - 5_000
    };
    mockTable.emptySeatIndexes = [3, 4, 5, 6];
    mockTable.playerCount = 2;
    render(<SitAndGoWaitingModal tableId="fixture" />);
    expect(screen.getByRole("heading", { name: "Starting" })).toBeInTheDocument();
    expect(screen.getByText("The start time has arrived.")).toBeInTheDocument();
    expect(screen.getByText("Minimum reached, ready to start")).toBeInTheDocument();
    await waitFor(() => expect(start).toHaveBeenCalledWith("fixture", { name: "fixture" }));
});
