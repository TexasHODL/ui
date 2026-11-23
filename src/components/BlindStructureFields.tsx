/**
 * Blind structure controls shared by the lobby's create modal (Dashboard) and
 * /admin/tables (ui#905, ui#906): the structure select, the custom-text box and
 * the ante controls (ui#891) and the level preview. The logic lives in
 * utils/blindStructureChoice and utils/anteRule; these are just its views, so
 * the two create forms can't drift apart again.
 */
import React from "react";
import { ANTE_PERCENT_QUICK_CHOICES, describeAnteForm, validateAnteForm, type AnteFormState } from "@block52/poker-ui-core/utils/anteRule";
import {
    BLIND_STRUCTURE_CHOICES,
    describeBlindStructureChoice,
    isBlindStructureChoice,
    previewHasAnte,
    type BlindLevelRow,
    type BlindStructureChoice
} from "@block52/poker-ui-core/utils/blindStructureChoice";
import { isEmpty } from "@block52/ui-sdk/helpers";
import styles from "./BlindStructureFields.module.css";

const DEFAULT_CONTROL_CLASS = styles.control;

interface BlindStructureSelectProps {
    value: BlindStructureChoice;
    onChange: (choice: BlindStructureChoice) => void;
    className?: string;
    labelClassName?: string;
}

/** The Blind Structure select: Ladder (default), Doubling, the presets, Custom. */
export const BlindStructureSelect: React.FC<BlindStructureSelectProps> = ({ value, onChange, className, labelClassName }) => (
    <>
        <label className={labelClassName ?? "block text-white text-sm mb-1 mt-3"}>Blind Structure</label>
        <select
            data-testid="blind-structure"
            value={value}
            onChange={e => {
                if (isBlindStructureChoice(e.target.value)) onChange(e.target.value);
            }}
            className={className ?? DEFAULT_CONTROL_CLASS}
        >
            {BLIND_STRUCTURE_CHOICES.map(c => (
                <option key={c.value} value={c.value}>
                    {c.label}
                </option>
            ))}
        </select>
    </>
);

interface CustomBlindStructureInputProps {
    value: string;
    onChange: (text: string) => void;
    error?: string;
    labelClassName?: string;
}

/** The custom structure textarea (SDK text form) with its parse error. */
export const CustomBlindStructureInput: React.FC<CustomBlindStructureInputProps> = ({ value, onChange, error, labelClassName }) => (
    <>
        <label className={labelClassName ?? "block text-white text-sm mb-1 mt-3"}>Custom structure</label>
        <textarea
            data-testid="blind-custom"
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={8}
            spellCheck={false}
            className={styles.customText}
        />
        <p className={styles.hint}>
            start: sb/bb {"\u00b7"} duration: 5m {"\u00b7"} progression: double | linear 25 | percentage 1.5 (+ round: 25) {"\u00b7"} ante: bb | bb * 0.1 |
            level &gt;= 4 ? bb * 0.1 : 0 {"\u00b7"} cap: 15 {"\u2014"} or levels {"{"} 0: 100/200 {"\u2026"} {"}"} (levels count from 0)
        </p>
        {error && (
            <p className={styles.error} data-testid="blind-structure-error">
                {error}
            </p>
        )}
    </>
);

interface AnteControlsProps {
    value: AnteFormState;
    onChange: (form: AnteFormState) => void;
    /** Disabled while the custom text does not parse. */
    disabled?: boolean;
    /** The custom text has hand-written per-level antes; changing a control replaces them. */
    customAntes?: boolean;
    labelClassName?: string;
    className?: string;
}

/**
 * Antes on/off, the level they start at and their size as a % of the big
 * blind (ui#891). They write the structure's ante rule; the preview below
 * shows the result.
 */
export const AnteControls: React.FC<AnteControlsProps> = ({ value, onChange, disabled, customAntes, labelClassName, className }) => {
    const error = validateAnteForm(value);
    const label = labelClassName ?? "block text-white text-sm mb-1 mt-3";
    const control = className ?? DEFAULT_CONTROL_CLASS;
    return (
        <div data-testid="ante-controls">
            <label className={label}>Antes</label>
            <div className={styles.toggles} role="group" aria-label="Antes">
                {[true, false].map(on => (
                    <button
                        key={String(on)}
                        type="button"
                        data-testid={on ? "ante-on" : "ante-off"}
                        aria-pressed={value.enabled === on}
                        disabled={disabled}
                        onClick={() => onChange({ ...value, enabled: on })}
                        className={`${styles.chip}${value.enabled === on ? ` ${styles.chipOn}` : ""}`}
                    >
                        {on ? "On" : "Off"}
                    </button>
                ))}
            </div>
            {value.enabled && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={label}>Starts at level</label>
                        <input
                            type="number"
                            data-testid="ante-start-level"
                            min={1}
                            step={1}
                            value={Number.isFinite(value.startLevel) ? value.startLevel : ""}
                            disabled={disabled}
                            onChange={e => onChange({ ...value, startLevel: e.target.valueAsNumber })}
                            className={control}
                        />
                    </div>
                    <div>
                        <label className={label}>Ante size (% of big blind)</label>
                        <input
                            type="number"
                            data-testid="ante-percent"
                            min={1}
                            max={100}
                            step="any"
                            value={Number.isFinite(value.percentOfBigBlind) ? value.percentOfBigBlind : ""}
                            disabled={disabled}
                            onChange={e => onChange({ ...value, percentOfBigBlind: e.target.valueAsNumber })}
                            className={control}
                        />
                        <div className={`${styles.percents} mt-1`}>
                            {ANTE_PERCENT_QUICK_CHOICES.map(pct => (
                                <button
                                    key={pct}
                                    type="button"
                                    data-testid={`ante-percent-${pct}`}
                                    aria-pressed={value.percentOfBigBlind === pct}
                                    disabled={disabled}
                                    onClick={() => onChange({ ...value, percentOfBigBlind: pct })}
                                    className={`${styles.percent}${value.percentOfBigBlind === pct ? ` ${styles.percentOn}` : ""}`}
                                >
                                    {pct}%
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <p className={styles.hint} data-testid="ante-summary">
                {customAntes ? "Your custom structure sets its own ante per level; changing these replaces them." : describeAnteForm(value)}
            </p>
            {error && (
                <p className={styles.error} data-testid="ante-error">
                    {error}
                </p>
            )}
        </div>
    );
};

interface BlindPreviewTableProps {
    rows: BlindLevelRow[];
    /** When set, a footnote describing the structure is shown under the table. */
    choice?: BlindStructureChoice;
    className?: string;
}

/** The first levels as the engine will play them: Level, Blinds, Ante (when any level has one), Minutes. */
export const BlindPreviewTable: React.FC<BlindPreviewTableProps> = ({ rows, choice, className }) => {
    if (isEmpty(rows)) return null;
    const showAnte = previewHasAnte(rows);
    return (
        <div className={className ? `${styles.preview} ${className}` : styles.preview} data-testid="blind-preview">
            <table>
                <thead>
                    <tr>
                        <th>Level</th>
                        <th>Blinds</th>
                        {showAnte && <th>Ante</th>}
                        <th>Minutes</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.number} className={r.number === 1 ? styles.current : undefined}>
                            <td>{r.number}</td>
                            <td>{r.isBreak ? "Break" : `${Number(r.smallBlind).toLocaleString()} / ${Number(r.bigBlind).toLocaleString()}`}</td>
                            {showAnte && <td>{r.isBreak || r.ante === "0" ? "\u2014" : Number(r.ante).toLocaleString()}</td>}
                            <td>{r.durationMinutes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {choice && (
                <p className={styles.previewNote} data-testid="blind-preview-note">
                    * {describeBlindStructureChoice(choice)} Level 1 is highlighted.
                </p>
            )}
        </div>
    );
};
