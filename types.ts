import type { WebSocket } from "ws";

export type Lanes = {
	[lane: number]: {
		tv: WebSocket | null;
		user: WebSocket | null;
		bowlers: number;
		games: number;
		bowler_names: string[];
	};
};

export type JsonData = Initialize | SetBowlerNames | CreateLanes | SetBowlers | SetGames;

// Commands
export type Initialize = { command: "initialize"; lane: number; type: "tv" | "user"; pass?: string };
export type SetBowlerNames = { command: "set_bowler_names"; names: string[] };

// Admin Commands
export type CreateLanes = { command: "create_lanes"; lanes: number[] };
export type SetBowlers = { command: "set_bowlers"; lane: number; bowlers: number };
export type SetGames = { command: "set_games"; lane: number; games: number };
