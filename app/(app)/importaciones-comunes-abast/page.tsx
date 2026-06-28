"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, ImportacionComun, uid } from "@/lib/abastecimiento-store";
import FormField, { Input, Select, Textarea } from "@/components/abastecimiento/FormField";
import { Plus, Trash2, Pencil, X, CheckCircle2, Globe } from "lucide-react";

const ESTADOS: ImportacionComun["estado"][] = ["En tránsito", "En aduana", "Nacionalizada", "Cancelada"];

const estadoStyle: Record<string, string> = {
  "En tránsito":  "bg-olive-100 text-olive-600 border-olive-200",
  "En aduana":    "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Nacionalizada":"bg-green-100 text-green-700 border-green-200",
  "Cancelada":    "bg-red-100 text-red-700 border-red-200",
};

const empty = (): ImportacionComun => ({
  id: uid(),
  numero: "",
  proveedor: "",
  paisOrigen: "",
  descripcion: "",
  valorUSD: 0,
  cantidad: 0,
  unidad: "",
  fechaEmbarque: "",
  fechaArribo: "",
  fechaNacionalizacion: "",
  estado: "En tránsito",
  observaciones: "",
});

export default function ImportacionesComunesPage() {
  const [items, setItems]       = useState<ImportacionComun[]>([]);
  const [form, setForm]         = useState<ImportacionComun>(empty());
  const [editing, setEditing]   = useState<string | null>(null);
  const [modal, setModal]       = useState(false);
  const [saved, setSaved]       = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const d = loadData();
    setItems(d.importacionesComunes ?? []);
  }, []);

  const persist = (next: ImportacionComun[]) => {
    const d = loadData();
    d.importacionesComunes = next;
    saveData(d);
    setItems(next);
  };

  const openNew  = () => { setForm(empty()); setEditing(null); setModal(true); };
  const openEdit = (item: ImportacionComun) => { setForm({ ...item }); setEditing(item.id); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(empty()); };

  const handleSave = () => {
    if (!form.numero.trim() || !form.proveedor.trim() || !form.descripcion.trim()) return;
    persist(editing ? items.map(i => i.id === editing ? form : i) : [...items, form]);
    setSaved(true);
    setTimeout(() => { setSaved(false); closeModal(); }, 800);
  };

  const cycleEstado = (item: ImportacionComun) => {
    const idx = ESTADOS.indexOf(item.estado);
    const next = ESTADOS[(idx + 1) % ESTADOS.length];
    persist(items.map(i => i.id === item.id ? { ...i, estado: next } : i));
  };

  const totalUSD = items.reduce((s, i) => s + i.valorUSD, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Importaciones</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} {items.length === 1 ? "importación" : "importaciones"} cargadas
            {items.length > 0 && (
              <span className="ml-2 text-olive-600 font-medium">
                · Total: USD {totalUSD.toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-olive-600 hover:bg-olive-700 active:scale-95 text-white text-sm font-semibold rounded-xl shadow transition-all">
          <Plus size={18} /> Nueva Importación
        </button>
      </div>

      {/* Resumen por estado */}
      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {ESTADOS.map(e => {
            const count = items.filter(i => i.estado === e).length;
            return (
              <div key={e} className={`rounded-xl border px-4 py-3 text-center ${estadoStyle[e]}`}>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs font-semibold mt-0.5">{e}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabla */}
      {items.length > 0 ? (
        <div className="bg-olive-50/60 border border-olive-100 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-olive-100">
              <tr>
                {["N° Despacho", "Proveedor", "País", "Descripción", "Valor USD", "Arribo", "Estado", "Acciones"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 font-semibold">{item.numero}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.proveedor}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{item.paisOrigen}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate" title={item.descripcion}>{item.descripcion}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs font-medium">USD {item.valorUSD.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.fechaArribo || "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => cycleEstado(item)}
                      title="Clic para cambiar estado"
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all hover:opacity-80 active:scale-95 cursor-pointer ${estadoStyle[item.estado]}`}>
                      {item.estado}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <button onClick={() => openEdit(item)} title="Editar"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-olive-600 hover:bg-olive-50 transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(item.id)} title="Eliminar"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-olive-50/40 border-2 border-dashed border-olive-200 rounded-2xl p-14 text-center">
          <div className="w-16 h-16 bg-olive-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe size={28} className="text-olive-400" />
          </div>
          <p className="font-semibold text-gray-700 text-base">Sin importaciones cargadas</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">Registrá las importaciones del período</p>
          <button onClick={openNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-olive-600 hover:bg-olive-700 active:scale-95 text-white text-sm font-semibold rounded-xl shadow transition-all">
            <Plus size={16} /> Cargar primera importación
          </button>
        </div>
      )}

      {/* Modal carga / edición */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900 text-base">
                {editing ? "Editar Importación" : "Nueva Importación"}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="N° Despacho / Factura" required>
                  <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })}
                    placeholder="IMP-2026-001" autoFocus />
                </FormField>
                <FormField label="Estado">
                  <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as ImportacionComun["estado"] })}>
                    {ESTADOS.map(e => <option key={e}>{e}</option>)}
                  </Select>
                </FormField>
                <FormField label="Proveedor" required>
                  <Input value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })}
                    placeholder="Nombre del proveedor" />
                </FormField>
                <FormField label="País de Origen">
                  <Input value={form.paisOrigen} onChange={e => setForm({ ...form, paisOrigen: e.target.value })}
                    placeholder="España, Brasil, China..." />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Descripción de la mercadería" required>
                    <Input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      placeholder="Latas, tapas, film, etc." />
                  </FormField>
                </div>
                <FormField label="Valor USD">
                  <Input type="number" value={form.valorUSD || ""} onChange={e => setForm({ ...form, valorUSD: +e.target.value })}
                    placeholder="0" />
                </FormField>
                <FormField label="Cantidad">
                  <Input type="number" value={form.cantidad || ""} onChange={e => setForm({ ...form, cantidad: +e.target.value })}
                    placeholder="0" />
                </FormField>
                <FormField label="Unidad">
                  <Input value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}
                    placeholder="kg, unid, pallets..." />
                </FormField>
                <FormField label="Fecha Embarque">
                  <Input type="date" value={form.fechaEmbarque} onChange={e => setForm({ ...form, fechaEmbarque: e.target.value })} />
                </FormField>
                <FormField label="Fecha Arribo Estimada">
                  <Input type="date" value={form.fechaArribo} onChange={e => setForm({ ...form, fechaArribo: e.target.value })} />
                </FormField>
                <FormField label="Fecha Nacionalización">
                  <Input type="date" value={form.fechaNacionalizacion} onChange={e => setForm({ ...form, fechaNacionalizacion: e.target.value })} />
                </FormField>
              </div>

              {form.valorUSD > 0 && (
                <div className="bg-olive-50 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm text-olive-600 font-medium">Valor declarado</span>
                  <span className="text-lg font-bold text-olive-600">USD {form.valorUSD.toLocaleString()}</span>
                </div>
              )}

              <FormField label="Observaciones">
                <Textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Canal de selectividad, estado aduanero, documentación pendiente..." />
              </FormField>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl">
              <button onClick={closeModal}
                className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                disabled={!form.numero.trim() || !form.proveedor.trim() || !form.descripcion.trim()}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2
                  ${saved
                    ? "bg-green-500"
                    : "bg-olive-600 hover:bg-olive-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"}`}>
                {saved ? <><CheckCircle2 size={16} /> Guardado</> : editing ? "Guardar cambios" : "Agregar importación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación borrado */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <div>
              <p className="font-bold text-gray-900">¿Eliminar esta importación?</p>
              <p className="text-sm text-gray-500 mt-1">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={() => { persist(items.filter(i => i.id !== deleteId)); setDeleteId(null); }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
