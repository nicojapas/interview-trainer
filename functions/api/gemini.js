export async function onRequestPost(context) {
  const apiKey = context.env.GOOGLE_API_KEY

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { question, options } = await context.request.json()

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert and friendly tutor. Explain this interview question clearly and pedagogically.

STRICT RULES:
- ALWAYS respond in exactly 2 or 3 short paragraphs.
- DO NOT include conversational filler.
- DO NOT explicitly say which option is correct.
- Do not use bulleted lists.
- Use an encouraging tone.

Question: ${question}
Options: ${options.join(', ')}`
            }]
          }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 500,
          }
        })
      }
    )

    const data = await response.json()
    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No explanation generated.'

    return new Response(JSON.stringify({ explanation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
