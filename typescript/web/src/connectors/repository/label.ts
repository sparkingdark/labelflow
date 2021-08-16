import { DbLabel } from "@labelflow/common-resolvers";
import type { LabelWhereInput } from "@labelflow/graphql-types";
import { getDatabase } from "../database";
import { list } from "./utils/list";

/* `count` and `list` need to handle a specific logic when you want it to be filtered by dataset
 * We can't do joins with dexies so we need to do it manually. */

export const countLabels = async (where?: LabelWhereInput) => {
  if (where) {
    if ("datasetId" in where) {
      const imagesOfDataset = await getDatabase()
        .image.where({
          datasetId: where.datasetId,
        })
        .toArray();

      return getDatabase()
        .label.filter((currentLabel) =>
          imagesOfDataset.some((image) => currentLabel.imageId === image.id)
        )
        .count();
    }

    return getDatabase().label.where(where).count();
  }

  return getDatabase().label.count();
};

export const listLabels = async (
  where?: LabelWhereInput | null,
  skip?: number | null,
  first?: number | null
) => {
  if (where && "datasetId" in where) {
    const imagesOfDataset = await getDatabase()
      .image.where({
        datasetId: where.datasetId,
      })
      .toArray();

    const query = getDatabase()
      .label.orderBy("createdAt")
      .filter((currentLabel) =>
        imagesOfDataset.some((image) => currentLabel.imageId === image.id)
      );

    if (skip) {
      query.offset(skip);
    }
    if (first) {
      query.limit(first);
    }

    return getDatabase()
      .label.filter((currentLabel) =>
        imagesOfDataset.some((image) => currentLabel.imageId === image.id)
      )
      .sortBy("createdAt");
  }

  return list<DbLabel, LabelWhereInput>(getDatabase().label)(
    where,
    skip,
    first
  );
};