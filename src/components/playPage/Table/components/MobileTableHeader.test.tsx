/**
 * MobileTableHeader drawer rows (ui#684).
 *
 * The phone drawer is now the only home for three controls that used to be
 * pinned over the felt: the spectate hint, the 6-o'clock view preference, and
 * the two sit-out intents. These assert they are present, wired, and gated —
 * the felt side is asserted by PlayerActionButtons' own tests.
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { NonPlayerActionType, type LegalActionDTO } from "@block52/poker-vm-sdk";
import { displayTableName } from "../../../../utils/generatedTableName";
import { MobileTableHeader } from "./MobileTableHeader";
import { SitOutIntentProvider } from "../../../../context/SitOutIntentContext";

const mockSubmit = jest.fn();
const mockToggleSeatAtBottom = jest.fn();
const mockToggleFocus = jest.fn();
const mockLeaveTable = jest.fn();

jest.mock("../../../../hooks/playerActions", () => ({ sitOut: jest.fn(), useAutoSitOutNextBB: jest.fn() }));
jest.mock("../../../../utils/cosmosAccountUtils", () => ({ getCosmosAddressSync: () => "b521abc" }));
jest.mock("../../../../context/ActionSubmitContext", () => ({
    useActionSubmit: () => ({ submit: mockSubmit, loadingAction: null, isBusy: false, lastError: null })
}));
const mockTableState = {
    gameState: { players: [] as unknown[], bigBlindPosition: 2, handNumber: 1, previousActions: [] as unknown[] },
    gameFormat: "cash" as string | undefined
};
jest.mock("../../../../context/GameStateContext", () => ({
    useGameStateContext: () => mockTableState
}));
jest.mock("../../../../context/GameSettingsContext", () => ({
    useGameSettings: () => ({ seatAtBottom: false, toggleSeatAtBottom: mockToggleSeatAtBottom })
}));
jest.mock("../../../../hooks/game/useBlindLevel", () => ({
    useBlindLevel: () => ({ isActive: false, level: undefined, msRemaining: 0 })
}));
jest.mock("../../../../hooks/game/useTableTopUp", () => ({
    useTableTopUp: () => ({ handleTopUp: jest.fn(), isTopUpLoading: false })
}));
// Modal pulls colorConfig, which reads import.meta.env — unavailable under Jest.
jest.mock("../../../common/Modal", () => ({ Modal: ({ children }: { children?: React.ReactNode }) => <div>{children}</div> }));
jest.mock("../../../NetworkSelector", () => ({ NetworkSelector: () => <div /> }));
jest.mock("../../../profile", () => ({ ProfileAvatarButton: () => <div /> }));
jest.mock("../../../modals", () => ({ TopUpModal: () => <div /> }));

const sitOutLegal: LegalActionDTO[] = [{ action: NonPlayerActionType.SIT_OUT, min: "0", max: "0", index: 1 } as LegalActionDTO];

function renderHeader(over: { seated?: boolean; legalActions?: LegalActionDTO[]; tableName?: string; openSidebar?: boolean; onHistory?: () => void } = {}) {
    const legalActions = over.legalActions ?? [];
    return render(
        <SitOutIntentProvider tableId="0xtable" network={{} as never} pendingSitOut={null} legalActions={legalActions}>
            <MobileTableHeader
                onToggleFocus={mockToggleFocus}
                tableId="0xtable"
                tableName={over.tableName}
                currentNetwork={{} as never}
                gameFormat={null}
                gameOptions={null}
                tableActivePlayers={[]}
                publicKey="b521abc"
                formattedAddress="b521...abc"
                isBalanceLoading={false}
                balanceFormatted="0.00"
                formattedValues={{ smallBlindFormatted: "$10", bigBlindFormatted: "$20", isTournamentStyle: false }}
                handNumber={1}
                nextToAct={-1}
                currentPlayerData={over.seated ? ({ seat: 1 } as never) : null}
                isCurrentUserSeated={!!over.seated}
                legalActions={legalActions}
                currentStack="0"
                minBuyIn="0"
                maxBuyIn="0"
                walletBalance="0"
                openSidebar={!!over.openSidebar}
                openSettings={false}
                tableStyle="modern"
                onCycleTableStyle={jest.fn()}
                handleLobbyClick={jest.fn()}
                handleCopyTableLink={jest.fn()}
                fetchAccountBalance={jest.fn()}
                copyToClipboard={jest.fn()}
                onCloseSideBar={over.onHistory ?? jest.fn()}
                onToggleSettings={jest.fn()}
                handleLeaveTableClick={mockLeaveTable}
                handleShareHand={jest.fn()}
            />
        </SitOutIntentProvider>
    );
}

const openMenu = () => fireEvent.click(screen.getByLabelText("Open menu"));

describe("MobileTableHeader drawer (ui#684)", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockTableState.gameFormat = "cash";
        mockTableState.gameState = { players: [], bigBlindPosition: 2, handNumber: 1, previousActions: [] };
    });
    it("keeps blinds in the chrome and the theme control in the top row", () => {
        renderHeader();
        expect(screen.queryByRole("button", { name: "Open hand history" })).not.toBeInTheDocument();
        const fallback = document.querySelector(".mobile-status-fallback");
        expect(fallback).not.toBeNull();
        expect(fallback).toHaveTextContent("Hand #1");
        expect(screen.getByRole("group", { name: "Color theme" }).closest(".mobile-header-row")).not.toBeNull();
        expect(screen.getByRole("group", { name: "Color theme" }).closest(".mobile-status-fallback")).toBeNull();
    });

    it("offers themes without opening the mobile drawer", () => {
        renderHeader();
        fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
        expect(document.documentElement).toHaveAttribute("data-theme", "light");
        fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));
        expect(document.documentElement).not.toHaveAttribute("data-theme");
        expect(screen.queryByText("Table menu")).not.toBeInTheDocument();
    });

    it("shows a custom name, or a generated name when none was set", () => {
        const { unmount } = renderHeader({ tableName: "friday-degens" });
        expect(screen.getByRole("button", { name: "Back to lobby from friday-degens" })).toBeInTheDocument();
        unmount();
        renderHeader();
        const generated = displayTableName(undefined, "0xtable");
        expect(screen.getByRole("button", { name: "Back to lobby from " + generated })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Back to lobby from Table xtable" })).not.toBeInTheDocument();
    });

    it("offers Leave table without opening the drawer and only opens confirmation", () => {
        renderHeader({ seated: true });
        fireEvent.click(screen.getByRole("button", { name: "Leave table" }));
        expect(mockLeaveTable).toHaveBeenCalledTimes(1);
        expect(screen.queryByText("Table menu")).not.toBeInTheDocument();
        expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("does not offer Leave table to a spectator", () => {
        renderHeader();
        expect(screen.queryByRole("button", { name: "Leave table" })).not.toBeInTheDocument();
    });

    it("offers table-only fullscreen from the Table menu without submitting a game action", () => {
        renderHeader();
        expect(screen.queryByRole("button", { name: "Full screen" })).not.toBeInTheDocument();
        openMenu();
        fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
        expect(mockToggleFocus).toHaveBeenCalledTimes(1);
        expect(mockSubmit).not.toHaveBeenCalled();
        expect(screen.queryByText("Table menu")).not.toBeInTheDocument();
    });

    it("splits table info, network, sharing and action log into Table settings", () => {
        const onHistory = jest.fn();
        renderHeader({ onHistory });
        fireEvent.click(screen.getByLabelText("Open table settings"));
        const settings = screen.getByTestId("table-settings-drawer");
        for (const label of ["Network", "b521...abc", "Copy Table Link", "Share via QR Code", "Share this hand", "Share on X", "Action log"]) {
            expect(settings).toHaveTextContent(label);
        }
        expect(screen.queryByText("Table menu")).not.toBeInTheDocument();
        fireEvent.click(screen.getByText("Action log"));
        expect(onHistory).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId("table-settings-drawer")).not.toBeInTheDocument();

        openMenu();
        const menu = screen.getByTestId("table-menu-drawer");
        expect(menu).toHaveTextContent("Settings");
        expect(menu).toHaveTextContent("Full screen");
        expect(menu).toHaveTextContent("Seat me at 6");
        for (const label of ["Network", "Copy Table Link", "Share via QR Code", "Share on X", "Action log"]) {
            expect(menu).not.toHaveTextContent(label);
        }
    });

    it("offers the 6 o'clock view preference, seated or not", () => {
        renderHeader();
        openMenu();
        const row = screen.getByRole("switch", { name: /Seat me at 6/ });
        fireEvent.click(row);
        expect(mockToggleSeatAtBottom).toHaveBeenCalledTimes(1);
    });

    it("shows the spectate hint while unseated", () => {
        mockTableState.gameState = { players: [], bigBlindPosition: 2, handNumber: 8, previousActions: [] };
        renderHeader({ seated: false });
        openMenu();
        expect(screen.getByText(/tap an open seat to join/)).toBeInTheDocument();
    });

    it("stops offering a seat once a sit-and-go has started", () => {
        mockTableState.gameFormat = "sit-and-go";
        mockTableState.gameState = { players: [], bigBlindPosition: 2, handNumber: 8, previousActions: [] };
        renderHeader({ seated: false });
        openMenu();
        expect(screen.getByText("You’re watching")).toBeInTheDocument();
        expect(screen.queryByText(/tap an open seat to join/)).not.toBeInTheDocument();
    });

    it("hides the spectate hint once seated", () => {
        renderHeader({ seated: true, legalActions: sitOutLegal });
        openMenu();
        expect(screen.queryByText(/tap an open seat to join/)).not.toBeInTheDocument();
    });

    describe("sit-out intents", () => {
        it("are absent when the engine does not allow sitting out", () => {
            renderHeader({ seated: true, legalActions: [] });
            openMenu();
            expect(screen.queryByRole("switch", { name: /Next hand/ })).not.toBeInTheDocument();
            expect(screen.queryByRole("switch", { name: /Next big blind/ })).not.toBeInTheDocument();
        });

        it("submit a sit-out for 'next hand'", () => {
            renderHeader({ seated: true, legalActions: sitOutLegal });
            openMenu();
            fireEvent.click(screen.getByRole("switch", { name: /Next hand/ }));
            expect(mockSubmit).toHaveBeenCalledWith(expect.objectContaining({ actionName: "sit-out" }));
        });

        it("queue 'next big blind' locally, with no transaction (#114)", () => {
            renderHeader({ seated: true, legalActions: sitOutLegal });
            openMenu();
            const row = screen.getByRole("switch", { name: /Next big blind/ });
            expect(row).toHaveAttribute("aria-checked", "false");
            fireEvent.click(row);
            expect(screen.getByRole("switch", { name: /Next big blind/ })).toHaveAttribute("aria-checked", "true");
            expect(mockSubmit).not.toHaveBeenCalled();
        });
    });
});
