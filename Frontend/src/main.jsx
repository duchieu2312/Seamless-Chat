import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./style.css";
import routes from "./routes";
const router = createBrowserRouter(routes);
import { Toaster } from "sonner";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Toaster richColors position="top-right" theme="dark" />
    <RouterProvider router={router} />
  </StrictMode>,
);
