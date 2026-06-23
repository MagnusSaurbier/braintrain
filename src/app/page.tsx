import { getChallenges } from '@/challenges/registry';
import Link from 'next/link';

export default function Home() {
  const challenges = getChallenges();

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center relative">
          <h1 className="text-5xl font-extrabold tracking-tight mb-3">BrainTrain</h1>
          <p className="text-gray-400 text-lg">Timed mental challenges. Pick one and go.</p>
          <Link href="/settings" className="absolute right-0 top-0 text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Settings ⚙
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((c) => (
            <Link
              key={c.id}
              href={`/play/${c.id}`}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-indigo-600 rounded-2xl p-6 flex flex-col gap-3 transition-all group"
            >
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold group-hover:text-indigo-400 transition-colors">
                  {c.title}
                </h2>
                <span className="text-xs font-medium bg-gray-800 text-gray-400 px-2 py-1 rounded-full capitalize">
                  {c.category}
                </span>
              </div>
              <p className="text-gray-400 text-sm">{c.description}</p>
              <div className="text-gray-600 text-xs mt-auto">{c.config.durationSec}s · {c.config.mode}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
