import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';
import type { PrismaClient, User, Post, Profile, MemberType } from '@prisma/client';
import DataLoader from 'dataloader';
import { UUIDType } from './types/uuid.js';

type UserWithRelations = User & {
  profile?: Profile | null;
  posts?: Post[];
  userSubscribedTo?: User[];
  subscribedToUser?: User[];
};

type PostWithRelations = Post & {
  author?: User;
};

type ProfileWithRelations = Profile & {
  memberType?: MemberType;
  user?: User;
};

interface GraphQLContext {
  prisma: PrismaClient;
  loaders: {
    user: DataLoader<string, User | null>;
    memberType: DataLoader<string, MemberType | null>;
    profileByUserId: DataLoader<string, Profile | null>;
    postsByAuthorId: DataLoader<string, Post[]>;
    userSubscribedTo: DataLoader<string, User[]>;
    subscribedToUser: DataLoader<string, User[]>;
  };
}

const MemberTypeIdEnum = new GraphQLEnumType({
  name: 'MemberTypeId',
  values: {
    BASIC: { value: 'BASIC' },
    BUSINESS: { value: 'BUSINESS' },
  },
});

const MemberTypeType: GraphQLObjectType = new GraphQLObjectType({
  name: 'MemberType',
  fields: () => ({
    id: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    discount: { type: new GraphQLNonNull(GraphQLFloat) },
    postsLimitPerMonth: { type: new GraphQLNonNull(GraphQLInt) },
  }),
});

const PostType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
    author: {
      type: UserType,
      resolve: async (parent: PostWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.user;
        return loader.load(parent.authorId);
      },
    },
  }),
});

const ProfileType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Profile',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdEnum) },
    memberType: {
      type: MemberTypeType,
      resolve: async (parent: ProfileWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.memberType;
        return loader.load(parent.memberTypeId);
      },
    },
    user: {
      type: UserType,
      resolve: async (parent: ProfileWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.user;
        return loader.load(parent.userId);
      },
    },
  }),
});

const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: new GraphQLNonNull(UUIDType) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
    profile: {
      type: ProfileType,
      resolve: async (parent: UserWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.profileByUserId;
        return loader.load(parent.id);
      },
    },
    posts: {
      type: new GraphQLList(PostType),
      resolve: async (parent: UserWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.postsByAuthorId;
        return loader.load(parent.id);
      },
    },
    userSubscribedTo: {
      type: new GraphQLList(UserType),
      resolve: async (parent: UserWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.userSubscribedTo;
        return loader.load(parent.id);
      },
    },
    subscribedToUser: {
      type: new GraphQLList(UserType),
      resolve: async (parent: UserWithRelations, _args: unknown, context: GraphQLContext) => {
        const loader = context.loaders.subscribedToUser;
        return loader.load(parent.id);
      },
    },
  }),
});

const CreateUserInput = new GraphQLInputObjectType({
  name: 'CreateUserInput',
  fields: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    balance: { type: new GraphQLNonNull(GraphQLFloat) },
  },
});

const ChangeUserInput = new GraphQLInputObjectType({
  name: 'ChangeUserInput',
  fields: {
    name: { type: GraphQLString },
    balance: { type: GraphQLFloat },
  },
});

const CreatePostInput = new GraphQLInputObjectType({
  name: 'CreatePostInput',
  fields: {
    title: { type: new GraphQLNonNull(GraphQLString) },
    content: { type: new GraphQLNonNull(GraphQLString) },
    authorId: { type: new GraphQLNonNull(UUIDType) },
  },
});

const ChangePostInput = new GraphQLInputObjectType({
  name: 'ChangePostInput',
  fields: {
    title: { type: GraphQLString },
    content: { type: GraphQLString },
  },
});

const CreateProfileInput = new GraphQLInputObjectType({
  name: 'CreateProfileInput',
  fields: {
    isMale: { type: new GraphQLNonNull(GraphQLBoolean) },
    yearOfBirth: { type: new GraphQLNonNull(GraphQLInt) },
    userId: { type: new GraphQLNonNull(UUIDType) },
    memberTypeId: { type: new GraphQLNonNull(MemberTypeIdEnum) },
  },
});

const ChangeProfileInput = new GraphQLInputObjectType({
  name: 'ChangeProfileInput',
  fields: {
    isMale: { type: GraphQLBoolean },
    yearOfBirth: { type: GraphQLInt },
    userId: { type: UUIDType },
    memberTypeId: { type: MemberTypeIdEnum },
  },
});

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