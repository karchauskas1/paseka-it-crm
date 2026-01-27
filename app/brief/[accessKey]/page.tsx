/**
 * Публичная страница для заполнения брифа клиентом
 * /brief/[accessKey]
 *
 * Не требует авторизации
 * Updated: 2026-01-27 - Glassmorphism redesign
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
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl shadow-md border border-gray-200/50 dark:border-gray-700/50 overflow-hidden hover:shadow-lg transition-all duration-300">
          <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-sm shadow-sm">
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
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
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
          {question.type === 'SELECT' && (() => {
            const optionsData = question.options
            const items = Array.isArray(optionsData) ? optionsData : (optionsData?.items || [])
            const allowCustom = optionsData?.allowCustom || false
            const isCustomSelected = answer && !items.includes(answer)

            return (
              <div className="space-y-3">
                <RadioGroup
                  value={isCustomSelected ? '__custom__' : answer}
                  onValueChange={(v) => {
                    if (v !== '__custom__') {
                      handleAnswerChange(question.id, v)
                    }
                  }}
                >
                  {items.map((option: string, i: number) => (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${i}`} />
                      <Label htmlFor={`${question.id}-${i}`}>{option}</Label>
                    </div>
                  ))}
                  {allowCustom && (
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="__custom__" id={`${question.id}-custom`} />
                      <Label htmlFor={`${question.id}-custom`}>Другое:</Label>
                      <Input
                        placeholder="Ваш вариант..."
                        value={isCustomSelected ? answer : ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        onClick={() => handleAnswerChange(question.id, isCustomSelected ? answer : '')}
                        className="flex-1"
                      />
                    </div>
                  )}
                </RadioGroup>
              </div>
            )
          })()}

          {/* MULTI_SELECT */}
          {question.type === 'MULTI_SELECT' && (() => {
            const optionsData = question.options
            const items = Array.isArray(optionsData) ? optionsData : (optionsData?.items || [])
            const allowCustom = optionsData?.allowCustom || false
            const maxSelections = optionsData?.maxSelections
            const selectedOptions = answer || []

            // Find custom value (value not in items list)
            const customValue = selectedOptions.find((opt: string) => !items.includes(opt)) || ''
            const isCustomChecked = customValue !== ''

            // Calculate current selection count
            const standardSelectedCount = selectedOptions.filter((o: string) => items.includes(o)).length
            const currentSelectionCount = standardSelectedCount + (isCustomChecked ? 1 : 0)

            // Check if max limit is reached
            const isMaxReached = maxSelections && currentSelectionCount >= maxSelections

            return (
              <div className="space-y-2">
                {maxSelections && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Выберите не более {maxSelections} {maxSelections === 1 ? 'пункта' : maxSelections < 5 ? 'пунктов' : 'пунктов'}
                    {currentSelectionCount > 0 && (
                      <span className="ml-2 font-medium text-indigo-600 dark:text-indigo-400">
                        (выбрано: {currentSelectionCount})
                      </span>
                    )}
                  </p>
                )}
                {items.map((option: string, i: number) => {
                  const isChecked = selectedOptions.includes(option)
                  const isDisabled = !isChecked && isMaxReached

                  return (
                    <div key={i} className={`flex items-center space-x-2 ${isDisabled ? 'opacity-50' : ''}`}>
                      <Checkbox
                        id={`${question.id}-${i}`}
                        checked={isChecked}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => {
                          const newOptions = checked
                            ? [...selectedOptions, option]
                            : selectedOptions.filter((o: string) => o !== option)
                          handleAnswerChange(question.id, newOptions)
                        }}
                      />
                      <Label
                        htmlFor={`${question.id}-${i}`}
                        className={`${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {option}
                      </Label>
                    </div>
                  )
                })}
                {allowCustom && (
                  <div className={`flex items-center space-x-2 ${!isCustomChecked && isMaxReached ? 'opacity-50' : ''}`}>
                    <Checkbox
                      id={`${question.id}-custom`}
                      checked={isCustomChecked}
                      disabled={!isCustomChecked && isMaxReached}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleAnswerChange(question.id, [...selectedOptions.filter((o: string) => items.includes(o)), ''])
                        } else {
                          handleAnswerChange(question.id, selectedOptions.filter((o: string) => items.includes(o)))
                        }
                      }}
                    />
                    <Label htmlFor={`${question.id}-custom`}>Другое:</Label>
                    <Input
                      placeholder="Ваш вариант..."
                      value={customValue}
                      disabled={!isCustomChecked && isMaxReached}
                      onChange={(e) => {
                        const standardOptions = selectedOptions.filter((o: string) => items.includes(o))
                        handleAnswerChange(question.id, [...standardOptions, e.target.value])
                      }}
                      onClick={() => {
                        if (!isCustomChecked) {
                          handleAnswerChange(question.id, [...selectedOptions, ''])
                        }
                      }}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            )
          })()}

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-slate-950 dark:to-gray-900 p-4">
        <div className="max-w-md w-full bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-10">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-600 dark:bg-green-500 rounded-full shadow-md animate-bounce">
              <CheckCircle2 className="h-12 w-12 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
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

  // Calculate progress based on non-empty answers
  const filledAnswersCount = Object.values(answers).filter(answer => {
    if (Array.isArray(answer)) {
      return answer.length > 0
    }
    return answer !== null && answer !== undefined && String(answer).trim() !== ''
  }).length

  const progress = brief.questions.length > 0
    ? (filledAnswersCount / brief.questions.length) * 100
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-950 dark:via-slate-950 dark:to-gray-900">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-slate-200/20 dark:bg-slate-800/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gray-200/20 dark:bg-gray-800/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-slate-200/20 dark:bg-slate-800/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-10 shadow-sm">
        <div className="container max-w-4xl mx-auto py-4 px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl shadow-sm flex-shrink-0">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {brief.title}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                  {brief.project.workspace.name}
                </span>
                <span>•</span>
                <span className="truncate">{brief.project.name}</span>
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-xl p-4 shadow-md border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">
                Заполнено {filledAnswersCount} из {brief.questions.length}
              </span>
              <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="relative container max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-8">
        {brief.questions.map((question, index) => renderQuestion(question, index))}

        {/* Submit Button */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl p-8 shadow-md border border-gray-200/50 dark:border-gray-700/50">
          <Button
            onClick={submitBrief}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-md hover:shadow-lg transition-all duration-200"
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
            <Save className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <p className="text-sm text-muted-foreground">
              Ваши ответы сохраняются автоматически
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
