import { act, createRef, type RefObject } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { TournamentCreateFields, type TournamentCreateFieldsHandle } from "./TournamentCreateFields";
import type { CreateTournamentParams } from "../../utils/tournamentTx";

const submit = (ref: RefObject<TournamentCreateFieldsHandle | null>): CreateTournamentParams | undefined => {
    const box: { params?: CreateTournamentParams } = {};
    act(() => {
        box.params = ref.current?.submit();
    });
    return box.params;
};

const control = "w-full";
const label = "block";

test("default multi-table fields submit a create payload", () => {
    const ref = createRef<TournamentCreateFieldsHandle>();
    render(<TournamentCreateFields ref={ref} controlClassName={control} labelClassName={label} layout="stack" />);
    const params = submit(ref);
    expect(params?.buyIn).toBe(5_000_000n);
    expect(params?.entryFee).toBe(0n);
    expect(params?.seatsPerTable).toBe(9);
    expect(params?.minEntrants).toBe(2);
    expect(params?.maxEntrants).toBe(27);
    expect(params?.actionTimeoutSeconds).toBe(25);
    expect(params?.blindStructure).toBeDefined();
});

test("an empty buy-in is shown on the field and does not submit", () => {
    const ref = createRef<TournamentCreateFieldsHandle>();
    render(<TournamentCreateFields ref={ref} controlClassName={control} labelClassName={label} layout="grid" />);
    fireEvent.change(screen.getByTestId("tournament-buyin-input"), { target: { value: "" } });
    expect(submit(ref)).toBeUndefined();
    expect(screen.getByTestId("buyIn-error")).toHaveTextContent("Buy-in");
});
