import { type WebSocket, WebSocketServer } from "ws";
import type { AdminLanesType, JsonData, LanesType, PinsType } from "./types";

console.log("∴ Trinity Bowling Software ∴");

const server = new WebSocketServer({ port: 2053 });

let lanes: LanesType = {};
let adminSockets: WebSocket[] = [];

[...Array(8).keys()].forEach((num) => {
	lanes[num + 1] = {
		tv: null,
		user: null,
		data: {
			bowlerAmt: 0,
			gamesAmt: 0,
			currentBowler: "",
			currentGame: 0,
			currentFrame: 1,
			past_games: [],
			bowlers: {},
			pins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
		},
	};
});

lanes[4].data.bowlerAmt = 3;
lanes[4].data.gamesAmt = 2;

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
				// adminSocket = ws;
				adminSockets.push(ws);
				response = { response: true, type: "admin", lanes: admin_lanes(lanes) };
			} else if (!lanes[jsonData.lane]) {
				response = { response: null, lane: jsonData.lane, type: jsonData.type };
			} else if (lanes[jsonData.lane][jsonData.type]) {
				response = { response: false, lane: jsonData.lane, type: jsonData.type };
			} else {
				lanes[jsonData.lane][jsonData.type] = ws;
				lane = jsonData.lane;
				type = jsonData.type;

				response = { response: true, lane, type, ...lanes[jsonData.lane].data };
			}
		} else if (jsonData.command === "start_game") {
			let duplicates = jsonData.names.filter((item, index) => jsonData.names.indexOf(item) != index);
			if (
				type !== "user" ||
				jsonData.names.length !== lanes[lane].data.bowlerAmt ||
				lanes[lane].data.currentGame === lanes[lane].data.gamesAmt ||
				duplicates.length > 0
			) {
				response = { response: false };
			} else {
				const data = lanes[lane].data;
				if (data.currentGame > 0) data.past_games.push(data.bowlers);
				jsonData.names.forEach((name) => (data.bowlers[name] = { frames: [] }));
				data.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
				data.currentBowler = Object.keys(data.bowlers)[0];
				data.currentFrame = 1;
				data.currentGame++;

				setTimeout(() => bowlPins(lane, randomPins(lane)), 3000);

				const broadcast = { response: true, names: jsonData.names };
				sendmsg(lanes[lane].tv, lane, "tv", { command: "start_game", ...broadcast });
				// sendmsg(adminSocket, lane, "admin", { command: "start_game", ...broadcast, lane });
				response = broadcast;
			}
		}

		if (admin) {
			if (jsonData.command === "create_lanes") {
				jsonData.lanes.forEach((lane: number) => {
					lanes[lane] = {
						tv: null,
						user: null,
						data: {
							bowlerAmt: 0,
							gamesAmt: 0,
							currentBowler: "",
							currentGame: 0,
							currentFrame: 1,
							past_games: [],
							bowlers: {},
							pins: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
						},
					};
				});
				response = { response: true };
			} else if (jsonData.command === "set_bowlers") {
				if (!lanes[lane]) {
					response = { response: null };
				} else {
					lanes[lane].data.bowlerAmt = jsonData.bowlers;
					const broadcast = { command: "set_bowlers", response: true, bowlers: jsonData.bowlers };
					sendmsg(lanes[lane].user, lane, type, broadcast);
					sendmsg(lanes[lane].tv, lane, type, broadcast);
					response = { response: true, bowlers: jsonData.bowlers };
				}
			} else if (jsonData.command === "set_games") {
				if (!lanes[lane]) {
					response = { response: null };
				} else {
					lanes[lane].data.gamesAmt = jsonData.games;
					const broadcast = { command: "get_games", response: true, games: jsonData.games };
					sendmsg(lanes[lane].user, lane, type, broadcast);
					sendmsg(lanes[lane].tv, lane, type, broadcast);
					response = { response: true };
				}
			}
		} else {
			// Share current lanes with admin
			update_lanes(lane, lanes);
		}

		if (response) sendmsg(ws, lane, type, { command: jsonData.command, ...response }, admin);
	});

	ws.on("close", () => {
		if (lane && type) lanes[lane][type] = null;
		console.log(`\x1b[31m×\x1b[0m [${console_prefix(lane, type, admin)}]`);
		if (admin) {
			// adminSocket = null;
			const index = adminSockets.indexOf(ws);
			if (index > -1) adminSockets.splice(index, 1);
		}
		update_lanes(lane, lanes);
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

const admin_lanes = (lanes: LanesType): AdminLanesType => {
	let new_lanes: AdminLanesType = {};
	Object.keys(lanes).forEach((lane: string) => {
		new_lanes[+lane] = {
			tv: !!lanes[+lane].tv,
			user: !!lanes[+lane].user,
			data: lanes[+lane].data,
		};
	});
	return new_lanes;
}

const update_lanes = (lane: number, lanes: LanesType) => {
	let new_lanes: AdminLanesType = admin_lanes(lanes);
	adminSockets.forEach((socket) => {
		sendmsg(socket, lane, "admin", { command: "update_lanes", lanes: new_lanes });
	});
};

const bowlPins = (lane: number, pins_knocked: PinsType) => {
	const data = lanes[lane].data;

	if (data.currentFrame === 11) return;
	else setTimeout(() => bowlPins(lane, randomPins(lane)), 100); // removable

	const pins_amt = pins_knocked.length;
	let reset_pins = pins_amt === data.pins.length;
	pins_knocked.forEach((pin_num) => {
		const index = data.pins.indexOf(pin_num);
		if (index > -1) data.pins.splice(index, 1);
	});

	const frames = data.bowlers[data.currentBowler].frames;
	const next_frame = frames.length ?? 0;
	const last_frame = next_frame - 1;
	let next_player = false;
	if (frames.length === 0) {
		if (pins_amt === 10) {
			data.bowlers[data.currentBowler].frames[0] = [10, 0];
			next_player = true;
		} else data.bowlers[data.currentBowler].frames[0] = [pins_amt];
	} else if (frames.length < 10) {
		if (frames[last_frame].length === 1) {
			data.bowlers[data.currentBowler].frames[last_frame] = [frames[last_frame][0], pins_amt];
			next_player = true;
		} else if (frames[last_frame].length === 2) {
			if (pins_amt === 10) {
				if (frames[8]) data.bowlers[data.currentBowler].frames[next_frame] = [10];
				else data.bowlers[data.currentBowler].frames[next_frame] = [10, 0];
				if (next_frame < 9) next_player = true;
			} else data.bowlers[data.currentBowler].frames[next_frame] = [pins_amt];
		}
	} else if (frames[9].length === 1) {
		data.bowlers[data.currentBowler].frames[9] = [frames[9][0], pins_amt];
		if (frames[9][0] !== 10 && frames[9][0] + pins_amt !== 10) next_player = true;
	} else if (frames[9].length === 2 && (frames[9][0] === 10 || frames[9][0] + frames[9][1] === 10)) {
		data.bowlers[data.currentBowler].frames[9] = [frames[9][0], frames[9][1], pins_amt];
		next_player = true;
	}
	if (next_player) {
		reset_pins = true;
		const bowler_names = Object.keys(data.bowlers);
		const next_index = bowler_names.indexOf(data.currentBowler) + 1;
		const back_to_start = next_index >= bowler_names.length;
		if (back_to_start) data.currentFrame++;
		data.currentBowler = bowler_names[back_to_start ? 0 : next_index];
	}
	if (reset_pins) data.pins = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

	const broadcast = { command: "bowl_pins", response: true, pins_knocked };
	sendmsg(lanes[lane].user, lane, "pins", broadcast);
	sendmsg(lanes[lane].tv, lane, "pins", broadcast);

	update_lanes(lane, lanes);
};

const randomPins = (lane: number) => {
	// Only for testing purposes
	const data = lanes[lane].data;

	const frames = data.bowlers[data.currentBowler].frames;
	const last_frame = frames.at(-1) ?? [];
	const amt = Math.round(Math.random() * (10 - (last_frame.at(-1) ?? 0)));

	let returned_pins: PinsType = [];
	const possible_pins: PinsType = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
	for (let i = 0; i < amt; i++) {
		let random = 0;
		while (returned_pins.includes(random)) {
			random = possible_pins[Math.floor(Math.random() * possible_pins.length)];
		}
		returned_pins.push(random);
	}
	return returned_pins;
};
