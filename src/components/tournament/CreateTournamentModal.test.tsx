import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { CreateTournamentModal } from "./CreateTournamentModal";

jest.mock("../common", () => ({
    Modal: ({ isOpen, children }: { isOpen: boolean; children?: ReactNode }) => (isOpen ? <div>{children}</div> : null)
}));

test("the create dialog ceilings the creation cost to cents", () => {
    render(<CreateTournamentModal isOpen busy={false} error={null} onSubmit={() => undefined} onClose={() => undefined} />);
    // Default $5 buy-in, 1,500 chips, 25/50 blinds: the exact fee is 1,666,666 micro ($1.666666).
    expect(screen.getByTestId("tournament-create-fee")).toHaveTextContent("Creating costs you $1.67");
});
