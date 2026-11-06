import { Injectable } from "@nestjs/common";
import { EventEmitter } from "node:events";

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

@Injectable()
export class ChatEventsService {
  private readonly emitter = new EventEmitter();

  emit(event: ChatEvent): void {
    this.emitter.emit(`rel:${event.relationshipId}`, event);
  }

  subscribe(relationshipId: string, listener: (event: ChatEvent) => void): () => void {
    const channel = `rel:${relationshipId}`;
    this.emitter.on(channel, listener);
    return () => {
      this.emitter.off(channel, listener);
    };
  }
}
