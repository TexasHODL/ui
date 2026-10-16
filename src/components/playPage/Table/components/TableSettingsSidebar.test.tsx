
import { render, screen, fireEvent } from "@testing-library/react";
import { TableSettingsSidebar } from "./TableSettingsSidebar";

jest.mock("../../../../context/GameSettingsContext", () => ({
    useGameSettings: () => ({
        turnNotificationSound: true,
        playerActionSounds: true,
        autoMuck: false,
        sitInOptions: false,
        preSelectCheck: false,
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
        expect(screen.getByRole("switch", { name: "Pre-Select Check" })).toBeVisible();
        expect(screen.getByRole("switch", { name: "Left-hand mode" })).toHaveAttribute("aria-checked", "false");
        expect(screen.getByRole("switch", { name: "Turn Notification Sound" })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("switch", { name: "Auto Muck" })).toHaveAttribute("aria-checked", "false");
        fireEvent.change(screen.getByRole("combobox", { name: "Table appearance" }), { target: { value: "classic" } });
        expect(onStyle).toHaveBeenCalledWith("classic");
        fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
