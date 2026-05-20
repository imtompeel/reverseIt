export type GamePhase =
  | "lobby"
  | "recording_original"
  | "recording_mimic"
  | "reveal"
  | "finished";

export type PlayerRole = "original" | "mimic" | "waiting";

export interface Player {
  id: string;
  name: string;
  socketId: string;
  role: PlayerRole;
}

export interface MimicAttempt {
  playerId: string;
  audio: string;
  reversedAudio: string;
}

export interface RoundState {
  roundNumber: number;
  originalPlayerId: string;
  /** Player ids still waiting to mimic (first is current) */
  mimicQueue: string[];
  /** All non-speaker ids in turn order */
  mimickerIds: string[];
  mimics: MimicAttempt[];
  originalAudio?: string;
  reversedAudio?: string;
  originalPhrase?: string;
}

export interface GameState {
  id: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  round: RoundState | null;
  maxRounds: number;
  createdAt: number;
}

export interface ClientMimicAttempt {
  playerId: string;
  playerName: string;
  reversedAudio: string;
}

export interface ClientRoundState {
  roundNumber: number;
  originalPlayerId: string;
  currentMimicPlayerId?: string;
  mimickerIds: string[];
  completedMimicPlayerIds: string[];
  mimics?: ClientMimicAttempt[];
  originalPhrase?: string;
  originalAudio?: string;
  reversedAudio?: string;
}

export interface ClientGameState {
  id: string;
  hostId: string;
  players: Omit<Player, "socketId">[];
  phase: GamePhase;
  round: ClientRoundState | null;
  maxRounds: number;
  myPlayerId: string;
  myRole: PlayerRole;
  /** Audio the current player should hear (base64 data URL) */
  audioToPlay?: string;
  canAct: boolean;
}
