'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, GripVertical, Plus, X } from 'lucide-react'
import { BriefQuestionType } from '@prisma/client'

interface QuestionEditorProps {
  question?: {
    id?: string
    type: BriefQuestionType
    question: string
    description?: string
    options?: any
    required: boolean
    scaleMin?: number
    scaleMax?: number
    scaleMinLabel?: string
    scaleMaxLabel?: string
  }
  onSave: (data: any) => void
  onDelete?: () => void
  onCancel?: () => void
}

const QUESTION_TYPES = [
  { value: 'TEXT_SHORT', label: 'Короткий текст' },
  { value: 'TEXT_LONG', label: 'Длинный текст' },
  { value: 'SELECT', label: 'Выбор из списка' },
  { value: 'MULTI_SELECT', label: 'Множественный выбор' },
  { value: 'FILE', label: 'Загрузка файлов' },
  { value: 'YES_NO', label: 'Да/Нет' },
  { value: 'SCALE', label: 'Шкала' },
]

export function QuestionEditor({ question, onSave, onDelete, onCancel }: QuestionEditorProps) {
  const [type, setType] = useState<BriefQuestionType>(question?.type || 'TEXT_SHORT')
  const [questionText, setQuestionText] = useState(question?.question || '')
  const [description, setDescription] = useState(question?.description || '')
  const [required, setRequired] = useState(question?.required || false)

  // Для SELECT/MULTI_SELECT
  const [options, setOptions] = useState<string[]>(
    Array.isArray(question?.options) ? question.options : (question?.options?.items || [])
  )
  const [newOption, setNewOption] = useState('')
  const [allowCustomOption, setAllowCustomOption] = useState(
    question?.options?.allowCustom || false
  )

  // Для SCALE
  const [scaleMin, setScaleMin] = useState(question?.scaleMin || 1)
  const [scaleMax, setScaleMax] = useState(question?.scaleMax || 10)
  const [scaleMinLabel, setScaleMinLabel] = useState(question?.scaleMinLabel || '')
  const [scaleMaxLabel, setScaleMaxLabel] = useState(question?.scaleMaxLabel || '')

  const handleSave = () => {
    const data: any = {
      type,
      question: questionText,
      description,
      required,
    }

    if (type === 'SELECT' || type === 'MULTI_SELECT') {
      data.options = {
        items: options,
        allowCustom: allowCustomOption,
      }
    }

    if (type === 'SCALE') {
      data.scaleMin = scaleMin
      data.scaleMax = scaleMax
      data.scaleMinLabel = scaleMinLabel
      data.scaleMaxLabel = scaleMaxLabel
    }

    if (question?.id) {
      data.questionId = question.id
    }

    onSave(data)
  }

  const addOption = () => {
    if (newOption.trim()) {
      setOptions([...options, newOption.trim()])
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index))
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label>Тип вопроса</Label>
          <Select value={type} onValueChange={(v) => setType(v as BriefQuestionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Вопрос *</Label>
          <Input
            placeholder="Введите вопрос..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Описание (подсказка для клиента)</Label>
          <Textarea
            placeholder="Дополнительная информация..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {/* Опции для SELECT/MULTI_SELECT */}
        {(type === 'SELECT' || type === 'MULTI_SELECT') && (
          <div className="space-y-3">
            <Label>Варианты ответа</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={option} readOnly className="flex-1" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Новый вариант..."
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addOption()}
                />
                <Button size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="allowCustom"
                checked={allowCustomOption}
                onCheckedChange={(checked) => setAllowCustomOption(checked as boolean)}
              />
              <Label htmlFor="allowCustom" className="cursor-pointer">
                Разрешить свой вариант ответа
              </Label>
            </div>
          </div>
        )}

        {/* Настройки для SCALE */}
        {type === 'SCALE' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Минимум</Label>
                <Input
                  type="number"
                  value={scaleMin}
                  onChange={(e) => setScaleMin(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Максимум</Label>
                <Input
                  type="number"
                  value={scaleMax}
                  onChange={(e) => setScaleMax(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Подпись минимума</Label>
                <Input
                  placeholder="Например: Очень плохо"
                  value={scaleMinLabel}
                  onChange={(e) => setScaleMinLabel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Подпись максимума</Label>
                <Input
                  placeholder="Например: Отлично"
                  value={scaleMaxLabel}
                  onChange={(e) => setScaleMaxLabel(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="required"
            checked={required}
            onCheckedChange={(checked) => setRequired(checked as boolean)}
          />
          <Label htmlFor="required" className="cursor-pointer">
            Обязательный вопрос
          </Label>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <Button
            onClick={handleSave}
            disabled={!questionText.trim()}
          >
            Сохранить
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
          {onDelete && question?.id && (
            <Button
              variant="destructive"
              className="ml-auto"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
