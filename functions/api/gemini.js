export async function onRequestPost(context) {
  const apiKey = context.env.GOOGLE_API_KEY
  const db = context.env.DB

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const { questionId, question, options } = await context.request.json()

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
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
            maxOutputTokens: 1024,
          }
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      const errorMessage = data.error?.message || JSON.stringify(data)
      return new Response(JSON.stringify({ error: `Gemini API error: ${errorMessage}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const explanation = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!explanation) {
      return new Response(JSON.stringify({ error: 'No explanation in Gemini response', debug: data }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Save the explanation to the database for future use
    if (db && questionId) {
      try {
        await db.prepare(
          'UPDATE questions SET learn = ? WHERE external_id = ?'
        ).bind(explanation, questionId).run()
      } catch (dbError) {
        // Log error but don't fail the request - the user still gets their explanation
        console.error('Failed to save learn content:', dbError)
      }
    }

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
