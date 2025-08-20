// Updated SMS service with read/unread tracking enabled
// Use this to replace the current sms-service.ts after adding read_at column

// Key changes needed in sms-service.ts:

// 1. Restore checkForNewMessages with read_at filter:
async checkForNewMessages() {
  try {
    const { data: newMessages, error } = await supabase
      .from('communications')
      .select('*')
      .eq('type', 'sms')
      .eq('direction', 'inbound')
      .is('read_at', null)  // ✅ This will work after adding column
      .order('created_at', { ascending: false })
      .limit(10);
    
    // ... rest of the function
  } catch (error) {
    console.error('Error checking for new messages:', error);
  }
}

// 2. Restore readAt field mapping:
readAt: msg.read_at ? new Date(msg.read_at) : undefined  // ✅ Works with column

// 3. Restore unreadCount calculation:
unreadCount: messages?.filter(m => m.direction === 'inbound' && !m.read_at).length || 0  // ✅ Works

// 4. Restore markAsRead database update:
async markAsRead(phoneNumber: string): Promise<void> {
  try {
    await supabase
      .from('communications')
      .update({ read_at: new Date().toISOString() })  // ✅ Works with column
      .eq('phone_number', phoneNumber)
      .eq('type', 'sms')
      .eq('direction', 'inbound')
      .is('read_at', null);

    // Update cache
    if (this.conversations.has(phoneNumber)) {
      const conversation = this.conversations.get(phoneNumber)!;
      conversation.unreadCount = 0;
      conversation.messages.forEach(msg => {
        if (msg.direction === 'inbound' && !msg.readAt) {
          msg.readAt = new Date();
        }
      });
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
}