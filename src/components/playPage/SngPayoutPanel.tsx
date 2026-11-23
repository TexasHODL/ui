import React from "react";
import { useSitAndGoPayouts } from "../../hooks/game/useSitAndGoPayouts";
import type { TournamentStateDTO } from "@block52/poker-ui-core/types/tournament";
import { hasContent, hasValue, isEmpty } from "@block52/ui-sdk/helpers";
import { payoutSharePercent, tournamentPayoutStructure } from "../../utils/payoutStructure";
import { PrizeAmount } from "./PrizeAmount";

const PLACE_LABELS = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];

const ordinal = (place: number): string => PLACE_LABELS[place - 1] ?? `${place}th`;

interface SngPayoutPanelProps {
    /**
     * The multi-table tournament record already loaded by `useTournament`.
     * Its prize pool and payout schedule replace the table snapshot, which
     * does not carry them. Omit on a sit-and-go.
     */
    tournament?: TournamentStateDTO;
}

const SngPayoutPanel: React.FC<SngPayoutPanelProps> = ({ tournament }) => {
    const tablePayouts = useSitAndGoPayouts();
    // Directed tables keep the schedule on the tournament, which Table already
    // polls. A sit-and-go has no record here and keeps reading the table.
    const fromTournament = tournamentPayoutStructure(tournament);
    const isSitAndGo = hasValue(fromTournament) || tablePayouts.isSitAndGo;
    const prizePool = hasValue(fromTournament) ? fromTournament.prizePool : tablePayouts.prizePool;
    const places = hasValue(fromTournament) ? fromTournament.places : tablePayouts.places;

    if (!isSitAndGo || !hasContent(prizePool) || isEmpty(places)) {
        return null;
    }

    return (
        <div
            className="w-fit rounded-xl border border-white/15 bg-black/55 px-3 py-2 backdrop-blur-sm shadow-xl"
            data-testid="sng-payout-structure"
        >
            <div className="type-payout-header uppercase text-yellow-300 mb-1">
                Payout Structure
            </div>
            <div className="text-[12px] sm:text-xs text-white type-num-payout mb-1" data-testid="sng-payout-pool">
                Prize pool <PrizeAmount micro={prizePool} />
            </div>
            <ul className="space-y-1">
                {places.map(({ place, payout }) => (
                    <li
                        key={place}
                        className="text-[12px] sm:text-xs text-white type-num-payout"
                        data-testid={`sng-payout-place-${place}`}
                    >
                        {ordinal(place)} {payoutSharePercent(payout, prizePool)}%: <PrizeAmount micro={payout} />
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SngPayoutPanel;
