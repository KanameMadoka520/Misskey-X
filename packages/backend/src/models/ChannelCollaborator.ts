/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiUser } from './User.js';
import { MiChannel } from './Channel.js';

@Entity('channel_collaborator')
@Index(['channelId', 'userId'], { unique: true })
export class MiChannelCollaborator {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column({
		...id(),
		comment: 'The channel ID.',
	})
	public channelId: MiChannel['id'];

	@ManyToOne(() => MiChannel, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public channel: MiChannel | null;

	@Index()
	@Column({
		...id(),
		comment: 'The collaborator user ID.',
	})
	public userId: MiUser['id'];

	@ManyToOne(() => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;
}

