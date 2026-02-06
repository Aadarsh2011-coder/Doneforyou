export async function onRequest(context) {
    const { request } = context;
  
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
  
    try {
      const { idea } = await request.json();
      if (!idea || typeof idea !== 'string' || idea.trim().length < 5) {
        return new Response(JSON.stringify({ error: 'Invalid idea' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      // === Fetch Hacker News ===
      const hnRes = await fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(idea)}&tags=story&hitsPerPage=3`);
      const hnData = await hnRes.json();
      const hnPosts = (hnData.hits || []).slice(0, 2).map(hit => ({
        source: "Hacker News",
        title: hit.title,
        date: new Date(hit.created_at * 1000).toLocaleDateString()
      }));
  
      // === Fetch Reddit ===
      const redditQuery = idea.split(' ').join('+');
      const redditRes = await fetch(`https://api.pushshift.io/reddit/search/comment/?q=${redditQuery}&size=2&sort=desc&sort_type=created_utc`);
      const redditData = await redditRes.json();
      const redditPosts = (redditData.data || []).map(comment => ({
        source: "Reddit",
        text: (comment.body || "").substring(0, 200) + ((comment.body || "").length > 200 ? "..." : ""),
        date: new Date(comment.created_utc * 1000).toLocaleDateString()
      }));
  
      const discussions = [...hnPosts, ...redditPosts];
  
      // === Call Groq (use secret from env) ===
      const GROQ_API_KEY = context.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        throw new Error('Groq key missing');
      }
  
      const prompt = `
  Analyze this SaaS idea using the discussions below.
  
  IDEA: "${idea}"
  
  DISCUSSIONS:
  ${discussions.map(d => `[${d.source}] ${d.title || d.text} (${d.date})`).join('\n')}
  
  Respond in JSON only:
  {
    "humanThinking": "2 raw pain quotes from users",
    "aiThinking": "1-sentence market gap",
    "urgencyScore": number (0-10, one decimal),
    "competitorGaps": ["Gap 1", "Gap 2"],
    "targetAudience": ["Audience 1", "Audience 2"]
  }
  `;
  
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 600
        })
      });
  
      const groqData = await groqRes.json();
      let analysis;
      try {
        const content = groqData.choices[0].message.content;
        const jsonMatch = content.match(/({[\s\S]*})/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[1]) : { error: 'Parse failed' };
      } catch (e) {
        analysis = {
          humanThinking: "People are actively discussing problems like this.",
          aiThinking: "Strong signal of unmet need.",
          urgencyScore: 7.5,
          competitorGaps: ["No real-demand validation", "Poor technical testing"],
          targetAudience: ["Indie Hackers", "Founders"]
        };
      }
  
      const result = {
        discussions,
        humanThinking: analysis.humanThinking,
        aiThinking: analysis.aiThinking,
        urgencyScore: analysis.urgencyScore,
        competitorGaps: analysis.competitorGaps,
        targetAudience: analysis.targetAudience
      };
  
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
  
    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({
        error: 'Validation failed',
        demo: true
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }