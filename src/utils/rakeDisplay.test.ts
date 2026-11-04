import { GameFormat } from "@block52/poker-vm-sdk";
import { rakeDisplay } from "./rakeDisplay";

describe("rakeDisplay", () => {
    it("formats the Honey Pot config (5%, cap 100000 micro, threshold 0)", () => {
        expect(rakeDisplay({ rakePercentage: 5, rakeCap: "100000", rakeFreeThreshold: "0" }, GameFormat.CASH)).toEqual({
            short: "Rake 5%",
            withCap: "Rake 5% \u00b7 cap $0.10",
            title: "5% of each pot is taken as rake, capped at $0.10 per hand."
        });
    });

    it("mentions a rake-free threshold when set", () => {
        expect(rakeDisplay({ rakePercentage: 3, rakeCap: "1000000", rakeFreeThreshold: "500000" })?.title).toBe(
            "3% of each pot is taken as rake, capped at $1.00 per hand; no rake on pots under $0.50."
        );
    });

    it("drops the cap when there is none", () => {
        const label = rakeDisplay({ rakePercentage: 2.5, rakeCap: "0" });
        expect(label?.withCap).toBe("Rake 2.5%");
        expect(label?.title).toBe("2.5% of each pot is taken as rake, no cap.");
    });

    it.each([undefined, null, { rakePercentage: 0, rakeCap: "100000" }, { rakePercentage: undefined }, { rakePercentage: "abc" }])("hides no-rake config %p", rake => {
        expect(rakeDisplay(rake as never, GameFormat.CASH)).toBeNull();
    });

    it("hides rake on sit-and-go and tournament tables", () => {
        const rake = { rakePercentage: 5, rakeCap: "100000" };
        expect(rakeDisplay(rake, GameFormat.SIT_AND_GO)).toBeNull();
        expect(rakeDisplay(rake, GameFormat.TOURNAMENT)).toBeNull();
    });
});