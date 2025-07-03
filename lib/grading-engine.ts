export interface Question {
  id: string
  type: "multiple-choice" | "true-false" | "short-answer" | "essay"
  question: string
  options?: string[]
  correctAnswer?: string | number
  points: number
}

export interface StudentAnswer {
  questionId: string
  answer: string | number
}

export interface GradingResult {
  questionId: string
  isCorrect: boolean
  pointsEarned: number
  maxPoints: number
  feedback?: string
}

export class AutoGradingEngine {
  static gradeAssignment(
    questions: Question[],
    answers: StudentAnswer[],
  ): {
    results: GradingResult[]
    totalScore: number
    maxScore: number
    percentage: number
  } {
    const results: GradingResult[] = []
    let totalScore = 0
    let maxScore = 0

    for (const question of questions) {
      maxScore += question.points
      const studentAnswer = answers.find((a) => a.questionId === question.id)

      if (!studentAnswer) {
        results.push({
          questionId: question.id,
          isCorrect: false,
          pointsEarned: 0,
          maxPoints: question.points,
          feedback: "No answer provided",
        })
        continue
      }

      const result = this.gradeQuestion(question, studentAnswer)
      results.push(result)
      totalScore += result.pointsEarned
    }

    return {
      results,
      totalScore,
      maxScore,
      percentage: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
    }
  }

  private static gradeQuestion(question: Question, answer: StudentAnswer): GradingResult {
    switch (question.type) {
      case "multiple-choice":
        return this.gradeMultipleChoice(question, answer)
      case "true-false":
        return this.gradeTrueFalse(question, answer)
      case "short-answer":
        return this.gradeShortAnswer(question, answer)
      case "essay":
        return this.gradeEssay(question, answer)
      default:
        return {
          questionId: question.id,
          isCorrect: false,
          pointsEarned: 0,
          maxPoints: question.points,
          feedback: "Unknown question type",
        }
    }
  }

  private static gradeMultipleChoice(question: Question, answer: StudentAnswer): GradingResult {
    const isCorrect = answer.answer === question.correctAnswer
    return {
      questionId: question.id,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      maxPoints: question.points,
      feedback: isCorrect
        ? "Correct!"
        : `Incorrect. The correct answer was: ${question.options?.[question.correctAnswer as number]}`,
    }
  }

  private static gradeTrueFalse(question: Question, answer: StudentAnswer): GradingResult {
    const isCorrect = answer.answer.toString().toLowerCase() === question.correctAnswer?.toString().toLowerCase()
    return {
      questionId: question.id,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      maxPoints: question.points,
      feedback: isCorrect ? "Correct!" : `Incorrect. The correct answer was: ${question.correctAnswer}`,
    }
  }

  private static gradeShortAnswer(question: Question, answer: StudentAnswer): GradingResult {
    // Simple keyword matching for short answers
    const studentAnswer = answer.answer.toString().toLowerCase().trim()
    const correctAnswer = question.correctAnswer?.toString().toLowerCase().trim()

    if (!correctAnswer) {
      return {
        questionId: question.id,
        isCorrect: false,
        pointsEarned: 0,
        maxPoints: question.points,
        feedback: "No correct answer defined",
      }
    }

    // Check for exact match or keyword presence
    const isCorrect =
      studentAnswer === correctAnswer || studentAnswer.includes(correctAnswer) || correctAnswer.includes(studentAnswer)

    return {
      questionId: question.id,
      isCorrect,
      pointsEarned: isCorrect ? question.points : 0,
      maxPoints: question.points,
      feedback: isCorrect ? "Correct!" : "Please review your answer. Manual review may be required.",
    }
  }

  private static gradeEssay(question: Question, answer: StudentAnswer): GradingResult {
    // Essays require manual grading, but we can provide basic feedback
    const wordCount = answer.answer.toString().split(/\s+/).length

    return {
      questionId: question.id,
      isCorrect: false, // Essays are not auto-graded as correct/incorrect
      pointsEarned: 0, // Requires manual grading
      maxPoints: question.points,
      feedback: `Essay submitted (${wordCount} words). Requires manual grading.`,
    }
  }

  static generateDetailedFeedback(results: GradingResult[]): string {
    const correctAnswers = results.filter((r) => r.isCorrect).length
    const totalQuestions = results.length
    const percentage =
      (results.reduce((sum, r) => sum + r.pointsEarned, 0) / results.reduce((sum, r) => sum + r.maxPoints, 0)) * 100

    let feedback = `You answered ${correctAnswers} out of ${totalQuestions} questions correctly (${percentage.toFixed(1)}%).\n\n`

    results.forEach((result, index) => {
      feedback += `Question ${index + 1}: ${result.isCorrect ? "✓" : "✗"} (${result.pointsEarned}/${result.maxPoints} points)\n`
      if (result.feedback) {
        feedback += `  ${result.feedback}\n`
      }
      feedback += "\n"
    })

    return feedback
  }
}
