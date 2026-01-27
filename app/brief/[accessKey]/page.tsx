/**
 * Публичная страница для заполнения брифа клиентом
 * /brief/[accessKey]
 *
 * Не требует авторизации
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  Loader2,
  CheckCircle2,
  FileText,
  Send,
  Save,
} from 'lucide-react'

interface Brief {
  id: string
  title: string
  description?: string
  status: string
  completedAt?: string
  questions: any[]
  answers: any[]
  project: {
    name: string
    workspace: {
      name: string
    }
  }
}

export default function BriefPublicPage() {
  const params = useParams()
  const accessKey = params.accessKey as string

  const [brief, setBrief] = useState<Brief | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBrief()
  }, [accessKey])

  const loadBrief = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/briefs/public/${accessKey}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Brief not found')
      }

      const data = await response.json()
      setBrief(data.brief)

      // Загрузить существующие ответы
      const existingAnswers: Record<string, any> = {}
      data.brief.answers.forEach((answer: any) => {
        existingAnswers[answer.questionId] = answer.answer
      })
      setAnswers(existingAnswers)

      setError(null)
    } catch (error: any) {
      setError(error.message || 'Failed to load brief')
    } finally {
      setIsLoading(false)
    }
  }

  const saveAnswer = async (questionId: string, answer: any) => {
    try {
      await fetch(`/api/briefs/public/${accessKey}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          answer,
        }),
      })
    } catch (error) {
      console.error('Failed to save answer:', error)
    }
  }

  const handleAnswerChange = async (questionId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    await saveAnswer(questionId, value)
  }

  const submitBrief = async () => {
    if (!brief) return

    // Проверить обязательные вопросы
    const requiredQuestions = brief.questions.filter(q => q.required)
    const missingRequired = requiredQuestions.filter(q => !answers[q.id])

    if (missingRequired.length > 0) {
      toast.error('Заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/briefs/public/${accessKey}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }

      toast.success('Бриф успешно отправлен!')
      await loadBrief()
    } catch (error: any) {
      toast.error(error.message || 'Ошибка отправки')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderQuestion = (question: any, index: number) => {
    const answer = answers[question.id]

    return (
      <div key={question.id} className="scroll-mt-6 group">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm shadow-md">
                {index + 1}
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {question.question}
                  {question.required && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
                      *
                    </span>
                  )}
                </h3>
                {question.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {question.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="px-6 py-6">
          {/* TEXT_SHORT */}
          {question.type === 'TEXT_SHORT' && (
            <Input
              placeholder="Ваш ответ..."
              value={answer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            />
          )}

          {/* TEXT_LONG */}
          {question.type === 'TEXT_LONG' && (
            <Textarea
              placeholder="Ваш ответ..."
              value={answer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              rows={4}
            />
          )}

          {/* YES_NO */}
          {question.type === 'YES_NO' && (
            <RadioGroup
              value={answer}
              onValueChange={(v) => handleAnswerChange(question.id, v)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                <Label htmlFor={`${question.id}-yes`}>Да</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${question.id}-no`} />
                <Label htmlFor={`${question.id}-no`}>Нет</Label>
              </div>
            </RadioGroup>
          )}

          {/* SELECT */}
          {question.type === 'SELECT' && (
            <RadioGroup
              value={answer}
              onValueChange={(v) => handleAnswerChange(question.id, v)}
            >
              {question.options?.map((option: string, i: number) => (
                <div key={i} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                  <Label htmlFor={`${question.id}-${i}`}>{option}</Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* MULTI_SELECT */}
          {question.type === 'MULTI_SELECT' && (
            <div className="space-y-2">
              {question.options?.map((option: string, i: number) => {
                const selectedOptions = answer || []
                const isChecked = selectedOptions.includes(option)

                return (
                  <div key={i} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${question.id}-${i}`}
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const newOptions = checked
                          ? [...selectedOptions, option]
                          : selectedOptions.filter((o: string) => o !== option)
                        handleAnswerChange(question.id, newOptions)
                      }}
                    />
                    <Label htmlFor={`${question.id}-${i}`} className="cursor-pointer">
                      {option}
                    </Label>
                  </div>
                )
              })}
            </div>
          )}

          {/* SCALE */}
          {question.type === 'SCALE' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {Array.from(
                  { length: (question.scaleMax || 10) - (question.scaleMin || 1) + 1 },
                  (_, i) => i + (question.scaleMin || 1)
                ).map((value) => (
                  <Button
                    key={value}
                    variant={answer === value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleAnswerChange(question.id, value)}
                    className="w-10 h-10"
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{question.scaleMinLabel || question.scaleMin}</span>
                <span>{question.scaleMaxLabel || question.scaleMax}</span>
              </div>
            </div>
          )}

          {/* FILE */}
          {question.type === 'FILE' && (
            <div className="text-sm text-muted-foreground">
              Загрузка файлов временно недоступна
            </div>
          )}
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !brief) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{error || 'Бриф не найден'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (brief.status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-10">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full shadow-lg animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Бриф заполнен!
              </h2>
              <p className="text-muted-foreground">
                Спасибо! Ваш бриф был успешно отправлен
              </p>
              <p className="text-sm text-muted-foreground">
                {new Date(brief.completedAt!).toLocaleString('ru')}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const progress = brief.questions.length > 0
    ? (Object.keys(answers).length / brief.questions.length) * 100
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 shadow-sm">
        <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-3 shadow-lg">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {brief.title}
            </h1>
            <p className="text-base text-muted-foreground flex items-center justify-center gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                {brief.project.workspace.name}
              </span>
              <span>•</span>
              <span className="text-sm">{brief.project.name}</span>
            </p>
            {brief.description && (
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">{brief.description}</p>
            )}
          </div>

          {/* Progress */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-muted-foreground font-medium">
                  Заполнено {Object.keys(answers).length} из {brief.questions.length}
                </span>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="relative container max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8">
        {brief.questions.map((question, index) => renderQuestion(question, index))}

        {/* Submit Button */}
        <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-950 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
          <Button
            onClick={submitBrief}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                Отправка...
              </>
            ) : (
              <>
                <Send className="h-6 w-6 mr-3" />
                Отправить бриф
              </>
            )}
          </Button>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Save className="h-4 w-4 text-green-600" />
            <p className="text-sm text-muted-foreground">
              Ваши ответы сохраняются автоматически
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
