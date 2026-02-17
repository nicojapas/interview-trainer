export async function onRequestGet(context) {
  const db = context.env.DB

  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Get all subtopics with their topics
  const subtopicsResult = await db.prepare(`
    SELECT s.id, s.name as subtopic, s.description,
           t.name as topic
    FROM subtopics s
    JOIN topics t ON t.id = s.topic_id
    ORDER BY t.name, s.name
  `).all()

  // Get all questions with their options
  const questionsResult = await db.prepare(`
    SELECT q.id, q.external_id, q.subtopic_id, q.question, q.question_type,
           q.correct_answer, q.correct_index, q.explanation, q.learn
    FROM questions q
    ORDER BY q.subtopic_id, q.id
  `).all()

  const optionsResult = await db.prepare(`
    SELECT o.question_id, o.option_index, o.option_text
    FROM options o
    ORDER BY o.question_id, o.option_index
  `).all()

  // Build options map: question_id -> options array
  const optionsMap = new Map()
  for (const opt of optionsResult.results) {
    if (!optionsMap.has(opt.question_id)) {
      optionsMap.set(opt.question_id, [])
    }
    optionsMap.get(opt.question_id).push(opt.option_text)
  }

  // Build questions map: subtopic_id -> questions array
  const questionsMap = new Map()
  for (const q of questionsResult.results) {
    if (!questionsMap.has(q.subtopic_id)) {
      questionsMap.set(q.subtopic_id, [])
    }

    const question = {
      id: q.external_id,
      question: q.question,
      correct: q.correct_answer,
      explanation: q.explanation
    }

    // Add options for multiple choice questions
    if (q.question_type === 'multiple_choice') {
      question.options = optionsMap.get(q.id) || []
      question.answer = q.correct_index
    }

    // Add learn content if available
    if (q.learn) {
      question.learn = q.learn
    }

    questionsMap.get(q.subtopic_id).push(question)
  }

  // Build response in the same format as the original JSON
  const response = subtopicsResult.results.map(s => ({
    topic: s.topic,
    subtopic: s.subtopic,
    description: s.description,
    questions: questionsMap.get(s.id) || []
  }))

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
}
