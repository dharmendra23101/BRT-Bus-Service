import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";

const Login = () => {
const [isActive, setIsActive] = useState(false);

const { signIn, signUp, signInWithGoogle, user } = useUser();

const navigate = useNavigate();

const [signInEmail, setSignInEmail] = useState("");
const [signInPass, setSignInPass] = useState("");

const [signUpName, setSignUpName] = useState("");
const [signUpEmail, setSignUpEmail] = useState("");
const [signUpPass, setSignUpPass] = useState("");

const [error, setError] = useState("");
const [loadingAuth, setLoadingAuth] = useState(false);

useEffect(() => {
if (user) {
navigate("/dashboard");
}
}, [user, navigate]);

const handleSignIn = async () => {
if (!signInEmail.trim() || !signInPass.trim()) {
setError("Please enter email and password.");
return;
}

setLoadingAuth(true);
setError("");

const err = await signIn(signInEmail, signInPass);

setLoadingAuth(false);

if (err) {
  setError(err);
}

};

const handleSignUp = async () => {
if (!signUpName.trim() || !signUpEmail.trim() || !signUpPass.trim()) {
setError("Please fill in all fields.");
return;
}

setLoadingAuth(true);
setError("");

const err = await signUp(signUpName, signUpEmail, signUpPass);

setLoadingAuth(false);

if (err) {
  setError(err);
}

};

const handleGoogleLogin = async () => {
setLoadingAuth(true);
setError("");

const err = await signInWithGoogle();

setLoadingAuth(false);

if (err) {
  setError(err);
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


Home


Contact




  <div className="flex items-center justify-center min-h-[calc(100vh-48px)] px-4">
    <div className="relative bg-card rounded-[30px] overflow-hidden w-full max-w-[768px] min-h-[480px]">

      {/* SIGN UP FORM */}
      <div
        className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-all duration-[600ms] ${
          isActive
            ? "translate-x-full opacity-100 z-[5]"
            : "opacity-0 z-[1]"
        }`}
      >
        <h1 className="text-2xl font-bold mb-2">Create Account</h1>

        {error && isActive && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}

        <input
          type="text"
          placeholder="Name"
          value={signUpName}
          onChange={(e) => setSignUpName(e.target.value)}
          className="w-full bg-secondary rounded-lg px-4 py-2 mb-2"
        />

        <input
          type="email"
          placeholder="Email"
          value={signUpEmail}
          onChange={(e) => setSignUpEmail(e.target.value)}
          className="w-full bg-secondary rounded-lg px-4 py-2 mb-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={signUpPass}
          onChange={(e) => setSignUpPass(e.target.value)}
          className="w-full bg-secondary rounded-lg px-4 py-2 mb-3"
        />

        <button
          onClick={handleSignUp}
          disabled={loadingAuth}
          className="bg-primary text-primary-foreground px-10 py-2 rounded-lg"
        >
          {loadingAuth ? "Creating..." : "Sign Up"}
        </button>
      </div>

      {/* SIGN IN FORM */}
      <div
        className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center px-10 transition-all duration-[600ms] z-[2] ${
          isActive ? "-translate-x-full" : ""
        }`}
      >
        <h1 className="text-2xl font-bold mb-2">Sign In</h1>

        {error && !isActive && (
          <p className="text-xs text-red-500 mb-2">{error}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          value={signInEmail}
          onChange={(e) => setSignInEmail(e.target.value)}
          className="w-full bg-secondary rounded-lg px-4 py-2 mb-2"
        />

        <input
          type="password"
          placeholder="Password"
          value={signInPass}
          onChange={(e) => setSignInPass(e.target.value)}
          className="w-full bg-secondary rounded-lg px-4 py-2 mb-3"
        />

        <button
          onClick={handleSignIn}
          disabled={loadingAuth}
          className="bg-primary text-primary-foreground px-10 py-2 rounded-lg"
        >
          {loadingAuth ? "Signing in..." : "Sign In"}
        </button>

        <button
          onClick={handleGoogleLogin}
          className="mt-3 border px-6 py-2 rounded-lg text-sm"
        >
          Continue with Google
        </button>
      </div>

      {/* TOGGLE PANEL */}
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
              <h1 className="text-2xl font-bold mb-3">Hello, Friend!</h1>
              <button
                onClick={() => {
                  setIsActive(true);
                  setError("");
                }}
                className="border px-10 py-2 rounded-lg"
              >
                Sign Up
              </button>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold mb-3">Welcome Back!</h1>
              <button
                onClick={() => {
                  setIsActive(false);
                  setError("");
                }}
                className="border px-10 py-2 rounded-lg"
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