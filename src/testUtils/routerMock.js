// Lightweight stand-in for react-router-dom in unit tests (Jest in CRA cannot
// resolve react-router v7's "exports" map). Used via:
//   jest.mock("react-router-dom", () => require("<rel>/testUtils/routerMock"));
const React = require("react");

const navigate = jest.fn();
const location = { pathname: "/", search: "", state: null };

module.exports = {
  navigate,
  location,
  useNavigate: () => navigate,
  useLocation: () => location,
  MemoryRouter: ({ children }) => React.createElement(React.Fragment, null, children),
  Link: ({ to, children, ...rest }) => React.createElement("a", { href: to, ...rest }, children),
  NavLink: ({ to, children, ...rest }) => React.createElement("a", { href: to, ...rest }, children),
};
