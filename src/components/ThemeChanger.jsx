import React, { useContext } from "react";
import { ThemeContext } from "../context/ThemeContext";

const ThemeChanger = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <button
      onClick={toggleTheme}
      className="px-2 py-1 border rounded bg-gray-200 dark:bg-gray-700 dark:text-white"
    >
      Switch to {theme === "light" ? "dark" : "light"} theme
    </button>
  );
};

export default ThemeChanger;
