import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql } from 'graphql';
import { schema, createLoaders } from './user.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const { query, variables } = req.body;
      const loaders = createLoaders(prisma);
      const context = {
        prisma,
        loaders,
      };

      try {
        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: context,
        });

        return result;
      } catch (error) {
        return {
          errors: [{ message: (error as Error).message }],
        };
      }
    },
  });
};

export default plugin;
