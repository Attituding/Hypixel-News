import { BaseInteractionErrorHandler } from './BaseCommandErrorHandler';
import { BetterEmbed } from '../utility/BetterEmbed';
import {
    ColorResolvable,
    CommandInteraction,
} from 'discord.js';
import { Constants } from '../utility/constants1';
import { ConstraintError } from './ConstraintError';
import { ErrorHandler } from './ErrorHandler';
import { Severity } from '@sentry/node';

export class CommandConstraintErrorHandler
    extends BaseInteractionErrorHandler<ConstraintError> {
    readonly interaction: CommandInteraction;

    constructor(
        error: ConstraintError,
        interaction: CommandInteraction,
    ) {
        super(error, interaction);
        this.interaction = interaction;
    }

    init() {
        try {
            this.log(this.i18n.getMessage(
                'errorsInteractionConstraintLog',
                [
                    this.interaction.user.id,
                    this.error.message,
                ],
            ));

            this.sentry
                .setSeverity(Severity.Warning)
                .commandInteractionConstraintContext(this.error.message)
                .captureMessages(this.error.message);
        } catch (error) {
            new ErrorHandler(error, this.incidentID).init();
        }
    }

    static async resolveConstraint(
        interaction: CommandInteraction,
        title: string,
        description: string,
        color?: ColorResolvable,
    ) {
        const embed = new BetterEmbed(interaction)
            .setColor(color ?? Constants.colors.warning)
            .setTitle(title)
            .setDescription(description);

        await interaction.editReply({
            embeds: [embed],
        });
    }
}