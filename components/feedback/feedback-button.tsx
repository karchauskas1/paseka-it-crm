'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedbackModal } from './feedback-modal'

interface FeedbackButtonProps {
  workspaceId: string
}

export function FeedbackButton({ workspaceId }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white"
        size="default"
      >
        <MessageSquare className="mr-2 h-4 w-4" />
        Обратная связь
      </Button>

      <FeedbackModal
        workspaceId={workspaceId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
