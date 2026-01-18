import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'

export function MarkdownPreview({ value }: { value: string }) {
  if (!value) {
    return (
      <div className="h-full w-full flex items-center justify-center text-slate-300 italic text-sm bg-white">
        等待输入 Markdown 内容...
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto bg-white scroll-smooth">
      <div className="max-w-3xl mx-auto p-8 lg:p-12 text-sm text-slate-800 leading-relaxed markdown-body">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm, remarkBreaks]} 
          rehypePlugins={[rehypeHighlight]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-3xl font-bold mt-12 mb-6 pb-4 border-b border-slate-200 text-slate-900" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-10 mb-5 pb-2 border-b border-slate-100 text-slate-800" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-xl font-bold mt-8 mb-4 text-slate-800" {...props} />,
            p: ({node, ...props}) => <p className="my-4 text-slate-700 leading-7" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-6 my-4 space-y-2 text-slate-700" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-4 space-y-2 text-slate-700" {...props} />,
            li: ({node, ...props}) => <li className="pl-1" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-emerald-100 bg-emerald-50/30 pl-6 py-2 my-6 italic text-slate-600 rounded-r-lg" {...props} />,
            code: ({node, inline, ...props}: any) => 
              inline 
                ? <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-600 font-mono text-[13px]" {...props} />
                : <code className="block bg-slate-50 p-6 rounded-xl border border-slate-100 font-mono text-[13px] my-6 overflow-x-auto shadow-sm" {...props} />,
            pre: ({node, ...props}) => <pre className="bg-transparent p-0 m-0" {...props} />,
            table: ({node, ...props}) => (
              <div className="overflow-x-auto my-6 rounded-lg border border-slate-200">
                <table className="w-full border-collapse" {...props} />
              </div>
            ),
            th: ({node, ...props}) => <th className="bg-slate-50 px-4 py-3 text-left font-bold border-b border-slate-200 text-slate-700" {...props} />,
            td: ({node, ...props}) => <td className="border-b border-slate-100 px-4 py-3 text-slate-600" {...props} />,
            a: ({node, ...props}) => <a className="text-emerald-600 hover:text-emerald-700 underline underline-offset-4 decoration-emerald-200 transition-colors" {...props} />,
            hr: ({node, ...props}) => <hr className="my-12 border-slate-100" {...props} />,
            img: ({node, ...props}) => <img className="rounded-xl shadow-md mx-auto my-8 max-w-full" {...props} />,
          }}
        >
          {value}
        </ReactMarkdown>
      </div>
    </div>
  )
}
