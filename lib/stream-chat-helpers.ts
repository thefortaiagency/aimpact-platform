import { StreamChat, Channel } from 'stream-chat';

export async function ensureDefaultChannels(client: StreamChat, userId: string) {
  try {
    console.log('Ensuring default channels for user:', userId);
    
    // Try to create/watch general channel, but don't fail if permissions denied
    try {
      const generalChannel = client.channel('team', 'general', {
        name: 'General',
        description: 'General discussion channel',
        created_by_id: userId,
      });
      
      await generalChannel.watch();
      
      // Make sure user is a member
      if (!generalChannel.state.members[userId]) {
        await generalChannel.addMembers([userId]);
      }
    } catch (channelError: any) {
      // If it's a permissions error, just log it and continue
      if (channelError.message?.includes('not allowed to perform action')) {
        console.log('User does not have permission for team channels, skipping...');
      } else {
        console.error('Error with general channel:', channelError);
      }
    }
    
    console.log('Default channels check completed for user:', userId);
    return true;
  } catch (error) {
    console.error('Error ensuring default channels:', error);
    // Don't fail the whole app just because of channel permissions
    return true;
  }
}

export async function createDirectMessage(
  client: StreamChat, 
  userId1: string, 
  userId2: string
): Promise<Channel | null> {
  try {
    // Create a unique channel ID for the DM
    const channelId = [userId1, userId2].sort().join('_');
    
    const channel = client.channel('messaging', channelId, {
      members: [userId1, userId2],
    });
    
    await channel.watch();
    
    return channel;
  } catch (error) {
    console.error('Error creating direct message:', error);
    return null;
  }
}