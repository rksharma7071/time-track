import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { changePassword } from "../data/auth.js";
import { getErrorMessage } from "../data/api.js";
import { validatePassword } from "../utils/helpers.js";
import "../styles/TimesheetForm.css";

const initialForm = { currentPassword: "", newPassword: "", confirmPassword: "" };

const ChangePassword = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = formData;

    if (!currentPassword || !newPassword) return setError("Current password and new password are required.");
    const passwordError = validatePassword(newPassword);
    if (passwordError) return setError(passwordError);
    if (newPassword === currentPassword) return setError("New password must be different from the current password.");
    if (newPassword !== confirmPassword) return setError("New passwords do not match.");

    setSaving(true);
    try {
      const data = await changePassword({ currentPassword, newPassword });
      // Backend blacklists the token and clears the cookie, so the session is over.
      setUser(null);
      navigate("/login", { replace: true, state: { message: data.message } });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to change password."));
      setSaving(false);
    }
  };

  return (
    <main className="account-page">
      <section className="timesheet-form-section account-card">
        <div className="section-header">
          <h1>Account</h1>
          <p>
            Signed in as <strong>{user?.name}</strong> ({user?.email}) · <span className="text-capitalize">{user?.role}</span>
          </p>
        </div>

        <form className="timesheet-form" onSubmit={handleSubmit} noValidate>
          <h2 className="account-subheading">Change password</h2>

          <div className="form-group">
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" value={formData.currentPassword} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" maxLength={72} value={formData.newPassword} onChange={handleChange} required />
            <small className="form-hint">8–72 characters, with at least one letter and one number.</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} required />
          </div>

          {error && <p className="timesheet-error" role="alert">{error}</p>}

          <p className="form-note">You'll be logged out after the password changes.</p>

          <div className="timesheet-actions">
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? "Changing password..." : "Change password"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default ChangePassword;
