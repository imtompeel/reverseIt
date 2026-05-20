import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type { ClientGameState, ClientRoundState, GameState, PlayerRole } from "./types";
import * as store from "./game-store";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, {
    path: "/api/socket",
    cors: { origin: "*" },
    maxHttpBufferSize: 15e6,
  });

  io.on("connection", (socket) => {
    let currentGameId: string | null = null;
    let currentPlayerId: string | null = null;

    socket.on("create_game", ({ name }: { name: string }) => {
      const game = store.createGame(name.trim() || "Host", socket.id);
      currentGameId = game.id;
      currentPlayerId = game.hostId;
      socket.join(game.id);
      socket.emit("game_state", toClientState(game, currentPlayerId));
    });

    socket.on("join_game", ({ gameId, name }: { gameId: string; name: string }) => {
      const result = store.joinGame(gameId, name.trim() || "Player", socket.id);
      if ("error" in result) {
        socket.emit("error", { message: result.error });
        return;
      }
      const player = result.game.players.find((p) => p.socketId === socket.id)!;
      currentGameId = result.game.id;
      currentPlayerId = player.id;
      socket.join(result.game.id);
      broadcastGame(result.game.id);
    });

    socket.on("start_game", () => {
      if (!currentGameId || !currentPlayerId) return;
      const result = store.startGame(currentGameId, currentPlayerId);
      if (result.error) {
        socket.emit("error", { message: result.error });
        return;
      }
      broadcastGame(currentGameId);
    });

    socket.on(
      "submit_original",
      ({ audio, reversedAudio, phrase }: { audio: string; reversedAudio: string; phrase?: string }) => {
        if (!currentGameId || !currentPlayerId) return;
        const result = store.setOriginalAudio(
          currentGameId,
          currentPlayerId,
          audio,
          reversedAudio,
          phrase
        );
        if (result.error) {
          socket.emit("error", { message: result.error });
          return;
        }
        broadcastGame(currentGameId);
      }
    );

    socket.on(
      "submit_mimic",
      ({ audio, reversedAudio }: { audio: string; reversedAudio: string }) => {
      if (!currentGameId || !currentPlayerId) return;
      const result = store.setMimicAudio(
        currentGameId,
        currentPlayerId,
        audio,
        reversedAudio
      );
      if (result.error) {
        socket.emit("error", { message: result.error });
        return;
      }
      broadcastGame(currentGameId);
    });

    socket.on("next_round", () => {
      if (!currentGameId || !currentPlayerId) return;
      const result = store.nextRound(currentGameId, currentPlayerId);
      if (result.error) {
        socket.emit("error", { message: result.error });
        return;
      }
      broadcastGame(currentGameId);
    });

    socket.on("back_to_lobby", () => {
      if (!currentGameId || !currentPlayerId) return;
      const result = store.backToLobby(currentGameId, currentPlayerId);
      if (result.error) {
        socket.emit("error", { message: result.error });
        return;
      }
      broadcastGame(currentGameId);
    });

    socket.on("disconnect", () => {
      const updated = store.removePlayer(socket.id);
      if (updated) broadcastGame(updated.id);
    });
  });

  return io;
}

function broadcastGame(gameId: string) {
  const game = store.getGame(gameId);
  if (!game || !io) return;

  for (const player of game.players) {
    const socket = io.sockets.sockets.get(player.socketId);
    if (socket) {
      socket.emit("game_state", toClientState(game, player.id));
    }
  }
}

function playerName(game: GameState, playerId: string): string {
  return game.players.find((p) => p.id === playerId)?.name ?? "Player";
}

function toClientRound(game: GameState): ClientRoundState | null {
  const round = game.round;
  if (!round) return null;

  const currentMimicPlayerId = round.mimicQueue[0];
  const completedMimicPlayerIds = round.mimics.map((m) => m.playerId);

  const base: ClientRoundState = {
    roundNumber: round.roundNumber,
    originalPlayerId: round.originalPlayerId,
    currentMimicPlayerId,
    mimickerIds: round.mimickerIds,
    completedMimicPlayerIds,
  };

  if (game.phase === "reveal" || game.phase === "finished") {
    return {
      ...base,
      originalPhrase: round.originalPhrase,
      originalAudio: round.originalAudio,
      mimics: round.mimics.map((m) => ({
        playerId: m.playerId,
        playerName: playerName(game, m.playerId),
        reversedAudio: m.reversedAudio,
      })),
    };
  }

  return base;
}

function toClientState(game: GameState, playerId: string): ClientGameState {
  const me = game.players.find((p) => p.id === playerId);
  const myRole: PlayerRole = me?.role ?? "waiting";
  const round = game.round;

  let audioToPlay: string | undefined;
  let canAct = false;

  switch (game.phase) {
    case "recording_original":
      canAct = myRole === "original";
      break;
    case "recording_mimic":
      canAct = myRole === "mimic";
      if (myRole === "mimic") audioToPlay = round?.reversedAudio;
      break;
    default:
      break;
  }

  return {
    id: game.id,
    hostId: game.hostId,
    players: game.players.map(({ socketId: _, ...p }) => p),
    phase: game.phase,
    round: toClientRound(game),
    maxRounds: game.maxRounds,
    myPlayerId: playerId,
    myRole,
    audioToPlay,
    canAct,
  };
}
