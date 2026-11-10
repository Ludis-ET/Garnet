import { Inject, Injectable } from "@nestjs/common";
import { RealtimeHub } from "../realtime/hub";

export interface ChatEvent {
  relationshipId: string;
  senderId: string;
  type:
    | "message_received"
    | "message_edited"
    | "message_deleted"
    | "reaction_updated"
    | "pin_updated"
    | "typing"
    | "presence";
  payload: unknown;
}

/**
 * Chat's events, sent through the realtime hub (P-100) so they reach the partner whichever API
 * process holds their connection, by WebSocket or by the SSE stream.
 */
@Injectable()
export class ChatEventsService {
  constructor(@Inject(RealtimeHub) private readonly hub: RealtimeHub) {}

  emit(event: ChatEvent): void {
    this.hub.publish(event);
  }

  subscribe(relationshipId: string, listener: (event: ChatEvent) => void): () => void {
    return this.hub.subscribe(relationshipId, (event) => {
      listener(event as ChatEvent);
    });
  }
}
