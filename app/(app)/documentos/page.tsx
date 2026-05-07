'use client'
import { useEffect, useRef, useState } from 'react'
import { Topbar } from '@/components/layout/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FolderOpen, Folder, Upload, Trash2, FileText, Image,
  Download, Eye, X, ChevronLeft, Search,
} from 'lucide-react'

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmtDate(str: string) {
  return str ? str.slice(0, 16).replace('T', ' ') : '-'
}

export default function DocumentosPage() {
  const [items, setItems] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<any | null>(null)
  const [filter, setFilter] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Count docs per item
  const [docCounts, setDocCounts] = useState<Record<string, number>>({})

  async function loadItems() {
    const [ir, dr] = await Promise.all([fetch('/api/items'), fetch('/api/documentos')])
    const itemsData = await ir.json()
    const allDocs = await dr.json()
    setItems(itemsData)
    const counts: Record<string, number> = {}
    allDocs.forEach((d: any) => { counts[d.id_item] = (counts[d.id_item] || 0) + 1 })
    setDocCounts(counts)
  }

  async function loadDocs(id_item: string) {
    const r = await fetch(`/api/documentos?id_item=${id_item}`)
    setDocs(await r.json())
  }

  useEffect(() => { loadItems() }, [])

  function selectItem(item: any) {
    setSelectedItem(item)
    loadDocs(item.id_item)
    setPreview(null)
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || !selectedItem) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('id_item', selectedItem.id_item)
      fd.append('file', file)
      await fetch('/api/documentos', { method: 'POST', body: fd })
    }
    await loadDocs(selectedItem.id_item)
    await loadItems()
    setUploading(false)
  }

  async function deleteDoc(id: number) {
    if (!confirm('¿Eliminar este documento?')) return
    await fetch(`/api/documentos/${id}`, { method: 'DELETE' })
    await loadDocs(selectedItem.id_item)
    await loadItems()
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    uploadFiles(e.dataTransfer.files)
  }

  const filteredItems = items.filter(i =>
    !filter ||
    i.id_item?.toLowerCase().includes(filter.toLowerCase()) ||
    i.detalle?.toLowerCase().includes(filter.toLowerCase())
  )

  const isImage = (doc: any) => ['image/jpeg', 'image/jpg', 'image/png', 'jpg', 'jpeg', 'png'].includes(doc.tipo)
  const isPdf = (doc: any) => doc.tipo === 'application/pdf' || doc.tipo === 'pdf'

  return (
    <div>
      <Topbar title="Documentos" />
      <div className="p-6 flex gap-5 h-[calc(100vh-64px)]">

        {/* Panel izquierdo — carpetas por ítem */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Buscar ítem..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#6B1A1A] focus:outline-none focus:ring-1 focus:ring-[#6B1A1A]"
            />
          </div>

          <Card className="flex-1 overflow-y-auto p-0">
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {filteredItems.length} ítem{filteredItems.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {filteredItems.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">Sin ítems</p>
              )}
              {filteredItems.map(item => {
                const active = selectedItem?.id_item === item.id_item
                const count = docCounts[item.id_item] || 0
                return (
                  <button
                    key={item.id_item}
                    onClick={() => selectItem(item)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${active ? 'bg-[#F5EEEE] border-l-2 border-[#6B1A1A]' : 'hover:bg-gray-50 border-l-2 border-transparent'}`}
                  >
                    {active
                      ? <FolderOpen size={18} className="text-[#6B1A1A] flex-shrink-0" />
                      : <Folder size={18} className="text-amber-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-[#4A1010]' : 'text-gray-700'}`}>{item.id_item}</p>
                      <p className="text-xs text-gray-400 truncate">{item.detalle || '—'}</p>
                    </div>
                    {count > 0 && (
                      <span className="flex-shrink-0 text-xs bg-red-100 text-[#4A1010] font-semibold rounded-full px-2 py-0.5">{count}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Panel derecho — documentos del ítem */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {!selectedItem ? (
            <Card className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <FolderOpen size={48} className="text-gray-200" />
              <p className="text-gray-400 font-medium">Seleccioná un ítem para ver sus documentos</p>
            </Card>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button onClick={() => setSelectedItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <ChevronLeft size={18} />
                  </button>
                  <div>
                    <p className="font-semibold text-gray-900">{selectedItem.id_item}</p>
                    <p className="text-xs text-gray-500">{selectedItem.detalle || '—'}</p>
                  </div>
                  <Badge variant="default">{docs.length} doc{docs.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => uploadFiles(e.target.files)}
                  />
                  <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload size={15} />
                    {uploading ? 'Subiendo...' : 'Subir archivos'}
                  </Button>
                </div>
              </div>

              {/* Zona de drop */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex-1 flex flex-col gap-3 overflow-y-auto rounded-xl border-2 border-dashed p-4 transition-colors ${dragOver ? 'border-[#9B2828] bg-[#F5EEEE]' : 'border-gray-200 bg-white'}`}
              >
                {dragOver && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#F5EEEE]/80 rounded-xl z-10 pointer-events-none">
                    <p className="text-[#6B1A1A] font-semibold text-lg">Soltá para subir</p>
                  </div>
                )}

                {docs.length === 0 && !dragOver && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-12">
                    <Upload size={36} className="text-gray-200" />
                    <p className="text-gray-400 font-medium">Sin documentos</p>
                    <p className="text-xs text-gray-400">Hacé clic en "Subir archivos" o arrastrá archivos PDF, JPG o PNG aquí</p>
                  </div>
                )}

                {/* Grid de documentos */}
                {docs.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {docs.map(doc => (
                      <div key={doc.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                        {/* Thumbnail */}
                        <div className="h-28 bg-gray-50 flex items-center justify-center relative overflow-hidden">
                          {isImage(doc) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/documentos/file/${doc.id}`}
                              alt={doc.nombre_original}
                              className="w-full h-full object-cover"
                            />
                          ) : isPdf(doc) ? (
                            <div className="flex flex-col items-center gap-1">
                              <FileText size={32} className="text-red-400" />
                              <span className="text-xs font-bold text-red-500 uppercase">PDF</span>
                            </div>
                          ) : (
                            <FileText size={32} className="text-gray-300" />
                          )}
                          {/* Overlay acciones */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => setPreview(doc)}
                              className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                              title="Ver"
                            >
                              <Eye size={15} />
                            </button>
                            <a
                              href={`/api/documentos/file/${doc.id}`}
                              download={doc.nombre_original}
                              className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100"
                              title="Descargar"
                            >
                              <Download size={15} />
                            </a>
                            <button
                              onClick={() => deleteDoc(doc.id)}
                              className="p-2 bg-white rounded-lg text-red-500 hover:bg-[#F5EEEE]"
                              title="Eliminar"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        {/* Info */}
                        <div className="p-2">
                          <p className="text-xs font-medium text-gray-800 truncate" title={doc.nombre_original}>{doc.nombre_original}</p>
                          <p className="text-xs text-gray-400">{fmtSize(doc.tamanio)}</p>
                          <p className="text-xs text-gray-400">{fmtDate(doc.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de preview */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-4xl max-h-full w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10"
            >
              <X size={24} />
            </button>
            <p className="text-white text-sm mb-3 text-center">{preview.nombre_original}</p>
            {isImage(preview) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/documentos/file/${preview.id}`}
                alt={preview.nombre_original}
                className="max-w-full max-h-[80vh] object-contain mx-auto rounded-lg"
              />
            ) : isPdf(preview) ? (
              <iframe
                src={`/api/documentos/file/${preview.id}`}
                className="w-full h-[80vh] rounded-lg"
                title={preview.nombre_original}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
