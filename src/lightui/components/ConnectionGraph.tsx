import { useMemo } from 'react'
import {
  ReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { connections } from '../../mocks/bandyLight'

/**
 * C1 밴드 관계 그래프 — React Flow.
 *
 * 읽기 전용 그림입니다: 패닝·줌·드래그를 모두 끄고 fitView 로 맞춥니다.
 * 선의 굵기·색이 교류 강도이고, 활동이 없다고 가늘어지지는 않습니다.
 */

export type Tone = 'strong' | 'mid' | 'weak'

/** 교류 강도별 선 — 강(합동 여러 번) · 중(합동 1회) · 약(응원/수락만) */
const EDGE_STYLE: Record<Tone, { stroke: string; strokeWidth: number }> = {
  strong: { stroke: '#FF5A5A', strokeWidth: 4.5 },
  mid: { stroke: 'rgba(255,90,90,0.45)', strokeWidth: 3.2 },
  weak: { stroke: '#D9DADD', strokeWidth: 2 },
}

/** 중심에서 뻗어 나가는 방향 — 핸들은 모두 노드 한가운데 있고, 방향만 곡률을 정합니다 */
const DIR: Record<string, Position> = {
  tl: Position.Left,
  tr: Position.Right,
  t: Position.Top,
  r: Position.Right,
  l: Position.Left,
  b: Position.Bottom,
  bl: Position.Left,
  br: Position.Right,
}

type BandData = {
  initial: string
  name: string
  record: string
  size: number
  tone: Tone
  to: string
}

type CenterData = { label: string }

/**
 * 라벨은 원 아래에 띄워 둡니다.
 *
 * 흐름 안에 두면 노드 상자의 너비가 원 지름으로 굳어서, 「블루노트」 처럼 원보다 긴 이름이
 * 그 폭에 눌립니다(브라우저에 따라 두 줄로 쪼개지기도 합니다). 띄워 두면 원 밖으로
 * 넓게 빠져나올 수 있고, 가운데 정렬도 원 기준으로 유지됩니다.
 */
const BandNode = ({ data }: NodeProps<Node<BandData>>) => (
  <div className="c1g-node">
    <Handle type="target" position={DIR[data.to] ?? Position.Top} className="c1g-handle" />
    <span
      className={`c1g-node__circle c1g-node__circle--${data.tone}`}
      style={{ width: data.size, height: data.size }}
    >
      {data.initial}
    </span>
    <span className="c1g-node__labels">
      <span className={`c1g-node__name c1g-node__name--${data.tone}`}>{data.name}</span>
      <span className="c1g-node__record">{data.record}</span>
    </span>
  </div>
)

const CenterNode = ({ data }: NodeProps<Node<CenterData>>) => (
  <div className="c1g-center">
    {['tl', 'tr', 'r', 'l', 'b'].map((key) => (
      <Handle key={key} id={key} type="source" position={DIR[key]} className="c1g-handle" />
    ))}
    <span className="c1g-center__label">{data.label}</span>
  </div>
)

const nodeTypes = { band: BandNode, center: CenterNode }

const ConnectionGraph = ({ onSelect }: { onSelect?: (id: string) => void }) => {
  const { nodes, edges } = useMemo(() => {
    const g = connections.graph
    const ns: Node[] = [
      {
        id: g.center.id,
        type: 'center',
        position: { x: g.center.x, y: g.center.y },
        data: { label: g.center.label },
        draggable: false,
        selectable: false,
      },
      ...g.nodes.map((n) => ({
        id: n.id,
        type: 'band',
        position: { x: n.x, y: n.y },
        data: {
          initial: n.initial,
          name: n.name,
          record: n.record,
          size: n.size,
          tone: n.tone,
          to: n.to,
        },
        draggable: false,
      })),
    ]
    const es: Edge[] = g.nodes.map((n) => ({
      id: `${g.center.id}-${n.id}`,
      source: g.center.id,
      sourceHandle: n.from,
      target: n.id,
      type: 'default',
      style: EDGE_STYLE[n.tone],
    }))
    return { nodes: ns, edges: es }
  }, [])

  return (
    <div className="c1g">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        /* 라벨이 노드 상자 밖으로 나가 있어서 fitView 가 세지 못합니다 — 여백을 넉넉히 */
        fitViewOptions={{ padding: 0.22 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        onNodeClick={(_, node) => node.type === 'band' && onSelect?.(node.id)}
      />
    </div>
  )
}

export default ConnectionGraph
