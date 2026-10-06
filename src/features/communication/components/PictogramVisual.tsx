import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface PictogramVisualProps {
  src: string
}

export function PictogramVisual({ src }: PictogramVisualProps) {
  const [imageFailed, setImageFailed] = useState(false)

  if (imageFailed || !src) {
    return (
      <div className="flex size-full items-center justify-center rounded-2xl bg-caa-surface">
        <ImageOff aria-hidden="true" strokeWidth={1.5} className="size-1/3 text-caa-muted" />
      </div>
    )
  }

  // The card's label is the accessible name, so the image is decorative.
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setImageFailed(true)}
      className="size-full object-contain"
    />
  )
}
