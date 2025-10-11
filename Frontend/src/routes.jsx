import Auth from "./pages/Auth";
import Channels from "./pages/Channels";

const routes = [
  {
    path: "/",
    element: <Auth />,
  },
  {
    path: "/channels",
    element: <Channels />,
  },
];

export default routes;
