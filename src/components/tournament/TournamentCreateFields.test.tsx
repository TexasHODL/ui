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
    // The chain is charged the exact micro fee (1,666,666). The label ceilings to the next cent.
    expect(screen.getByTestId("tournament-create-fee")).toHaveTextContent("Table Creation Fee (10 big blinds)");
    expect(screen.getByTestId("tournament-create-fee")).toHaveTextContent("$1.67");
});

test("an empty buy-in is shown on the field and does not submit", () => {
    const ref = createRef<TournamentCreateFieldsHandle>();
    render(<TournamentCreateFields ref={ref} controlClassName={control} labelClassName={label} layout="grid" />);
    fireEvent.change(screen.getByTestId("tournament-buyin-input"), { target: { value: "" } });
    expect(submit(ref)).toBeUndefined();
    expect(screen.getByTestId("buyIn-error")).toHaveTextContent("Buy-in");
});

test("the scheduled-start card shows the late-registration select with the default of 15 levels", () => {
    const ref = createRef<TournamentCreateFieldsHandle>();
    render(<TournamentCreateFields ref={ref} controlClassName={control} labelClassName={label} layout="stack" />);
    const select = screen.getByTestId("late-registration") as HTMLSelectElement;
    expect(select).toHaveValue("15");
    expect(screen.getByTestId("tournament-start")).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "6" } });
    expect(select).toHaveValue("6");
    // The choice is kept off CreateTournamentParams until the SDK and chain accept it.
    const params = submit(ref);
    expect(params).toBeDefined();
    expect(params).not.toHaveProperty("lateRegistrationLevels");
});

test("a host form can own seats-per-table in the Max Players slot", () => {
    const ref = createRef<TournamentCreateFieldsHandle>();
    const onSeats = jest.fn();
    render(
        <TournamentCreateFields
            ref={ref}
            controlClassName={control}
            labelClassName={label}
            layout="stack"
            hideSeatsField
            seatsPerTable="6"
            onSeatsPerTableChange={onSeats}
        />
    );
    expect(screen.queryByLabelText("Seats per table")).not.toBeInTheDocument();
    const params = submit(ref);
    expect(params?.seatsPerTable).toBe(6);
});
