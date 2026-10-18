import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Themed markdown renderer for LLM output (AI assistant, AI code reviews).
export default function Md({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`md-body text-sm text-ink ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>,
          h1: ({ children }) => <h4 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h4>,
          h2: ({ children }) => <h4 className="text-[15px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h4>,
          h3: ({ children }) => <h4 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0">{children}</h4>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ className: codeClass, children }) => {
            const text = String(children ?? "");
            const block = /language-/.test(codeClass ?? "") || text.includes("\n");
            return block ? (
              <code className="block rounded-[8px] bg-bg border border-line px-3 py-2 text-xs leading-relaxed whitespace-pre overflow-x-auto">
                {children}
              </code>
            ) : (
              <code className="rounded-[5px] bg-bg border border-line px-1.5 py-0.5 text-xs">{children}</code>
            );
          },
          pre: ({ children }) => <pre className="my-1.5 overflow-x-auto">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-l-accent pl-3 my-1.5 text-muted">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          hr: () => <hr className="border-line my-2" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-1.5">
              <table className="min-w-full text-[13px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-line bg-bg px-2 py-1 text-left font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-line px-2 py-1">{children}</td>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}