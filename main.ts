import { type WebSocket, WebSocketServer } from "ws";
import type { JsonData, LanesType } from "./types";

console.log("∴ Trinity Bowling Software ∴");

const server = new WebSocketServer({ port: 2053 });

let lanes: LanesType = { 27: { tv: null, user: null, bowlerAmt: 3, games: 2, bowler_names: [], bowlers: {} } };
let adminSocket: WebSocket | null;

server.on("connection", (ws: WebSocket) => {
	console.log("New connection.");
	let lane: number = 0;
	let type: "tv" | "user";
	let admin = false;

	ws.on("message", (data: string) => {
		const jsonData: JsonData = JSON.parse(data);
		console.log(`\x1b[32m←\x1b[0m [${console_prefix(lane, type, admin)}]:`, jsonData);
		let response;

		if (jsonData.command === "initialize") {
			if (jsonData.pass === process.env.PASS) {
				admin = true;
				response = { response: true, type: "admin" };
			} else if (!lanes[jsonData.lane]) {
				response = { response: null, lane: jsonData.lane, type: jsonData.type };
			} else if (lanes[jsonData.lane][jsonData.type]) {
				response = { response: false, lane: jsonData.lane, type: jsonData.type };
			} else {
				lanes[jsonData.lane][jsonData.type] = ws;
				lane = jsonData.lane;
				type = jsonData.type;

				response = { response: true, lane, type };
			}
		} else if (jsonData.command === "set_bowler_names") {
			if (type !== "user" || jsonData.names.length !== lanes[lane].bowlerAmt) {
				response = { response: false };
			} else {
				lanes[lane].bowler_names = jsonData.names;
				sendmsg(lanes[lane].tv, lane, type, { response: true });
				response = { response: true };
			}
		}

		if (admin) {
			if (jsonData.command === "create_lanes") {
				jsonData.lanes.forEach((lane: number) => {
					lanes[lane] = { tv: null, user: null, bowlerAmt: 0, games: 0, bowler_names: [], bowlers: {} };
				});
				response = { response: true };
			} else if (jsonData.command === "set_bowlers") {
				if (!lanes[lane]) {
					response = { response: null };
				} else {
					lanes[lane].bowlerAmt = jsonData.bowlers;
                    const broadcast = { command: "get_bowlers", response: true, bowlers: jsonData.bowlers };
                    sendmsg(lanes[lane].user, lane, type, broadcast);
                    sendmsg(lanes[lane].tv, lane, type, broadcast);
					response = { response: true };
				}
			} else if (jsonData.command === "set_games") {
				if (!lanes[lane]) {
					response = { response: null };
				} else {
					lanes[lane].games = jsonData.games;
                    const broadcast = { command: "get_games", response: true, games: jsonData.games };
                    sendmsg(lanes[lane].user, lane, type, broadcast);
                    sendmsg(lanes[lane].tv, lane, type, broadcast);
					response = { response: true };
				}
			}
		}

		if (response) sendmsg(ws, lane, type, { command: jsonData.command, ...response }, admin);
	});

	ws.on("close", () => {
		if (lane && type) lanes[lane][type] = null;
		console.log(`\x1b[31m×\x1b[0m [${console_prefix(lane, type, admin)}]`);
		if (admin) adminSocket = null;
	});
});

const sendmsg = (ws: WebSocket | null, lane: number, type: string, data: any, admin?: boolean) => {
	if (ws) {
		console.log(`\x1b[34m→\x1b[0m [${console_prefix(lane, type, admin)}]:`, data);
		ws.send(JSON.stringify(data));
	}
};

const console_prefix = (lane: number, type: string, admin?: boolean) =>
	admin ? "admin" : (lane || "") + " " + (type ?? "");
