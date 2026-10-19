import { fireEvent, render, screen } from "@testing-library/react";
import SitAndGoWaitingModal from "./SitAndGoWaitingModal";

const mockLeave = jest.fn().mockResolvedValue(undefined);

jest.mock("../../hooks/game/useGameOptions", () => ({
    useGameOptions: () => ({
        gameOptions: {
            scheduledStartTime: Date.now() - 20 * 60 * 1000,
            minPlayers: 4,
            maxPlayers: 9,
            startingStack: "1500"
        }
    })
}));
jest.mock("../../hooks/game/useVacantSeatData", () => ({
    useVacantSeatData: () => ({ emptySeatIndexes: [2, 3, 4, 5, 6, 7, 8, 9] })
}));
jest.mock("../../context/GameStateContext", () => ({
    useGameStateContext: () => ({ gameState: { players: [{ seat: 1 }] } })
}));
jest.mock("../../context/NetworkContext", () => ({ useNetwork: () => ({ currentNetwork: { name: "fixture" } }) }));
jest.mock("../../hooks/playerActions/usePlayerLegalActions", () => ({ usePlayerLegalActions: () => ({ legalActions: [] }) }));
jest.mock("../../hooks/playerActions/startTournament", () => ({ startTournament: jest.fn() }));
jest.mock("../../utils/gameFormatUtils", () => ({ getGameTypeMnemonic: () => "9-Max" }));
jest.mock("../../utils/numberUtils", () => ({ formatSitAndGoStackString: (value: string) => value }));

it("lets a seated player leave a cancelled tournament for the buy-in", async () => {
    render(<SitAndGoWaitingModal tableId="fixture" onLeaveConfirm={mockLeave} playerStack="1500" />);
    expect(screen.getByRole("heading", { name: "Tournament Cancelled" })).toBeInTheDocument();
    expect(screen.getByText(/Leave to get your buy-in back/)).toBeInTheDocument();
    expect(screen.queryByText(/Waiting for/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Starts when the table is full/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave Game" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Leave" }));
    expect(mockLeave).toHaveBeenCalledTimes(1);
});
