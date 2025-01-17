import { gql, useQuery } from "@apollo/client";
import NextLink from "next/link";
import {
  Box,
  VStack,
  useColorModeValue as mode,
  Image,
  Center,
  Skeleton,
  Spinner,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Heading,
  chakra,
  SimpleGrid,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { isEmpty } from "lodash/fp";
import { RiArrowRightSLine } from "react-icons/ri";
import { useErrorHandler } from "react-error-boundary";
import type { Dataset as DatasetType } from "@labelflow/graphql-types";
import { AppLifecycleManager } from "../../../../../components/app-lifecycle-manager";
import { KeymapButton } from "../../../../../components/layout/top-bar/keymap-button";
import { ImportButton } from "../../../../../components/import-button";
import { ExportButton } from "../../../../../components/export-button";
import { Meta } from "../../../../../components/meta";
import { Layout } from "../../../../../components/layout";
import { EmptyStateNoImages } from "../../../../../components/empty-state";
import { DatasetTabBar } from "../../../../../components/layout/tab-bar/dataset-tab-bar";
import Error404Page from "../../../../404";

const ArrowRightIcon = chakra(RiArrowRightSLine);

export const datasetDataQuery = gql`
  query getDatasetData($slug: String!) {
    dataset(where: { slug: $slug }) {
      id
      name
      images {
        id
        name
        url
      }
    }
  }
`;

const ImagesPage = () => {
  const router = useRouter();
  const datasetSlug = router?.query?.datasetSlug as string;

  const { data: datasetResult, error } = useQuery<{
    dataset: DatasetType;
  }>(datasetDataQuery, {
    variables: {
      slug: datasetSlug,
    },
    skip: !datasetSlug,
  });

  const datasetName = datasetResult?.dataset.name;

  const handleError = useErrorHandler();
  if (error) {
    if (!error.message.match(/No dataset with slug/)) {
      handleError(error);
    }
    return (
      <>
        <AppLifecycleManager />
        <Error404Page />
      </>
    );
  }

  const cardBackground = mode("white", "gray.700");
  const imageBackground = mode("gray.100", "gray.800");
  return (
    <>
      <AppLifecycleManager />
      <Meta title="LabelFlow | Images" />
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

            <BreadcrumbItem>
              <NextLink href={`/local/datasets/${datasetSlug}`}>
                <BreadcrumbLink>
                  {datasetName ?? <Skeleton>Dataset Name</Skeleton>}
                </BreadcrumbLink>
              </NextLink>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <Text>Images</Text>
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
        tabBar={<DatasetTabBar currentTab="images" datasetSlug={datasetSlug} />}
      >
        {!datasetResult && (
          <Center h="full">
            <Spinner size="xl" />
          </Center>
        )}
        {datasetResult && isEmpty(datasetResult?.dataset?.images) && (
          <Center h="full">
            <Box as="section">
              <Box
                maxW="2xl"
                mx="auto"
                px={{ base: "6", lg: "8" }}
                py={{ base: "16", sm: "20" }}
                textAlign="center"
              >
                <EmptyStateNoImages w="full" />
                <Heading as="h2">You don&apos;t have any images.</Heading>
                <Text mt="4" fontSize="lg">
                  Fortunately, it’s very easy to add some.
                </Text>

                <ImportButton
                  colorScheme="brand"
                  variant="solid"
                  mt="8"
                  showModal={false}
                />
              </Box>
            </Box>
          </Center>
        )}

        {datasetResult && !isEmpty(datasetResult?.dataset?.images) && (
          <SimpleGrid
            minChildWidth="240px"
            spacing={{ base: "2", md: "8" }}
            padding={{ base: "2", md: "8" }}
          >
            {datasetResult?.dataset?.images?.map(({ id, name, url }) => (
              <NextLink
                href={`/local/datasets/${datasetSlug}/images/${id}`}
                key={id}
              >
                <a href={`/local/datasets/${datasetSlug}/images/${id}`}>
                  <VStack
                    p={4}
                    background={cardBackground}
                    rounded={8}
                    height="250px"
                    justifyContent="space-between"
                  >
                    <Heading
                      as="h3"
                      size="sm"
                      overflow="hidden"
                      textOverflow="ellipsis"
                      whiteSpace="nowrap"
                      w="full"
                      flexGrow={0}
                      flexShrink={0}
                    >
                      {name}
                    </Heading>
                    <Image
                      background={imageBackground}
                      alt={name}
                      src={url}
                      ignoreFallback
                      objectFit="contain"
                      h="188px"
                      w="full"
                      flexGrow={0}
                      flexShrink={0}
                    />
                  </VStack>
                </a>
              </NextLink>
            ))}
          </SimpleGrid>
        )}
      </Layout>
    </>
  );
};

export default ImagesPage;
