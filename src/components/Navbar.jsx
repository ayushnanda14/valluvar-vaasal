import { Flex, Link, Box } from "@chakra-ui/react";
import ThemeChanger from "./ThemeChanger";

function Navbar() {
  return (
    <Flex p="1rem" justify="space-between" align="center">
      {/* Logo */}
      <Box>
        <Box as="span" fontWeight="bold">
          Valluvar Vaasal
        </Box>
      </Box>
      {/* Navigation Menu */}
      <Box>
        <Flex gap="1rem" m={0}>
          <Link href="/home" _hover={{ color: "blue.500" }}>
            Home
          </Link>
          <Link href="/about" _hover={{ color: "blue.500" }}>
            About
          </Link>
        </Flex>
      </Box>
      {/* Auxiliary Options */}
      <Flex gap="1rem" align="center">
        <ThemeChanger />
        <Box>
          <Link href="/login" _hover={{ color: "blue.500" }}>
            Login/Sign Up
          </Link>
        </Box>
      </Flex>
    </Flex>
  );
}

export default Navbar;
