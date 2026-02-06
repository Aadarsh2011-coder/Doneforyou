export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      
      // Only accept POST to /api/validate
      if (url.pathname === '/api/validate' && request.method === 'POST') {
        try {
          const { idea } = await request.json();
          if (!idea || typeof idea !== 'string' || idea.trim().length < 5) {
            return new Response(JSON.stringify({ error: 'Invalid idea' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
          }
  
          // 🟢 Demo response (until you add Groq later)
          const result = {
            discussions: [
              { source: "Hacker News", title: "How do you validate a SaaS idea before coding?", date: "2 days ago" },
              { source: "Reddit", text: "Wasted 6 months on something nobody wanted.", date: "1 week ago" }
            ],
            humanThinking: "People are frustrated with existing tools. They say: “I wasted 4 months building something nobody wanted.”",
            aiThinking: "High emotional intensity suggests urgent need. Gap: no tool combines real demand + technical testing.",
            urgencyScore: 8.2,
            competitorGaps: [
              "Most tools use AI guesses, not real forum data",
              "No one checks if users actually complain about the problem"
            ],
            targetAudience: [
              "Indie Hackers — solo founders fearing wasted time",
              "Pre-seed SaaS founders needing proof before fundraising"
            ]
          };
  
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
  
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
        }
      }
  
      return new Response('Not Found', { status: 404 });
    }
  };