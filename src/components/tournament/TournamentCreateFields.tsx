import React, { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { BlindPreviewTable, BlindStructureSelect, CustomBlindStructureInput } from "../BlindStructureFields";
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
import {
    DEFAULT_TOURNAMENT_FORM_VALUES,
    defaultStartTimeLocal,
    tournamentBlindStructure,
    tournamentCreationFeeMicro,
    validateTournamentForm,
    type TournamentFormField,
    type TournamentFormValues
} from "../../utils/tournamentCreate";
import { hasElements, isBlank, isNullish } from "../../utils/guards";
import { formatMicroUsd } from "../../utils/moneyDisplay";
import type { CreateTournamentParams } from "../../utils/tournamentTx";

const PREVIEW_LEVELS = 8;

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
}

const Field: React.FC<{ labelClassName: string; label: string; hint?: string; error?: string; children: React.ReactNode; testId: string }> = ({
    labelClassName,
    label,
    hint,
    error,
    children,
    testId
}) => (
    <div>
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
 * The multi-table tournament fields inside a create-table form. Validation stays
 * in utils/tournamentCreate; submitting goes through the tournament tx hook.
 */
export const TournamentCreateFields = forwardRef<TournamentCreateFieldsHandle, TournamentCreateFieldsProps>(function TournamentCreateFields(
    { controlClassName, labelClassName, layout },
    ref
) {
    const [values, setValues] = useState<TournamentFormValues>(() => ({ ...DEFAULT_TOURNAMENT_FORM_VALUES, startTime: defaultStartTimeLocal(Date.now()) }));
    const [choice, setChoice] = useState<BlindStructureChoice>(DEFAULT_BLIND_STRUCTURE_CHOICE);
    const [customText, setCustomText] = useState(DEFAULT_CUSTOM_BLIND_STRUCTURE_TEXT);
    const [blindsIndex, setBlindsIndex] = useState(1);
    const [levelMinutes, setLevelMinutes] = useState(DEFAULT_SNG_BLIND_LEVEL_MINUTES);
    const [submitted, setSubmitted] = useState(false);

    const plan = useMemo(
        () => resolveBlindStructureChoice(choice, customText, { ...SNG_BLINDS[blindsIndex], durationMinutes: levelMinutes }),
        [choice, customText, blindsIndex, levelMinutes]
    );
    const blindStructure = tournamentBlindStructure(plan);
    const previewRows = useMemo(() => (plan.preview ? previewBlindLevels(plan.preview, PREVIEW_LEVELS) : []), [plan.preview]);
    const result = validateTournamentForm({ values, blindStructure, blindError: plan.error, nowMs: Date.now() });

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

    const set = (field: keyof TournamentFormValues) => (e: React.ChangeEvent<HTMLInputElement>) => setValues(current => ({ ...current, [field]: e.target.value }));
    const err = (field: TournamentFormField): string | undefined => (submitted ? result.errors[field] : undefined);
    const fieldsClass = layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-3";

    return (
        <div className={layout === "stack" ? "creation-span space-y-3" : "mb-4"} data-testid="mtt-create-fields">
            <div className={fieldsClass}>
                <Field labelClassName={labelClassName} label="Buy-in (USDC)" error={err("buyIn")} testId="buyIn" hint="What each player pays to register.">
                    <input data-testid="tournament-buyin-input" className={controlClassName} inputMode="decimal" value={values.buyIn} onChange={set("buyIn")} />
                </Field>
                <Field labelClassName={labelClassName} label="Entry fee (USDC)" error={err("entryFee")} testId="entryFee" hint="Comes out of the buy-in and goes to you. 0 for none.">
                    <input data-testid="tournament-entryfee-input" className={controlClassName} inputMode="decimal" value={values.entryFee} onChange={set("entryFee")} />
                </Field>
                <Field labelClassName={labelClassName} label="Starting stack (chips)" error={err("startingStack")} testId="startingStack">
                    <input className={controlClassName} inputMode="numeric" value={values.startingStack} onChange={set("startingStack")} />
                </Field>
                <Field labelClassName={labelClassName} label="Seats per table" error={err("seatsPerTable")} testId="seatsPerTable" hint="2 to 9.">
                    <input className={controlClassName} inputMode="numeric" value={values.seatsPerTable} onChange={set("seatsPerTable")} />
                </Field>
                <Field labelClassName={labelClassName} label="Minimum entrants" error={err("minEntrants")} testId="minEntrants" hint="Cancelled with refunds if fewer have registered at the start.">
                    <input className={controlClassName} inputMode="numeric" value={values.minEntrants} onChange={set("minEntrants")} />
                </Field>
                <Field labelClassName={labelClassName} label="Maximum entrants" error={err("maxEntrants")} testId="maxEntrants" hint="Registration closes when this many have registered. Up to 180.">
                    <input className={controlClassName} inputMode="numeric" value={values.maxEntrants} onChange={set("maxEntrants")} />
                </Field>
                <Field labelClassName={labelClassName} label="Start time" error={err("startTime")} testId="startTime" hint="Registration closes then, and it starts with the minimum or more.">
                    <input data-testid="tournament-start-input" type="datetime-local" className={controlClassName} value={values.startTime} onChange={set("startTime")} />
                </Field>
                <Field labelClassName={labelClassName} label="Action timeout (seconds)" error={err("actionTimeoutSeconds")} testId="actionTimeoutSeconds" hint="Every table's action clock.">
                    <input className={controlClassName} inputMode="numeric" value={values.actionTimeoutSeconds} onChange={set("actionTimeoutSeconds")} />
                </Field>
            </div>

            <div className="mt-4">
                <BlindStructureSelect value={choice} onChange={setChoice} className={controlClassName} labelClassName={labelClassName} />
                {choiceUsesFormBlinds(choice) && (
                    <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4" : "grid grid-cols-1 gap-3 mt-3"}>
                        <div>
                            <label className={labelClassName}>Starting blinds (chips)</label>
                            <select className={controlClassName} aria-label="Starting blinds" value={blindsIndex} onChange={e => setBlindsIndex(Number(e.target.value))}>
                                {SNG_BLINDS.map((b, i) => (
                                    <option key={b.bigBlind} value={i}>
                                        {b.smallBlind} / {b.bigBlind}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClassName}>Minutes per level</label>
                            <select className={controlClassName} aria-label="Minutes per level" value={levelMinutes} onChange={e => setLevelMinutes(Number(e.target.value))}>
                                {[3, 5, 10, 15, 20, 30].map(m => (
                                    <option key={m} value={m}>
                                        {m} min
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
                {choice === "custom" && <CustomBlindStructureInput value={customText} onChange={setCustomText} error={plan.error} />}
                <BlindPreviewTable rows={previewRows} />
                {err("blindStructure") && choice !== "custom" && <p className="text-xs text-red-400 mt-1">{err("blindStructure")}</p>}
            </div>

            <p className="text-xs text-gray-400 mt-3" data-testid="tournament-create-fee">
                {isNullish(creationFee) ? "Creation fee: set the buy-in, starting stack and blinds to see it." : `Creating costs you $${formatMicroUsd(creationFee)} (10 big blinds of level 1, priced at the buy-in's chip value).`}
            </p>

            {submitted && hasElements(Object.keys(result.errors)) && (
                <p className="text-sm text-red-400 mt-2" role="alert" data-testid="tournament-create-summary">
                    Fix the {Object.keys(result.errors).length === 1 ? "field" : `${Object.keys(result.errors).length} fields`} marked in red to create the tournament.
                </p>
            )}
        </div>
    );
});
