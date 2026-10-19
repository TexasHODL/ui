import { readFileSync } from "fs";

describe("scheduled start placement", () => {
    it("puts the lobby card on a full-width row after Max Players, only for Sit & Go", () => {
        const source = readFileSync("src/pages/Dashboard.tsx", "utf8");
        const gameType = source.indexOf("Game Type");
        const maxPlayers = source.indexOf("lobby-max-players");
        const card = source.indexOf("<ScheduledStartCard");
        expect(gameType).toBeGreaterThan(-1);
        expect(maxPlayers).toBeGreaterThan(gameType);
        expect(card).toBeGreaterThan(maxPlayers);
        expect(source.slice(card - 220, card)).toContain("isSitAndGoFormat(modalGameFormat)");
        expect(source.slice(card - 120, card)).toContain("creation-span");
    });

    it("puts the inline card after Max Players, only for Sit & Go", () => {
        const source = readFileSync("src/pages/TableAdminPage.tsx", "utf8");
        const gameType = source.indexOf(">Game Type<");
        const maxPlayers = source.indexOf(">Max Players<");
        const card = source.indexOf("<ScheduledStartCard");
        expect(gameType).toBeGreaterThan(-1);
        expect(maxPlayers).toBeGreaterThan(gameType);
        expect(card).toBeGreaterThan(maxPlayers);
        expect(source.slice(card - 160, card)).toContain("isSitAndGoFormat(gameFormat)");
    });
});
