"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, DestinaciónIT, uid } from "@/lib/abastecimiento-store";
import FormField, { Input, Textarea } from "@/components/abastecimiento/FormField";
import { Plus, Trash2, Pencil } from "lucide-react";

const empty = (): DestinaciónIT => ({
  id: uid(),
  numero: "",
  descripcion: "",
  categoria: "",
  codigoProducto: "",
  proveedor: "",
  precioUnitarioUSD: 0,
  valorUSD: 0,
  fechaAltaARCA: new Date().toISOString().slice(0, 10),
  fechaVtoOriginal: "",
  fechaVtoProrroga: "",
  fechaVencimiento: "",
  stockDocumental: 0,
  stockFisico: 0,
  enProduccion: 0,
  desperdicios: 0,
  ptSeville: 0,
  ptTomalar: 0,
  unidad: "",
  estado: "",
  observaciones: "",
});

function dias(fecha: string) {
  return Math.round((new Date(fecha).getTime() - Date.now()) / 86400000);
}

function badge(d: number) {
  if (d < 90) return "bg-red-100 text-red-700";
  if (d < 180) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}
function label(d: number) {
  if (d < 90) return "CRÍTICO";
  if (d < 180) return "ATENCIÓN";
  return "CONTROLADO";
}

export default function ImportacionesPage() {
  const [items, setItems] = useState<DestinaciónIT[]>([]);
  const [form, setForm] = useState<DestinaciónIT>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setItems(loadData().destinaciones); }, []);

  const persist = (next: DestinaciónIT[]) => {
    const d = loadData(); d.destinaciones = next; saveData(d); setItems(next);
  };

  const handleSave = () => {
    if (!form.numero || !form.descripcion) return;
    persist(editing ? items.map(i => i.id === editing ? form : i) : [...items, form]);
    setForm(empty()); setEditing(null); setShowForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Importaciones Temporales</h2>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} destinaciones cargadas</p>
        </div>
        <button onClick={() => { setForm(empty()); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={16} /> Nueva Destinación
        </button>
      </div>

      {showForm && (
        <div className="bg-olive-50/60 border border-olive-100 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">{editing ? "Editar Destinación" : "Nueva Destinación IT"}</h3>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="N° Destinación" required>
              <Input value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} placeholder="IT-2025-001" />
            </FormField>
            <FormField label="Descripción" required>
              <Input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Latas hojalata, tapas..." />
            </FormField>
            <FormField label="Valor USD">
              <Input type="number" value={form.valorUSD} onChange={e => setForm({ ...form, valorUSD: +e.target.value })} />
            </FormField>
            <FormField label="Fecha Alta ARCA">
              <Input type="date" value={form.fechaAltaARCA} onChange={e => setForm({ ...form, fechaAltaARCA: e.target.value })} />
            </FormField>
            <FormField label="Fecha Vencimiento">
              <Input type="date" value={form.fechaVencimiento} onChange={e => setForm({ ...form, fechaVencimiento: e.target.value })} />
            </FormField>
            <FormField label="Stock Documental">
              <Input type="number" value={form.stockDocumental} onChange={e => setForm({ ...form, stockDocumental: +e.target.value })} />
            </FormField>
            <FormField label="Stock Físico">
              <Input type="number" value={form.stockFisico} onChange={e => setForm({ ...form, stockFisico: +e.target.value })} />
            </FormField>
            <FormField label="Unidad">
              <Input value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })} placeholder="kg, unid, m..." />
            </FormField>
            <div className="col-span-3">
              <FormField label="Observaciones">
                <Input value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Observaciones adicionales" />
              </FormField>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="px-5 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-lg transition-colors">
              {editing ? "Guardar cambios" : "Agregar Destinación"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(empty()); }}
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-olive-50/60 border border-olive-100 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-olive-100">
              <tr>
                {["N° Dest.", "Descripción", "Proveedor", "P. Unit. USD", "Valor Total USD", "Vencimiento", "Días Rest.", "Riesgo", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map(item => {
                const d = item.fechaVencimiento ? dias(item.fechaVencimiento) : 9999;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.numero}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.descripcion}</td>
                    <td className="px-4 py-3 text-gray-600">{item.proveedor || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.precioUnitarioUSD > 0 ? `USD ${item.precioUnitarioUSD.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.valorUSD > 0 ? `USD ${item.valorUSD.toLocaleString()}` : "—"}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{item.fechaVencimiento}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{item.fechaVencimiento ? d : "—"}</td>
                    <td className="px-4 py-3">
                      {item.fechaVencimiento && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${badge(d)}`}>{label(d)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setForm(item); setEditing(item.id); setShowForm(true); }} className="text-gray-400 hover:text-olive-600 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => persist(items.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          <p className="font-medium">Sin destinaciones IT cargadas</p>
          <p className="text-sm">Hacé clic en &ldquo;Nueva Destinación&rdquo; para empezar</p>
        </div>
      )}
    </div>
  );
}
