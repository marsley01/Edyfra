export interface StreamChatRoomProps {
  channelId: string;
  userId: string;
  userName: string;
  userImage?: string;
  memberIds?: string[];
  channelName?: string;
  hideHeader?: boolean;
  mashAI?: {
    tier?: string;
    subject: string;
    topic?: string;
  };
}

export type CallState =
  | "idle"
  | "starting"
  | "joining"
  | "joined"
  | "ended"
  | "error";

export interface MashAIMentionMeta {
  tier?: string;
  subject: string;
  topic?: string;
}
