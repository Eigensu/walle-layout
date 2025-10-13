import * as React from "react";
import { PlayerCard } from "./PlayerCard";
import { SearchInput } from "./SearchInput";
import { Pagination } from "./Pagination";
import { normalizeRole, ROLE_ORDER } from "./utils";
import type { PlayerListProps } from "./types";

const PLAYERS_PER_PAGE = 10;

export const PlayerList: React.FC<PlayerListProps> = ({
  players,
  selectedPlayers,
  captainId,
  viceCaptainId,
  onPlayerSelect,
  onSetCaptain,
  onSetViceCaptain,
  maxSelections = 16,
  roleLimits,
  filterRole,
  filterSlot,
  sortByRole = true,
  onBlockedSelect,
  showActions = false,
  compact = false,
  className = "",
  displayRoleMap,
  compactShowPrice = false,
  isPlayerDisabled,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Build a map from playerId to normalized role for quick lookup
  const idToRole = React.useMemo(() => {
    const m = new Map<string, string>();
    players.forEach((p) => m.set(p.id, normalizeRole(p.role)));
    return m;
  }, [players]);

  // Count selected per role
  const selectedCountByRole = React.useMemo(() => {
    const counts: Record<string, number> = {};
    selectedPlayers.forEach((id) => {
      const role = idToRole.get(id);
      if (!role) return;
      counts[role] = (counts[role] || 0) + 1;
    });
    return counts;
  }, [selectedPlayers, idToRole]);

  const canSelectMoreTotal = selectedPlayers.length < maxSelections;

  const playersPrepared = React.useMemo(() => {
    let list = players.slice();

    // Apply slot/role filter
    if (typeof filterSlot === "number") {
      list = list.filter((p) => (p as any).slot === filterSlot);
    } else if (filterRole && filterRole !== "All") {
      list = list.filter((p) => normalizeRole(p.role) === filterRole);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.team.toLowerCase().includes(query) ||
          normalizeRole(p.role).toLowerCase().includes(query)
      );
    }

    // Sort by role if needed
    if (sortByRole) {
      list.sort((a, b) => {
        const ar = ROLE_ORDER.indexOf(normalizeRole(a.role));
        const br = ROLE_ORDER.indexOf(normalizeRole(b.role));
        return ar - br;
      });
    }

    return list;
  }, [players, filterRole, filterSlot, sortByRole, searchQuery]);

  // Reset to page 1 when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSlot, filterRole]);

  // Calculate pagination
  const totalPlayers = playersPrepared.length;
  const totalPages = Math.ceil(totalPlayers / PLAYERS_PER_PAGE);
  const startIndex = (currentPage - 1) * PLAYERS_PER_PAGE;
  const endIndex = startIndex + PLAYERS_PER_PAGE;
  const paginatedPlayers = playersPrepared.slice(startIndex, endIndex);

  const handleSelect = (playerId: string) => {
    const isAlreadySelected = selectedPlayers.includes(playerId);
    if (isAlreadySelected) {
      onPlayerSelect(playerId); // toggle off
      return;
    }

    if (!canSelectMoreTotal) {
      onBlockedSelect?.(
        `You can select at most ${maxSelections} players in total.`
      );
      return;
    }

    // Enforce per-role limits if provided
    if (roleLimits) {
      const role = idToRole.get(playerId);
      if (role) {
        const limit = roleLimits[role];
        if (typeof limit === "number") {
          const current = selectedCountByRole[role] || 0;
          if (current >= limit) {
            onBlockedSelect?.(
              `You can select at most ${limit} players for ${role}.`
            );
            return;
          }
        }
      }
    }

    onPlayerSelect(playerId);
  };

  return (
    <div className={`space-y-2 sm:space-y-3 ${className}`}>
      {/* Search Input */}
      <SearchInput searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Player Count */}
      <div className="text-xs sm:text-sm text-gray-600 font-medium">
        Showing {paginatedPlayers.length} of {totalPlayers} player
        {totalPlayers !== 1 ? "s" : ""}
      </div>

      {/* Players List */}
      {paginatedPlayers.length > 0 ? (
        <>
          {paginatedPlayers.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              isSelected={selectedPlayers.includes(player.id)}
              isCaptain={player.id === captainId}
              isViceCaptain={player.id === viceCaptainId}
              onSelect={handleSelect}
              onSetCaptain={onSetCaptain}
              onSetViceCaptain={onSetViceCaptain}
              showActions={showActions}
              compact={compact}
              displayRoleMap={displayRoleMap}
              compactShowPrice={compactShowPrice}
              disabled={isPlayerDisabled ? isPlayerDisabled(player) : false}
            />
          ))}

          {/* Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No players found matching your search.
        </div>
      )}
    </div>
  );
};
