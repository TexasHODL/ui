import { formatMicroUsd } from "../../utils/moneyDisplay";
import React from "react";
import { truncateMiddle } from "../../utils/stringUtils";
import { isEmpty } from "../../utils/guards";
import type { ValidatorBond } from "../../utils/validatorBonds";

interface ValidatorEarningsPanelProps {
    /** Bonded-USDC weights per validator (poker-vm#2592). */
    bonds: ValidatorBond[];
    /**
     * Whether bonded-USDC data has been fetched (from the standard Cosmos staking
     * endpoint). When false (no node reachable) we show an empty state rather than
     * fabricating numbers (Commandment #7).
     */
    hasQuery: boolean;
    isLoading: boolean;
}

/**
 * ValidatorEarningsPanel — shows each validator's bonded USDC (the weight the SNG
 * protocol fee is split by).
 *
 * Bonded USDC drives the split at join: share_i = protocolCut * bondedUsdc_i / Σ
 * bondedUsdc (poker-vm#2592), sourced from the validator's staking `tokens` (bond
 * denom is USDC). Accrued fee earnings over time are intentionally NOT shown:
 * protocol fees are paid-and-emitted per distribution with no per-validator
 * accumulator state, so a running total would need new state or event indexing.
 */
const ValidatorEarningsPanel: React.FC<ValidatorEarningsPanelProps> = ({ bonds, hasQuery, isLoading }) => {
    return (
        <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Validator Earnings</h2>
            <div className="bg-[#100c17] rounded-lg border border-white/10 overflow-hidden max-w-full">
                <table className="w-full table-fixed">
                    <thead className="bg-[#0c0911]">
                        <tr>
                            <th className="w-[42%] px-2 py-3 sm:px-4 text-left text-xs font-semibold text-gray-400 align-bottom">Validator</th>
                            <th className="w-[29%] px-2 py-3 sm:px-4 text-left text-xs font-semibold text-gray-400 align-bottom">Bonded USDC (split weight)</th>
                            <th className="w-[29%] px-2 py-3 sm:px-4 text-left text-xs font-semibold text-gray-400 align-bottom">Protocol-Fee Earnings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {isLoading ? (
                            <tr>
                                <td className="px-2 py-3 sm:px-4 text-gray-400 text-sm" colSpan={3}>
                                    Loading validator bonds...
                                </td>
                            </tr>
                        ) : !hasQuery || isEmpty(bonds) ? (
                            <tr>
                                <td className="px-2 py-3 sm:px-4 text-gray-400 text-sm" colSpan={3}>
                                    Validator bonded-USDC and earnings are not yet available from the chain.
                                    <span className="ml-1 text-purple-300">Coming soon.</span>
                                </td>
                            </tr>
                        ) : (
                            bonds.map(bond => (
                                <tr key={bond.validator} className="hover:bg-[#21172b]/50 transition-colors">
                                    <td className="px-2 py-3 sm:px-4 overflow-hidden">
                                        <span className="block truncate text-white font-mono text-sm">{truncateMiddle(bond.validator, 10, 8)}</span>
                                    </td>
                                    <td className="px-2 py-3 sm:px-4">
                                        {/* bondedUsdc is micro-USDC (6dp) as a string; the shared formatter ceilings it to cents. */}
                                        <span className="text-white font-mono text-sm">${formatMicroUsd(bond.bondedUsdc)}</span>
                                    </td>
                                    <td className="px-2 py-3 sm:px-4">
                                        {/* No per-validator earnings query exists yet — do NOT fabricate a value. */}
                                        <span className="text-purple-300 text-sm">Coming soon</span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ValidatorEarningsPanel;
