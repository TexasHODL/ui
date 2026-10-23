
import { render, screen, fireEvent } from "@testing-library/react";
import { TableSettingsSidebar } from "./TableSettingsSidebar";
import { TABLE_STYLE_STORAGE_KEYS, resetTableStylesForTests } from "../../../../theme/tableStyles";
import Chip from "../../common/Chip";

jest.mock("../../../../context/GameSettingsContext", () => ({
    useGameSettings: () => ({
        turnNotificationSound: true,
        playerActionSounds: true,
        autoMuck: false,
        sitInOptions: false,
        preSelectCheck: true,
        leftHandMode: false,
        toggleTurnNotificationSound: jest.fn(),
        togglePlayerActionSounds: jest.fn(),
        toggleAutoMuck: jest.fn(),
        toggleSitInOptions: jest.fn(),
        togglePreSelectCheck: jest.fn(),
        toggleLeftHandMode: jest.fn()
    })
}));

describe("Table settings", () => {
    it("keeps hidden settings out of the keyboard and screen-reader flow", () => {
        render(<TableSettingsSidebar isOpen={false} />);
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    });

    it("provides named switches, appearance selection and a close control", () => {
        const onStyle = jest.fn();
        const onClose = jest.fn();
        render(<TableSettingsSidebar isOpen tableStyle="modern" onTableStyleChange={onStyle} onClose={onClose} />);
        expect(screen.getAllByRole("switch")).toHaveLength(6);
        expect(screen.getByRole("switch", { name: "Pre-Select Check/Fold" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Left-hand mode" })).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("switch", { name: "Turn Notification Sound" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Auto Muck" })).toHaveAttribute("aria-checked", "false");
        fireEvent.change(screen.getByRole("combobox", { name: "Table appearance" }), { target: { value: "classic" } });
        expect(onStyle).toHaveBeenCalledWith("classic");
        fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
        expect(onClose).toHaveBeenCalledTimes(1);
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
            expect(optionLabels("Dealer button")).toEqual(["Current", "Classic acrylic", "Brand ring", "Clean minimal", "Gold coin"]);
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
