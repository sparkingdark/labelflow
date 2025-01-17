import mime from "mime-types";
import { Geometry } from "@turf/helpers";
import { coordReduce } from "@turf/meta";
import { DbImage, DbLabelClass } from "../../types";

import {
  CocoCategory,
  CocoAnnotation,
  CocoImage,
  CocoDataset,
  DbLabelWithImageDimensions,
} from "./types";

export {
  initialCocoDataset,
  convertLabelClassToCocoCategory,
  convertLabelClassesToCocoCategories,
  convertLabelToCocoAnnotation,
  convertLabelsOfImageToCocoAnnotations,
  convertImageToCocoImage,
  convertImagesToCocoImages,
  convertLabelflowDatasetToCocoDataset,
  convertGeometryToSegmentation,
};

const initialCocoDataset: CocoDataset = {
  info: {
    contributor: "",
    date_created: "",
    description: "",
    url: "",
    version: "",
    year: "",
  },
  licenses: [
    {
      name: "",
      id: 0,
      url: "",
    },
  ],
  annotations: [],
  categories: [],
  images: [],
};

const convertLabelClassToCocoCategory = (
  labelClass: DbLabelClass,
  id: number
): CocoCategory => {
  return {
    id,
    name: labelClass.name,
    supercategory: "",
  };
};

const convertLabelClassesToCocoCategories = (labelClasses: DbLabelClass[]) => {
  const labelClassIdsMap: Record<string, number> = {};

  const cocoCategories = labelClasses.map((labelClass, index) => {
    const cocoCategoryId = index + 1;
    labelClassIdsMap[labelClass.id] = cocoCategoryId;
    return convertLabelClassToCocoCategory(labelClass, cocoCategoryId);
  });

  return {
    cocoCategories,
    labelClassIdsMap,
  };
};

const convertGeometryToSegmentation = (
  geometry: Geometry,
  imageHeight: number
): number[][] => {
  return coordReduce(
    geometry,
    (
      segmentation: number[][],
      [x, y]: number[],
      _coordIndex: number,
      _featureIndex: number,
      multiFeatureIndex: number,
      geometryIndex: number
    ) => {
      // Only take the outer ring of the geometry
      if (geometryIndex > 0) {
        return segmentation;
      }

      const currentSegment = segmentation[multiFeatureIndex]
        ? segmentation[multiFeatureIndex]
        : [];

      const coordToAdd = [x, imageHeight - y];

      // eslint-disable-next-line no-param-reassign
      segmentation[multiFeatureIndex] = [...currentSegment, ...coordToAdd];

      return segmentation;
    },
    []
  );
};

const convertLabelToCocoAnnotation = (
  {
    x,
    y,
    width,
    height,
    geometry,
    imageDimensions,
  }: DbLabelWithImageDimensions,
  id: number,
  imageId: number,
  categoryId: number | null = null
): CocoAnnotation => {
  return {
    id,
    image_id: imageId,
    category_id: categoryId,
    segmentation: convertGeometryToSegmentation(
      geometry,
      imageDimensions.height
    ),
    area: width * height,
    bbox: [x, imageDimensions.height - y - height, width, height],
    iscrowd: 0,
  };
};

const convertLabelsOfImageToCocoAnnotations = (
  labels: DbLabelWithImageDimensions[],
  imageIdsMap: Record<string, number>,
  labelClassIdsMap: Record<string, number>
) => {
  return labels.map((label, index) => {
    const cocoAnnotationId = index + 1;
    return convertLabelToCocoAnnotation(
      label,
      cocoAnnotationId,
      imageIdsMap[label.imageId],
      label.labelClassId ? labelClassIdsMap[label.labelClassId] : null
    );
  });
};

const convertImageToCocoImage = (
  {
    createdAt,
    height,
    width,
    name,
    externalUrl,
    id: idImage,
    mimetype,
  }: DbImage,
  id: number
): CocoImage => {
  return {
    id,
    file_name: `${name}_${idImage}.${mime.extension(mimetype)}`,
    coco_url: externalUrl ?? "",
    date_captured: createdAt,
    flickr_url: "",
    height,
    width,
    license: 0,
  };
};

const convertImagesToCocoImages = (images: DbImage[]) => {
  const imageIdsMap: Record<string, number> = {};
  const cocoImages = images.map((image, index) => {
    const cocoImageId = index + 1;
    imageIdsMap[image.id] = cocoImageId;
    return convertImageToCocoImage(image, cocoImageId);
  });

  return { cocoImages, imageIdsMap };
};

const convertLabelflowDatasetToCocoDataset = (
  images: DbImage[],
  labels: DbLabelWithImageDimensions[],
  labelClasses: DbLabelClass[]
): CocoDataset => {
  const { cocoImages, imageIdsMap } = convertImagesToCocoImages(images);

  const { cocoCategories, labelClassIdsMap } =
    convertLabelClassesToCocoCategories(labelClasses);

  const cocoAnnotations = convertLabelsOfImageToCocoAnnotations(
    labels,
    imageIdsMap,
    labelClassIdsMap
  );

  return {
    ...initialCocoDataset,
    categories: cocoCategories,
    images: cocoImages,
    annotations: cocoAnnotations,
  };
};
