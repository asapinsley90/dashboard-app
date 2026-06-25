module.exports = function(app) {

app.post('/api/scrape-job', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'No URL' });
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return res.json({ success: false, reason: 'blocked' });
    const html = await r.text();
    const strip = s => s.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleM ? titleM[1].replace(/[|\-–].*/,'').trim() : '';
    const bodyM = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const text = bodyM ? strip(bodyM[1]).slice(0,6000) : strip(html).slice(0,6000);
    const blocked = text.length < 200 || /sign in|log in|create account/i.test(text.slice(0,500));
    if (blocked) return res.json({ success: false, reason: 'blocked' });
    res.json({ success: true, title, text });
  } catch(e) { res.json({ success: false, reason: e.message }); }
});

app.post('/api/parse-job', async (req, res) => {
  const { text, imageBase64, imageType } = req.body;
  if (!text && !imageBase64) return res.status(400).json({ error: 'No content' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const content = imageBase64
      ? [{ type:'image', source:{ type:'base64', media_type: imageType||'image/png', data: imageBase64 }},
         { type:'text', text:'Extract job posting details. Return JSON only: {role,company,location,salary,description}' }]
      : [{ type:'text', text:'Extract job details from this text. Return JSON only: {role,company,location,salary,description}\n\n'+text }];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:1000, messages:[{ role:'user', content }] }),
    });
    if (!r.ok) {
      const err = await r.text();
      return res.json({ success: false, reason: `Anthropic ${r.status}: ${err}` });
    }
    const data = await r.json();
    const raw = (data.content?.[0]?.text||'{}').replace(/```json|```/g,'').trim();
    res.json({ success: true, ...JSON.parse(raw) });
  } catch(e) { res.json({ success: false, reason: e.message }); }
});

};
