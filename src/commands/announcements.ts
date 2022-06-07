import { BetterEmbed } from '../utility/BetterEmbed';
import {
    BucketScope,
    Command,
    RegisterBehavior,
} from '@sapphire/framework';
import { ChannelTypes } from 'discord.js/typings/enums';
import {
    Formatters,
    NewsChannel,
    Permissions,
    TextChannel,
} from 'discord.js';
import { Log } from '../utility/Log';
import { Options } from '../utility/Options';
import process from 'node:process';

export class AnnouncementsCommand extends Command {
    public constructor(context: Command.Context, options: Command.Options) {
        super(context, {
            ...options,
            name: 'announcements',
            description: 'Configure what announcements you want to receive',
            cooldownLimit: 3,
            cooldownDelay: 10000,
            cooldownScope: BucketScope.Guild,
            preconditions: [
                'Base',
                'DevMode',
                'GuildOnly',
            ],
        });
    }

    public override registerApplicationCommands(registry: Command.Registry) {
        registry.registerChatInputCommand({
            name: 'announcements',
            description: 'Configure what announcements you want to receive',
            options: [
                {
                    name: 'general',
                    description: 'General Hypixel News and Announcements',
                    type: 1,
                    options: [
                        {
                            name: 'channel',
                            type: 7,
                            channel_types: [ChannelTypes.GUILD_TEXT],
                            description: 'The channel where Hypixel News and Announcements should be toggled',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'skyblock',
                    description: 'SkyBlock Patch Notes',
                    type: 1,
                    options: [
                        {
                            name: 'channel',
                            type: 7,
                            channel_types: [ChannelTypes.GUILD_TEXT],
                            description: 'The channel where SkyBlock Patch Notes should be toggled',
                            required: true,
                        },
                    ],
                },
                {
                    name: 'moderation',
                    description: 'Moderation Information and Changes',
                    type: 1,
                    options: [
                        {
                            name: 'channel',
                            type: 7,
                            channel_types: [ChannelTypes.GUILD_TEXT],
                            description: 'The channel where Moderation Information and Changes should be toggled',
                            required: true,
                        },
                    ],
                },
            ],
        }, {
            guildIds: this.options.preconditions?.find(
                    condition => condition === 'OwnerOnly',
                )
                ? JSON.parse(process.env.OWNER_GUILDS!) as string[]
                : undefined, // eslint-disable-line no-undefined
            registerCommandIfMissing: true,
            behaviorWhenNotIdentical: RegisterBehavior.Overwrite,
        });
    }

    public async chatInputRun(interaction: Command.ChatInputInteraction) {
        if (!interaction.inCachedGuild()) {
            return;
        }

        const { i18n } = interaction;

        const channel = interaction.options.getChannel('channel', true) as TextChannel;

        const userHasPermission = channel
            .permissionsFor(interaction.member)
            .has([
                Permissions.FLAGS.MANAGE_WEBHOOKS,
            ]);

        if (userHasPermission === false) {
            const missingPermission = new BetterEmbed(interaction)
                .setColor(Options.colorsWarning)
                .setTitle(
                    i18n.getMessage(
                        'commandsAnnouncementsUserMissingPermissionTitle',
                    ),
                )
                .setDescription(
                    i18n.getMessage(
                        'commandsAnnouncementsUserMissingPermissionDescription',
                    ),
                );

            Log.command(
                interaction,
                'User missing permission',
            );

            await interaction.editReply({
                embeds: [missingPermission],
            });

            return;
        }

        const BotMissingPermissions = channel
            .permissionsFor(interaction.guild.me!)
            .missing([
                Permissions.FLAGS.VIEW_CHANNEL,
                Permissions.FLAGS.MANAGE_WEBHOOKS,
            ]);

        if (BotMissingPermissions.length !== 0) {
            const missingPermission = new BetterEmbed(interaction)
                .setColor(Options.colorsWarning)
                .setTitle(
                    i18n.getMessage(
                        'commandsAnnouncementsBotMissingPermissionTitle',
                    ),
                )
                .setDescription(
                    i18n.getMessage(
                        'commandsAnnouncementsBotMissingPermissionDescription', [
                            BotMissingPermissions.join(', '),
                        ],
                    ),
                );

            Log.command(interaction, 'Bot missing permission(s)');

            await interaction.editReply({
                embeds: [missingPermission],
            });

            return;
        }

        const type = interaction.options.getSubcommand() === 'general'
            ? 'News and Announcements'
            : interaction.options.getSubcommand() === 'skyblock'
                ? 'SkyBlock Patch Notes'
                : 'Moderation Information and Changes';

        const channels = JSON.parse(process.env.ANNOUNCEMENTS!);
        const announcementID = channels[type].id as string;

        const oldWebhooks = await channel.fetchWebhooks();
        const existingAnnouncementWebhook = oldWebhooks
            .filter(webhook => webhook.sourceChannel?.id === announcementID)
            .first();

        if (typeof existingAnnouncementWebhook === 'undefined') {
            //Add webhook

            const newsChannel = await interaction.client.channels.fetch(
                announcementID,
            ) as NewsChannel;

            await newsChannel.addFollower(channel);
            const webhooks = await channel.fetchWebhooks();

            const announcementWebhook = webhooks
                .filter(webhook => webhook.sourceChannel?.id === announcementID)
                .first()!;

            await announcementWebhook.edit({
                name: type,
                avatar: interaction.client.user?.avatarURL(),
            });

            const addEmbed = new BetterEmbed(interaction)
                .setColor(Options.colorsNormal)
                .setTitle(
                    i18n.getMessage(
                        'commandsAnnouncementsAddTitle', [
                        type,
                    ]),
                )
                .setDescription(
                    i18n.getMessage(
                        'commandsAnnouncementsAddDescription', [
                            type,
                            Formatters.channelMention(channel.id),
                        ],
                    ),
                );

            Log.command(
                interaction,
                i18n.getMessage(
                    'commandsAnnouncementsAddLog', [
                        type,
                        channel.id,
                    ],
                ),
            );

            await interaction.editReply({ embeds: [addEmbed] });
        } else {
            //Remove webhook

            await existingAnnouncementWebhook.delete();

            const removeEmbed = new BetterEmbed(interaction)
                .setColor(Options.colorsNormal)
                .setTitle(
                    i18n.getMessage(
                        'commandsAnnouncementsRemoveTitle', [
                            type,
                        ],
                    ),
                )
                .setDescription(
                    i18n.getMessage(
                        'commandsAnnouncementsRemoveDescription', [
                            type,
                            Formatters.channelMention(channel.id),
                        ],
                    ),
                );

            Log.command(
                interaction,
                i18n.getMessage(
                    'commandsAnnouncementsRemoveLog', [
                        type,
                        channel.id,
                    ],
                ),
            );

            await interaction.editReply({ embeds: [removeEmbed] });
        }
    }
}