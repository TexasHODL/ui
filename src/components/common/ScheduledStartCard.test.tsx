import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ScheduledStartCard } from "./ScheduledStartCard";

function Harness({ initial = false }: { initial?: boolean }) {
    const [checked, setChecked] = useState(initial);
    return (
        <ScheduledStartCard checked={checked} onChange={setChecked}>
            <input aria-label="Scheduled start time" type="datetime-local" />
            <label>
                Minimum players
                <select aria-label="Minimum players">
                    <option value="2">2</option>
                </select>
            </label>
        </ScheduledStartCard>
    );
}

describe("ScheduledStartCard", () => {
    it("shows the schedule as a switch and hides the time until it is on", () => {
        render(<Harness />);
        const toggle = screen.getByRole("switch", { name: /Scheduled start/ });
        expect(toggle).toHaveAttribute("aria-checked", "false");
        expect(screen.getByText("Start at a set time — with whoever has registered, or earlier when full")).toBeInTheDocument();
        expect(screen.queryByLabelText("Scheduled start time")).not.toBeInTheDocument();

        fireEvent.click(toggle);
        expect(toggle).toHaveAttribute("aria-checked", "true");
        expect(screen.getByLabelText("Scheduled start time")).toBeInTheDocument();
        expect(screen.getByLabelText("Minimum players")).toBeInTheDocument();

        fireEvent.click(toggle);
        expect(screen.queryByLabelText("Scheduled start time")).not.toBeInTheDocument();
    });

    it("keeps a tournament start open, with no switch to turn it off", () => {
        render(
            <ScheduledStartCard locked checked onChange={() => undefined} testId="tournament-start">
                <input aria-label="Scheduled start time" type="datetime-local" />
            </ScheduledStartCard>
        );
        expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        expect(screen.getByTestId("tournament-start")).toBeInTheDocument();
        expect(screen.getByLabelText("Scheduled start time")).toBeInTheDocument();
        expect(screen.getByText("A tournament starts at this time with whoever has registered, or earlier when full")).toBeInTheDocument();
    });
});
