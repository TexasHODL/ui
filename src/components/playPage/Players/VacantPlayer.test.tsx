import { render, screen } from "@testing-library/react";
import { GameFormat } from "@block52/poker-vm-sdk";
import VacantPlayer from "./VacantPlayer";

const mockCtx = {
    gameFormat: GameFormat.CASH as GameFormat | undefined,
    gameState: { handNumber: 1, players: [], gameOptions: { minPlayers: 2 } } as { tournamentId?: string; handNumber: number; players: []; gameOptions: { minPlayers: number } }
};
const mockTable = { id: "0xcash" as string | undefined };

jest.mock("../../../context/GameStateContext", () => ({
    useGameStateContext: () => mockCtx
}));
jest.mock("../../../hooks/game/useTableId", () => ({
    useTableId: () => mockTable.id
}));
jest.mock("../../../hooks/game/useVacantSeatData", () => ({
    useVacantSeatData: () => ({ isUserAlreadyPlaying: false, canJoinSeat: () => true })
}));
jest.mock("../../../hooks/game/useGameOptions", () => ({
    useGameOptions: () => ({ gameOptions: { minBuyIn: "1000000", maxBuyIn: "1000000", bigBlind: "20000" }, isLoading: false, error: null })
}));
jest.mock("../../../hooks", () => ({
    useCosmosWallet: () => ({ balance: [] })
}));
jest.mock("../../../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: { name: "test", rpc: "", rest: "", grpc: "", ws: "" } })
}));
jest.mock("../../modals", () => ({
    USDCDepositModal: () => null
}));
jest.mock("../../../hooks/playerActions/joinTable", () => ({
    joinTable: jest.fn()
}));
jest.mock("../../../utils/colorConfig", () => ({
    colors: { accent: { success: "#55dda2" } }
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

const seat = () => render(<VacantPlayer index={4} left="10px" top="20px" />);

describe("VacantPlayer empty seat", () => {
    beforeEach(() => {
        mockCtx.gameFormat = GameFormat.CASH;
        mockCtx.gameState = { handNumber: 1, players: [], gameOptions: { minPlayers: 2 } };
        mockTable.id = "0xcash";
    });

    it("draws the original place card on a cash table", () => {
        seat();
        const card = screen.getByRole("button", { name: "Join seat 4" });
        expect(card).toHaveClass("vacant-seat");
        expect(card).not.toHaveClass("player-seat");
        expect(card.querySelector(".vacant-seat-plus")).toHaveTextContent("+");
        expect(card.querySelector(".vacant-seat-title")).toHaveTextContent("Seat 4");
        expect(card.querySelector(".vacant-seat-label")).toHaveTextContent("Click to Join");
        expect(screen.queryByTestId("empty-seat-pill")).toBeNull();
    });

    it("draws the original place card on a sit & go", () => {
        mockCtx.gameFormat = GameFormat.SIT_AND_GO;
        mockTable.id = "0xsitandgo";
        seat();
        const card = screen.getByRole("button", { name: "Join a random seat" });
        expect(card).toHaveClass("vacant-seat");
        expect(card).not.toHaveClass("player-seat");
        expect(card.querySelector(".vacant-seat-plus")).toHaveTextContent("+");
        expect(card.querySelector(".vacant-seat-title")).toHaveTextContent("Open Seat");
        expect(card.querySelector(".vacant-seat-label")).toHaveTextContent("Click to Join");
        expect(screen.queryByTestId("empty-seat-pill")).toBeNull();
    });

    it("draws the blank number pill on a single-table tournament", () => {
        mockCtx.gameFormat = GameFormat.TOURNAMENT;
        mockTable.id = "0xscheduled";
        seat();
        const pill = screen.getByRole("button", { name: "Seat 4, empty" });
        expect(pill).toHaveClass("player-seat");
        expect(screen.getByTestId("empty-seat-pill")).toHaveTextContent("4");
        expect(screen.queryByText("Empty")).toBeNull();
        expect(pill.querySelector(".vacant-seat-plus")).toBeNull();
        expect(pill.querySelector(".vacant-seat-title")).toBeNull();
    });

    it("draws the blank number pill on a multi-table tournament table", () => {
        mockCtx.gameFormat = GameFormat.TOURNAMENT;
        mockCtx.gameState = { tournamentId: "0xabc", handNumber: 1, players: [], gameOptions: { minPlayers: 2 } };
        mockTable.id = "0xabc-t1";
        seat();
        const pill = screen.getByRole("button", { name: "Seat 4, empty" });
        expect(pill).toHaveClass("player-seat");
        expect(screen.getByTestId("empty-seat-pill")).toHaveTextContent("4");
        expect(screen.queryByText("Empty")).toBeNull();
        expect(pill.querySelector(".vacant-seat-plus")).toBeNull();
        expect(pill.querySelector(".vacant-seat-title")).toBeNull();
    });
});
