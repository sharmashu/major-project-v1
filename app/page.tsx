"use client";

import { useState } from "react";
import { Loader2, Github, Sparkles, FileText, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";

export default function Home() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [commits, setCommits] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // States for individual commits
  const [briefs, setBriefs] = useState<Record<string, { loading: boolean, text: string | null }>>({});
  const [activeChat, setActiveChat] = useState<string | null>(null); // commit sha
  const [chatMessages, setChatMessages] = useState<Record<string, { role: string, content: string }[]>>({});
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const fetchCommits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setError(null);
    setCommits([]);

    try {
      const res = await fetch(`/api/commits?repo=${encodeURIComponent(repoUrl)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch commits");

      setCommits(data.commits);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBriefExplanation = async (commit: any) => {
    if (briefs[commit.sha]) return; // already loaded or loading

    setBriefs(prev => ({ ...prev, [commit.sha]: { loading: true, text: null } }));

    try {
      const res = await fetch("/api/explain/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ diffUrl: commit.diffUrl })
      });
      const data = await res.json();
      setBriefs(prev => ({ ...prev, [commit.sha]: { loading: false, text: data.summary } }));
    } catch (err) {
      setBriefs(prev => ({ ...prev, [commit.sha]: { loading: false, text: "Failed to load explanation." } }));
    }
  };

  const handleChat = async (commit: any, e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput("");

    const history = chatMessages[commit.sha] || [];
    const updatedHistory = [...history, { role: "user", content: userMessage }];

    setChatMessages(prev => ({ ...prev, [commit.sha]: updatedHistory }));
    setChatLoading(true);

    try {
      const res = await fetch("/api/explain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diffUrl: commit.diffUrl,
          userMessage: userMessage,
          history: history
        })
      });
      const data = await res.json();
      setChatMessages(prev => ({
        ...prev,
        [commit.sha]: [...updatedHistory, { role: "assistant", content: data.answer }]
      }));
    } catch (err) {
      setChatMessages(prev => ({
        ...prev,
        [commit.sha]: [...updatedHistory, { role: "assistant", content: "Sorry, I couldn't connect to the Oracle." }]
      }));
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-zinc-300 py-12 px-4 font-sans selection:bg-purple-500/30">

      {/* Header */}
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-4 mb-12">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Github className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">GitSimple</h1>
        <p className="text-zinc-400">Paste a GitHub Repo URL to understand its commits simply.</p>

        <form onSubmit={fetchCommits} className="w-full max-w-xl mt-6 flex gap-2">
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/"
            className="flex-1 bg-[#111111] border border-zinc-800 text-zinc-100 px-4 py-3 rounded-xl outline-none focus:border-purple-500"
            required
          />
          <button
            type="submit"
            disabled={loading || !repoUrl}
            className="bg-zinc-100 hover:bg-white text-zinc-900 font-semibold px-6 py-3 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Fetch"}
          </button>
        </form>
        {error && <p className="text-red-400 mt-2">{error}</p>}
      </div>

      {/* Commits List */}
      <div className="max-w-4xl mx-auto space-y-6">
        {commits.map((commit) => {
          const isChatOpen = activeChat === commit.sha;
          const brief = briefs[commit.sha];
          const hasBrief = !!brief;

          return (
            <div key={commit.sha} className="bg-[#111111] border border-zinc-800 rounded-2xl p-6 shadow-xl transition-all hover:border-zinc-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{commit.message.split('\n')[0]}</h3>
                  <p className="text-sm text-zinc-500 mt-1">
                    By {commit.author} • {new Date(commit.date).toLocaleDateString()} • {commit.shortSha}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 mb-4">
                {!hasBrief && (
                  <button
                    onClick={() => getBriefExplanation(commit)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-sm transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Explain Simply
                  </button>
                )}

                <a
                  href={`/api/explain/pdf?diffUrl=${encodeURIComponent(commit.diffUrl)}&repoUrl=${encodeURIComponent(repoUrl)}&sha=${commit.shortSha}`}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-sm transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Detailed PDF
                </a>

                <button
                  onClick={() => setActiveChat(isChatOpen ? null : commit.sha)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-sm transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  {isChatOpen ? "Close Chat" : "Ask Oracle"}
                </button>
              </div>

              {/* Brief Summary */}
              {brief && (
                <div className="mt-4 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 text-zinc-300 text-sm leading-relaxed">
                  {brief.loading ? (
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                    </div>
                  ) : (
                    brief.text
                  )}
                </div>
              )}

              {/* Chatbot Area */}
              {isChatOpen && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <div className="h-48 overflow-y-auto mb-4 space-y-3 pr-2">
                    {(!chatMessages[commit.sha] || chatMessages[commit.sha].length === 0) && (
                      <p className="text-zinc-500 text-sm text-center italic mt-16">
                        Ask me what a functionality does, or what this commit means!
                      </p>
                    )}
                    {chatMessages[commit.sha]?.map((msg, i) => (
                      <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-zinc-800 ml-auto max-w-[80%]' : 'bg-purple-900/20 text-purple-200 border border-purple-500/20 mr-auto max-w-[90%]'}`}>
                        {msg.content}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={(e) => handleChat(commit, e)} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask the Oracle..."
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                    />
                    <button type="submit" disabled={chatLoading || !chatInput.trim()} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50">
                      {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
