export const normalizeRole = (role: string): string => {
  const r = role.toLowerCase();
  if (r === "batsman" || r === "batsmen") return "Batsman";
  if (r === "bowler") return "Bowler";
  if (r === "all-rounder" || r === "allrounder") return "All-Rounder";
  if (r === "wicket-keeper" || r === "wicketkeeper") return "Wicket-Keeper";
  return role;
};

export const ROLE_ORDER = ["Batsman", "Bowler", "All-Rounder", "Wicket-Keeper"];
