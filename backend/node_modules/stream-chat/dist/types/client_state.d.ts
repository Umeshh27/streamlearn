import { UserResponse, ExtendableGenerics, DefaultGenerics } from './types';
import { StreamChat } from './client';
/**
 * ClientState - A container class for the client state.
 */
export declare class ClientState<StreamChatGenerics extends ExtendableGenerics = DefaultGenerics> {
    private client;
    users: {
        [key: string]: UserResponse<StreamChatGenerics>;
    };
    userChannelReferences: {
        [key: string]: {
            [key: string]: boolean;
        };
    };
    constructor({ client }: {
        client: StreamChat<StreamChatGenerics>;
    });
    updateUsers(users: UserResponse<StreamChatGenerics>[]): void;
    updateUser(user?: UserResponse<StreamChatGenerics>): void;
    updateUserReference(user: UserResponse<StreamChatGenerics>, channelID: string): void;
    deleteAllChannelReference(channelID: string): void;
}
//# sourceMappingURL=client_state.d.ts.map