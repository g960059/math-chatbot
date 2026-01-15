'use client'
'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import { cn } from '@/lib/utils'


interface MessageContentProps {
  content: string
  isStreaming?: boolean
}

const DEFAULT_TIKZ_HEIGHT = 160

function buildTikzDocument(content: string, origin: string) {
  const safeContent = content.replace(/<\/script>/gi, '<\\/script>')
  const targetOrigin = origin || '*'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <link rel="stylesheet" href="https://tikzjax.com/v1/fonts.css" />
  <style>
    body { margin: 0; padding: 0; width: 100%; }
    body > div { width: 100% !important; height: auto !important; display: block !important; }
    .page { width: 100% !important; height: auto !important; }
    svg { max-width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <script type="text/tikz">${safeContent}</script>
  <script src="https://tikzjax.com/v1/tikzjax.js"></script>
  <script>
    const targetOrigin = ${JSON.stringify(targetOrigin)};
    const padding = 4;
    const updateLayout = () => {
      const svg = document.querySelector('svg');
      if (svg && typeof svg.getBBox === 'function') {
        try {
          const box = svg.getBBox();
          const width = box.width + padding * 2;
          const height = box.height + padding * 2;
          const viewBox = (box.x - padding) + ' ' + (box.y - padding) + ' ' + width + ' ' + height;
          svg.setAttribute('viewBox', viewBox);
          svg.setAttribute('preserveAspectRatio', 'xMinYMin meet');

          const containerWidth = document.body.clientWidth || window.innerWidth || width;
          const aspectRatio = height / Math.max(width, 1);
          let maxScale = 2.0;
          let minWidthRatio = 0.4;

          if (aspectRatio > 0.7) {
            maxScale = 1.75;
            minWidthRatio = 0.34;
          } else if (aspectRatio > 0.4) {
            maxScale = 2.5;
            minWidthRatio = 0.5;
          }

          const desiredWidth = Math.max(width * maxScale, containerWidth * minWidthRatio);
          const targetWidth = Math.min(containerWidth, desiredWidth);

          svg.style.width = targetWidth + 'px';
          svg.style.height = 'auto';
          svg.style.maxWidth = '100%';
          svg.style.position = 'relative';
          svg.style.left = '50%';
          svg.style.transform = 'translateX(-50%)';
          svg.style.top = '0';
          svg.removeAttribute('width');
          svg.removeAttribute('height');
        } catch (error) {
          // ignore
        }
      }
      const svgRect = svg?.getBoundingClientRect();
      const height = (svgRect?.height || document.body.scrollHeight || document.documentElement.scrollHeight || 0) + padding;
      window.parent.postMessage({ type: 'tikzjax:height', height }, targetOrigin);
    };
    const observer = new MutationObserver(updateLayout);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('load', () => {
      updateLayout();
      setTimeout(updateLayout, 500);
      setTimeout(updateLayout, 1500);
    });
  </script>
</body>
</html>`
}

function TikzBlock({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(DEFAULT_TIKZ_HEIGHT)
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const srcDoc = useMemo(() => buildTikzDocument(content, origin), [content, origin])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current?.contentWindow || event.source !== iframeRef.current.contentWindow) {
        return
      }
      if (!event.data || typeof event.data !== 'object') {
        return
      }
      if (event.data.type === 'tikzjax:height' && typeof event.data.height === 'number') {
        setHeight(Math.max(event.data.height, DEFAULT_TIKZ_HEIGHT))
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <iframe
      ref={iframeRef}
      title="TikZ diagram"
      className="w-full border-0 block"
      style={{ height: `${height}px`, width: '100%' }}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
    />
  )
}

function MessageContentComponent({ content, isStreaming }: MessageContentProps) {
  const segments = useMemo(() => {
    if (!content.includes('\\begin{tikz')) {
      return [{ type: 'markdown', content }]
    }

    const tikzEnvRegex = /\\begin\{tikz(?:cd|picture)\}[\s\S]*?\\end\{tikz(?:cd|picture)\}/g
    const collected: Array<{ type: 'markdown' | 'tikz'; content: string }> = []
    let lastIndex = 0

    for (const match of content.matchAll(tikzEnvRegex)) {
      const index = match.index ?? 0
      let before = content.slice(lastIndex, index)
      before = before.replace(/\$\$\s*$/, '').replace(/\\\[\s*$/, '')
      if (before.trim()) {
        collected.push({ type: 'markdown', content: before })
      }

      collected.push({ type: 'tikz', content: match[0] })
      lastIndex = index + match[0].length

      const afterSlice = content.slice(lastIndex)
      const leadingMatch = afterSlice.match(/^\s*(\$\$|\\\])/)
      if (leadingMatch) {
        lastIndex += leadingMatch[0].length
      }
    }

    const tail = content.slice(lastIndex)
    if (tail.trim()) {
      collected.push({ type: 'markdown', content: tail })
    }

    return collected
  }, [content])

  const sanitizeTikz = (raw: string) => {
    const cleaned = raw.replace(/```/g, '').trim()
    const withLibrary = cleaned.includes('\\begin{tikzcd}')
      ? `\\usetikzlibrary{cd}\n${cleaned}`
      : cleaned
    const scaleDirective = '\\tikzset{every picture/.style={scale=1.0}, every node/.style={transform shape}}'
    const withScale = withLibrary.startsWith('\\usetikzlibrary{cd}')
      ? `${withLibrary}\n${scaleDirective}`
      : `${scaleDirective}\n${withLibrary}`

    const asciiText = withScale
      .replace(/\\text\{([^}]*)\}/g, (_match, text) => {
        const latin = text.replace(/[^\x00-\xFF]/g, '')
        return latin ? `\\mathrm{${latin}}` : ''
      })
      .replace(/[^\x00-\xFF]/g, '')
      .replace(/\\text\{\s*\}/g, '')

    return asciiText
      .replace(/\\begin\{tikzcd\}\[[^\]]*?\]/g, '\\begin{tikzcd}')
      .replace(/\\begin\{tikzpicture\}\[[^\]]*?\]/g, '\\begin{tikzpicture}')
      .replace(/\\quad/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  return (
    <div className={cn('message-content', isStreaming && 'streaming')}>
      {segments.map((segment, index) =>
        segment.type === 'tikz' ? (
          <TikzBlock key={`tikz-${index}`} content={sanitizeTikz(segment.content)} />
        ) : (
          <ReactMarkdown
            key={`md-${index}`}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-([\w-]+)/.exec(className || '')
                const isInline = !match
                const rawCode = String(children).replace(/\n$/, '')
                const language = match?.[1]?.toLowerCase()

                if (isInline) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }

                return (
                  <pre className={cn('relative', className)}>
                    {language && (
                      <div className="absolute top-2 right-2 text-xs text-gray-500 dark:text-gray-400">
                        {language}
                      </div>
                    )}
                    <code className={className} {...props}>
                      {rawCode}
                    </code>
                  </pre>
                )
              },
            }}
          >
            {segment.content}
          </ReactMarkdown>
        )
      )}
      {isStreaming && (
        <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse" />
      )}
    </div>
  )
}

export const MessageContent = memo(MessageContentComponent)
