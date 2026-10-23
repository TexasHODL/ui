import { render, screen, act } from "@testing-library/react";
import { ScheduledStartCountdown } from "./ScheduledStartCountdown";
import { formatCountdown } from "../../utils/scheduledSng";

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-10-23T10:00:00.000Z"));
});
afterEach(() => {
    jest.useRealTimers();
});

it("shows STARTS IN with the same countdown format as the waiting screen", () => {
    const start = Date.now() + 8 * 60 * 1000 + 7 * 1000;
    render(<ScheduledStartCountdown scheduledStartTime={start} minPlayers={2} maxPlayers={6} />);
    expect(screen.getByTestId("scheduled-start-panel")).toHaveTextContent("STARTS IN");
    expect(screen.getByText(formatCountdown(start, Date.now()))).toBeInTheDocument();
    expect(screen.getByText(/needs 2 of 6, or starts early when full/)).toBeInTheDocument();
});

it("ticks down once a second when no shared clock is passed", () => {
    const start = Date.now() + 65_000;
    render(<ScheduledStartCountdown scheduledStartTime={start} minPlayers={2} maxPlayers={9} />);
    expect(screen.getByText("1:05")).toBeInTheDocument();
    act(() => {
        jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText("1:04")).toBeInTheDocument();
});