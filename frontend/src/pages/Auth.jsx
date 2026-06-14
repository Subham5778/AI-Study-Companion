import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BrainCircuit, Loader2 } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, googleLogin } = useAuth();

  const handleGoogleSuccess = async (response) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
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
    const checkGoogle = setInterval(() => {
      if (window.google) {
        clearInterval(checkGoogle);
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your_google_client_id_here',
            callback: handleGoogleSuccess,
          });
          window.google.accounts.id.renderButton(
            document.getElementById("googleSignInButton"),
            { theme: "outline", size: "large", width: "100%", text: isLogin ? "signin_with" : "signup_with" }
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
          <div id="googleSignInButton" className="w-full flex justify-center"></div>
          {(!import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID === 'your_google_client_id_here') && (
            <button 
              onClick={handleMockGoogleLogin}
              className="text-xs text-primary/60 hover:text-primary hover:underline transition-colors w-full text-center mt-1 block"
            >
              ⚙️ Test Google Sign-In (Mock Bypass)
            </button>
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
