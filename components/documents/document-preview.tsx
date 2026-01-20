'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentPreviewProps {
  isOpen: boolean
  onClose: () => void
  document: {
    id: string
    name: string
    url: string
    type: string
    size?: number
  }
}

export function DocumentPreview({ isOpen, onClose, document: doc }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Документ скачивается')
  }

  const handleOpenInNewTab = () => {
    window.open(doc.url, '_blank')
  }

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || ''
  }

  const isPreviewable = (filename: string) => {
    const ext = getFileExtension(filename)
    const previewableTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'txt', 'md']
    return previewableTypes.includes(ext)
  }

  const isPDF = getFileExtension(doc.name) === 'pdf'
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(getFileExtension(doc.name))
  const isText = ['txt', 'md'].includes(getFileExtension(doc.name))
  const canPreview = isPreviewable(doc.name)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{doc.name}</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                title="Открыть в новой вкладке"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                title="Скачать"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {doc.size && (
            <p className="text-sm text-muted-foreground">
              {(doc.size / 1024).toFixed(1)} KB
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {!canPreview ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Предпросмотр недоступен для этого типа файла
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать
                </Button>
                <Button variant="outline" onClick={handleOpenInNewTab}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Открыть в новой вкладке
                </Button>
              </div>
            </div>
          ) : isPDF ? (
            <div className="w-full h-[70vh] relative">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <p className="text-muted-foreground">Загрузка PDF...</p>
                </div>
              )}
              <iframe
                src={`${doc.url}#toolbar=0`}
                className="w-full h-full border-0"
                onLoad={() => setLoading(false)}
                title={doc.name}
              />
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center bg-muted p-4 rounded-lg">
              <img
                src={doc.url}
                alt={doc.name}
                className="max-w-full max-h-[70vh] object-contain"
                onLoad={() => setLoading(false)}
              />
            </div>
          ) : isText ? (
            <div className="w-full h-[70vh]">
              {loading && (
                <div className="flex items-center justify-center h-full bg-muted">
                  <p className="text-muted-foreground">Загрузка...</p>
                </div>
              )}
              <iframe
                src={doc.url}
                className="w-full h-full border-0 bg-background"
                onLoad={() => setLoading(false)}
                title={doc.name}
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Предпросмотр не поддерживается
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
