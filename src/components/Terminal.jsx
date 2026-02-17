import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { loadQuestions, getAiExplanation } from '../lib/api'

export default function Terminal() {
  const terminalRef = useRef(null)
  const xtermRef = useRef(null)
  const inputBufferRef = useRef('')

  // Data
  const [questions, setQuestions] = useState([])
  const [topicTree, setTopicTree] = useState({})

  // Quiz state
  const [quizState, setQuizState] = useState('TOPIC_SELECTION')
  const [selectedIndices, setSelectedIndices] = useState(new Set()) // Set of "1.1", "1.2", etc.
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [quizQuestions, setQuizQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [lastAnswer, setLastAnswer] = useState(null)

  useEffect(() => {
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Courier New, monospace',
      theme: {
        background: '#000000',
        foreground: '#00ff00'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = term

    const handleResize = () => fitAddon.fit()
    window.addEventListener('resize', handleResize)

    loadQuestions()
      .then(data => {
        setQuestions(data)
        const tree = buildTopicTree(data)
        setTopicTree(tree)
        showTopicSelection(term, tree, new Set())
        term.focus()
      })
      .catch(err => {
        term.writeln('Error loading questions: ' + err.message)
      })

    return () => {
      window.removeEventListener('resize', handleResize)
      term.dispose()
    }
  }, [])

  useEffect(() => {
    const term = xtermRef.current
    if (!term || questions.length === 0) return

    const handleData = async (data) => {
      if (data === '\r') { // Enter key
        term.write('\r\n')
        await handleInput(inputBufferRef.current.trim())
        inputBufferRef.current = ''
      } else if (data === '\x7f') { // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1)
          term.write('\b \b')
        }
      } else if (data >= ' ') { // Printable characters
        inputBufferRef.current += data
        term.write(data)
      }
    }

    const disposable = term.onData(handleData)
    return () => disposable.dispose()
  }, [questions, quizState, currentQuestionIndex, quizQuestions, selectedQuestions, selectedIndices, score, lastAnswer])

  const buildTopicTree = (data) => {
    const tree = {}

    data.forEach(item => {
      const topic = item.topic
      const subtopic = item.subtopic

      if (!tree[topic]) {
        tree[topic] = {}
      }

      tree[topic][subtopic] = {
        questions: item.questions || [],
        subtopic: subtopic
      }
    })

    return tree
  }

  const showTopicSelection = (term, tree, selected) => {
    term.clear()
    term.writeln('='.repeat(50))
    term.writeln('Choose topics')
    term.writeln('='.repeat(50))
    term.writeln('')

    const topics = Object.keys(tree).sort()
    topics.forEach((topic, topicIndex) => {
      const topicNum = topicIndex + 1
      const subtopics = tree[topic]
      const subtopicNames = Object.keys(subtopics).sort()

      // Determine parent checkbox state
      const subIndices = subtopicNames.map((_, j) => `${topicNum}.${j + 1}`)
      const allSelected = subIndices.every(idx => selected.has(idx))
      const someSelected = subIndices.some(idx => selected.has(idx))
      const mark = allSelected ? 'X' : (someSelected ? '~' : ' ')

      // Capitalize topic name
      const displayTopic = topic.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      term.writeln(`[${mark}] ${topicNum}. ${displayTopic}`)

      subtopicNames.forEach((subtopicName, subIndex) => {
        const subNum = `${topicNum}.${subIndex + 1}`
        const displaySubtopic = subtopicName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
        const subMark = selected.has(subNum) ? 'X' : ' '
        term.writeln(`    [${subMark}] ${subNum} ${displaySubtopic}`)
      })

      term.writeln('')
    })

    term.writeln("Enter selection (e.g. '1' for topic, '1.2' for subtopic).")
    term.write("Press Enter to confirm, or 'quit': ")
  }

  const handleInput = async (input) => {
    const term = xtermRef.current

    if (input === 'quit') {
      term.writeln('Goodbye!')
      return
    }

    switch (quizState) {
      case 'TOPIC_SELECTION':
        handleTopicToggle(input)
        break

      case 'ASK_QUESTIONS':
        handleQuestionCount(input)
        break

      case 'IN_QUIZ':
        handleAnswer(input)
        break

      case 'SHOW_RESULT':
        handleResultAction(input)
        break

      case 'COMPLETE':
        // Reset everything and start over
        setSelectedIndices(new Set())
        setSelectedQuestions([])
        setQuizQuestions([])
        setCurrentQuestionIndex(0)
        setScore(0)
        setLastAnswer(null)
        setQuizState('TOPIC_SELECTION')
        showTopicSelection(term, topicTree, new Set())
        break

      default:
        term.writeln('Unknown state')
        term.write('> ')
    }
  }

  const handleTopicToggle = (input) => {
    const term = xtermRef.current
    const topics = Object.keys(topicTree).sort()

    // Empty input = confirm selection
    if (input === '') {
      // Compile selected questions
      const questionsToUse = []
      const newSelected = new Set(selectedIndices)

      topics.forEach((topicName, topicIndex) => {
        const topicNum = topicIndex + 1
        const subtopics = topicTree[topicName]
        const subtopicNames = Object.keys(subtopics).sort()

        subtopicNames.forEach((subtopicName, subIndex) => {
          const subNum = `${topicNum}.${subIndex + 1}`
          if (newSelected.has(subNum)) {
            questionsToUse.push(...subtopics[subtopicName].questions)
          }
        })
      })

      if (questionsToUse.length === 0) {
        showTopicSelection(term, topicTree, selectedIndices)
        return
      }

      setSelectedQuestions(questionsToUse)
      setQuizState('ASK_QUESTIONS')

      term.writeln('')
      term.writeln(`Selected ${questionsToUse.length} questions total`)
      term.write('How many questions do you want? ')
      return
    }

    const newSelected = new Set(selectedIndices)

    // Check if input is main topic (e.g., "1") or subtopic (e.g., "1.2")
    if (/^\d+$/.test(input)) {
      // Toggle whole topic
      const topicNum = parseInt(input)
      if (topicNum < 1 || topicNum > topics.length) {
        showTopicSelection(term, topicTree, selectedIndices)
        return
      }

      const topicName = topics[topicNum - 1]
      const subtopics = topicTree[topicName]
      const subtopicNames = Object.keys(subtopics).sort()
      const subIndices = subtopicNames.map((_, j) => `${topicNum}.${j + 1}`)

      // If all selected, deselect all. Otherwise, select all
      if (subIndices.every(idx => newSelected.has(idx))) {
        subIndices.forEach(idx => newSelected.delete(idx))
      } else {
        subIndices.forEach(idx => newSelected.add(idx))
      }

      setSelectedIndices(newSelected)
      showTopicSelection(term, topicTree, newSelected)
    } else if (/^\d+\.\d+$/.test(input)) {
      // Toggle subtopic
      const [topicStr, subStr] = input.split('.')
      const topicNum = parseInt(topicStr)
      const subNum = parseInt(subStr)

      if (topicNum < 1 || topicNum > topics.length) {
        showTopicSelection(term, topicTree, selectedIndices)
        return
      }

      const topicName = topics[topicNum - 1]
      const subtopicNames = Object.keys(topicTree[topicName]).sort()

      if (subNum < 1 || subNum > subtopicNames.length) {
        showTopicSelection(term, topicTree, selectedIndices)
        return
      }

      // Toggle this specific subtopic
      if (newSelected.has(input)) {
        newSelected.delete(input)
      } else {
        newSelected.add(input)
      }

      setSelectedIndices(newSelected)
      showTopicSelection(term, topicTree, newSelected)
    } else {
      // Invalid input, redisplay
      showTopicSelection(term, topicTree, selectedIndices)
    }
  }

  const handleQuestionCount = (input) => {
    const term = xtermRef.current
    const count = parseInt(input)
    const maxQuestions = selectedQuestions.length

    if (isNaN(count) || count < 1 || count > maxQuestions) {
      term.writeln(`Please enter a number between 1 and ${maxQuestions}`)
      term.write('How many questions? ')
      return
    }

    // Shuffle and select questions
    const shuffled = [...selectedQuestions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, count)

    setQuizQuestions(selected)
    setCurrentQuestionIndex(0)
    setScore(0)
    setQuizState('IN_QUIZ')

    displayQuestion(selected[0], 0, count)
  }

  const displayQuestion = (question, index, total) => {
    const term = xtermRef.current

    term.clear()
    term.writeln('='.repeat(50))
    term.writeln(`Question ${index + 1}/${total}`)
    term.writeln('')
    term.writeln(`** ${question.question} **`)
    term.writeln('')
    term.writeln('='.repeat(50))

    question.options.forEach((opt, idx) => {
      const letter = String.fromCharCode(65 + idx).toLowerCase() // a, b, c, d
      term.writeln(`${letter}. ${opt}`)
    })

    term.writeln('')
    term.write('Your answer (a/b/c/d): ')
  }

  const handleAnswer = (input) => {
    const term = xtermRef.current
    const answer = input.toLowerCase()
    const question = quizQuestions[currentQuestionIndex]

    if (!['a', 'b', 'c', 'd'].includes(answer)) {
      term.writeln('Please enter a, b, c, or d')
      term.write('Your answer (a/b/c/d): ')
      return
    }

    const answerIndex = answer.charCodeAt(0) - 97 // 97 = 'a'
    const correctIndex = question.answer
    const isCorrect = answerIndex === correctIndex

    if (isCorrect) {
      setScore(score + 1)
    }

    setLastAnswer({
      correct: isCorrect,
      userAnswer: answer,
      correctAnswer: String.fromCharCode(97 + correctIndex) // 97 = 'a'
    })
    setQuizState('SHOW_RESULT')

    term.writeln('')
    if (isCorrect) {
      term.writeln(`✓ Correct! ${question.explanation}`)
    } else {
      const correctLetter = String.fromCharCode(97 + correctIndex)
      term.writeln(`✗ Incorrect. The correct answer is ${correctLetter}. ${question.explanation}`)
    }
    term.writeln('')
    term.writeln('Press "e" for explanation or Enter to continue')
    term.write('> ')
  }

  const handleResultAction = async (input) => {
    const term = xtermRef.current
    const question = quizQuestions[currentQuestionIndex]

    if (input.toLowerCase() === 'e') {
      term.writeln('')
      term.writeln('Loading explanation...')

      try {
        const learn = question.learn || await getAiExplanation(question.id, question.question, question.options)
        term.writeln('')
        term.writeln(learn)
      } catch (err) {
        term.writeln('')
        term.writeln(`Error: ${err.message}`)
      }

      term.writeln('')
      term.writeln('Press Enter to continue')
      term.write('> ')
      return
    }

    // Move to next question or end quiz
    const nextIndex = currentQuestionIndex + 1

    if (nextIndex >= quizQuestions.length) {
      // Quiz complete
      setQuizState('COMPLETE')
      term.clear()
      term.writeln('='.repeat(50))
      term.writeln('Quiz Complete!')
      term.writeln('='.repeat(50))
      term.writeln('')
      term.writeln(`Your score: ${score + (lastAnswer.correct ? 1 : 0)}/${quizQuestions.length}`)
      const percentage = ((score + (lastAnswer.correct ? 1 : 0)) / quizQuestions.length * 100).toFixed(1)
      term.writeln(`Percentage: ${percentage}%`)
      term.writeln('')
      term.writeln('Press Enter to start over')
      term.write('> ')
    } else {
      // Next question
      setCurrentQuestionIndex(nextIndex)
      setQuizState('IN_QUIZ')
      term.writeln('')
      displayQuestion(quizQuestions[nextIndex], nextIndex, quizQuestions.length)
    }
  }

  return <div ref={terminalRef} style={{ width: '100%', height: '100%' }} />
}
