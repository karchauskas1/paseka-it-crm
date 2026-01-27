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
      <Card key={question.id} className="scroll-mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="text-muted-foreground">#{index + 1}</span>
            {question.question}
            {question.required && (
              <span className="text-red-500">*</span>
            )}
          </CardTitle>
          {question.description && (
            <CardDescription>{question.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
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
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <h2 className="text-xl font-semibold mb-2">Бриф заполнен</h2>
              <p className="text-muted-foreground">
                Спасибо! Ваш бриф был отправлен {new Date(brief.completedAt!).toLocaleString('ru')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const progress = brief.questions.length > 0
    ? (Object.keys(answers).length / brief.questions.length) * 100
    : 0

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container max-w-3xl py-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{brief.title}</h1>
            <p className="text-muted-foreground">
              {brief.project.workspace.name} • {brief.project.name}
            </p>
            {brief.description && (
              <p className="text-sm text-muted-foreground">{brief.description}</p>
            )}
          </div>

          {/* Progress */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Заполнено {Object.keys(answers).length} из {brief.questions.length}
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="container max-w-3xl py-8 space-y-6">
        {brief.questions.map((question, index) => renderQuestion(question, index))}

        {/* Submit Button */}
        <Card>
          <CardContent className="pt-6">
            <Button
              onClick={submitBrief}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Отправить бриф
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground text-center mt-3">
              Ваши ответы сохраняются автоматически
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
