import {
    ChatInputCommandErrorPayload,
    Events,
    Listener,
} from '@sapphire/framework';
import { InteractionErrorHandler } from '../errors/InteractionErrorHandler';

export class CommandErrorListener extends Listener {
    public constructor(context: Listener.Context, options: Listener.Options) {
        super(context, {
            ...options,
            once: false,
            event: Events.ChatInputCommandError,
        });
    }

    public async run(error: Error, payload: ChatInputCommandErrorPayload) {
        await InteractionErrorHandler.init(
            error,
            payload.interaction,
        );
    }
}