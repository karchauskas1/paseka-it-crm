'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTISELECT' | 'CHECKBOX' | 'URL' | 'EMAIL' | 'PHONE'

interface CustomField {
  id: string
  name: string
  fieldType: FieldType
  options: string[] | null
  required: boolean
}

interface CustomFieldRendererProps {
  field: CustomField
  value: any
  onChange: (value: any) => void
}

export function CustomFieldRenderer({ field, value, onChange }: CustomFieldRendererProps) {
  const handleMultiSelectChange = (option: string, checked: boolean) => {
    const currentValues = Array.isArray(value) ? value : []
    if (checked) {
      onChange([...currentValues, option])
    } else {
      onChange(currentValues.filter((v: string) => v !== option))
    }
  }

  const renderField = () => {
    switch (field.fieldType) {
      case 'TEXT':
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        )

      case 'NUMBER':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            required={field.required}
          />
        )

      case 'DATE':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        )

      case 'URL':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://example.com"
            required={field.required}
          />
        )

      case 'EMAIL':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="email@example.com"
            required={field.required}
          />
        )

      case 'PHONE':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="+7 (999) 999-99-99"
            required={field.required}
          />
        )

      case 'SELECT':
        if (!field.options || field.options.length === 0) {
          return <p className="text-sm text-gray-500">Нет вариантов для выбора</p>
        }
        return (
          <Select
            value={value || 'none'}
            onValueChange={(val) => onChange(val === 'none' ? '' : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите вариант" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не выбрано</SelectItem>
              {field.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'MULTISELECT':
        if (!field.options || field.options.length === 0) {
          return <p className="text-sm text-gray-500">Нет вариантов для выбора</p>
        }
        const selectedValues = Array.isArray(value) ? value : []
        return (
          <div className="space-y-2">
            {field.options.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${option}`}
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) =>
                    handleMultiSelectChange(option, checked as boolean)
                  }
                />
                <label
                  htmlFor={`${field.id}-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
        )

      case 'CHECKBOX':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked)}
            />
            <label
              htmlFor={field.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Да
            </label>
          </div>
        )

      default:
        return <p className="text-sm text-gray-500">Неподдерживаемый тип поля</p>
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={field.id}>
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}
