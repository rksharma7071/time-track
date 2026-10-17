import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../data/auth.js";
import { getErrorMessage } from "../data/api.js";
import { EMAIL_REGEX, validatePassword } from "../utils/helpers.js";
import "../styles/Login.css";

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();

    if (!name || !email) return setError("Name and email are required.");
    if (!EMAIL_REGEX.test(email)) return setError("Please enter a valid email address.");

    const passwordError = validatePassword(formData.password);
    if (passwordError) return setError(passwordError);
    if (formData.password !== formData.confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    try {
      await register({ name, email, password: formData.password });
      navigate("/login", { replace: true, state: { message: "Account created. Log in to continue." } });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">T</div>
          <h1>Create your account</h1>
          <p>Your admin can give you access to projects after you sign up.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="form-group">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" value={formData.name} onChange={handleChange} autoComplete="name" maxLength={100} required />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} autoComplete="email" required />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                autoComplete="new-password"
                maxLength={72}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <small className="form-hint">8–72 characters, with at least one letter and one number.</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>

          {error && <p className="login-message login-error" role="alert">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="login-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
