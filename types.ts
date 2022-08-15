import type { WebSocket } from "ws";

export type LanesType = {
	[lane: number]: {
		tv: WebSocket | null;
		user: WebSocket | null;
		bowlerAmt: number;
		games: number;
		bowler_names: string[];
		bowlers: BowlersType;
	};
};

// Games

export type FramesType = ([number] | [number, number] | [number, number, number])[];

export type BowlersType = {
	[name: string]: { frames: FramesType };
};

export type PinsType = number[];

// Commands

export type JsonData = Initialize | SetBowlerNames | CreateLanes | SetBowlers | SetGames;

export type Initialize = { command: "initialize"; lane: number; type: "tv" | "user"; pass?: string };
export type SetBowlerNames = { command: "set_bowler_names"; names: string[] };

// Admin
export type CreateLanes = { command: "create_lanes"; lanes: number[] };
export type SetBowlers = { command: "set_bowlers"; lane: number; bowlers: number };
export type SetGames = { command: "set_games"; lane: number; games: number };
