import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
    vpip: 0,
    pfr: 0,
    aggression_factor: 0,
    wtsd: 0,
    won_at_showdown: 0,
    total_bets: 0,
    total_raises: 0,
    total_calls: 0,
    total_folds: 0,
    total_checks: 0,
    biggest_pot_won: 0,
    biggest_hand_profit: 0,
    longest_session_blocks: 0
};

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

jest.mock("../components/common/AnimatedBackground", () => ({ AnimatedBackground: () => null }));
jest.mock("../components/common", () => ({ Pagination: () => null }));
jest.mock("../components/players/MyHandsPanel", () => ({ MyHandsPanel: () => null }));
jest.mock("../components/CosmosWalletPage", () => ({ __esModule: true, default: () => null }));
jest.mock("./PlayerAwardsPage", () => ({ __esModule: true, default: () => null }));
jest.mock("../components/players/ProfileHeaderAvatar", () => ({
    ProfileHeaderAvatar: () => <span data-testid="player-avatar" />
}));
jest.mock("../hooks/player/usePlayerProfile", () => ({ usePlayerProfile: () => mockProfileState }));
jest.mock("../hooks/player/usePlayerSessions", () => ({
    useAllPlayerSessions: () => ({ sessions: [], loading: false, error: null, total: 0 })
}));
jest.mock("../hooks/player/usePlayerPrizeClaims", () => ({
    usePlayerPrizeClaims: () => ({ claims: [], loading: false, error: null })
}));
jest.mock("../hooks/player/usePlayerTournamentEntries", () => ({
    usePlayerTournamentEntries: () => ({ entries: [], loading: false, error: null })
}));
jest.mock("../hooks/wallet/useCosmosWallet", () => ({ useCosmosWallet: () => ({ address: null }) }));
jest.mock("../context/NetworkContext", () => ({
    useNetwork: () => ({ currentNetwork: { name: "Texas Hodl", rest: "https://node.texashodl.net", rpc: "rpc" } })
}));
jest.mock("../hooks/player/useMyHandHistory", () => ({
    useMyHandHistory: () => ({ hands: [], error: "", complete: true, loading: false })
}));
jest.mock("../hooks/player/useSessionGameMeta", () => ({ useSessionGameMeta: () => ({ byId: {}, loading: false }) }));
jest.mock("../hooks/player/useSessionEliminationBlocks", () => ({ useSessionEliminationBlocks: () => ({}) }));
jest.mock("../hooks/player/useHandContributions", () => ({
    useHandContributions: () => ({ byKey: {}, pending: false, unavailable: 0 }),
    usePlayingStyle: () => ({
        counts: { hands: 0, vpip: 0, pfr: 0, aggressive: 0, calls: 0, sawFlop: 0, showdown: 0, wonShowdown: 0 },
        pending: false,
        unavailable: 0,
        dealt: 480
    })
}));
jest.mock("../hooks/player/useAddressUsdcBalance", () => ({
    useAddressUsdcBalance: (address: string | undefined) => mockUseBalance(address)
}));

const VOLUME = ["Wallet Balance", "Net Profit", "Total Buy-In", "Total Cash-Out", "Hands Played", "Sessions", "Total Actions", "Network Fees Paid"];

function valueOf(label: string): string {
    return screen.getByText(label).nextElementSibling?.textContent ?? "";
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
        mockUseBalance.mockImplementation(() => mockWalletState);
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
        expect(valueOf("Hands Played")).toBe("480");
        expect(valueOf("Sessions")).toBe("83");
        expect(valueOf("Total Actions")).toBe("4,616");
        expect(valueOf("Network Fees Paid")).toBe("0.00");
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
});
