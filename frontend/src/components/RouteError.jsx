import { useNavigate, useRouteError } from "react-router-dom";
import { getErrorMessage } from "../data/api.js";

const RouteError = () => {
  const error = useRouteError();
  const navigate = useNavigate();
  const status = error?.response?.status ?? error?.status;

  const title = status === 403 ? "You don't have access to this page" : "This page couldn't be loaded";
  const message = getErrorMessage(error, error?.statusText || "Check your connection and try again.");

  return (
    <main className="route-error">
      <div className="route-error-card">
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="route-error-actions">
          <button type="button" onClick={() => navigate(0)}>Try again</button>
          <button type="button" onClick={() => navigate("/", { replace: true })}>Go to my tasks</button>
        </div>
      </div>
    </main>
  );
};

export default RouteError;
