'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import { Plus, Trash2, Edit2, GripVertical, X } from 'lucide-react'

type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'URL' | 'EMAIL' | 'PHONE'

interface CustomField {
  id: string
  entityType: string
  name: string
  fieldType: FieldType
  options: string[] | null
  required: boolean
  order: number
}

interface CustomFieldManagerProps {
  entityType: string
  workspaceId: string
}

export function CustomFieldManager({ entityType, workspaceId }: CustomFieldManagerProps) {
  const [fields, setFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    fieldType: 'TEXT' as FieldType,
    required: false,
    options: [] as string[],
  })
  const [optionInput, setOptionInput] = useState('')

  useEffect(() => {
    fetchFields()
  }, [entityType])

  const fetchFields = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/custom-fields?entityType=${entityType}`)
      if (res.ok) {
        const data = await res.json()
        setFields(data.fields)
      } else {
        toast({
          title: 'Ошибка',
          description: 'Не удалось загрузить кастомные поля',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить кастомные поля',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingField(null)
    setFormData({
      name: '',
      fieldType: 'TEXT',
      required: false,
      options: [],
    })
    setOptionInput('')
    setIsDialogOpen(true)
  }

  const openEditDialog = (field: CustomField) => {
    setEditingField(field)
    setFormData({
      name: field.name,
      fieldType: field.fieldType,
      required: field.required,
      options: field.options || [],
    })
    setOptionInput('')
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Название поля обязательно',
        variant: 'destructive',
      })
      return
    }

    // Validate options for SELECT/MULTISELECT
    if (['SELECT', 'MULTISELECT'].includes(formData.fieldType) && formData.options.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Добавьте хотя бы один вариант для списка',
        variant: 'destructive',
      })
      return
    }

    try {
      const url = editingField ? `/api/custom-fields/${editingField.id}` : '/api/custom-fields'
      const method = editingField ? 'PATCH' : 'POST'

      const body: any = {
        name: formData.name,
        fieldType: formData.fieldType,
        required: formData.required,
      }

      if (!editingField) {
        body.entityType = entityType
        body.order = fields.length
      }

      if (['SELECT', 'MULTISELECT'].includes(formData.fieldType)) {
        body.options = formData.options
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast({
          title: 'Успешно',
          description: editingField ? 'Поле обновлено' : 'Поле создано',
        })
        setIsDialogOpen(false)
        fetchFields()
      } else {
        const data = await res.json()
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось сохранить поле',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить поле',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (fieldId: string) => {
    if (!confirm('Удалить это кастомное поле? Все данные в этом поле будут потеряны.')) {
      return
    }

    try {
      const res = await fetch(`/api/custom-fields/${fieldId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        toast({
          title: 'Успешно',
          description: 'Поле удалено',
        })
        fetchFields()
      } else {
        const data = await res.json()
        toast({
          title: 'Ошибка',
          description: data.error || 'Не удалось удалить поле',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить поле',
        variant: 'destructive',
      })
    }
  }

  const addOption = () => {
    if (optionInput.trim() && !formData.options.includes(optionInput.trim())) {
      setFormData({
        ...formData,
        options: [...formData.options, optionInput.trim()],
      })
      setOptionInput('')
    }
  }

  const removeOption = (option: string) => {
    setFormData({
      ...formData,
      options: formData.options.filter((o) => o !== option),
    })
  }

  const fieldTypeLabels: Record<FieldType, string> = {
    TEXT: 'Текст',
    NUMBER: 'Число',
    DATE: 'Дата',
    SELECT: 'Список (один)',
    MULTISELECT: 'Список (множ.)',
    CHECKBOX: 'Чекбокс',
    URL: 'URL',
    EMAIL: 'Email',
    PHONE: 'Телефон',
  }

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Кастомные поля</h3>
          <p className="text-sm text-gray-500">
            Добавьте дополнительные поля для {entityType === 'client' ? 'клиентов' : 'сущностей'}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить поле
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <p className="text-gray-500">Нет кастомных полей</p>
          <Button variant="link" onClick={openCreateDialog}>
            Создать первое поле
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-gray-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{field.name}</span>
                    <Badge variant="outline">{fieldTypeLabels[field.fieldType]}</Badge>
                    {field.required && (
                      <Badge variant="secondary">Обязательное</Badge>
                    )}
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      Варианты: {field.options.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(field)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(field.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingField ? 'Редактировать поле' : 'Создать кастомное поле'}
            </DialogTitle>
            <DialogDescription>
              Настройте дополнительное поле для {entityType === 'client' ? 'клиентов' : 'сущностей'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="field-name">Название поля *</Label>
              <Input
                id="field-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Город"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="field-type">Тип поля</Label>
              <Select
                value={formData.fieldType}
                onValueChange={(value) =>
                  setFormData({ ...formData, fieldType: value as FieldType, options: [] })
                }
                disabled={!!editingField}
              >
                <SelectTrigger id="field-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(fieldTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {['SELECT', 'MULTISELECT'].includes(formData.fieldType) && (
              <div className="grid gap-2">
                <Label>Варианты *</Label>
                <div className="flex gap-2">
                  <Input
                    value={optionInput}
                    onChange={(e) => setOptionInput(e.target.value)}
                    placeholder="Добавить вариант"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addOption()
                      }
                    }}
                  />
                  <Button type="button" onClick={addOption} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.options.map((option) => (
                      <Badge key={option} variant="secondary" className="gap-1">
                        {option}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeOption(option)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="required">Обязательное поле</Label>
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, required: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSubmit}>
              {editingField ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
