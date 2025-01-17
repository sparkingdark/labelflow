import { v4 as uuidv4 } from "uuid";
import "isomorphic-fetch";

import type {
  ImageCreateInput,
  MutationCreateImageArgs,
  QueryImageArgs,
  QueryImagesArgs,
} from "@labelflow/graphql-types";
import { probeImage } from "./utils/probe-image";

import { Context, DbImage, Repository } from "./types";
import { throwIfResolvesToNil } from "./utils/throw-if-resolves-to-nil";

// Mutations
const getImageName = ({
  externalUrl,
  finalUrl,
  name,
}: {
  externalUrl?: string | null;
  finalUrl?: string | null;
  name?: string | null;
}): string => {
  const nameBase =
    name ??
    externalUrl?.substring(
      externalUrl?.lastIndexOf("/") + 1,
      externalUrl?.indexOf("?")
    ) ??
    finalUrl!.substring(finalUrl!.lastIndexOf("/") + 1, finalUrl!.indexOf("?"));
  return nameBase.replace(/\.[^/.]+$/, "");
};

export const getImageEntityFromMutationArgs = async (
  data: ImageCreateInput,
  repository: Pick<Repository, "upload">
) => {
  const {
    file,
    id,
    name,
    height,
    width,
    mimetype,
    path,
    url,
    externalUrl,
    datasetId,
  } = data;
  const now = data?.createdAt ?? new Date().toISOString();
  const imageId = id ?? uuidv4();
  let finalUrl: string | undefined;
  if (!file && !externalUrl && url) {
    // No File Upload
    finalUrl = url;
  }

  if (!file && externalUrl && !url) {
    // External file based upload
    const fetchResult = await fetch(externalUrl, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "image/tiff,image/jpeg,image/png,image/*,*/*;q=0.8",
        "Sec-Fetch-Dest": "image",
      },
      credentials: "omit",
    });

    if (fetchResult.status !== 200) {
      throw new Error(
        `Could not fetch image at url ${url} properly, code ${fetchResult.status}`
      );
    }

    const uploadTarget = await repository.upload.getUploadTargetHttp();

    // eslint-disable-next-line no-underscore-dangle
    if (uploadTarget.__typename !== "UploadTargetHttp") {
      throw new Error(
        "This Server does not support file upload. You can create images by providing a `file` directly in the `createImage` mutation"
      );
    }

    finalUrl = uploadTarget.downloadUrl;

    const blob = await fetchResult.blob();
    await repository.upload.put(finalUrl, blob);
  }

  if (file && !externalUrl && !url) {
    // File Content based upload

    const uploadTarget = await repository.upload.getUploadTargetHttp();

    // eslint-disable-next-line no-underscore-dangle
    if (uploadTarget.__typename !== "UploadTargetHttp") {
      throw new Error(
        "This Server does not support file upload. You can create images by providing a `file` directly in the `createImage` mutation"
      );
    }
    finalUrl = uploadTarget.downloadUrl;

    await repository.upload.put(finalUrl, file);
  }

  // Probe the file to get its dimensions and mimetype if not provided
  const imageMetaData = await probeImage(
    {
      width,
      height,
      mimetype,
      url: finalUrl!,
    },
    repository.upload.get
  );

  const newImageEntity: DbImage = {
    datasetId,
    createdAt: now,
    updatedAt: now,
    id: imageId,
    url: finalUrl!,
    externalUrl,
    path: path ?? externalUrl ?? finalUrl!,
    name: getImageName({ externalUrl, finalUrl, name }),
    ...imageMetaData,
  };
  return newImageEntity;
};

// Queries
const labelsResolver = async (
  { id }: DbImage,
  _args: any,
  { repository }: Context
) => {
  return await repository.label.list({ imageId: id });
};

const image = async (_: any, args: QueryImageArgs, { repository }: Context) => {
  return await throwIfResolvesToNil(
    `No image with id "${args?.where?.id}"`,
    repository.image.getById
  )(args?.where?.id);
};

const images = async (
  _: any,
  args: QueryImagesArgs,
  { repository }: Context
) => {
  return await repository.image.list(args?.where, args?.skip, args?.first);
};

// Mutations
const createImage = async (
  _: any,
  args: MutationCreateImageArgs,
  { repository }: Context
): Promise<DbImage> => {
  const { file, url, externalUrl, datasetId } = args.data;

  // Since we don't have any constraint checks with Dexie
  // we need to ensure that the datasetId matches some
  // entity before being able to continue.
  await throwIfResolvesToNil(
    `The dataset id ${datasetId} doesn't exist.`,
    repository.dataset.getById
  )(datasetId);

  if (
    !(
      (!file && !externalUrl && url) ||
      (!file && externalUrl && !url) ||
      (file && !externalUrl && !url)
    )
  ) {
    throw new Error(
      "Image creation upload must include either a `file` field of type `Upload`, or a `url` field of type `String`, or a `externalUrl` field of type `String`"
    );
  }

  const newImageEntity = await getImageEntityFromMutationArgs(
    args.data,
    repository
  );

  await repository.image.add(newImageEntity);

  return newImageEntity;
};

const imagesAggregates = (parent: any) => {
  // Forward `parent` to chained resolvers if it exists
  return parent ?? {};
};

const totalCount = async (parent: any, _args: any, { repository }: Context) => {
  // eslint-disable-next-line no-underscore-dangle
  const typename = parent?.__typename;

  if (typename === "Dataset") {
    return await repository.image.count({
      datasetId: parent.id,
    });
  }

  return await repository.image.count();
};

export default {
  Query: {
    image,
    images,
    imagesAggregates,
  },

  Mutation: {
    createImage,
  },

  Image: {
    labels: labelsResolver,
  },

  ImagesAggregates: { totalCount },

  Dataset: {
    imagesAggregates,
  },
};
