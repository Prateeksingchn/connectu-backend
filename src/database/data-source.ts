/**
 * DataSource used by the TypeORM CLI (migration:generate / migration:run /
 * migration:revert — see package.json scripts). Mirrors the connection
 * options AppModule passes to TypeOrmModule.forRoot in app.module.ts: same
 * env vars, same entities list. Kept in sync manually since the CLI cannot
 * read a NestJS-built TypeOrmModule config directly.
 */
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from '../users/user.entity';
import { Role } from '../profile-config/roles/role.entity';
import { Gender } from '../profile-config/genders/gender.entity';
import { Interest } from '../profile-config/interests/interest.entity';
import { Hobby } from '../profile-config/hobbies/hobbies.entity';
import { TechStack } from '../profile-config/tech-stack/tech-stack.entity';
import { ChatRoom } from '../matching/entities/chat-room.entity';
import { Friendship } from '../friends/friendships/entities/friendship.entity';
import { ChatRoomRequest } from '../friends/chat-rooms/entities/chat-room-request.entity';
import { FriendChatRoom } from '../friends/chat-rooms/entities/friend-chat-room.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Role,
    Gender,
    Interest,
    Hobby,
    TechStack,
    ChatRoom,
    Friendship,
    ChatRoomRequest,
    FriendChatRoom,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
