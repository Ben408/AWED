import type { ReactNode } from 'react';

type Block = {
  id: string;
  type: string;
  props: Record<string, unknown>;
};

type PageDoc = {
  metadata: { title: string; description?: string };
  agent?: { tldr?: string };
  blocks: Block[];
};

/** Minimal renderer for document-driven starter sites. */
export function renderPageDocument(doc: PageDoc): ReactNode {
  return (
    <main>
      {doc.agent?.tldr ? (
        <p data-agent-tldr="" style={{ position: 'absolute', left: -9999 }}>
          {doc.agent.tldr}
        </p>
      ) : null}
      {doc.blocks.map((block) => (
        <section key={block.id} data-block={block.type}>
          <BlockView block={block} />
        </section>
      ))}
    </main>
  );
}

function BlockView({ block }: { block: Block }) {
  const props = block.props;
  switch (block.type) {
    case 'hero':
      return (
        <header>
          {props.eyebrow ? <p>{String(props.eyebrow)}</p> : null}
          <h1>{String(props.headline ?? '')}</h1>
          {props.support ? <p>{String(props.support)}</p> : null}
        </header>
      );
    case 'prose':
      return (
        <div>
          {props.heading ? <h2>{String(props.heading)}</h2> : null}
          <p>{String(props.body ?? '')}</p>
        </div>
      );
    case 'ctaBand':
      return (
        <div>
          <h2>{String(props.heading ?? '')}</h2>
          {props.body ? <p>{String(props.body)}</p> : null}
          <a href={String(props.buttonHref ?? '#')}>{String(props.buttonLabel ?? 'Go')}</a>
        </div>
      );
    default:
      return <pre>{JSON.stringify(block, null, 2)}</pre>;
  }
}
