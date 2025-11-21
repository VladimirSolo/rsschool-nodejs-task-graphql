import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql, parse, validate } from 'graphql';
import { schema, createLoaders } from './user.js';
import depthLimit from 'graphql-depth-limit';

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

      const validationRules = [depthLimit(5)];
      const documentAST = parse(query);

      const errors = validate(schema, documentAST, validationRules);
      if (errors.length > 0) {
        return {
          errors: errors.map((error) => ({
            message: error.message,
            locations: error.locations,
            path: error.path,
          })),
        };
      }

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
