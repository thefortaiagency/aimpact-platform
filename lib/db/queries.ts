import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
  InferInsertModel,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { withDatabaseErrorHandling } from './error-wrapper';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
  stream,
  posts,
  users,
  type User1,
  type User1Insert,
  type Post,
  type Like,
  type LikeInsert,
  type Comment,
  type CommentInsert,
  comments,
  likes,
  bookmarks,
  bookmarks1,
  trainingCategories,
  trainingSessions,
  userTrainingEnrollments,
  news,
  contentSpotItems,
  bugReports, BugReportInsert
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from '../password-utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { resolveViewport } from 'next/dist/lib/metadata/resolve-metadata';
import { LayoutSettingsRequestNameEnum } from '@stream-io/video-react-sdk';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  return withDatabaseErrorHandling(
    async () => {
      return await db.select().from(user).where(eq(user.email, email));
    },
    `getUser(${email})`
  );
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);

  try {
    return await db.insert(user).values({ email, password: hashedPassword }).returning();
  } catch (error) {
    console.error('Failed to create user in database');
    throw error;
  }
}

//No longer needed - guest users are handled client-side only
export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  try {
    return await db.insert(user).values({ email, password }).returning({
      id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Failed to create guest user in database');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
      visibility,
    });
  } catch (error) {
    console.error('Failed to save chat in database');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    await db.delete(stream).where(eq(stream.chatId, id));

    const [chatsDeleted] = await db
      .delete(chat)
      .where(eq(chat.id, id))
      .returning();
    return chatsDeleted;
  } catch (error) {
    console.error('Failed to delete chat by id from database');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<any>) =>
      db
        .select()
        .from(chat)
        .where(
          whereCondition
            ? and(whereCondition, eq(chat.userId, id))
            : eq(chat.userId, id),
        )
        .orderBy(desc(chat.createdAt))
        .limit(extendedLimit);

    let filteredChats: Array<Chat> = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chat)
        .where(eq(chat.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new Error(`Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;

    return {
      chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
      hasMore,
    };
  } catch (error) {
    console.error('Failed to get chats by user from database');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error('Failed to save messages in database', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    return await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Failed to get message by id from database');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const messagesToDelete = await db
      .select({ id: message.id })
      .from(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );

    const messageIds = messagesToDelete.map((message) => message.id);

    if (messageIds.length > 0) {
      await db
        .delete(vote)
        .where(
          and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
        );

      return await db
        .delete(message)
        .where(
          and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
        );
    }
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from database',
    );
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Failed to update chat visibility in database');
    throw error;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const twentyFourHoursAgo = new Date(
      Date.now() - differenceInHours * 60 * 60 * 1000,
    );

    const [stats] = await db
      .select({ count: count(message.id) })
      .from(message)
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(
        and(
          eq(chat.userId, id),
          gte(message.createdAt, twentyFourHoursAgo),
          eq(message.role, 'user'),
        ),
      )
      .execute();

    return stats?.count ?? 0;
  } catch (error) {
    console.error(
      'Failed to get message count by user id for the last 24 hours from database',
    );
    throw error;
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    console.error('Failed to create stream id in database');
    throw error;
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(desc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (error) {
    console.error('Failed to get stream ids by chat id from database');
    throw error;
  }
}




// New query to get the 5 most recent posts
export async function getRecentPosts() {
  try {
    return await db
      .select({
        post: posts,
        user: users,
      })
      .from(posts)
      .innerJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(5);
  } catch (error) {
    console.error('Failed to get recent posts from database', error);
    throw error;
  }
}

// Fetch recent posts along with their author info
export async function getRecentPostsWithAuthors(limit = 5) {
  try {
    const rows = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        createdAt: posts.createdAt,
        userId: posts.userId,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit)

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt,
      userId: row.userId,
      author: {
        id: row.authorId,
        name:
          row.authorName ||
          row.authorHandle ||
          row.authorImage ||
          "Anonymous",
        handle: row.authorHandle || "user",
        image: row.authorImage ?? null,
      },
    }))
  } catch (error) {
    console.error("Error fetching recent posts with authors:", error)
    throw error
  }
}


// Fetch recent posts with author info, with a variable limit
export async function getRecentPostsWithAuthors1(limit: number = 5) {
  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      userId: posts.userId,
      authorId: users.id,
      authorName: users.name,
      authorHandle: users.handle,
      authorImage: users.image,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    userId: row.userId,
    author: {
      id: row.authorId,
      name: row.authorName,
      handle: row.authorHandle,
      image: row.authorImage,
    },
  }))
}

type NewPost = InferInsertModel<typeof posts>

// Insert a new post into the Post table
export async function createPost(postData: {
  userId: string
  content: string
}): Promise<Post> {
  try {
    const newPost: NewPost = {
      //id: uuidv4(),
      userId: postData.userId,
      content: postData.content,
      // imageUrl, createdAt & updatedAt will use their defaults
    }

    const [created] = await db
      .insert(posts)
      .values(newPost)
      .returning()

    return created
  } catch (error) {
    console.error("Error creating post:", error)
    throw error
  }
}

// Update the createPost function to accept media
export async function createPostMedia({
  userId,
  content,
  media,
}: {
  userId: string
  content: string
  media?: Array<{ type: "image" | "video"; url: string; alt?: string }>
}) {
  // Insert into posts table, including media as JSONB
  const [post] = await db
    .insert(posts)
    .values({
      userId,
      content,
      media: media ? JSON.stringify(media) : null,
    })
    .returning()

  return post
}

export async function getProfile1(userId: string) {
  try {
    const [profile] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    return profile ?? null
  } catch (error) {
    console.error('Failed to load user profile:', error)
    throw error
  }
}

export async function getProfile(userId: string) {
  try {
    const [userProfile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        handle: users.handle,
        bio: users.bio,
        image: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userProfile || null;
  } catch (error) {
    console.error('Failed to get user profile from database', error);
    throw error;
  }
}

export async function getProfile2(userId: string) {
  try {
    const [userProfile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        handle: users.handle,
        bio: users.bio,
        image: users.image,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        banner: users.banner
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userProfile || null;
  } catch (error) {
    console.error('Failed to get user profile from database', error);
    throw error;
  }
}


// Fetch recent posts with author info, with a variable limit for user
export async function getUserRecentPosts(userId: string, limit: number = 5) {
  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      userId: posts.userId,
      authorId: users.id,
      authorName: users.name,
      authorHandle: users.handle,
      authorImage: users.image,
    })
    .from(posts)
    .where(eq(posts.userId, userId))
    .leftJoin(users, eq(posts.userId, users.id))
    .orderBy(desc(posts.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    userId: row.userId,
    author: {
      id: row.authorId,
      name: row.authorName,
      handle: row.authorHandle,
      image: row.authorImage,
    },
  }))
}

export async function updateUserImage(userId: string, imageUrl: string) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ image: imageUrl })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        image: users.image,
      });
    return updatedUser ?? null;
  } catch (error) {
    console.error('Failed to update user image in database', error);
    throw error;
  }
}

/// LIKES
export async function getPostsWithCounts(postId: string) {
  try {
    const likeCount = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId))
      .then((result) => result.length);

    const isLiked = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId))
      .then((result) => result.length > 0);

    const commentCount = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .then((result) => result.length);

    // Add this for bookmarks (if not already present)
    const bookmarkCount = await db
      .select()
      .from(bookmarks) // <-- make sure bookmarks table exists!
      .where(eq(bookmarks.postId, postId))
      .then((result) => result.length);

    return {
      likeCount,
      isLiked,
      commentCount,
      bookmarkCount,
      analyticsCount: 0
    };
  } catch (error) {
    console.error('Failed to get post counts and like status', error);
    throw error;
  }
}

// 1. Fetch recent posts with author info and media (media column as JSON)
export async function getRecentPostsWithAuthorsMedia(limit = 5) {
  try {
    const rows = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        media: posts.media, // <-- new: fetch media column
        createdAt: posts.createdAt,
        userId: posts.userId,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      media: row.media ? (typeof row.media === "string" ? JSON.parse(row.media) : row.media) : undefined,
      createdAt: row.createdAt,
      userId: row.userId,
      author: {
        id: row.authorId,
        name: row.authorName,
        handle: row.authorHandle,
        image: row.authorImage,
      },
    }));
  } catch (error) {
    console.error("Error fetching recent posts with authors and media:", error);
    throw error;
  }
}

// 2. Get post stats (likes, comments, bookmarks, analytics) for a post, same as getPostsWithCounts but no change needed unless you want to include media info here as well
export async function getPostsWithCountsMedia(postId: string) {
  try {
    // Get the post's media column as well
    const [postRow] = await db
      .select({
        media: posts.media,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    const likeCount = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId))
      .then((result) => result.length);

    const isLiked = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId))
      .then((result) => result.length > 0);

    const commentCount = await db
      .select()
      .from(comments)
      .where(eq(comments.postId, postId))
      .then((result) => result.length);

    const bookmarkCount = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.postId, postId))
      .then((result) => result.length);

    return {
      likeCount,
      isLiked,
      commentCount,
      bookmarkCount,
      analyticsCount: 0,
      media: postRow?.media ? (typeof postRow.media === "string" ? JSON.parse(postRow.media) : postRow.media) : undefined,
    };
  } catch (error) {
    console.error('Failed to get post counts and media', error);
    throw error;
  }
}


export async function getPostLikeStatus(postId: string, userId: string) {
  try {
    const likeCount = await db
      .select()
      .from(likes)
      .where(eq(likes.postId, postId))
      .then((result) => result.length);

    const isLiked = await db
      .select()
      .from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
      .then((result) => result.length > 0);

    return {
      likeCount,
      isLiked,
    };
  } catch (error) {
    console.error('Failed to get post like status', error);
    throw error;
  }
}


type NewLike = InferInsertModel<typeof likes>

// Insert a new post into the like table
export async function addLike(likeData: {
  userId: string
  postId: string
}): Promise<Like> {
  try {
    const newLike: NewLike = {
      //id: uuidv4(),
      userId: likeData.userId,
      postId: likeData.postId,
      // imageUrl, createdAt & updatedAt will use their defaults
    }

    const [liked] = await db
      .insert(likes)
      .values(newLike)
      .returning()

    return liked
  } catch (error) {
    console.error("Error creating like:", error)
    throw error
  }
}

export async function deleteLike(likeData: {
  userId: string
  postId: string
}): Promise<void> {
  try {
    await db
      .delete(likes)
      .where(and(eq(likes.postId, likeData.postId), eq(likes.userId, likeData.userId)))
  } catch (error) {
    console.error("Error deleting like:", error)
    throw error
  }
}


type NewComment = InferInsertModel<typeof comments>

// Insert a new post into the like table
export async function addComment(commentData: {
  userId: string
  postId: string
  content: string
}): Promise<Comment> {
  try {
    const newComment: NewComment = {
      //id: uuidv4(),
      userId: commentData.userId,
      postId: commentData.postId,
      content: commentData.content
      // imageUrl, createdAt & updatedAt will use their defaults
    }

    const [comment] = await db
      .insert(comments)
      .values(newComment)
      .returning()

    return comment
  } catch (error) {
    console.error("Error creating comment:", error)
    throw error
  }
}


export async function deleteComment(commentData: {
  userId: string
  postId: string
}): Promise<void> {
  try {
    await db
      .delete(comments)
      .where(and(eq(comments.postId, commentData.postId), eq(likes.userId, commentData.userId)))
  } catch (error) {
    console.error("Error deleting comment:", error)
    throw error
  }
}

// export async function getPostsWithCounts(postId: string, userId: string) {
//   try {
//     const likeCount = await db
//       .select()
//       .from(likes)
//       .where(eq(likes.postId, postId))
//       .then((result) => result.length);

//     const isLiked = await db
//       .select()
//       .from(likes)
//       .where(
//         and(eq(likes.postId, postId), eq(likes.userId, userId))
//       )
//       .then((result) => result.length > 0);

//     return {
//       likeCount,
//       isLiked,
//     };
//   } catch (error) {
//     console.error('Failed to get post counts and like status', error);
//     throw error;
//   }
// }


export async function getPostById(postId: string) {
  try {
    const [row] = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        createdAt: posts.createdAt,
        userId: posts.userId,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      content: row.content,
      imageUrl: row.imageUrl,
      createdAt: row.createdAt,
      userId: row.userId,
      author: {
        id: row.authorId,
        name: row.authorName,
        handle: row.authorHandle,
        image: row.authorImage,
      },
    };
  } catch (error) {
    console.error("Error fetching post by ID:", error);
    throw error;
  }
}


export async function getPostWithComments(postId: string) {
  try {
    // Fetch the post with author details
    const postRows = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        createdAt: posts.createdAt,
        userId: posts.userId,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .where(eq(posts.id, postId))
      .limit(1);

    if (postRows.length === 0) {
      throw new Error(`Post with id ${postId} not found`);
    }

    const postRow = postRows[0];

    // Fetch comments with author details
    const commentRows = await db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        userId: comments.userId,
        authorId: users.id,
        authorName: users.name,
        authorHandle: users.handle,
        authorImage: users.image,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.postId, postId))
      .orderBy(asc(comments.createdAt));

    return {
      post: {
        id: postRow.id,
        content: postRow.content,
        imageUrl: postRow.imageUrl,
        createdAt: postRow.createdAt,
        userId: postRow.userId,
        author: {
          id: postRow.authorId,
          name: postRow.authorName ?? "Anonymous",
          handle: postRow.authorHandle ?? "user",
          image: postRow.authorImage ?? null,
        },
      },
      comments: commentRows.map((row) => ({
        id: row.id,
        content: row.content,
        createdAt: row.createdAt,
        userId: row.userId,
        author: {
          id: row.authorId,
          name: row.authorName ?? "Anonymous",
          handle: row.authorHandle ?? "user",
          image: row.authorImage ?? null,
        },
      })),
    };
  } catch (error) {
    console.error("Error fetching post with comments:", error);
    throw error;
  }
}


// Fetch recent posts the user liked
export async function getUserRecentLikes(userId: string, limit: number = 5) {
  const rows = await db
    .select({
      id: posts.id,
      content: posts.content,
      imageUrl: posts.imageUrl,
      createdAt: posts.createdAt,
      userId: posts.userId,
      authorId: users.id,
      authorName: users.name,
      authorHandle: users.handle,
      authorImage: users.image,
    })
    .from(likes)
    .innerJoin(posts, eq(likes.postId, posts.id))
    .leftJoin(users, eq(posts.userId, users.id))
    .where(eq(likes.userId, userId))
    .orderBy(desc(likes.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt,
    userId: row.userId,
    author: {
      id: row.authorId,
      name: row.authorName ?? "Anonymous",
      handle: row.authorHandle ?? "user",
      image: row.authorImage ?? null,
    },
  }));
}


export async function getPostBookmarkStatus(postId: string, userId: string) {
  try {
    const bookmarkCount = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.postId, postId))
      .then((result) => result.length);

    const isBookmarked = await db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)))
      .then((result) => result.length > 0);

    return { bookmarkCount, isBookmarked }
  } catch (error) {
    console.error('Failed to get post bookmark status', error)
    throw error
  }
}

export async function addBookmark({ userId, postId }: { userId: string, postId: string }) {
  try {
    return await db.insert(bookmarks).values({ userId, postId }).returning()
  } catch (error) {
    console.error("Error adding bookmark:", error)
    throw error
  }
}

export async function deleteBookmark({ userId, postId }: { userId: string, postId: string }) {
  try {
    await db.delete(bookmarks).where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)))
  } catch (error) {
    console.error("Error deleting bookmark:", error)
    throw error
  }
}


export async function updateUserProfile(userId: string, profile: {
  name?: string,
  handle?: string,
  bio?: string,
  email?: string,
  title?: string,
  location?: string,
  website?: string
}) {
  try {
    const [updated] = await db
      .update(users)
      .set({
        ...(profile.name !== undefined && { name: profile.name }),
        ...(profile.handle !== undefined && { handle: profile.handle }),
        ...(profile.bio !== undefined && { bio: profile.bio }),
        ...(profile.email !== undefined && { email: profile.email }),
        ...(profile.title !== undefined && { title: profile.title }),
        ...(profile.location !== undefined && { location: profile.location }),
        ...(profile.website !== undefined && { website: profile.website }),
      })
      .where(eq(users.id, userId))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
}


export async function updateUserBanner(userId: string, bannerUrl: string) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ banner: bannerUrl })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        banner: users.banner,
      });
    return updatedUser ?? null;
  } catch (error) {
    console.error('Failed to update user banner in database', error);
    throw error;
  }
}

export async function getUserTrainingSessions(userId: string) {
  try {
    const user_training_rows = await db
      .select({
        id: userTrainingEnrollments.id,
        userId: userTrainingEnrollments.userId,
        trainingId: userTrainingEnrollments.trainingId,
        enrolledAt: userTrainingEnrollments.enrolledAt,
        status: userTrainingEnrollments.status,
        trainingTitle: trainingSessions.title,
        trainingDescription: trainingSessions.description,
        trainingDate: trainingSessions.date,
        trainingStartTime: trainingSessions.startTime,
        trainingEndTime: trainingSessions.endTime,
        trainingInstructor: trainingSessions.instructor,
        trainingCategoryId: trainingSessions.categoryId,
        trainingLocation: trainingSessions.location,
        trainingAgenda: trainingSessions.agenda,
        trainingMaxParticipants: trainingSessions.maxParticipants,
        trainingCurrentParticipants: trainingSessions.currentParticipants,
        trainingCreatedAt: trainingSessions.createdAt,
        trainingUpdatedAt: trainingSessions.updatedAt,
        categoryName: trainingCategories.name,
      })
      .from(userTrainingEnrollments)
      .innerJoin(
        trainingSessions,
        eq(userTrainingEnrollments.trainingId, trainingSessions.id)
      )
      .leftJoin(
        trainingCategories,
        eq(trainingSessions.categoryId, trainingCategories.id)
      )
      .where(eq(userTrainingEnrollments.userId, userId));

    return user_training_rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      trainingId: row.trainingId,
      enrolledAt: row.enrolledAt,
      status: row.status,
      trainingDetails: {
        id: row.trainingId,
        title: row.trainingTitle ?? null,
        description: row.trainingDescription ?? null,
        date: row.trainingDate ?? null,
        startTime: row.trainingStartTime ?? null,
        endTime: row.trainingEndTime ?? null,
        instructor: row.trainingInstructor ?? null,
        categoryId: row.trainingCategoryId ?? null,
        categoryName: row.categoryName ?? null,
        location: row.trainingLocation ?? null,
        agenda: row.trainingAgenda ?? null,
        maxParticipants: row.trainingMaxParticipants ?? null,
        currentParticipants: row.trainingCurrentParticipants ?? null,
        createdAt: row.trainingCreatedAt ?? null,
        updatedAt: row.trainingUpdatedAt ?? null,
      },
    }));
  } catch (error) {
    console.error('Error fetching user training sessions:', error);
    throw new Error('Failed to fetch user training sessions');
  }
}

export async function getAllTrainingSessions() {
  try {
    const training_rows = await db
      .select({
        id: trainingSessions.id,
        title: trainingSessions.title,
        description: trainingSessions.description,
        date: trainingSessions.date,
        startTime: trainingSessions.startTime,
        endTime: trainingSessions.endTime,
        instructor: trainingSessions.instructor,
        categoryId: trainingSessions.categoryId,
        location: trainingSessions.location,
        agenda: trainingSessions.agenda,
        maxParticipants: trainingSessions.maxParticipants,
        currentParticipants: trainingSessions.currentParticipants,
        createdAt: trainingSessions.createdAt,
        updatedAt: trainingSessions.updatedAt,
        categoryName: trainingCategories.name,
      })
      .from(trainingSessions)
      .leftJoin(
        trainingCategories,
        eq(trainingSessions.categoryId, trainingCategories.id)
      );

    return training_rows.map((row) => ({
      id: row.id,
      title: row.title ?? null,
      description: row.description ?? null,
      date: row.date ?? null,
      startTime: row.startTime ?? null,
      endTime: row.endTime ?? null,
      instructor: row.instructor ?? null,
      categoryId: row.categoryId ?? null,
      categoryName: row.categoryName ?? null,
      location: row.location ?? null,
      agenda: row.agenda ?? null,
      maxParticipants: row.maxParticipants ?? null,
      currentParticipants: row.currentParticipants ?? null,
      createdAt: row.createdAt ?? null,
      updatedAt: row.updatedAt ?? null,
    }));
  } catch (error) {
    console.error('Error fetching all training sessions:', error);
    throw new Error('Failed to fetch all training sessions');
  }
}

export async function isUserEnrolledInTraining( userId: string, trainingId: string ) {
  try {
    const enrollments = await db
      .select({
        id: userTrainingEnrollments.id
      })
      .from(userTrainingEnrollments)
      .where(and(eq(userTrainingEnrollments.userId, userId), eq(userTrainingEnrollments.trainingId, trainingId)))
      .limit(1);
    return enrollments.length > 0;
  }
  catch (error) {
    console.error('Error checking user enrollment in training:', error, userId, trainingId);
    throw new Error('Failed to check user enrollment in training');
  }
}

export async function enrollUserInTraining( userId: string, trainingId: string ) {
  try {
    return await db.insert(userTrainingEnrollments).values({ userId, trainingId, status: "enrolled" }).returning()
  }
  catch (error) {
    console.error("Error adding user:", error, userId)
    throw error
  }
}

export async function enrollUserInTraining1(userId: string, trainingId: string) {
  try {
    return await db.transaction(async (tx) => {
      const [enrollment] = await tx.insert(userTrainingEnrollments).values({ userId, trainingId, status: "enrolled" }).returning();
      
      const [session] = await tx
        .select({ currentParticipants: trainingSessions.currentParticipants })
        .from(trainingSessions)
        .where(eq(trainingSessions.id, trainingId))
        .limit(1);
      
      await tx
        .update(trainingSessions)
        .set({
          currentParticipants: (session?.currentParticipants ?? 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(trainingSessions.id, trainingId));
      
      return enrollment;
    });
  }
  catch (error) {
    console.error("Error adding user:", error, userId);
    throw error;
  }
}


// Assumes you have `users` table and `db` already imported

export async function createUserProfile(userId: string, email: string) {
  const DEFAULT_IMAGE =
    "https://n7wcarlzhhyjnrze.public.blob.vercel-storage.com/default-profile-Pf8Vk6eskyEhFKm2iJOAMR5jEgiGil.png";

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        email: email,
        image: DEFAULT_IMAGE,
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}


export async function createUserProfile2(
  userId: string,
  email: string,
  firstName: string,
  lastName: string
) {
  const DEFAULT_IMAGE =
    "https://n7wcarlzhhyjnrze.public.blob.vercel-storage.com/default-profile-Pf8Vk6eskyEhFKm2iJOAMR5jEgiGil.png";
  const name = `${firstName} ${lastName}`.trim();

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        email: email,
        image: DEFAULT_IMAGE,
        firstName: firstName,
        lastName: lastName,
        name: name,
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}


export async function getLatestNews(limit: number = 6) {
  try {
    return await db
      .select()
      .from(news)
      .orderBy(desc(news.publishedAt), desc(news.createdAt))
      .limit(limit);
  } catch (error) {
    console.error("Failed to get latest news from database", error);
    throw error;
  }
}


export async function getNewsById(newsId: string) {
  try {
    const [article] = await db
      .select()
      .from(news)
      .where(eq(news.id, newsId))
      .limit(1);

    return article ?? null;
  } catch (error) {
    console.error("Failed to get news article by id from database", error);
    throw error;
  }
}


// Add this function to check if a handle exists
export async function getUserByHandle(handle: string) {
  try {
    const [userRow] = await db
      .select()
      .from(users)
      .where(eq(users.handle, handle))
      .limit(1);
    return userRow ?? null;
  } catch (error) {
    console.error('Failed to get user by handle from database');
    throw error;
  }
}

// Update createUserProfile2 to accept handle
export async function createUserProfile3(
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  handle?: string
) {
  const DEFAULT_IMAGE =
    "https://n7wcarlzhhyjnrze.public.blob.vercel-storage.com/default-profile-Pf8Vk6eskyEhFKm2iJOAMR5jEgiGil.png";
  const name = `${firstName} ${lastName}`.trim();

  try {
    const [created] = await db
      .insert(users)
      .values({
        id: userId,
        email: email,
        image: DEFAULT_IMAGE,
        firstName: firstName,
        lastName: lastName,
        name: name,
        handle: handle,
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error("Failed to create user profile:", error);
    throw error;
  }
}

export async function getContentSpotItemsByType(spotType: string) {
  try {
    return await db
      .select()
      .from(contentSpotItems)
      .where(eq(contentSpotItems.spotType, spotType))
      .orderBy(asc(contentSpotItems.itemIndex));
  } catch (error) {
    console.error('Failed to get content spot items by type', error);
    throw error;
  }
}

// Get a user profile by userId (returns all fields, including banner)
export async function getUserProfile(userId: string) {
  try {
    const [userProfile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        handle: users.handle,
        bio: users.bio,
        image: users.image,
        banner: users.banner,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userProfile || null;
  } catch (error) {
    console.error('Failed to get user profile from database', error);
    throw error;
  }
}


// Get a user profile by userId (returns all fields, including banner)
export async function getUserProfile1(userId: string) {
  try {
    const [userProfile] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        handle: users.handle,
        bio: users.bio,
        image: users.image,
        banner: users.banner,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        firstName: users.firstName,
        lastName: users.lastName,
        userRole: users.userRole
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return userProfile || null;
  } catch (error) {
    console.error('Failed to get user profile from database', error);
    throw error;
  }
}

export async function createBugReport(data: BugReportInsert) {
  try {
    const [bug] = await db.insert(bugReports).values(data).returning();
    return bug;
  } catch (error) {
    console.error("Failed to create bug report:", error);
    throw error;
  }
}


export async function updateUserImage1(userId: string, imageUrl: string) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        image: imageUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        image: users.image,
      });
    return updatedUser ?? null;
  } catch (error) {
    console.error('Failed to update user image in database', error);
    throw error;
  }
}

export async function updateUserBanner1(userId: string, bannerUrl: string) {
  try {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        banner: bannerUrl,
        updatedAt: new Date().toISOString()
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        banner: users.banner,
      });
    return updatedUser ?? null;
  } catch (error) {
    console.error('Failed to update user banner in database', error);
    throw error;
  }
}

export async function updateUserProfile1(userId: string, profile: {
  name?: string,
  handle?: string,
  bio?: string,
  email?: string,
  firstName?: string,
  lastName?: string,
  location?: string,
  website?: string
}) {
  try {
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (profile.name !== undefined) updateData.name = profile.name;
    if (profile.handle !== undefined) updateData.handle = profile.handle;
    if (profile.bio !== undefined) updateData.bio = profile.bio;
    if (profile.email !== undefined) updateData.email = profile.email;
    if (profile.firstName !== undefined) updateData.firstName = profile.firstName;
    if (profile.lastName !== undefined) updateData.lastName = profile.lastName;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error("Failed to update user profile:", error);
    throw error;
  }
}
