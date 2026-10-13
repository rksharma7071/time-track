
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";

import "./styles/index.css";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";

import Base from "./components/Base.jsx";
import App from "./App.jsx";
import Login from "./components/Login.jsx";
import Register from "./components/Register.jsx";
import Project from "./components/Project.jsx";
import User from "./components/User.jsx";
import { getAllProjects, getAllUsers, getProjectsAndUsers } from "./data/product.js";

const NotFoundRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) return <p>Checking authentication...</p>;

  return <Navigate to={user ? "/" : "/login"} replace />;
};

const router = createBrowserRouter([
  // Private routes: only logged-in users
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
          },
          {
            path: "projects",
            element: <Project />,
            loader: getProjectsAndUsers
          },
          {
            path: "users",
            element: <User />,
            loader: getAllUsers
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
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
