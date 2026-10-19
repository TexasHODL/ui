import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { CreationDialog } from "./CreationDialog";

function renderDialog(onClose = jest.fn()) {
    render(
        <CreationDialog titleId="create-table-title" onClose={onClose}>
            <h2 id="create-table-title">Create a table.</h2>
            <select aria-label="Game type">
                <option>Sit & Go</option>
                <option>Cash Game</option>
            </select>
            <input aria-label="Table name" />
        </CreationDialog>
    );
    return onClose;
}

describe("CreationDialog", () => {
    it("closes from the backdrop and Escape, and stays open for presses inside", () => {
        const onClose = renderDialog();
        const overlay = document.querySelector(".creation-overlay") as HTMLElement;
        const gameType = screen.getByLabelText("Game type");
        const name = screen.getByLabelText("Table name");

        fireEvent.mouseDown(gameType);
        fireEvent.click(gameType);
        fireEvent.mouseDown(name);
        fireEvent.click(overlay);
        expect(onClose).not.toHaveBeenCalled();

        fireEvent.mouseDown(overlay);
        fireEvent.click(overlay);
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("does not treat Escape as a close while the dialog is hidden", () => {
        const onClose = jest.fn();
        render(
            <CreationDialog titleId="create-table-title" onClose={onClose} hidden>
                <h2 id="create-table-title">Create a table.</h2>
            </CreationDialog>
        );
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).not.toHaveBeenCalled();
    });
});

describe("create table modal layout", () => {
    const css = readFileSync("src/components/common/TableCreation.css", "utf8");

    it("uses a wide two-column grid on a large screen and one column below that", () => {
        expect(css).toContain(".creation-modal.creation-form");
        expect(css).toContain("width: min(100%, 920px)");
        expect(css).toContain("max-height: calc(100dvh - 40px)");
        const wide = css.slice(css.indexOf("@media (min-width: 800px)"));
        expect(wide).toContain("grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)");
        const base = css.slice(css.indexOf(".creation-form-grid"), css.indexOf("@media (min-width: 800px)"));
        expect(base).toContain("grid-template-columns: minmax(0, 1fr);");
    });

    it("orders the lobby popup like the inline form and labels the custom stack", () => {
        const lobby = readFileSync("src/pages/Dashboard.tsx", "utf8");
        const inline = readFileSync("src/pages/TableAdminPage.tsx", "utf8");
        const at = (source: string, text: string) => {
            const index = source.indexOf(text);
            expect(index).toBeGreaterThan(-1);
            return index;
        };
        const name = at(lobby, "Table Name");
        const gameType = at(lobby, ">Game Type<");
        const game = at(lobby, ">Game<");
        const limit = at(lobby, ">Limit<");
        const seats = at(lobby, "lobby-max-players");
        const buyIn = at(lobby, "Tournament Buy-In");
        const fee = at(lobby, "Entry Fee");
        const stack = at(lobby, "Starting Stack (chips)");
        const blinds = at(lobby, "Starting Blinds (chips)");
        const duration = at(lobby, "Blind Level Duration");
        expect(name).toBeLessThan(gameType);
        expect(gameType).toBeLessThan(game);
        expect(game).toBeLessThan(limit);
        expect(limit).toBeLessThan(seats);
        expect(seats).toBeLessThan(buyIn);
        expect(buyIn).toBeLessThan(fee);
        expect(fee).toBeLessThan(stack);
        expect(stack).toBeLessThan(blinds);
        expect(blinds).toBeLessThan(duration);
        expect(lobby).toContain("Custom stack (chips)");
        expect(inline).toContain("Custom stack (chips)");
        expect(lobby).not.toContain("aria-label=\"Custom starting stack\"");
    });
});
