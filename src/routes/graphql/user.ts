import type { PrismaClient, User, Post } from '@prisma/client';
import DataLoader from 'dataloader';

export function createLoaders(prisma: PrismaClient) {
  return {
    user: new DataLoader(async (ids: readonly string[]) => {
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      return ids.map((id) => userMap.get(id) || null);
    }),

    memberType: new DataLoader(async (ids: readonly string[]) => {
      const memberTypes = await prisma.memberType.findMany({
        where: { id: { in: [...ids] } },
      });
      const typeMap = new Map(memberTypes.map((mt) => [mt.id, mt]));
      return ids.map((id) => typeMap.get(id) || null);
    }),

    profileByUserId: new DataLoader(async (userIds: readonly string[]) => {
      const profiles = await prisma.profile.findMany({
        where: { userId: { in: [...userIds] } },
      });
      const profileMap = new Map(profiles.map((p) => [p.userId, p]));
      return userIds.map((id) => profileMap.get(id) || null);
    }),

    postsByAuthorId: new DataLoader(async (authorIds: readonly string[]) => {
      const posts = await prisma.post.findMany({
        where: { authorId: { in: [...authorIds] } },
      });
      const postsByAuthor = new Map<string, Post[]>();
      for (const post of posts) {
        if (!postsByAuthor.has(post.authorId)) {
          postsByAuthor.set(post.authorId, []);
        }
        postsByAuthor.get(post.authorId)!.push(post);
      }
      return authorIds.map((id) => postsByAuthor.get(id) || []);
    }),

    userSubscribedTo: new DataLoader(async (userIds: readonly string[]) => {
      const subscriptions = await prisma.subscribersOnAuthors.findMany({
        where: { subscriberId: { in: [...userIds] } },
        include: { author: true },
      });
      const subsByUser = new Map<string, User[]>();
      for (const sub of subscriptions) {
        if (!subsByUser.has(sub.subscriberId)) {
          subsByUser.set(sub.subscriberId, []);
        }
        subsByUser.get(sub.subscriberId)!.push(sub.author);
      }
      return userIds.map((id) => subsByUser.get(id) || []);
    }),

    subscribedToUser: new DataLoader(async (authorIds: readonly string[]) => {
      const subscriptions = await prisma.subscribersOnAuthors.findMany({
        where: { authorId: { in: [...authorIds] } },
        include: { subscriber: true },
      });
      const subsByAuthor = new Map<string, User[]>();
      for (const sub of subscriptions) {
        if (!subsByAuthor.has(sub.authorId)) {
          subsByAuthor.set(sub.authorId, []);
        }
        subsByAuthor.get(sub.authorId)!.push(sub.subscriber);
      }
      return authorIds.map((id) => subsByAuthor.get(id) || []);
    }),
  };
}