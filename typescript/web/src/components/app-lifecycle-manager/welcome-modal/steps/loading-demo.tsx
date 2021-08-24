import {
  chakra,
  ModalContent,
  ModalFooter,
  VStack,
  HStack,
  Button,
  Image,
  Center,
  Text,
  Heading,
  ModalBody,
  ModalHeader,
  useColorModeValue as mode,
} from "@chakra-ui/react";
import { RiGithubFill } from "react-icons/ri";

import gift from "../../../../../public/static/graphics/gift.svg";

const GithubIcon = chakra(RiGithubFill);
type Props = {
  startLabellingButtonRef: React.Ref<HTMLButtonElement>;
  onClickNext?: () => void;
};

export const LoadingDemo = ({
  startLabellingButtonRef,
  onClickNext,
}: Props) => {
  return (
    <ModalContent margin="3.75rem">
      <ModalHeader textAlign="center" padding="8">
        <Center>
          <Image src={gift} mt="12" mb="8" width="40" height="40" />
        </Center>
      </ModalHeader>

      <ModalBody>
        <VStack
          justifyContent="space-evenly"
          spacing="8"
          h="full"
          mt="0"
          mb="8"
        >
          <Heading
            as="h1"
            size="2xl"
            maxW="lg"
            color={mode("gray.600", "gray.300")}
            fontWeight="extrabold"
            textAlign="center"
          >
            Preparing the demo...
          </Heading>
          <Text
            color={mode("gray.600", "gray.400")}
            maxW="lg"
            fontSize="lg"
            fontWeight="medium"
            textAlign="justify"
          >
            The demo dataset contains example data and a quick tutorial, helping
            you get you started easily with the tool. This should last a few
            seconds.
          </Text>
        </VStack>
      </ModalBody>

      <ModalFooter>
        <HStack
          direction={{ base: "column", md: "row" }}
          justifyContent="center"
          width="full"
          spacing="4"
          mb="10"
        >
          <Button
            as="a"
            leftIcon={<GithubIcon fontSize="xl" />}
            href="https://github.com/Labelflow/labelflow"
            target="blank"
            size="lg"
            minW="210px"
            variant="link"
            height="14"
            px="8"
          >
            See code on Github
          </Button>

          <Button
            ref={startLabellingButtonRef}
            size="lg"
            minW="210px"
            colorScheme="brand"
            height="14"
            px="8"
            isLoading
            onClick={onClickNext}
            loadingText="Loading the demo"
          >
            Start Labelling!
          </Button>
        </HStack>
      </ModalFooter>
    </ModalContent>
  );
};
