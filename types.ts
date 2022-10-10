import type { WebSocket } from "ws";

export type LanesType = {
	[lane: number]: {
		tv: WebSocket | null;
		user: WebSocket | null;
		data: LanesDataType;
	};
};

export type AdminLanesType = {
	[lane: number]: {
		tv: boolean;
		user: boolean;
		data: LanesDataType;
	};
};

export type LanesDataType = {
	bowlersAmt: number;
	gamesAmt: number;
	currentBowler: string;
	currentGame: number;
	currentFrame: number;
	pastGames: BowlersType[];
	bowlers: BowlersType;
	pins: PinsType;
};

// Games

export type FramesType = ([number] | [number, number] | [number, number, number])[];

export type BowlersType = {
	[name: string]: { frames: FramesType };
};

export type PinsType = number[];

// Commands

export type JsonData = Initialize | StartGame | CreateLanes | SetBowlers | SetGames | AddBowler | StopSession;

export type Initialize = { command: "initialize"; lane: number; type: "tv" | "user"; pass?: string };
export type StartGame = { command: "start_game"; names: string[] };

// Admin
export type CreateLanes = { command: "create_lanes"; lanes: number[] };
export type SetBowlers = { command: "set_bowlers"; lane: number; bowlers: number };
export type SetGames = { command: "set_games"; lane: number; games: number };
export type AddBowler = { command: "add_bowler"; lane: number; name: string };
export type StopSession = { command: "stop_session"; lane: number };
