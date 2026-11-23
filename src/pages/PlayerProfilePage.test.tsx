import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { PlayerProfile } from "../types/players";
import PlayerProfilePage from "./PlayerProfilePage";

const ADDRESS = "b521kjpfyeyg3watq2f978vhu48ju3xjwdp0wjgp5t";

const profile: PlayerProfile = {
    player_address: ADDRESS,
    total_hands: 69,
    total_actions: 4616,
    total_buy_ins: 62_900_000,
    total_cash_outs: 76_820_000,
    net_profit: 13_920_000,
    session_count: 83,
    avg_session_length: 0,
    vip_tier: "bronze",
    rakeback_pct: 0,
    vip_points: 0,
    total_rake_contributed: 0,
    current_month_rake: 0,
    vpip: 3960,
    pfr: 973,
    aggression_factor: 62,
    wtsd: 923,
    won_at_showdown: 4790,
    total_bets: 682,
    total_raises: 467,
    total_calls: 1832,
    total_folds: 0,
    total_checks: 0,
    biggest_pot_won: 0,
    biggest_hand_profit: 0,
    longest_session_blocks: 0
};

const mockRefetchProfile = jest.fn();
const mockRefetchSessions = jest.fn();
const mockRefetchClaims = jest.fn();
const mockRefetchTournaments = jest.fn();
const mockRefetchWallet = jest.fn();
const mockReloadHands = jest.fn();
const recoveredDefault = () => ({ hands: [] as never[], states: new Map(), recovering: false, searched: true });
let mockRecovered = recoveredDefault();

let mockProfileState: { profile: PlayerProfile | null; loading: boolean; error: string | null } = {
    profile,
    loading: false,
    error: null
};
let mockWalletState: { micro: string | null; loading: boolean; error: string | null } = {
    micro: "39892077",
    loading: false,
    error: null
};
const mockUseBalance = jest.fn();
let mockEntries: Array<{
    tournamentId: string;
    registerHeight: number;
    buyIn: number;
    gameId: string;
    status: string;
    results: Array<{ place: number; playerId: string; payout: string }>;
    refund?: number;
}> = [];
let mockRegistrations: Array<{ tournamentId: string; height: number; buyIn?: number; entryFee?: number }> = [];
let mockUnregistrations: Array<{ tournamentId: string; height: number; txhash: string; refund?: number }> = [];
let mockClaims: Array<{ gameId: string; amount: number; height: number; txhash: string }> = [];
let mockTournamentsLoading = false;

jest.mock("../components/common/AnimatedBackground", () => ({ AnimatedBackground: () => null }));
jest.mock("../components/common", () => ({ Pagination: () => null }));
jest.mock("../components/players/MyHandsPanel", () => ({ MyHandsPanel: () => null }));
jest.mock("../components/CosmosWalletPage", () => ({ __esModule: true, default: () => null }));
jest.mock("./PlayerAwardsPage", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/players/ProfileActivityPanel", () => ({ ProfileActivityPanel: () => <div>Recent activity panel</div> }));
jest.mock("../components/players/ProfileHeaderAvatar", () => ({
    ProfileHeaderAvatar: () => <span data-testid="player-avatar" />
}));
jest.mock("../hooks/player/usePlayerProfile", () => ({
    usePlayerProfile: () => ({ ...mockProfileState, refetch: mockRefetchProfile })
}));
jest.mock("../hooks/player/usePlayerSessions", () => ({
    useAllPlayerSessions: () => ({ sessions: [], loading: false, error: null, total: 0, refetch: mockRefetchSessions })
}));
jest.mock("../hooks/player/usePlayerPrizeClaims", () => ({
    usePlayerPrizeClaims: () => ({ claims: mockClaims, loading: false, error: null, refetch: mockRefetchClaims })
}));
jest.mock("../hooks/player/usePlayerTournamentEntries", () => ({
    usePlayerTournamentEntries: () => ({
        entries: mockEntries,
        registrations: mockRegistrations,
        unregistrations: mockUnregistrations,
        loading: mockTournamentsLoading,
        error: null,
        refetch: mockRefetchTournaments
    })
}));
jest.mock("../hooks/wallet/useCosmosWallet", () => ({ useCosmosWallet: () => ({ address: null }) }));
jest.mock("../context/NetworkContext", () => ({
    NETWORK_PRESETS: [],
    useNetwork: () => ({ currentNetwork: { name: "Texas Hodl", rest: "https://node.texashodl.net", rpc: "rpc" } })
}));
jest.mock("../context/CosmosApiContext", () => ({
    useCosmosApi: () => ({ getAllTransactionsMatching: async () => ({ tx_responses: [] }) })
}));
jest.mock("../hooks/player/useRecoveredHands", () => ({
    useRecoveredHands: () => mockRecovered
}));
jest.mock("../hooks/player/useMyHandHistory", () => ({
    useMyHandHistory: () => ({ hands: [], error: "", complete: true, loading: false, reload: mockReloadHands })
}));
jest.mock("../hooks/player/useSessionGameMeta", () => ({ useSessionGameMeta: () => ({ byId: {}, loading: false }) }));
jest.mock("../hooks/player/useSessionEliminationBlocks", () => ({ useSessionEliminationBlocks: () => ({}) }));
jest.mock("../hooks/player/useHandContributions", () => ({
    useHandContributions: () => ({ byKey: {}, pending: false, unavailable: 0 })
}));
jest.mock("../hooks/player/useAddressUsdcBalance", () => ({
    useAddressUsdcBalance: (address: string | undefined) => mockUseBalance(address)
}));

const VOLUME = ["Wallet Balance", "Net Profit", "Total Buy-In", "Total Cash-Out", "Hands Played", "Sessions", "Total Actions", "Network Fees Paid"];

function valueOf(label: string): string {
    return screen.getByText(label).nextElementSibling?.textContent ?? "";
}

function styleValue(label: string): string {
    return screen.getByText(label).parentElement?.nextElementSibling?.textContent ?? "";
}

function renderPage(path = `/players/${ADDRESS}`) {
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/players/:address" element={<PlayerProfilePage />} />
            </Routes>
        </MemoryRouter>
    );
}

describe("PlayerProfilePage volume cards", () => {
    const writeText = jest.fn();

    beforeEach(() => {
        mockProfileState = { profile, loading: false, error: null };
        mockWalletState = { micro: "39892077", loading: false, error: null };
        mockUseBalance.mockReset();
        mockUseBalance.mockImplementation(() => ({ ...mockWalletState, refetch: mockRefetchWallet }));
        mockRefetchProfile.mockReset();
        mockRefetchSessions.mockReset();
        mockRefetchClaims.mockReset();
        mockRefetchTournaments.mockReset();
        mockRefetchWallet.mockReset();
        mockReloadHands.mockReset();
        mockRecovered = recoveredDefault();
        mockEntries = [];
        mockRegistrations = [];
        mockUnregistrations = [];
        mockClaims = [];
        mockTournamentsLoading = false;
        writeText.mockReset();
        writeText.mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    });

    it("leads with wallet balance and puts hands played first on the second row", () => {
        renderPage();
        const labels = VOLUME.map(label => screen.getByText(label));
        for (let i = 1; i < labels.length; i += 1) {
            expect(labels[i - 1].compareDocumentPosition(labels[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        }
        expect(valueOf("Wallet Balance")).toBe("39.90");
        expect(valueOf("Net Profit")).toBe("13.92");
        expect(valueOf("Total Buy-In")).toBe("62.90");
        expect(valueOf("Total Cash-Out")).toBe("76.82");
        expect(valueOf("Hands Played")).toBe("69");
        expect(valueOf("Sessions")).toBe("83");
        expect(valueOf("Total Actions")).toBe("4,616");
        expect(valueOf("Network Fees Paid")).toBe("0.00");
        expect(styleValue("VPIP")).toBe("39.60%");
        expect(styleValue("PFR")).toBe("9.73%");
        expect(styleValue("Aggression")).toBe("0.62");
        expect(styleValue("WTSD")).toBe("9.23%");
        expect(styleValue("W$SD")).toBe("47.90%");
        expect(mockUseBalance).toHaveBeenCalledWith(ADDRESS);
    });

    it("keeps the other cards up while the balance is loading or the node errors", () => {
        mockWalletState = { micro: null, loading: true, error: null };
        const view = renderPage();
        expect(valueOf("Wallet Balance")).toBe("…");
        expect(valueOf("Total Buy-In")).toBe("62.90");

        mockWalletState = { micro: null, loading: false, error: "node down" };
        view.rerender(
            <MemoryRouter initialEntries={[`/players/${ADDRESS}`]}>
                <Routes>
                    <Route path="/players/:address" element={<PlayerProfilePage />} />
                </Routes>
            </MemoryRouter>
        );
        expect(valueOf("Wallet Balance")).toBe("—");
        expect(valueOf("Sessions")).toBe("83");
    });

    it("puts the avatar and address in the heading and copies the full address", async () => {
        const { container } = renderPage();
        const identity = screen.getByRole("group", { name: "Player" });
        expect(identity.closest(".page-heading-action")).not.toBeNull();
        expect(identity.closest(".containerCard")).toBeNull();
        expect(identity).toHaveTextContent(ADDRESS);
        expect(screen.getByTestId("player-avatar")).toBeInTheDocument();
        expect(container.querySelectorAll(".containerCard")).not.toHaveLength(0);

        fireEvent.click(screen.getByRole("button", { name: "Copy" }));
        await waitFor(() => expect(writeText).toHaveBeenCalledWith(ADDRESS));
    });

    it("keeps the heading identity visible while the profile is still loading", () => {
        mockProfileState = { profile: null, loading: true, error: null };
        renderPage();
        expect(screen.getByRole("group", { name: "Player" })).toHaveTextContent(ADDRESS);
        expect(screen.getByText("Loading player...")).toBeInTheDocument();
        expect(screen.queryByText("Wallet Balance")).not.toBeInTheDocument();
    });

    it("opens the Recent activity tab without the stats cards", () => {
        renderPage(`/players/${ADDRESS}?tab=activity`);
        expect(screen.getByText("Recent activity panel")).toBeInTheDocument();
        expect(screen.queryByText("Wallet Balance")).not.toBeInTheDocument();
        expect(screen.queryByText("Loading player...")).not.toBeInTheDocument();
    });

    it("keeps volume cards on the indexer figures when chain MTT entries and prize claims are present", () => {
        const mtt = "0x8d34bcce49c988106bba58a5052c3ecf9a6532f142e19dcfba4230ea3ff8a872";
        mockEntries = [
            {
                tournamentId: mtt,
                registerHeight: 1,
                buyIn: 2_200_000,
                gameId: `${mtt}-t1`,
                status: "finished",
                results: [{ place: 1, playerId: ADDRESS, payout: "6400000" }]
            }
        ];
        mockRegistrations = [{ tournamentId: mtt, height: 1, buyIn: 2_000_000, entryFee: 200_000 }];
        mockUnregistrations = [];
        mockClaims = [{ gameId: `${mtt}-t1`, amount: 6_400_000, height: 10, txhash: "CLAIM" }];
        renderPage();
        const volume = (label: string) => screen.getAllByText(label)[0].nextElementSibling?.textContent ?? "";
        expect(volume("Total Buy-In")).toBe("62.90");
        expect(volume("Total Cash-Out")).toBe("76.82");
        expect(volume("Net Profit")).toBe("13.92");
        expect(volume("Hands Played")).toBe("69");
    });

    it("refreshes stats silently when the tab becomes visible and does not reload hand history", () => {
        renderPage();
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" });
        act(() => {
            document.dispatchEvent(new Event("visibilitychange"));
        });
        expect(mockRefetchProfile).toHaveBeenCalledWith({ silent: true });
        expect(mockRefetchSessions).toHaveBeenCalledWith({ silent: true });
        expect(mockRefetchClaims).toHaveBeenCalledWith({ silent: true });
        expect(mockRefetchTournaments).toHaveBeenCalledWith({ silent: true });
        expect(mockRefetchWallet).toHaveBeenCalledWith({ silent: true });
        expect(mockReloadHands).not.toHaveBeenCalled();
    });

    it("shows indexer Playing Style immediately while recovered MTT hands are still loading", () => {
        mockRecovered = { hands: [], states: new Map(), recovering: true, searched: false };
        renderPage();
        expect(valueOf("Hands Played")).toBe("69");
        expect(valueOf("Sessions")).toBe("83");
        expect(styleValue("VPIP")).toBe("39.60%");
        expect(styleValue("PFR")).toBe("9.73%");
        expect(styleValue("Aggression")).toBe("0.62");
        expect(styleValue("WTSD")).toBe("9.23%");
        expect(styleValue("W$SD")).toBe("47.90%");
    });
});
