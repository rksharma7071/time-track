import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";

import "./styles/index.css";
import "./styles/extras.css";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";
import RoleRoute from "./components/RoleRoute.jsx";
import RouteError from "./components/RouteError.jsx";

import Base from "./pages/Base.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import MyTask from "./pages/MyTask.jsx";
import Project from "./pages/Project.jsx";
import User from "./pages/User.jsx";
import Permission from "./pages/Permission.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";

import { tasksLoader } from "./data/task.js";
import { projectsLoader } from "./data/project.js";
import { usersLoader } from "./data/user.js";
import { permissionsLoader } from "./data/permission.js";

const NotFoundRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Checking authentication...</div>;
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
            errorElement: <RouteError />,
            children: [
              {
                index: true,
                element: <MyTask />,
                loader: tasksLoader,
                errorElement: <RouteError />
              },
              {
                path: "account",
                element: <ChangePassword />
              },
              {
                element: <RoleRoute roles={["admin", "manager"]} />,
                children: [
                  {
                    path: "projects",
                    element: <Project />,
                    loader: projectsLoader,
                    errorElement: <RouteError />
                  },
                ],
              },
              {
                element: <RoleRoute roles={["admin"]} />,
                children: [
                  {
                    path: "users",
                    element: <User />,
                    loader: usersLoader,
                    errorElement: <RouteError />
                  },
                  {
                    path: "permission",
                    element: <Permission />,
                    loader: permissionsLoader,
                    errorElement: <RouteError />
                  },
                ],
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
            element: <Login />
          },
          {
            path: "/register",
            element: <Register />
          },
        ],
      },
      {
        path: "*",
        element: <NotFoundRedirect />
      },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
