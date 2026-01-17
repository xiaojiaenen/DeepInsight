import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

export function MarkdownPreview({ value }: { value: string }) {
  return (
    <div className="h-full w-full overflow-auto bg-white">
      <div className="max-w-none p-4 text-sm text-slate-900 leading-6">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {value}
        </ReactMarkdown>
      </div>
    </div>
  )
}
