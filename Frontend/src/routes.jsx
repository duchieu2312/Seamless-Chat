import Auth from "./pages/Auth";
import Channels from "./pages/Channels";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const routes = [
  {
    path: "/",
    element: <Auth />,
  },
  {
    path: "/channels",
    element: (
      <ProtectedRoute>
        <Channels />
      </ProtectedRoute>
    ),
  },
];

export default routes;
