import { useState } from 'react'
import { Copy, History, Play, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

const PIPELINE_STEPS = ["extraction", "editor", "visuals", "qa"];

// Simple UI Components since Shadcn isn't installed in this vite setup yet
const Button = ({ children, className, ...props }: any) => (
  <button className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 ${className}`} {...props}>{children}</button>
)

const Card = ({ children, className }: any) => (
  <div className={`rounded-xl border border-gray-800 bg-[#111111] overflow-hidden ${className}`}>{children}</div>
)

const Badge = ({ children, className, variant }: any) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${variant === 'outline' ? 'border border-green-500/20 text-green-500 bg-green-500/5' : 'bg-purple-600/20 text-purple-400'} ${className}`}>{children}</span>
)

function App() {
  const [url, setUrl] = useState("https://indianexpress.com/article/political-pulse/mamata-banerjee-re-entry-into-nda-speculations-tmc-9245678/");
  const [status, setStatus] = useState("idle");
  const [currentNode, setCurrentNode] = useState("");
  const [stateData, setStateData] = useState<any>(null);

  const generateScript = async () => {
    setStatus("running");
    setCurrentNode("extraction");
    setStateData(null);
    
    try {
      const response = await fetch("http://localhost:8001/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      if (!response.body) throw new Error("No response body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(Boolean);
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr.trim() === "") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.status === "running") {
                setCurrentNode(data.current_node);
                setStateData(data.state);
              } else if (data.status === "completed") {
                setStatus("completed");
                setCurrentNode("completed");
                setStateData(data.state);
              } else if (data.status === "error") {
                setStatus("error");
              }
            } catch (e) {
              console.error("JSON parse error:", dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const calculateRadarData = () => {
    if (!stateData || !stateData.qa_eval || !stateData.qa_eval.category_scores) {
      return [
        { subject: 'Article', A: 0, fullMark: 5 },
        { subject: 'Script', A: 0, fullMark: 5 },
        { subject: 'Insight', A: 0, fullMark: 5 },
        { subject: 'Visuals', A: 0, fullMark: 5 },
        { subject: 'Image', A: 0, fullMark: 5 },
        { subject: 'Performance', A: 0, fullMark: 5 },
      ];
    }
    const cat = stateData.qa_eval.category_scores;
    return [
        { subject: 'Article', A: cat.article_quality, fullMark: 5 },
        { subject: 'Script', A: cat.script_quality, fullMark: 5 },
        { subject: 'Insight', A: cat.insight_quality, fullMark: 5 },
        { subject: 'Visuals', A: cat.visual_quality, fullMark: 5 },
        { subject: 'Image', A: cat.image_quality, fullMark: 5 },
        { subject: 'Perf', A: cat.performance_quality, fullMark: 5 },
    ];
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans selection:bg-purple-500/30">
      {/* Background Glow */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0f0f0f]/80 backdrop-blur-md p-6 rounded-2xl border border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="font-bold text-2xl">L</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">LOQO AI <span className="text-purple-500 font-medium text-lg ml-1">PRO</span></h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Broadcast Intelligence Engine</p>
            </div>
          </div>

          <div className="flex-1 max-w-2xl px-4">
            <div className="relative group">
              <input 
                value={url} 
                onChange={(e) => setUrl(e.target.value)} 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-32 py-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all group-hover:border-white/20"
                placeholder="Enter news article URL..."
              />
              <div className="absolute right-1 top-1 bottom-1">
                <Button 
                  className="h-full bg-purple-600 hover:bg-purple-500 text-white flex items-center px-6 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-purple-600/20" 
                  onClick={generateScript} 
                  disabled={status === "running"}
                >
                  {status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {status === "running" ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className={`w-2 h-2 rounded-full ${status === 'running' ? 'bg-yellow-500 animate-pulse' : status === 'completed' ? 'bg-green-500' : 'bg-gray-700'}`} />
             <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{status}</span>
          </div>
        </div>

        {/* Pipeline Progress */}
        <div className="bg-[#0f0f0f]/40 backdrop-blur-sm rounded-2xl border border-white/5 p-1 overflow-hidden">
          <div className="grid grid-cols-4 gap-1">
            {PIPELINE_STEPS.map((step, i) => {
              const isActive = currentNode === step;
              const isDone = status === "completed" || PIPELINE_STEPS.indexOf(currentNode) > i;
              return (
                <div key={step} className={`relative p-3 transition-colors ${isDone ? 'bg-green-500/5' : isActive ? 'bg-purple-500/5' : ''}`}>
                  <div className="flex items-center justify-center gap-2">
                    {isDone ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : 
                     isActive ? <Loader2 className="w-3 h-3 text-purple-500 animate-spin" /> : 
                     <Circle className="w-3 h-3 text-white/10" />}
                    <span className={`text-[10px] uppercase tracking-widest font-black ${isDone ? 'text-green-500' : isActive ? 'text-purple-400' : 'text-white/20'}`}>{step}</span>
                  </div>
                  {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Output Area - Left (8 cols) */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Teleprompter Output</h2>
               {stateData?.source_title && <span className="text-[10px] text-purple-400 font-bold max-w-sm truncate italic">"{stateData.source_title}"</span>}
            </div>

            {stateData?.segments?.length > 0 ? (
              <div className="grid gap-4">
                {stateData.segments.map((seg: any) => (
                  <div key={seg.segment_id} className="group relative bg-gradient-to-r from-[#111] to-[#0d0d0d] rounded-2xl border border-white/5 overflow-hidden hover:border-purple-500/30 transition-all duration-500">
                    <div className="flex">
                      {/* Control Strip */}
                      <div className="w-12 bg-black/40 flex flex-col items-center py-4 gap-4 border-r border-white/5">
                        <span className="text-[10px] font-black text-white/20">{seg.segment_id.toString().padStart(2, '0')}</span>
                        <div className="w-0.5 flex-1 bg-white/5 rounded-full" />
                        <Play className="w-4 h-4 text-white/10" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                           <div className="flex gap-2">
                            <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1">{seg.top_tag || "BREAKING"}</Badge>
                            <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1">{seg.layout?.replace(/_/g, ' ') || "ANCHOR LEFT"}</Badge>
                           </div>
                           <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded">DURATION: {seg.end_time}s</span>
                        </div>

                        <div className="space-y-4">
                           <div className="relative pl-4 border-l-2 border-purple-500/30">
                              <p className="text-xs text-purple-500 font-black mb-1 uppercase tracking-tighter opacity-50 italic">Anchor Narration</p>
                              <p className="text-lg text-gray-200 leading-relaxed font-medium">
                                {seg.anchor_narration}
                              </p>
                           </div>

                           <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                              <div>
                                 <p className="text-[10px] text-blue-400 font-bold mb-1 tracking-widest uppercase">Visual Description</p>
                                 <p className="text-xs text-gray-400 italic leading-snug">{seg.right_panel}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] text-green-400 font-bold mb-1 tracking-widest uppercase">Graphic Overlay</p>
                                 <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                                    <p className="text-[10px] font-bold text-white leading-tight uppercase">{seg.main_headline}</p>
                                    <p className="text-[8px] text-gray-500 leading-tight uppercase mt-1">{seg.subheadline}</p>
                                 </div>
                              </div>
                           </div>
                           
                           {seg.ai_support_visual_prompt && (
                             <div className="mt-4 p-3 bg-purple-500/5 rounded-xl border border-purple-500/10">
                               <p className="text-[10px] text-purple-400 font-black mb-1 uppercase tracking-widest">AI Visual Gen Prompt</p>
                               <p className="text-[10px] text-gray-400 leading-relaxed italic block select-all cursor-copy">
                                 {seg.ai_support_visual_prompt}
                               </p>
                             </div>
                           )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center bg-[#0d0d0d] rounded-2xl border border-dashed border-white/10 text-white/20">
                 {status === 'running' ? (
                   <>
                    <Loader2 className="w-12 h-12 mb-4 animate-spin text-purple-600/50" />
                    <p className="text-sm font-medium tracking-widest uppercase animate-pulse">Processing Stream State...</p>
                   </>
                 ) : (
                   <>
                    <Play className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-sm font-medium tracking-widest uppercase">Dashboard Ready</p>
                    <p className="text-xs opacity-50 mt-2">Enter a URL above to begin the broadcast generation</p>
                   </>
                 )}
              </div>
            )}
          </div>

          {/* Sidebar - Right (4 cols) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white/40">Analytics & Metadata</h2>
            
            <Card className="p-6 border-purple-500/10 shadow-2xl shadow-purple-500/5">
              <div className="flex justify-between items-center mb-8">
                 <div>
                    <h3 className="text-xs font-bold text-green-400 tracking-[0.2em] uppercase">QA Score</h3>
                    <p className="text-[10px] text-gray-500 mt-1">Algorithmic quality check</p>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-white">{(stateData?.qa_eval?.percentage || 0).toFixed(1)}%</span>
                    {stateData?.qa_eval && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${stateData.qa_eval.status === 'APPROVE' ? 'bg-green-500/10 text-green-500' : stateData.qa_eval.status === 'IMPROVE' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                        {stateData.qa_eval.status}
                      </span>
                    )}
                 </div>
              </div>
              
              <div className="h-56 -mx-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={calculateRadarData()}>
                    <PolarGrid stroke="#333" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }} />
                    <Radar 
                      name="Score" 
                      dataKey="A" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6" 
                      fillOpacity={0.4} 
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {stateData?.qa_eval?.top_issues && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                    <p className="text-[10px] text-red-400 font-bold uppercase mb-2 tracking-widest text-center">Top Critical Issues</p>
                    <ul className="text-[10px] text-gray-400 space-y-2 list-disc pl-4">
                      {stateData.qa_eval.top_issues.map((issue: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">"{issue}"</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-green-500/5 rounded-xl border border-green-500/10">
                    <p className="text-[10px] text-green-400 font-bold uppercase mb-2 tracking-widest text-center">Elite Improvement Suggestions</p>
                    <ul className="text-[10px] text-gray-400 space-y-2 list-disc pl-4">
                      {stateData.qa_eval.improvement_suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx} className="leading-relaxed italic">"{suggestion}"</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
               <h3 className="text-[10px] font-black text-blue-400 mb-6 tracking-[0.2em] uppercase">Resource Utilization</h3>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                           <Loader2 className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                           <p className="text-[10px] text-gray-500 font-bold uppercase">Tokens</p>
                           <p className="text-sm font-mono text-white">~3,120</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                           <History className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                           <p className="text-[10px] text-gray-500 font-bold uppercase">Pipeline Latency</p>
                           <p className="text-sm font-mono text-white">12.8s</p>
                        </div>
                     </div>
                  </div>

                  <div className="p-4 bg-purple-500/5 rounded-xl border border-purple-500/10">
                     <div className="flex justify-between items-center mb-2">
                        <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Model Stack</p>
                        <Badge className="bg-purple-500 text-[8px]">GEMINI 2.5</Badge>
                     </div>
                     <p className="text-[10px] text-gray-500 leading-relaxed italic">Flash 2.5 optimized for draft, Pro 2.5 for evaluation.</p>
                  </div>
               </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
