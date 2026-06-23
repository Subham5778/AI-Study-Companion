import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Loader2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const openDashboardFromTop = () => {
    navigate('/', { replace: true });
    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
  };

  const handleGoogleSuccess = async (response) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
      openDashboardFromTop();
    } catch (err) {
      setError(err.response?.data?.message || 'Google Sign-In failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMockGoogleLogin = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'your_google_client_id_here') {
      const email = prompt("Enter mock email to test Google Login:", "test-google@example.com");
      if (email) {
        handleGoogleSuccess({ credential: email });
      }
    }
  };

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const hasValidClientId = clientId && clientId !== 'your_google_client_id_here';

    if (!hasValidClientId) {
      return;
    }

    const checkGoogle = setInterval(() => {
      if (window.google) {
        clearInterval(checkGoogle);
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSuccess,
          });
          window.google.accounts.id.renderButton(
            document.getElementById("googleSignInButton"),
            { theme: "outline", size: "large", width: "320", text: isLogin ? "signin_with" : "signup_with" }
          );
        } catch (err) {
          console.error("Error initializing Google Sign-In:", err);
        }
      }
    }, 100);

    return () => clearInterval(checkGoogle);
  }, [isLogin]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
      openDashboardFromTop();
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primaryDark flex items-center justify-center text-white font-bold text-2xl shadow-lg">
          AI
        </div>
        <h1 className="font-bold text-2xl text-white leading-tight">Study<br/>Companion</h1>
      </div>

      <div className="glass-panel p-8 w-full max-w-md relative overflow-hidden">
        <div className="absolute -top-20 -right-20 opacity-5">
           <BrainCircuit size={200} />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2 relative z-10">{isLogin ? 'Welcome back' : 'Create an account'}</h2>
        <p className="text-textMuted mb-6 relative z-10">{isLogin ? 'Login to continue your preparation journey.' : 'Start your placement preparation today.'}</p>

        {error && <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm relative z-10">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Full Name</label>
              <input 
                type="text" 
                name="name" 
                required 
                className="input-field w-full" 
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Email</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="input-field w-full" 
              placeholder="you@university.edu"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-textMuted mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="input-field w-full" 
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2 py-3">
             {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <div className="relative my-6 z-10 flex items-center justify-center">
          <div className="border-t border-white/10 w-full"></div>
          <span className="bg-[#171717] px-3 text-xs text-textMuted font-medium absolute">Or continue with</span>
        </div>

        <div className="space-y-3 relative z-10">
          {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your_google_client_id_here') ? (
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={handleMockGoogleLogin}
                className="w-full max-w-[320px] mx-auto flex items-center justify-center gap-3 bg-white text-gray-800 hover:bg-gray-100 active:bg-gray-200 font-semibold py-2.5 px-4 rounded-lg border border-gray-300 shadow-sm transition-all duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{isLogin ? 'Sign in with Google (Mock)' : 'Sign up with Google (Mock)'}</span>
              </button>
              <p className="text-xs text-textMuted text-center max-w-[280px]">
                Google Sign-In is running in Mock Mode because <code>VITE_GOOGLE_CLIENT_ID</code> is not configured.
              </p>
            </div>
          ) : (
            <div id="googleSignInButton" className="w-full flex justify-center"></div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-textMuted relative z-10">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button className="text-primary hover:underline hover:text-white transition-colors" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
