'use client'

import { useState } from 'react'
import { Bug, Lightbulb, Upload, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface FeedbackModalProps {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
}

type FeedbackType = 'BUG' | 'IMPROVEMENT' | null

export function FeedbackModal({ workspaceId, isOpen, onClose }: FeedbackModalProps) {
  const [step, setStep] = useState<'select' | 'form'>('select')
  const [type, setType] = useState<FeedbackType>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleReset = () => {
    setStep('select')
    setType(null)
    setTitle('')
    setDescription('')
    setScreenshot(null)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSelectType = (selectedType: FeedbackType) => {
    setType(selectedType)
    setStep('form')
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Файл слишком большой. Максимальный размер: 5MB')
      return
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      toast.error('Можно загружать только изображения')
      return
    }

    // Конвертируем в base64
    const reader = new FileReader()
    reader.onloadend = () => {
      setScreenshot(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!type || !title.trim() || !description.trim()) {
      toast.error('Заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          type,
          title: title.trim(),
          description: description.trim(),
          screenshot,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      toast.success('Спасибо за обратную связь!')
      handleClose()
    } catch (error) {
      console.error('Submit feedback error:', error)
      toast.error('Не удалось отправить обратную связь')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        {step === 'select' ? (
          <>
            <DialogHeader>
              <DialogTitle>Обратная связь</DialogTitle>
              <DialogDescription>
                Выберите тип обращения
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <Button
                onClick={() => handleSelectType('BUG')}
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <Bug className="h-8 w-8 text-red-500" />
                <div>
                  <div className="font-semibold">Сообщить о баге</div>
                  <div className="text-xs text-muted-foreground">
                    Если что-то работает неправильно
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleSelectType('IMPROVEMENT')}
                variant="outline"
                className="h-24 flex-col gap-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Lightbulb className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="font-semibold">Предложить улучшение</div>
                  <div className="text-xs text-muted-foreground">
                    Идея по улучшению системы
                  </div>
                </div>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                {type === 'BUG' ? 'Сообщить о баге' : 'Предложить улучшение'}
              </DialogTitle>
              <DialogDescription>
                Опишите подробно вашу проблему или идею
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Заголовок *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    type === 'BUG'
                      ? 'Кратко опишите проблему'
                      : 'Кратко опишите идею'
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    type === 'BUG'
                      ? 'Подробно опишите, что произошло, как воспроизвести ошибку'
                      : 'Подробно опишите вашу идею и как она улучшит систему'
                  }
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="screenshot">Скриншот (необязательно)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('screenshot')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {screenshot ? 'Изменить скриншот' : 'Загрузить скриншот'}
                  </Button>
                  {screenshot && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setScreenshot(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {screenshot && (
                  <div className="mt-2">
                    <img
                      src={screenshot}
                      alt="Screenshot preview"
                      className="max-h-40 rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep('select')}
                >
                  Назад
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Отправка...' : 'Отправить'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
