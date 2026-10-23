import React from "react";
import { render, screen } from "@testing-library/react";
import { PotPill } from "./PotPill";
import { TotalPotDisplay } from "./TotalPotDisplay";
import { MainPotDisplay } from "./MainPotDisplay";

describe("PotPill", () => {
    it("shows the cash amount in dollars with a POT caption", () => {
        render(<PotPill amount={168_000_000n} label="Pot" isTournament={false} />);
        expect(screen.getByText("$168.00")).toBeInTheDocument();
        expect(screen.getByText("Pot")).toBeInTheDocument();
    });

    it("draws a chip stack for the amount", () => {
        render(<PotPill amount={300_000_000n} label="Pot" isTournament={false} />);
        expect(screen.getAllByRole("img").length).toBeGreaterThan(0);
    });

    it("shows tournament pots as whole chips, no dollar sign", () => {
        render(<PotPill amount={3748n} label="Pot" isTournament={true} />);
        expect(screen.getByText("3,748")).toBeInTheDocument();
    });
});

describe("TotalPotDisplay / MainPotDisplay — text mode (setting off, the default)", () => {
    it("shows the total pot as plain text, as before", () => {
        const { container } = render(
            <TotalPotDisplay amount="0.04" rawAmount={40_000n} isTournamentStyle={false} hasMainPot={false} asChips={false} />
        );
        expect(screen.getByText("Total Pot: $0.04")).toBeInTheDocument();
        expect(container.querySelector(".pot-display")).not.toBeNull();
        expect(screen.queryAllByRole("img")).toHaveLength(0);
    });

    it("shows the main pot as plain text", () => {
        render(<MainPotDisplay amount="600.00" rawAmount={600_000_000n} isTournamentStyle={false} asChips={false} />);
        expect(screen.getByText("Main Pot: $600.00")).toBeInTheDocument();
    });

    it("shows tournament pots without a dollar sign", () => {
        render(<TotalPotDisplay amount="3,748" rawAmount={3748n} isTournamentStyle={true} hasMainPot={false} asChips={false} />);
        expect(screen.getByText("Total Pot: 3,748")).toBeInTheDocument();
    });
});

describe("TotalPotDisplay / MainPotDisplay — chip mode (setting on)", () => {
    it("reads POT when it is the only pot", () => {
        const { container } = render(
            <TotalPotDisplay amount="0.04" rawAmount={40_000n} isTournamentStyle={false} hasMainPot={false} asChips={true} />
        );
        expect(screen.getByLabelText("Pot")).toBeInTheDocument();
        expect(container.querySelector(".pot-chips")).not.toBeNull();
        expect(screen.queryByText(/Total Pot:/)).toBeNull();
    });

    it("reads TOTAL POT when a separate main pot is shown", () => {
        render(<TotalPotDisplay amount="900.00" rawAmount={900_000_000n} isTournamentStyle={false} hasMainPot={true} asChips={true} />);
        expect(screen.getByLabelText("Total Pot")).toBeInTheDocument();
    });

    it("labels the main pot MAIN POT", () => {
        render(<MainPotDisplay amount="600.00" rawAmount={600_000_000n} isTournamentStyle={false} asChips={true} />);
        expect(screen.getByLabelText("Main Pot")).toBeInTheDocument();
        expect(screen.getByText("$600.00")).toBeInTheDocument();
    });
});
