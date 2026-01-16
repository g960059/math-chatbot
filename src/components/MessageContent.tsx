'use client'

import { memo, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
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
    // Check for tikz content in either format:
    // 1. Direct LaTeX: \begin{tikzcd} or \begin{tikzpicture}
    // 2. Markdown code block: ```tikz
    const hasTikz = content.includes('\\begin{tikz') || /```tikz\s*\n/i.test(content)
    
    if (!hasTikz) {
      return [{ type: 'markdown', content }]
    }

    const collected: Array<{ type: 'markdown' | 'tikz'; content: string }> = []
    
    // Pattern for markdown code blocks with tikz
    // Matches: ```tikz\n...\n``` (with optional content inside)
    const tikzCodeBlockRegex = /```tikz\s*\n([\s\S]*?)```/gi
    
    // Pattern for direct LaTeX tikz environments
    const tikzEnvRegex = /\\begin\{tikz(?:cd|picture)\}[\s\S]*?\\end\{tikz(?:cd|picture)\}/g
    
    // Combine both patterns: find all tikz blocks
    const allMatches: Array<{ index: number; length: number; content: string; isCodeBlock: boolean }> = []
    
    // Find markdown code block matches
    for (const match of content.matchAll(tikzCodeBlockRegex)) {
      const index = match.index ?? 0
      allMatches.push({
        index,
        length: match[0].length,
        content: match[1], // The captured group (content inside code block)
        isCodeBlock: true,
      })
    }
    
    // Find direct LaTeX matches (only if not already inside a code block)
    for (const match of content.matchAll(tikzEnvRegex)) {
      const index = match.index ?? 0
      // Check if this match is inside a code block
      const isInsideCodeBlock = allMatches.some(
        m => m.isCodeBlock && index >= m.index && index < m.index + m.length
      )
      if (!isInsideCodeBlock) {
        allMatches.push({
          index,
          length: match[0].length,
          content: match[0],
          isCodeBlock: false,
        })
      }
    }
    
    // Sort by index
    allMatches.sort((a, b) => a.index - b.index)
    
    if (allMatches.length === 0) {
      return [{ type: 'markdown', content }]
    }
    
    let lastIndex = 0
    
    for (const match of allMatches) {
      // Add markdown before this tikz block
      let before = content.slice(lastIndex, match.index)
      // Clean up any trailing $$ or \[ that might wrap the tikz
      before = before.replace(/\$\$\s*$/, '').replace(/\\\[\s*$/, '')
      if (before.trim()) {
        collected.push({ type: 'markdown', content: before })
      }

      // Add the tikz block
      collected.push({ type: 'tikz', content: match.content })
      lastIndex = match.index + match.length

      // Skip any leading $$ or \] after the tikz block (but not if it's part of a math expression)
      // Only skip standalone $$ or \] that were used to wrap the tikz block
      const afterSlice = content.slice(lastIndex)
      // Match only standalone $$ or \] at the start (not followed by content on the same line)
      const leadingMatch = afterSlice.match(/^(\s*\n)?\s*(\$\$|\\\])(?=\s*\n|$)/)
      if (leadingMatch) {
        lastIndex += leadingMatch[0].length
      }
    }

    // Add remaining content after last tikz block
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
            remarkPlugins={[remarkGfm, remarkMath]}
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
