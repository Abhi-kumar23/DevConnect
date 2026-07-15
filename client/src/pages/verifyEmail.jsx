import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const VerifyEmail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, resendVerificationCode } = useAuth();

  const email = new URLSearchParams(location.search).get("email") || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timer <= 0) return;

    const timeout = setTimeout(() => {
      setTimer((current) => current - 1);
    }, 1000);

    return () => clearTimeout(timeout);
  }, [timer]);

  const handleVerifyOTP = async (event) => {
    event.preventDefault();

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");

    const result = await verifyEmail(email, otp);

    setLoading(false);

    if (result.success) {
      toast.success("Email verified successfully!");
      navigate("/", { replace: true });
    } else {
      setError(result.message);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError("");

    const result = await resendVerificationCode(email);

    setLoading(false);

    if (result.success) {
      toast.success("A new OTP was sent to your email");
      setTimer(120); // matches backend's two-minute cooldown
      setOtp("");
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900">Verify your email</h2>
        <p className="mt-2 text-sm text-gray-600">
          Enter the six-digit OTP sent to <strong>{email}</strong>.
        </p>

        <form onSubmit={handleVerifyOTP} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full rounded-lg border p-3 text-center text-2xl tracking-[0.5em]"
            autoFocus
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-lg bg-primary-600 py-3 text-white disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <div className="mt-5 text-center">
          {timer > 0 ? (
            <p className="text-sm text-gray-500">Resend OTP in {timer}s</p>
          ) : (
            <button
              onClick={handleResendOTP}
              disabled={loading}
              className="text-sm font-medium text-primary-600"
            >
              Resend OTP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
