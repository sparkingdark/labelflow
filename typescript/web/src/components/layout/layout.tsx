import { ReactNode } from "react";
import { Flex, Box, useColorModeValue as mode } from "@chakra-ui/react";
import { TopBar } from "./top-bar";

export type Props = {
  topBarLeftContent?: ReactNode;
  topBarRightContent?: ReactNode;
  children: ReactNode;
  tabBar?: ReactNode;
};

export const Layout = ({
  children,
  topBarLeftContent,
  topBarRightContent,
  tabBar,
}: Props) => {
  return (
    <Flex direction="column" h="100vh">
      <TopBar
        leftContent={topBarLeftContent}
        rightContent={topBarRightContent}
      />
      {tabBar}
      <Box as="main" bg={mode("gray.100", "gray.900")} flex="1">
        {children}
      </Box>
    </Flex>
  );
};
