import { render, screen, fireEvent } from "@testing-library/react";
import { TableSettingsSidebar } from "./TableSettingsSidebar";
import { TABLE_STYLE_STORAGE_KEYS, resetTableStylesForTests } from "../../../../theme/tableStyles";
import Chip from "../../common/Chip";
import { getViewportMode } from "../../../../config/stageGeometry";

jest.mock("../../../../context/GameSettingsContext", () => ({
    useGameSettings: () => ({
        turnNotificationSound: true,
        playerActionSounds: true,
        autoMuck: false,
        sitInOptions: false,
        preSelectCheck: true,
        leftHandMode: false,
        winCelebration: true,
        potAsChips: true,
        toggleTurnNotificationSound: jest.fn(),
        togglePlayerActionSounds: jest.fn(),
        toggleAutoMuck: jest.fn(),
        toggleSitInOptions: jest.fn(),
        togglePreSelectCheck: jest.fn(),
        toggleLeftHandMode: jest.fn(),
        toggleWinCelebration: jest.fn(),
        togglePotAsChips: jest.fn()
    })
}));

const mockBlindLevel = { isActive: true };
jest.mock("../../../../hooks/game/useBlindLevel", () => ({ useBlindLevel: () => mockBlindLevel }));

jest.mock("../../../../config/stageGeometry", () => ({
    getViewportMode: jest.fn(() => "desktop")
}));
describe("Table settings", () => {
    beforeEach(() => {
        (getViewportMode as jest.Mock).mockReturnValue("desktop");
    });

    it("keeps hidden settings out of the keyboard and screen-reader flow", () => {
        render(<TableSettingsSidebar isOpen={false} />);
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });

    it("provides named switches, appearance selection and a close control", () => {
        const onStyle = jest.fn();
        const onClose = jest.fn();
        render(<TableSettingsSidebar isOpen tableStyle="modern" onTableStyleChange={onStyle} onClose={onClose} />);
        expect(screen.queryByRole("switch", { name: "Left-hand mode" })).not.toBeInTheDocument();
        expect(screen.getByRole("switch", { name: "Pre-Select Check/Fold" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Turn Notification Sound" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Auto Muck" })).toHaveAttribute("aria-checked", "false");
        fireEvent.change(screen.getByRole("combobox", { name: "Table appearance" }), { target: { value: "classic" } });
        expect(onStyle).toHaveBeenCalledWith("classic");
        fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });


    it("lists Left-hand mode only in mobile landscape", () => {
        (getViewportMode as jest.Mock).mockReturnValue("mobile-landscape");
        const { unmount } = render(<TableSettingsSidebar isOpen />);
        expect(screen.getByRole("switch", { name: "Left-hand mode" })).toBeInTheDocument();
        unmount();
        (getViewportMode as jest.Mock).mockReturnValue("mobile-portrait");
        render(<TableSettingsSidebar isOpen />);
        expect(screen.queryByRole("switch", { name: "Left-hand mode" })).not.toBeInTheDocument();
    });
    describe("cards, chips and dealer button styles", () => {
        beforeEach(() => {
            localStorage.clear();
            resetTableStylesForTests();
        });

        const optionLabels = (name: string) =>
            Array.from((screen.getByRole("combobox", { name }) as HTMLSelectElement).options).map(option => option.textContent);

        it("shows three dropdowns with the offered names and the defaults selected", () => {
            render(<TableSettingsSidebar isOpen />);
            expect(optionLabels("Cards")).toEqual([
                "Block52 Classic", "Minimal Modern", "Brand Night", "HODL Watermark", "Bright Plum", "Spectrum Pastel",
                "Classic Courts", "HODL Courts", "Web3 Holo", "Tech Grid"
            ]);
            expect(optionLabels("Chips")).toEqual(["Current", "Classic casino", "Flat brand", "Crypto coin", "Layered 3D", "Marble"]);
            expect(optionLabels("Dealer button")).toEqual(["Current", "Classic acrylic", "Brand ring", "Clean minimal", "Gold coin", "Marble"]);
            expect(screen.getByRole("combobox", { name: "Cards" })).toHaveValue("block52");
            expect(screen.getByRole("combobox", { name: "Chips" })).toHaveValue("C");
            expect(screen.getByRole("combobox", { name: "Dealer button" })).toHaveValue("C");
        });

        it("saves a choice and applies it live to chips and the dealer button already on the table", () => {
            render(
                <>
                    <TableSettingsSidebar isOpen />
                    <Chip amount="250000" />
                </>
            );
            const chipImages = () => screen.getAllByRole("img").filter(img => img.getAttribute("alt")?.endsWith("chip"));
            expect(chipImages()[0].getAttribute("src")).toMatch(/^\/assets\/chipstyles\/C\//);

            fireEvent.change(screen.getByRole("combobox", { name: "Chips" }), { target: { value: "current" } });
            expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.chips)).toBe("current");
            expect(chipImages()[0].getAttribute("src")).toMatch(/cdn\.jsdelivr\.net\/gh\/block52\/cards@main\/chips\//);

            fireEvent.change(screen.getByRole("combobox", { name: "Cards" }), { target: { value: "M" } });
            expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.deck)).toBe("M");
            fireEvent.change(screen.getByRole("combobox", { name: "Dealer button" }), { target: { value: "D" } });
            expect(localStorage.getItem(TABLE_STYLE_STORAGE_KEYS.dealer)).toBe("D");
            expect(screen.getByRole("combobox", { name: "Dealer button" })).toHaveValue("D");
        });
    });
});

describe("PC Settings: Full screen and Blinds", () => {
    beforeEach(() => {
        (getViewportMode as jest.Mock).mockReturnValue("desktop");
        mockBlindLevel.isActive = true;
    });

    it("shows a Full screen switch that reflects and toggles the table-only view", () => {
        const onToggleFullScreen = jest.fn();
        const { rerender } = render(<TableSettingsSidebar isOpen fullScreen={false} onToggleFullScreen={onToggleFullScreen} />);
        const sw = screen.getByRole("switch", { name: "Full screen" });
        expect(sw).toHaveAttribute("aria-checked", "false");
        fireEvent.click(sw);
        expect(onToggleFullScreen).toHaveBeenCalledTimes(1);
        rerender(<TableSettingsSidebar isOpen fullScreen onToggleFullScreen={onToggleFullScreen} />);
        expect(screen.getByRole("switch", { name: "Full screen" })).toHaveAttribute("aria-checked", "true");
    });

    it("omits Full screen and Blinds when not wired (mobile)", () => {
        render(<TableSettingsSidebar isOpen />);
        expect(screen.queryByRole("switch", { name: "Full screen" })).not.toBeInTheDocument();
        expect(screen.queryByTestId("settings-open-blinds")).not.toBeInTheDocument();
    });

    it("opens the blinds panel from Settings on tables with a blind structure", () => {
        const onOpenBlinds = jest.fn();
        render(<TableSettingsSidebar isOpen onOpenBlinds={onOpenBlinds} />);
        fireEvent.click(screen.getByTestId("settings-open-blinds"));
        expect(onOpenBlinds).toHaveBeenCalledTimes(1);
    });

    it("hides Blinds on cash tables (no blind structure)", () => {
        mockBlindLevel.isActive = false;
        render(<TableSettingsSidebar isOpen onOpenBlinds={jest.fn()} />);
        expect(screen.queryByTestId("settings-open-blinds")).not.toBeInTheDocument();
    });
});

test("leaves the theme toggle to the header banner", () => {
    render(<TableSettingsSidebar isOpen />);
    expect(screen.queryByRole("button", { name: "Light theme" })).not.toBeInTheDocument();
});
