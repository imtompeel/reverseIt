import { v4 as uuid } from "uuid";
import type { GameState, Player, RoundState } from "./types";

const games = new Map<string, GameState>();

function currentMimicId(round: RoundState): string | undefined {
  return round.mimicQueue[0];
}

function assignRoles(game: GameState) {
  const round = game.round;
  if (!round) return;

  const mimicId = currentMimicId(round);

  for (const player of game.players) {
    if (player.id === round.originalPlayerId) {
      player.role = game.phase === "recording_original" ? "original" : "waiting";
    } else if (player.id === mimicId && game.phase === "recording_mimic") {
      player.role = "mimic";
    } else {
      player.role = "waiting";
    }
  }
}

function beginRound(game: GameState, roundNumber: number) {
  const n = game.players.length;
  const offset = (roundNumber - 1) % n;
  const speaker = game.players[offset % n]!;

  const mimickerIds = game.players
    .filter((p) => p.id !== speaker.id)
    .map((p) => p.id);

  const round: RoundState = {
    roundNumber,
    originalPlayerId: speaker.id,
    mimicQueue: [...mimickerIds],
    mimickerIds,
    mimics: [],
  };

  game.round = round;
  game.phase = "recording_original";
  assignRoles(game);
}

export function createGame(hostName: string, hostSocketId: string): GameState {
  const hostId = uuid();
  const game: GameState = {
    id: uuid().slice(0, 8).toUpperCase(),
    hostId,
    players: [
      {
        id: hostId,
        name: hostName,
        socketId: hostSocketId,
        role: "waiting",
      },
    ],
    phase: "lobby",
    round: null,
    maxRounds: 3,
    createdAt: Date.now(),
  };
  games.set(game.id, game);
  return game;
}

export function getGame(id: string): GameState | undefined {
  return games.get(id.toUpperCase());
}

export function joinGame(
  gameId: string,
  name: string,
  socketId: string
): { game: GameState } | { error: string } {
  const game = getGame(gameId);
  if (!game) return { error: "Game not found" };
  if (game.phase !== "lobby") return { error: "Game already in progress" };
  if (game.players.length >= 12) return { error: "Game is full" };
  if (game.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    return { error: "Name already taken" };
  }

  const player: Player = {
    id: uuid(),
    name,
    socketId,
    role: "waiting",
  };
  game.players.push(player);
  return { game };
}

function handlePlayerRemovedFromRound(game: GameState, removedPlayerId: string) {
  const round = game.round;
  if (!round) return;

  if (removedPlayerId === round.originalPlayerId) {
    game.phase = "lobby";
    game.round = null;
    game.players.forEach((p) => (p.role = "waiting"));
    return;
  }

  round.mimicQueue = round.mimicQueue.filter((id) => id !== removedPlayerId);
  round.mimickerIds = round.mimickerIds.filter((id) => id !== removedPlayerId);
  round.mimics = round.mimics.filter((m) => m.playerId !== removedPlayerId);

  if (game.phase === "recording_mimic") {
    if (round.mimicQueue.length === 0) {
      game.phase = "reveal";
      assignRoles(game);
    } else {
      assignRoles(game);
    }
  }
}

export function removePlayer(socketId: string): GameState | null {
  for (const game of games.values()) {
    const idx = game.players.findIndex((p) => p.socketId === socketId);
    if (idx === -1) continue;

    const removed = game.players[idx]!;
    const wasHost = removed.id === game.hostId;
    game.players.splice(idx, 1);

    if (game.players.length === 0) {
      games.delete(game.id);
      return null;
    }

    if (wasHost) {
      game.hostId = game.players[0]!.id;
    }

    if (game.phase === "lobby") return game;

    if (game.players.length < 2) {
      game.phase = "lobby";
      game.round = null;
      game.players.forEach((p) => (p.role = "waiting"));
      return game;
    }

    handlePlayerRemovedFromRound(game, removed.id);
    return game;
  }
  return null;
}

export function startGame(gameId: string, hostPlayerId: string): { error?: string } {
  const game = getGame(gameId);
  if (!game) return { error: "Game not found" };
  if (game.hostId !== hostPlayerId) return { error: "Only the host can start" };
  if (game.players.length < 2) {
    return { error: "Need at least 2 players to start" };
  }
  beginRound(game, 1);
  return {};
}

export function setOriginalAudio(
  gameId: string,
  playerId: string,
  audio: string,
  reversedAudio: string,
  phrase?: string
): { error?: string } {
  const game = getGame(gameId);
  if (!game?.round) return { error: "Invalid game state" };
  if (game.phase !== "recording_original") return { error: "Not the right phase" };
  if (game.round.originalPlayerId !== playerId) return { error: "Not your turn" };

  game.round.originalAudio = audio;
  game.round.reversedAudio = reversedAudio;
  if (phrase) game.round.originalPhrase = phrase.trim();
  game.phase = "recording_mimic";
  assignRoles(game);
  return {};
}

export function setMimicAudio(
  gameId: string,
  playerId: string,
  audio: string,
  reversedAudio: string
): { error?: string } {
  const game = getGame(gameId);
  if (!game?.round) return { error: "Invalid game state" };
  if (game.phase !== "recording_mimic") return { error: "Not the right phase" };
  if (currentMimicId(game.round) !== playerId) return { error: "Not your turn" };

  game.round.mimics.push({ playerId, audio, reversedAudio });
  game.round.mimicQueue.shift();

  if (game.round.mimicQueue.length > 0) {
    assignRoles(game);
  } else {
    game.phase = "reveal";
    assignRoles(game);
  }
  return {};
}

export function nextRound(gameId: string, hostPlayerId: string): { error?: string } {
  const game = getGame(gameId);
  if (!game) return { error: "Game not found" };
  if (game.hostId !== hostPlayerId) return { error: "Only the host can continue" };
  if (game.phase !== "reveal") return { error: "Round not finished" };

  const next = (game.round?.roundNumber ?? 0) + 1;
  if (next > game.maxRounds) {
    game.phase = "finished";
    game.round = null;
    game.players.forEach((p) => (p.role = "waiting"));
    return {};
  }

  beginRound(game, next);
  return {};
}

export function backToLobby(gameId: string, hostPlayerId: string): { error?: string } {
  const game = getGame(gameId);
  if (!game) return { error: "Game not found" };
  if (game.hostId !== hostPlayerId) return { error: "Only the host can reset" };

  game.phase = "lobby";
  game.round = null;
  game.players.forEach((p) => (p.role = "waiting"));
  return {};
}
