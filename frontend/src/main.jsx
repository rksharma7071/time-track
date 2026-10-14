
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";

import "./styles/index.css";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";

import Base from "./pages/Base.jsx";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Project from "./pages/Project.jsx";
import User from "./pages/User.jsx";
import { getProjectsAndUsers } from "./data/project.js";
import { usersLoader } from "./data/user.js";
import { getTasksAndUsers } from "./data/task.js";

const NotFoundRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <p>Checking authentication...</p>;

  return <Navigate to={user ? "/" : "/login"} replace />;
};

const AuthLayout = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "/",
            element: <Base />,
            children: [
              {
                index: true,
                element: <App />,
                loader: getTasksAndUsers
              },
              {
                path: "projects",
                element: <Project />,
                loader: getProjectsAndUsers,
              },
              {
                path: "users",
                element: <User />,
                loader: usersLoader,
              },
            ],
          },
        ],
      },

      {
        element: <PublicRoute />,
        children: [
          {
            path: "/login",
            element: <Login />,
          },
          {
            path: "/register",
            element: <Register />,
          },
        ],
      },

      {
        path: "*",
        element: <NotFoundRedirect />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
