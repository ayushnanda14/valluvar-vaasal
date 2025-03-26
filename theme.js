import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  colors: {
    brand: {
      50: "#fff8e1",
      100: "#ffecb3",
      200: "#ffe082",
      300: "#ffd54f",
      400: "#ffca28",
      500: "#ffc107",
      600: "#ffb300",
      700: "#ffa000",
      800: "#ff8f00",
      900: "#ff6f00",
    },
    brown: {
      50: "#efebe9",
      100: "#d7ccc8",
      200: "#bcaaa4",
      300: "#a1887f",
      400: "#8d6e63",
      500: "#795548",
      600: "#6d4c41",
      700: "#5d4037",
      800: "#4e342e",
      900: "#3e2723",
    },
  },
  components: {
    Button: {
      variants: {
        // A subtle button with a light orange background and brown text
        subtle: {
          bg: "brand.100",
          color: "brown.800",
          _hover: {
            bg: "brand.200",
          },
        },
        // A solid button with a brown background and white text
        solid: {
          bg: "brown.500",
          color: "white",
          _hover: {
            bg: "brown.600",
          },
        },
      },
      defaultProps: {
        variant: "subtle",
      },
    },
    Card: {
      baseStyle: {
        bg: "brand.50",
        borderRadius: "md",
        boxShadow: "md",
        p: 4,
      },
      variants: {
        subtle: {
          bg: "brand.50",
        },
        outlined: {
          border: "1px solid",
          borderColor: "brown.200",
        },
      },
      defaultProps: {
        variant: "subtle",
      },
    },
  },
});

export default theme;
