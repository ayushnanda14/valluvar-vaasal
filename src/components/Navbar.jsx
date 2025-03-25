import ThemeChanger from "./ThemeChanger";

function Navbar() {
  return (
    <nav className="flex justify-between items-center py-2 px-4 bg-white dark:bg-gray-800 text-black dark:text-white">
      {/* Logo */}
      <div>
        <span className="font-bold">Valluvar Vaasal</span>
      </div>
      {/* Nav menu */}
      <div className="flex">
        <ul className="flex gap-4">
          <li>
            <a className="hover:text-blue-500" href="/home">
              Home
            </a>
          </li>
          <li>
            <a className="hover:text-blue-500" href="/about">
              About
            </a>
          </li>
        </ul>
      </div>
      {/* Auxiliary Options */}
      <div className="flex gap-4 items-center">
        {/* <ThemeChanger /> */}
        <div>
          <a className="hover:text-blue-500" href="/login">
            Login/Sign Up
          </a>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
