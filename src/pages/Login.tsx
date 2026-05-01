import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

const Login = () => {
  const [isActive, setIsActive] = useState(false);
  const { signIn, signUp, signInWithGoogle, user } = useUser();
  const navigate = useNavigate();

  // Sign In States
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPass, setSignInPass] = useState("");
  const [showSignInPass, setShowSignInPass] = useState(false);
  const [signInEmailError, setSignInEmailError] = useState("");
  const [signInPassError, setSignInPassError] = useState("");

  // Sign Up States
  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPass, setSignUpPass] = useState("");
  const [showSignUpPass, setShowSignUpPass] = useState(false);
  const [signUpNameError, setSignUpNameError] = useState("");
  const [signUpEmailError, setSignUpEmailError] = useState("");
  const [signUpPassError, setSignUpPassError] = useState("");

  // General States
  const [error, setError] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);

  // 🔥 AUTO REDIRECT + RELOAD
  useEffect(() => {
    if (user && user.uid) {
      const redirectTimer = setTimeout(() => {
        window.location.href = "/";
      }, 300);
      return () => clearTimeout(redirectTimer);
    }
  }, [user]);

  // EMAIL VALIDATION
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // ✅ SIGN IN HANDLER
  const handleSignIn = async () => {
    setSignInEmailError("");
    setSignInPassError("");
    setError("");

    // VALIDATION
    if (!signInEmail.trim()) {
      setSignInEmailError("Email is required");
      return;
    }

    if (!validateEmail(signInEmail)) {
      setSignInEmailError("Please enter a valid email address");
      return;
    }

    if (!signInPass.trim()) {
      setSignInPassError("Password is required");
      return;
    }

    if (signInPass.length < 6) {
      setSignInPassError("Password must be at least 6 characters");
      return;
    }

    setLoadingAuth(true);

    try {
      const err = await signIn(signInEmail, signInPass);
      setLoadingAuth(false);

      // ✅ PROPER ERROR HANDLING
      if (err) {
        setError(err);
      }
    } catch (err: unknown) {
      setLoadingAuth(false);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  // ✅ SIGN UP HANDLER
  const handleSignUp = async () => {
    setSignUpNameError("");
    setSignUpEmailError("");
    setSignUpPassError("");
    setError("");

    // VALIDATION
    if (!signUpName.trim()) {
      setSignUpNameError("Name is required");
      return;
    }

    if (!signUpEmail.trim()) {
      setSignUpEmailError("Email is required");
      return;
    }

    if (!validateEmail(signUpEmail)) {
      setSignUpEmailError("Please enter a valid email address");
      return;
    }

    if (!signUpPass.trim()) {
      setSignUpPassError("Password is required");
      return;
    }

    if (signUpPass.length < 6) {
      setSignUpPassError("Password must be at least 6 characters");
      return;
    }

    setLoadingAuth(true);

    try {
      const err = await signUp(signUpName, signUpEmail, signUpPass);
      setLoadingAuth(false);

      // ✅ PROPER ERROR HANDLING
      if (err) {
        setError(err);
      }
    } catch (err: unknown) {
      setLoadingAuth(false);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  // ✅ GOOGLE LOGIN HANDLER
  const handleGoogleLogin = async () => {
    setError("");
    setLoadingAuth(true);

    try {
      const err = await signInWithGoogle();
      setLoadingAuth(false);

      // ✅ PROPER ERROR HANDLING
      if (err) {
        setError(err);
      }
    } catch (err: unknown) {
      setLoadingAuth(false);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    }
  };

  return (
    <div
      className="login-font min-h-screen"
      style={{
        background:
          "linear-gradient(to right, hsl(284, 33%, 92%), hsl(284, 33%, 98%))",
      }}
    >
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)] px-4">
        <div className="relative bg-card rounded-[30px] overflow-hidden w-full max-w-[768px] min-h-[480px]">

          {/* ===== SIGN UP FORM ===== */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-all duration-[600ms] ${
              isActive ? "translate-x-full opacity-100 z-[5]" : "opacity-0 z-[1]"
            }`}
          >
            <h1 className="text-2xl font-bold mb-2">Create Account</h1>

            {error && isActive && (
              <div className="w-full mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Name Input */}
            <div className="w-full mb-2">
              <input
                type="text"
                placeholder="Full Name"
                value={signUpName}
                onChange={(e) => {
                  setSignUpName(e.target.value);
                  setSignUpNameError("");
                }}
                className={`w-full bg-secondary rounded-lg px-4 py-2 border-2 transition-colors ${
                  signUpNameError ? "border-red-500" : "border-transparent focus:border-purple-400"
                }`}
              />
              {signUpNameError && (
                <p className="text-xs text-red-500 mt-1">{signUpNameError}</p>
              )}
            </div>

            {/* Email Input */}
            <div className="w-full mb-2">
              <input
                type="email"
                placeholder="Email"
                value={signUpEmail}
                onChange={(e) => {
                  setSignUpEmail(e.target.value);
                  setSignUpEmailError("");
                }}
                className={`w-full bg-secondary rounded-lg px-4 py-2 border-2 transition-colors ${
                  signUpEmailError ? "border-red-500" : "border-transparent focus:border-purple-400"
                }`}
              />
              {signUpEmailError && (
                <p className="text-xs text-red-500 mt-1">{signUpEmailError}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="w-full mb-3">
              <div className="relative">
                <input
                  type={showSignUpPass ? "text" : "password"}
                  placeholder="Password (min 6 characters)"
                  value={signUpPass}
                  onChange={(e) => {
                    setSignUpPass(e.target.value);
                    setSignUpPassError("");
                  }}
                  className={`w-full bg-secondary rounded-lg px-4 py-2 pr-10 border-2 transition-colors ${
                    signUpPassError ? "border-red-500" : "border-transparent focus:border-purple-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSignUpPass(!showSignUpPass)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-lg hover:opacity-70 transition-opacity"
                  aria-label={showSignUpPass ? "Hide password" : "Show password"}
                >
                  {showSignUpPass ? "🙈" : "👁️"}
                </button>
              </div>
              {signUpPassError && (
                <p className="text-xs text-red-500 mt-1">{signUpPassError}</p>
              )}
            </div>

            <button
              onClick={handleSignUp}
              disabled={loadingAuth}
              className="w-full bg-primary text-primary-foreground px-10 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {loadingAuth ? "Creating Account..." : "Sign Up"}
            </button>
          </div>

          {/* ===== SIGN IN FORM ===== */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-all duration-[600ms] z-[2] ${
              isActive ? "-translate-x-full" : ""
            }`}
          >
            <h1 className="text-2xl font-bold mb-2">Sign In</h1>

            {error && !isActive && (
              <div className="w-full mb-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 text-center">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div className="w-full mb-2">
              <input
                type="email"
                placeholder="Email"
                value={signInEmail}
                onChange={(e) => {
                  setSignInEmail(e.target.value);
                  setSignInEmailError("");
                }}
                className={`w-full bg-secondary rounded-lg px-4 py-2 border-2 transition-colors ${
                  signInEmailError ? "border-red-500" : "border-transparent focus:border-purple-400"
                }`}
              />
              {signInEmailError && (
                <p className="text-xs text-red-500 mt-1">{signInEmailError}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="w-full mb-3">
              <div className="relative">
                <input
                  type={showSignInPass ? "text" : "password"}
                  placeholder="Password"
                  value={signInPass}
                  onChange={(e) => {
                    setSignInPass(e.target.value);
                    setSignInPassError("");
                  }}
                  className={`w-full bg-secondary rounded-lg px-4 py-2 pr-10 border-2 transition-colors ${
                    signInPassError ? "border-red-500" : "border-transparent focus:border-purple-400"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowSignInPass(!showSignInPass)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-lg hover:opacity-70 transition-opacity"
                  aria-label={showSignInPass ? "Hide password" : "Show password"}
                >
                  {showSignInPass ? "🙈" : "👁️"}
                </button>
              </div>
              {signInPassError && (
                <p className="text-xs text-red-500 mt-1">{signInPassError}</p>
              )}
            </div>

            <button
              onClick={handleSignIn}
              disabled={loadingAuth}
              className="w-full bg-primary text-primary-foreground px-10 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {loadingAuth ? "Signing In..." : "Sign In"}
            </button>

            <button
              onClick={handleGoogleLogin}
              disabled={loadingAuth}
              className="w-full mt-3 border-2 border-gray-300 px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔵</span>
              {loadingAuth ? "Connecting..." : "Continue with Google"}
            </button>
          </div>

          {/* ===== TOGGLE PANEL ===== */}
          <div
            className={`absolute top-0 left-1/2 w-1/2 h-full overflow-hidden rounded-l-[150px] transition-all duration-[600ms] z-[100] ${
              isActive
                ? "-translate-x-full rounded-l-none rounded-r-[150px]"
                : ""
            }`}
          >
            <div className="h-full flex items-center justify-center px-8 text-center text-white bg-primary">
              {!isActive ? (
                <div>
                  <h1 className="text-2xl font-bold mb-3">Hello, Friend! 👋</h1>
                  <p className="text-sm mb-4 text-white/90">
                    Don't have an account? Sign up now to book bus tickets and enjoy seamless travel.
                  </p>
                  <button
                    onClick={() => {
                      setIsActive(true);
                      setError("");
                      setSignInEmailError("");
                      setSignInPassError("");
                    }}
                    className="border border-white px-10 py-2 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors duration-300"
                  >
                    Sign Up
                  </button>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold mb-3">Welcome Back! 🎉</h1>
                  <p className="text-sm mb-4 text-white/90">
                    Already have an account? Sign in to continue booking your tickets.
                  </p>
                  <button
                    onClick={() => {
                      setIsActive(false);
                      setError("");
                      setSignUpNameError("");
                      setSignUpEmailError("");
                      setSignUpPassError("");
                    }}
                    className="border border-white px-10 py-2 rounded-lg font-semibold hover:bg-white hover:text-primary transition-colors duration-300"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
