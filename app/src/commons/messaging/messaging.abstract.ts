export abstract class MessagingService {
    abstract emitEvent(data: any): Promise<void>;
}