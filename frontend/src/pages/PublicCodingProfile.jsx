import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Award, Code2, ExternalLink, Flame, Loader2, Trophy } from 'lucide-react';
import API from '../api/axios';

const PLATFORMS = {
  leetcode: { name: 'LeetCode', accent: '#f59e0b' },
  geeksforgeeks: { name: 'GeeksforGeeks', accent: '#22c55e' },
  codeforces: { name: 'Codeforces', accent: '#38bdf8' },
  codechef: { name: 'CodeChef', accent: '#c084fc' }
};

const platformName = (id) => PLATFORMS[id]?.name || id || 'Platform';

const PublicCodingProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    API.get(`/api/user/public-coding-profile/${userId}`)
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load public profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const totals = useMemo(() => {
    const problems = profile?.dashboard?.problemHistory || [];
    const accepted = problems.filter((problem) => (problem.status || 'Accepted') === 'Accepted').length;
    const platforms = new Set(problems.map((problem) => problem.platform).filter(Boolean));
    return {
      solved: accepted || problems.length,
      platforms: Math.max(platforms.size, profile?.dashboard?.profiles?.length || 0),
      recent: problems.slice(0, 8)
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-white">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-white">
        <div className="glass-panel max-w-md p-6 text-center">
          <h1 className="text-xl font-bold">Profile unavailable</h1>
          <p className="mt-2 text-sm text-textMuted">{error}</p>
        </div>
      </div>
    );
  }

  const { user, dashboard } = profile;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-white sm:px-6">
      <main className="mx-auto max-w-5xl space-y-6">
        <section className="glass-panel overflow-hidden p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <img src={user.avatar} alt="" className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 object-cover" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">Public Coding Profile</p>
                <h1 className="mt-1 text-3xl font-bold">{user.name}</h1>
                <p className="mt-1 text-sm text-textMuted">Shared competitive coding progress snapshot.</p>
              </div>
            </div>
            <div className="text-sm text-textMuted">
              Updated {dashboard.lastRefreshedAt ? new Date(dashboard.lastRefreshedAt).toLocaleDateString() : 'recently'}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric icon={Code2} label="Tracked Solves" value={totals.solved} />
            <Metric icon={Trophy} label="Platforms" value={totals.platforms} />
            <Metric icon={Flame} label="Goals" value={dashboard.goals?.length || 0} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {(dashboard.profiles || []).map((item) => (
            <article key={item.platform} className="glass-panel p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: PLATFORMS[item.platform]?.accent || '#38bdf8' }}>
                {platformName(item.platform)}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{item.username}</h2>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="rounded-lg border border-white/10 p-2 text-textMuted hover:bg-white/10" title="Open profile">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className="glass-panel p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Award size={20} className="text-sky-300" /> Recent Problems</h2>
          {totals.recent.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-textMuted">
                  <tr><th className="py-2 pr-4">Platform</th><th className="py-2 pr-4">Problem</th><th className="py-2 pr-4">Difficulty</th><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Language</th></tr>
                </thead>
                <tbody>
                  {totals.recent.map((problem) => (
                    <tr key={problem.id || `${problem.platform}-${problem.name}-${problem.date}`} className="border-t border-white/10">
                      <td className="py-3 pr-4">{platformName(problem.platform)}</td>
                      <td className="py-3 pr-4 font-medium">{problem.name}</td>
                      <td className="py-3 pr-4">{problem.difficulty || 'N/A'}</td>
                      <td className="py-3 pr-4">{problem.date || '-'}</td>
                      <td className="py-3 pr-4">{problem.language || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-textMuted">No public problem history has been tracked yet.</p>
          )}
        </section>
      </main>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }) => (
  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
    <Icon size={18} className="mb-3 text-sky-300" />
    <p className="text-xs uppercase tracking-[0.16em] text-textMuted">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </div>
);

export default PublicCodingProfile;
