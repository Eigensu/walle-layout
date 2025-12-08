import * as React from "react";
import { Avatar } from "../../ui/Avatar";
import type { Player } from "./types.js";

interface CaptainSelectionCardProps {
  player: Player;
  isCaptain: boolean;
  isViceCaptain: boolean;
  onSetCaptain: (playerId: string) => void;
  onSetViceCaptain: (playerId: string) => void;
}

/**
 * Compact card for captain/vice-captain selection on mobile devices.
 * Displays minimal information with inline action buttons.
 */
export const CaptainSelectionCard: React.FC<CaptainSelectionCardProps> = ({
  player,
  isCaptain,
  isViceCaptain,
  onSetCaptain,
  onSetViceCaptain,
}) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 bg-white hover:border-gray-300 transition-all">
      {/* Player Avatar */}
      <Avatar
        name={player.name}
        src={player.image}
        size="sm"
      />

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 text-sm truncate">
          {player.name}
        </h4>
        <p className="text-xs text-gray-500 truncate">{player.team}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isCaptain) {
              onSetCaptain(player.id);
            }
          }}
          disabled={isCaptain}
          aria-label={isCaptain ? "Captain selected" : "Set as captain"}
          className={`
            px-2.5 py-1 text-[10px] font-medium rounded-md transition-all
            ${isCaptain
              ? "bg-warning-500 text-white border border-warning-600 shadow-sm cursor-default"
              : "bg-warning-50 text-warning-700 border border-warning-200 hover:bg-warning-100"
            }
          `}
        >
          {isCaptain ? "Captain ✓" : "Captain"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!isViceCaptain) {
              onSetViceCaptain(player.id);
            }
          }}
          disabled={isViceCaptain}
          aria-label={isViceCaptain ? "Vice Captain selected" : "Set as vice captain"}
          className={`
            px-2.5 py-1 text-[10px] font-medium rounded-md transition-all
            ${isViceCaptain
              ? "bg-secondary-500 text-white border border-secondary-600 shadow-sm cursor-default"
              : "bg-secondary-50 text-secondary-700 border border-secondary-200 hover:bg-secondary-100"
            }
          `}
        >
          {isViceCaptain ? "V.Captain ✓" : "V.Captain"}
        </button>
      </div>
    </div>
  );
};
