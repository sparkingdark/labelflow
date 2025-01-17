import React from "react";
import { useQuery, gql } from "@apollo/client";
import {
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useColorModeValue as mode,
  Skeleton,
  Center,
  Spinner,
  Box,
  Flex,
  chakra,
} from "@chakra-ui/react";

import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { RiArrowRightSLine } from "react-icons/ri";
import NextLink from "next/link";
import type { Image } from "@labelflow/graphql-types";
import { useErrorHandler } from "react-error-boundary";
import { AppLifecycleManager } from "../../../../../components/app-lifecycle-manager";
import { KeymapButton } from "../../../../../components/layout/top-bar/keymap-button";
import { ImportButton } from "../../../../../components/import-button";
import { ExportButton } from "../../../../../components/export-button";
import { Meta } from "../../../../../components/meta";
import { Layout } from "../../../../../components/layout";
import { Gallery } from "../../../../../components/gallery";
import Error404Page from "../../../../404";

const ArrowRightIcon = chakra(RiArrowRightSLine);

// The dynamic import is needed because openlayers use web apis that are not available
// in NodeJS, like `Blob`, so it crashes when rendering in NextJS server side.
// And anyway, it would not make sense to render canvas server side, it would just be a loss.
const LabellingTool = dynamic(
  () => import("../../../../../components/labelling-tool"),
  {
    ssr: false,
    loading: ({ error }) => {
      if (error) throw error;
      return (
        <Center h="full">
          <Spinner aria-label="loading indicator" size="xl" />
        </Center>
      );
    },
  }
);

const imageQuery = gql`
  query image($id: ID!) {
    image(where: { id: $id }) {
      id
      name
    }
  }
`;

const getDatasetQuery = gql`
  query getDataset($slug: String!) {
    dataset(where: { slug: $slug }) {
      id
      name
    }
  }
`;

type ImageQueryResponse = {
  image: Pick<Image, "id" | "name">;
};

const ImagePage = () => {
  const router = useRouter();
  const { datasetSlug, imageId } = router?.query;

  const { data: imageResult, error: errorImage } = useQuery<ImageQueryResponse>(
    imageQuery,
    {
      variables: { id: imageId },
      skip: !imageId,
    }
  );

  const { data: datasetResult, error: errorDataset } = useQuery(
    getDatasetQuery,
    {
      variables: { slug: datasetSlug },
      skip: !datasetSlug,
    }
  );

  const imageName = imageResult?.image.name;
  const datasetName = datasetResult?.dataset.name;

  const handleError = useErrorHandler();
  if (errorDataset || errorImage) {
    if (errorDataset && !errorDataset.message.match(/No dataset with slug/)) {
      handleError(errorDataset);
    }
    if (errorImage && !errorImage.message.match(/No image with id/)) {
      handleError(errorImage);
    }
    return (
      <>
        <AppLifecycleManager />
        <Error404Page />
      </>
    );
  }

  return (
    <>
      <AppLifecycleManager />
      <Meta title={`LabelFlow | Image ${imageName ?? ""}`} />
      <Layout
        topBarLeftContent={
          <Breadcrumb
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            spacing="8px"
            sx={{ "*": { display: "inline !important" } }}
            separator={<ArrowRightIcon color="gray.500" />}
          >
            <BreadcrumbItem>
              <NextLink href="/local/datasets">
                <BreadcrumbLink>Datasets</BreadcrumbLink>
              </NextLink>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <NextLink href={`/local/datasets/${datasetSlug}/images`}>
                <BreadcrumbLink>
                  {datasetName ?? <Skeleton>Dataset Name</Skeleton>}
                </BreadcrumbLink>
              </NextLink>
            </BreadcrumbItem>

            <BreadcrumbItem>
              <NextLink href={`/local/datasets/${datasetSlug}/images`}>
                <BreadcrumbLink>Images</BreadcrumbLink>
              </NextLink>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              {imageName ? (
                <Text>{imageName}</Text>
              ) : (
                <Skeleton>Image Name</Skeleton>
              )}
            </BreadcrumbItem>
          </Breadcrumb>
        }
        topBarRightContent={
          <>
            <KeymapButton />
            <ImportButton />
            <ExportButton />
          </>
        }
      >
        <Flex height="100%" flexDirection="column">
          <Box flex="1">
            <LabellingTool />
          </Box>
          <Box bg={mode("white", "gray.800")} overflow="hidden">
            <Gallery />
          </Box>
        </Flex>
      </Layout>
    </>
  );
};

export default ImagePage;
