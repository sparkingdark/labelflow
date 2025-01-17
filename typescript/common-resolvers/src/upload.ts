import type { UploadTarget } from "@labelflow/graphql-types";

import { Context } from "./types";

export const uploadsCacheName = "uploads";
export const uploadsRoute = "/api/worker/uploads";

/**
 * A way for the server to tell how it wants to accept file uploads
 * @returns a presigned URL for the client to upload files to, or `null` if the server wants to accept direct graphql uploads
 */
const getUploadTarget = async (
  _parent: any,
  _args: null,
  { repository }: Context
): Promise<UploadTarget> => {
  return await repository.upload.getUploadTarget();
};

export default {
  Mutation: {
    getUploadTarget,
  },

  UploadTarget: {
    // See https://www.apollographql.com/docs/apollo-server/schema/unions-interfaces/#resolving-a-union
    // eslint-disable-next-line no-underscore-dangle
    __resolveType(obj: UploadTarget) {
      if ("direct" in obj) {
        return "UploadTargetDirect";
      }
      if ("uploadUrl" in obj || "downloadUrl" in obj) {
        return "UploadTargetHttp";
      }
      return null; // GraphQLError is thrown
    },
  },
};
