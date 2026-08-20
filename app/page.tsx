'use client'

import { ChangeEvent, MouseEvent as ReactMouseEvent, PointerEvent, useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'

type Selection = { id: number; x: number; y: number; width: number; height: number }
type Sprite = { id: number; url: string; width: number; height: number }

const colors = ['#ef8354', '#67d7c1', '#9d8cff', '#f3c969', '#ee6c9d', '#5aa9e6']

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [tileWidth, setTileWidth] = useState(16)
  const [tileHeight, setTileHeight] = useState(16)
  const [zoom, setZoom] = useState(1)
  const [selections, setSelections] = useState<Selection[]>([])
  const [sprites, setSprites] = useState<Sprite[]>([])
  const [frameWidth, setFrameWidth] = useState(32)
  const [frameHeight, setFrameHeight] = useState(64)
  const [batchMessage, setBatchMessage] = useState('')
  const [undoStack, setUndoStack] = useState<Selection[][]>([])
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<Selection | null>(null)
  const rightClickHandled = useRef(0)

  const cols = imageSize.width && tileWidth > 0 ? Math.floor(imageSize.width / tileWidth) : 0
  const rows = imageSize.height && tileHeight > 0 ? Math.floor(imageSize.height / tileHeight) : 0

  useEffect(() => {
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!canvas || !image || !imageSize.width) return
    canvas.width = imageSize.width
    canvas.height = imageSize.height
    const context = canvas.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = false
    context.drawImage(image, 0, 0)
    context.strokeStyle = 'rgba(220, 230, 240, .19)'
    context.lineWidth = 1
    for (let x = 0; x <= cols; x++) { context.beginPath(); context.moveTo(x * tileWidth + .5, 0); context.lineTo(x * tileWidth + .5, rows * tileHeight); context.stroke() }
    for (let y = 0; y <= rows; y++) { context.beginPath(); context.moveTo(0, y * tileHeight + .5); context.lineTo(cols * tileWidth, y * tileHeight + .5); context.stroke() }
    const all = draft ? [...selections, draft] : selections
    all.forEach((selection, index) => {
      const color = colors[index % colors.length]
      context.fillStyle = `${color}55`
      context.fillRect(selection.x * tileWidth, selection.y * tileHeight, selection.width * tileWidth, selection.height * tileHeight)
      context.strokeStyle = color
      context.lineWidth = 2 / zoom
      context.strokeRect(selection.x * tileWidth + 1 / zoom, selection.y * tileHeight + 1 / zoom, selection.width * tileWidth - 2 / zoom, selection.height * tileHeight - 2 / zoom)
      context.fillStyle = color
      context.font = `${Math.max(10, 11 / zoom)}px Arial`
      context.fillText(`S${index + 1}`, selection.x * tileWidth + 5 / zoom, selection.y * tileHeight + 15 / zoom)
    })
  }, [imageSize, tileWidth, tileHeight, cols, rows, selections, draft, zoom])

  function loadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { imageRef.current = image; setImageUrl(url); setImageSize({ width: image.naturalWidth, height: image.naturalHeight }); setSelections([]); setSprites([]); setUndoStack([]); setZoom(1) }
    image.src = url
  }

  function pointToTile(event: PointerEvent<HTMLCanvasElement> | ReactMouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const scaleX = imageSize.width / rect.width
    const scaleY = imageSize.height / rect.height
    return { x: Math.max(0, Math.min(cols - 1, Math.floor(((event.clientX - rect.left) * scaleX) / tileWidth))), y: Math.max(0, Math.min(rows - 1, Math.floor(((event.clientY - rect.top) * scaleY) / tileHeight))) }
  }
  function startSelection(event: PointerEvent<HTMLCanvasElement>) {
    if (event.button === 2) { removeSelectionAt(event); return }
    if (event.button !== 0 || !cols || !rows) return
    const point = pointToTile(event); setDrag(point); setDraft({ id: 0, ...point, width: 1, height: 1 }); event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveSelection(event: PointerEvent<HTMLCanvasElement>) {
    if (!drag) return
    const point = pointToTile(event)
    const x = Math.min(drag.x, point.x), y = Math.min(drag.y, point.y)
    setDraft({ id: 0, x, y, width: Math.abs(point.x - drag.x) + 1, height: Math.abs(point.y - drag.y) + 1 })
  }
  function endSelection() { if (draft) { setUndoStack(current => [...current, selections]); setSelections(current => [...current, { ...draft, id: Date.now() }]) } setDraft(null); setDrag(null) }
  function removeSelectionAt(event: PointerEvent<HTMLCanvasElement> | ReactMouseEvent<HTMLCanvasElement>) {
    event.preventDefault()
    if (event.type === 'contextmenu' && Date.now() - rightClickHandled.current < 300) return
    if (!selections.length) return
    const point = pointToTile(event)
    const target = [...selections].reverse().find(selection => point.x >= selection.x && point.x < selection.x + selection.width && point.y >= selection.y && point.y < selection.y + selection.height)
    if (target) { removeSelection(target.id); rightClickHandled.current = Date.now() }
  }
  function updateTile(setter: (value: number) => void, value: string) { const number = Math.max(1, Number(value) || 1); setter(number); setSelections([]); setSprites([]); setUndoStack([]) }
  function splitLastSelection() {
    const source = selections[selections.length - 1]
    const frameCols = frameWidth / tileWidth
    const frameRows = frameHeight / tileHeight
    if (!source) return
    if (!Number.isInteger(frameCols) || !Number.isInteger(frameRows) || frameCols < 1 || frameRows < 1) { setBatchMessage('As dimensões precisam ser múltiplas do tile.'); return }
    if (frameCols > source.width || frameRows > source.height) { setBatchMessage('O quadro é maior que a última área selecionada.'); return }
    const next: Selection[] = []
    for (let y = source.y; y + frameRows <= source.y + source.height; y += frameRows) for (let x = source.x; x + frameCols <= source.x + source.width; x += frameCols) next.push({ id: Date.now() + next.length, x, y, width: frameCols, height: frameRows })
    setUndoStack(current => [...current, selections])
    setSelections(current => [...current.slice(0, -1), ...next]); setSprites([]); setBatchMessage(`${next.length} quadros criados a partir da última área.`)
  }
  function undo() {
    const previous = undoStack[undoStack.length - 1]
    if (!previous) return
    setUndoStack(current => current.slice(0, -1))
    setSelections(previous); setSprites([]); setBatchMessage('')
  }
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      event.preventDefault(); undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undoStack])
  function fitToScreen() { if (!workspaceRef.current || !imageSize.width) return; const padding = 80; const next = Math.min(1, (workspaceRef.current.clientWidth - padding) / imageSize.width, (workspaceRef.current.clientHeight - padding) / imageSize.height); setZoom(Math.max(.1, Number(next.toFixed(2)))) }
  function removeSelection(id: number) { setUndoStack(current => [...current, selections]); setSelections(current => current.filter(selection => selection.id !== id)); setSprites([]) }
  function crop() {
    const image = imageRef.current
    if (!image || !selections.length) return
    const next: Sprite[] = []
    selections.forEach((selection, index) => {
      const canvas = document.createElement('canvas'); canvas.width = selection.width * tileWidth; canvas.height = selection.height * tileHeight
      canvas.getContext('2d')?.drawImage(image, selection.x * tileWidth, selection.y * tileHeight, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
      next.push({ id: index + 1, url: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height })
    })
    setSprites(next)
  }
  async function downloadAll() {
    if (!sprites.length) return
    const zip = new JSZip()
    sprites.forEach(sprite => zip.file(`sprite-${String(sprite.id).padStart(2, '0')}.png`, sprite.url.split(',')[1], { base64: true }))
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'sprites-recortados.zip'; link.click(); URL.revokeObjectURL(url)
  }
  const displayWidth = imageSize.width * zoom, displayHeight = imageSize.height * zoom

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">✦</span><span>tilecut</span><small>SPRITE CUTTER</small></div><label className="import-button"><span>＋</span> Importar imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={loadImage} /></label></header>
    <section className="hero"><div><p className="eyebrow">PIXEL WORKSPACE</p><h1>Recorte sprites,<br /><em>sem perder um pixel.</em></h1><p className="intro">Divida sua spritesheet em tiles, selecione as áreas que deseja e exporte PNGs perfeitos.</p></div>{imageSize.width ? <div className="image-meta"><span className="status-dot" /> imagem carregada <strong>{imageSize.width} × {imageSize.height} px</strong></div> : null}</section>
    {!imageSize.width ? <label className="dropzone"><span className="upload-icon">↥</span><strong>Solte sua spritesheet aqui</strong><span>ou clique para procurar · PNG, JPG ou WEBP</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={loadImage} /></label> : <div className="editor-layout">
      <aside className="sidebar"><div className="panel-section"><div className="section-heading"><span className="step">01</span><div><p>CONFIGURAÇÃO</p><h2>Grade de tiles</h2></div></div><div className="field-row"><label>Largura <span>px</span><input type="number" min="1" value={tileWidth} onChange={event => updateTile(setTileWidth, event.target.value)} /></label><label>Altura <span>px</span><input type="number" min="1" value={tileHeight} onChange={event => updateTile(setTileHeight, event.target.value)} /></label></div><div className="grid-summary"><span><b>{cols}</b> colunas</span><span><b>{rows}</b> linhas</span><span><b>{cols * rows}</b> tiles</span></div></div><div className="panel-section selections-panel"><div className="section-heading"><span className="step">02</span><div><p>ÁREAS MARCADAS</p><h2>Seleções <b>{selections.length}</b></h2></div></div>{selections.length ? <div className="selection-list">{selections.map((selection, index) => <div className="selection-item" key={selection.id}><span className="selection-color" style={{ background: colors[index % colors.length] }} /><span><strong>Seleção {index + 1}</strong><small>{selection.width} × {selection.height} tiles</small></span><button onClick={() => removeSelection(selection.id)} aria-label="Remover seleção">×</button></div>)}</div> : <p className="empty-note">Clique e arraste na imagem<br />para marcar uma área.</p>}{selections.length > 0 && <><div className="batch-box"><p>DIVIDIR ÚLTIMA ÁREA EM QUADROS</p><div className="field-row"><label>Largura <span>px</span><input type="number" min="1" value={frameWidth} onChange={event => setFrameWidth(Math.max(1, Number(event.target.value) || 1))} /></label><label>Altura <span>px</span><input type="number" min="1" value={frameHeight} onChange={event => setFrameHeight(Math.max(1, Number(event.target.value) || 1))} /></label></div><button className="split-button" onClick={splitLastSelection}>⊞ Dividir em quadros</button>{batchMessage && <small className="batch-message">{batchMessage}</small>}</div><button className="clear-button" onClick={() => { if (selections.length) setUndoStack(current => [...current, selections]); setSelections([]); setSprites([]); setBatchMessage('') }}>Limpar todas as seleções</button></>}</div><button className="undo-button" onClick={undo} disabled={!undoStack.length}><span>↩</span> Desfazer<small>Ctrl+Z</small></button><button className="crop-button" disabled={!selections.length} onClick={crop}><span>✂</span> Cortar sprites <small>{selections.length ? `${selections.length} ${selections.length === 1 ? 'área' : 'áreas'}` : 'selecione uma área'}</small></button></aside>
      <section className="workspace"><div className="workspace-toolbar"><div><span className="canvas-label">CANVAS</span><span className="hint">Arraste para selecionar tiles · clique direito para remover</span></div><div className="zoom-controls"><button onClick={() => setZoom(value => Math.max(.1, Number((value - .1).toFixed(2))))}>−</button><button className="zoom-value" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button onClick={() => setZoom(value => Math.min(4, Number((value + .1).toFixed(2))))}>＋</button><button className="fit-button" onClick={fitToScreen}>Ajustar à tela</button></div></div><div className="canvas-scroll" ref={workspaceRef}><div className="canvas-wrap" style={{ width: displayWidth, height: displayHeight }}><canvas ref={canvasRef} style={{ width: displayWidth, height: displayHeight, cursor: drag ? 'crosshair' : 'cell' }} onPointerDown={startSelection} onPointerMove={moveSelection} onPointerUp={endSelection} onPointerCancel={endSelection} onContextMenu={removeSelectionAt} /></div></div></section>
    </div>}
    {sprites.length > 0 && <section className="results"><div className="results-header"><div><p className="eyebrow">EXPORTAÇÃO CONCLUÍDA</p><h2>Sprites recortados <span>{sprites.length}</span></h2></div><div className="results-actions"><p>Seus arquivos são gerados localmente<br />e não saem do seu navegador.</p><button className="download-all" onClick={downloadAll}>↓&nbsp; Baixar todas (.ZIP)</button></div></div><div className="sprite-grid">{sprites.map(sprite => <article className="sprite-card" key={sprite.id}><div className="sprite-preview"><img src={sprite.url} alt={`Sprite ${sprite.id}`} /></div><div className="sprite-info"><div><strong>sprite-{String(sprite.id).padStart(2, '0')}.png</strong><small>{sprite.width} × {sprite.height} px</small></div><a href={sprite.url} download={`sprite-${String(sprite.id).padStart(2, '0')}.png`} className="download-button">↓</a></div></article>)}</div></section>}
    <footer><span>PROCESSAMENTO 100% LOCAL</span><span>Feito para spritesheets precisas <i>·</i> {imageSize.width ? `${selections.length} seleções` : 'nenhuma imagem carregada'}</span></footer>
  </main>
}
