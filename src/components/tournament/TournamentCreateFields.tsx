import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { BlindPreviewTable, BlindStructureSelect, CustomBlindStructureInput } from "../BlindStructureFields";
import { ScheduledStartCard } from "../common/ScheduledStartCard";
import { DEFAULT_SNG_BLIND_LEVEL_MINUTES, SNG_BLINDS } from "../../constants/blindLevels";
import { parseUsdcToMicro } from "../../constants/currency";
import {
    DEFAULT_BLIND_STRUCTURE_CHOICE,
    DEFAULT_CUSTOM_BLIND_STRUCTURE_TEXT,
    choiceUsesFormBlinds,
    openingBlindsOf,
    previewBlindLevels,
    resolveBlindStructureChoice,
    type BlindStructureChoice
} from "../../utils/blindStructureChoice";
import { LATE_REGISTRATION_LEVEL_OPTIONS, lateRegistrationOptionLabel } from "../../utils/scheduledSng";
import {
    DEFAULT_TOURNAMENT_FORM_VALUES,
    MTT_SEATS_PER_TABLE_OPTIONS,
    defaultStartTimeLocal,
    tournamentBlindStructure,
    tournamentCreationFeeMicro,
    validateTournamentForm,
    type TournamentFormField,
    type TournamentFormValues
} from "../../utils/tournamentCreate";
import { CREATION_FEE_BIG_BLINDS } from "../../utils/tableCreationFee";
import { hasElements, hasValue, isBlank, isNullish } from "../../utils/guards";
import { formatMicroUsd } from "../../utils/moneyDisplay";
import type { CreateTournamentParams } from "../../utils/tournamentTx";

const PREVIEW_LEVELS = 8;

/** Same starting-stack presets as the Sit & Go / Tournament create form. */
const STACK_PRESETS = [
    { value: 1000, label: "Turbo (1000)" },
    { value: 1500, label: "Standard (1500)" },
    { value: 3000, label: "Deep Stack (3000)" }
] as const;

/** Sit & Go duration presets, plus the longer 20 and 30 minute multi-table options. */
const DURATION_PRESETS = [
    { value: 3, label: "Hyper (3 min)" },
    { value: 5, label: "Turbo (5 min)" },
    { value: 10, label: "Standard (10 min)" },
    { value: 15, label: "Deep (15 min)" },
    { value: 20, label: "20 min" },
    { value: 30, label: "30 min" }
] as const;

export interface TournamentCreateFieldsHandle {
    /** Validates the fields. Returns the create params, or undefined after showing the errors. */
    submit: () => CreateTournamentParams | undefined;
}

interface TournamentCreateFieldsProps {
    /** The host form's input class, so these fields match the cash and sit-and-go inputs. */
    controlClassName: string;
    labelClassName: string;
    /** Two columns on the wide tables form; one column in the create dialog. */
    layout: "grid" | "stack";
    /**
     * When the host form shows seats in the Max Players slot, hide the field
     * here and keep this value as the submitted seats-per-table.
     */
    seatsPerTable?: string;
    onSeatsPerTableChange?: (value: string) => void;
    hideSeatsField?: boolean;
}

const Field: React.FC<{ labelClassName: string; label: string; hint?: string; error?: string; children: React.ReactNode; testId: string; className?: string }> = ({
    labelClassName,
    label,
    hint,
    error,
    children,
    testId,
    className
}) => (
    <div className={className}>
        <label className={labelClassName}>{label}</label>
        {children}
        {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        {error && (
            <p className="text-xs text-red-400 mt-1" data-testid={`${testId}-error`}>
                {error}
            </p>
        )}
    </div>
);

/**
 * The multi-table tournament fields inside a create-table form. Layout and
 * controls follow the Sit & Go / Tournament create modal (scheduled-start
 * card, late-registration select, preset rows). Validation stays in
 * utils/tournamentCreate; submitting goes through the tournament tx hook.
 */
export const TournamentCreateFields = forwardRef<TournamentCreateFieldsHandle, TournamentCreateFieldsProps>(function TournamentCreateFields(
    { controlClassName, labelClassName, layout, seatsPerTable, onSeatsPerTableChange, hideSeatsField = false },
    ref
) {
    const [values, setValues] = useState<TournamentFormValues>(() => ({
        ...DEFAULT_TOURNAMENT_FORM_VALUES,
        startTime: defaultStartTimeLocal(Date.now()),
        ...(hasValue(seatsPerTable) ? { seatsPerTable } : {})
    }));
    const [choice, setChoice] = useState<BlindStructureChoice>(DEFAULT_BLIND_STRUCTURE_CHOICE);
    const [customText, setCustomText] = useState(DEFAULT_CUSTOM_BLIND_STRUCTURE_TEXT);
    const [blindsIndex, setBlindsIndex] = useState(1);
    const [levelMinutes, setLevelMinutes] = useState(DEFAULT_SNG_BLIND_LEVEL_MINUTES);
    const [submitted, setSubmitted] = useState(false);

    const formValues: TournamentFormValues = hasValue(seatsPerTable) ? { ...values, seatsPerTable } : values;

    const plan = useMemo(
        () => resolveBlindStructureChoice(choice, customText, { ...SNG_BLINDS[blindsIndex], durationMinutes: levelMinutes }),
        [choice, customText, blindsIndex, levelMinutes]
    );
    const blindStructure = tournamentBlindStructure(plan);
    const previewRows = useMemo(() => (plan.preview ? previewBlindLevels(plan.preview, PREVIEW_LEVELS) : []), [plan.preview]);
    const result = validateTournamentForm({ values: formValues, blindStructure, blindError: plan.error, nowMs: Date.now() });

    const creationFee = useMemo(() => {
        if (isNullish(plan.preview)) return null;
        try {
            return tournamentCreationFeeMicro(
                parseUsdcToMicro(values.buyIn),
                BigInt(isBlank(values.startingStack) ? "0" : values.startingStack),
                BigInt(openingBlindsOf(plan.preview).bigBlind)
            );
        } catch {
            return null;
        }
    }, [plan.preview, values.buyIn, values.startingStack]);

    useImperativeHandle(ref, () => ({
        submit: () => {
            setSubmitted(true);
            return result.params;
        }
    }), [result.params]);

    const set = (field: keyof TournamentFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = e.target.value;
        if (field === "seatsPerTable") onSeatsPerTableChange?.(value);
        setValues(current => ({ ...current, [field]: value }));
    };
    const setStack = (stack: number | string) => setValues(current => ({ ...current, startingStack: String(stack) }));
    const err = (field: TournamentFormField): string | undefined => (submitted ? result.errors[field] : undefined);
    const lateRegLevels = Number(values.lateRegistrationLevels);
    const innerLabel = "block text-gray-300 text-xs mb-1";
    const stackValue = Number(values.startingStack);

    return (
        <div className={layout === "stack" ? "creation-span space-y-4" : "mb-4 space-y-4"} data-testid="mtt-create-fields">
            <ScheduledStartCard locked checked onChange={() => undefined} testId="tournament-start">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field labelClassName={innerLabel} label="Starts at" error={err("startTime")} testId="startTime">
                        <input
                            data-testid="tournament-start-input"
                            type="datetime-local"
                            aria-label="Scheduled start time"
                            className={controlClassName}
                            value={values.startTime}
                            onChange={set("startTime")}
                        />
                    </Field>
                    <Field
                        labelClassName={innerLabel}
                        label="Minimum players"
                        error={err("minEntrants")}
                        testId="minEntrants"
                        hint="Cancelled with refunds if fewer have registered at the start."
                    >
                        <input
                            className={controlClassName}
                            inputMode="numeric"
                            aria-label="Minimum players"
                            value={values.minEntrants}
                            onChange={set("minEntrants")}
                        />
                    </Field>
                    <Field
                        labelClassName={innerLabel}
                        label="Maximum entrants"
                        error={err("maxEntrants")}
                        testId="maxEntrants"
                        hint="Registration closes at this many. Up to 180."
                    >
                        <input
                            className={controlClassName}
                            inputMode="numeric"
                            aria-label="Maximum entrants"
                            value={values.maxEntrants}
                            onChange={set("maxEntrants")}
                        />
                    </Field>
                    <Field
                        labelClassName={innerLabel}
                        label="Action timeout (seconds)"
                        error={err("actionTimeoutSeconds")}
                        testId="actionTimeoutSeconds"
                        hint="Every table's action clock."
                    >
                        <input
                            className={controlClassName}
                            inputMode="numeric"
                            aria-label="Action timeout"
                            value={values.actionTimeoutSeconds}
                            onChange={set("actionTimeoutSeconds")}
                        />
                    </Field>
                    <Field
                        className="sm:col-span-2"
                        labelClassName={innerLabel}
                        label="Late registration"
                        error={err("lateRegistrationLevels")}
                        testId="lateRegistrationLevels"
                    >
                        <select
                            data-testid="late-registration"
                            aria-label="Late registration"
                            className={controlClassName}
                            value={values.lateRegistrationLevels}
                            onChange={set("lateRegistrationLevels")}
                        >
                            {LATE_REGISTRATION_LEVEL_OPTIONS.map(n => (
                                <option key={n} value={n}>
                                    {lateRegistrationOptionLabel(n)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <p className="sm:col-span-2 text-gray-400 text-xs">
                        Starts at the start time with at least the minimum. Cancelled with refunds if fewer have registered at the start.
                        {lateRegLevels > 0 && " Late entrants take an empty seat with a full starting stack until the window closes or someone finishes in the money."}
                    </p>
                </div>
            </ScheduledStartCard>

            <div className={layout === "grid" ? "creation-tournament-fields" : "space-y-4"}>
                {layout === "stack" ? (
                <div className="creation-field-pairs">
                    <Field labelClassName={labelClassName} label="Tournament Buy-In ($)" error={err("buyIn")} testId="buyIn" hint="All players pay the same buy in">
                        <input data-testid="tournament-buyin-input" className={controlClassName} inputMode="decimal" value={values.buyIn} onChange={set("buyIn")} />
                    </Field>
                    <Field
                        labelClassName={labelClassName}
                        label="Entry Fee ($)"
                        error={err("entryFee")}
                        testId="entryFee"
                        hint="Comes out of the buy-in and goes to you. 0 for none."
                    >
                        <input data-testid="tournament-entryfee-input" className={controlClassName} inputMode="decimal" value={values.entryFee} onChange={set("entryFee")} />
                    </Field>
                </div>
                ) : (
                <>
                    <Field labelClassName={labelClassName} label="Tournament Buy-In ($)" error={err("buyIn")} testId="buyIn" hint="All players pay the same buy in">
                        <input data-testid="tournament-buyin-input" className={controlClassName} inputMode="decimal" value={values.buyIn} onChange={set("buyIn")} />
                    </Field>
                    <Field
                        labelClassName={labelClassName}
                        label="Entry Fee ($)"
                        error={err("entryFee")}
                        testId="entryFee"
                        hint="Comes out of the buy-in and goes to you. 0 for none."
                    >
                        <input data-testid="tournament-entryfee-input" className={controlClassName} inputMode="decimal" value={values.entryFee} onChange={set("entryFee")} />
                    </Field>
                </>
                )}

                <div className={layout === "stack" ? "creation-span" : undefined}>
                    <label className={labelClassName}>Starting Stack (chips)</label>
                    <div className="creation-preset-row" role="group" aria-label="Starting stack">
                        {STACK_PRESETS.map(preset => (
                            <button
                                key={preset.value}
                                type="button"
                                onClick={() => setStack(preset.value)}
                                className={stackValue === preset.value ? "creation-preset-active" : "creation-preset"}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                    <div className="creation-custom-field">
                        <label htmlFor="mtt-custom-stack">Custom stack (chips)</label>
                        <input
                            id="mtt-custom-stack"
                            className={controlClassName}
                            inputMode="numeric"
                            value={values.startingStack}
                            onChange={set("startingStack")}
                            placeholder="e.g. 1500"
                            aria-invalid={Boolean(err("startingStack"))}
                        />
                        {err("startingStack") && (
                            <p className="text-xs text-red-400 mt-1" data-testid="startingStack-error">
                                {err("startingStack")}
                            </p>
                        )}
                    </div>
                </div>

                {!hideSeatsField && (
                    <Field labelClassName={labelClassName} label="Seats per table" error={err("seatsPerTable")} testId="seatsPerTable" hint="2 to 9.">
                        <select className={controlClassName} aria-label="Seats per table" value={formValues.seatsPerTable} onChange={set("seatsPerTable")}>
                            {MTT_SEATS_PER_TABLE_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}

                <div className={layout === "stack" ? "creation-span" : undefined}>
                    <BlindStructureSelect value={choice} onChange={setChoice} className={controlClassName} labelClassName={labelClassName} />
                    {choiceUsesFormBlinds(choice) && (
                        <>
                            <div className="mt-3" data-testid="sng-blinds">
                                <label className={labelClassName}>Starting Blinds (chips)</label>
                                <div className="creation-preset-row" role="group" aria-label="Starting blinds">
                                    {SNG_BLINDS.map((b, i) => (
                                        <button
                                            key={b.bigBlind}
                                            type="button"
                                            onClick={() => setBlindsIndex(i)}
                                            className={blindsIndex === i ? "creation-preset-active" : "creation-preset"}
                                        >
                                            {b.smallBlind} / {b.bigBlind}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mt-3" data-testid="sng-level-duration">
                                <label className={labelClassName}>Blind Level Duration</label>
                                <div className="creation-preset-row" role="group" aria-label="Blind level duration">
                                    {DURATION_PRESETS.map(preset => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => setLevelMinutes(preset.value)}
                                            className={levelMinutes === preset.value ? "creation-preset-active" : "creation-preset"}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    {choice === "custom" && <CustomBlindStructureInput value={customText} onChange={setCustomText} error={plan.error} />}
                    <BlindPreviewTable rows={previewRows} />
                    {err("blindStructure") && choice !== "custom" && <p className="text-xs text-red-400 mt-1">{err("blindStructure")}</p>}
                </div>
            </div>

            <div className="creation-fee creation-span" data-testid="tournament-create-fee">
                <span className="text-gray-400">Table Creation Fee ({CREATION_FEE_BIG_BLINDS.toString()} big blinds)</span>
                <span className="text-white font-mono">{isNullish(creationFee) ? "—" : `$${formatMicroUsd(creationFee)}`}</span>
            </div>

            {submitted && hasElements(Object.keys(result.errors)) && (
                <p className="text-sm text-red-400 mt-2" role="alert" data-testid="tournament-create-summary">
                    Fix the {Object.keys(result.errors).length === 1 ? "field" : `${Object.keys(result.errors).length} fields`} marked in red to create the tournament.
                </p>
            )}
        </div>
    );
});
