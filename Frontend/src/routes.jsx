import Auth from "./pages/Auth";
import App from "./pages/App";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const routes = [
  {
    path: "/",
    element: <Auth />,
  },
  {
    path: "/seamless-chat",
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
    ),
  },
];

export default routes;
