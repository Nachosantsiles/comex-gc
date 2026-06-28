"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, AccionPlan, uid } from "@/lib/abastecimiento-store";
import FormField, { Input, Select, Textarea } from "@/components/abastecimiento/FormField";
import { Plus, Trash2, Pencil } from "lucide-react";

const empty = (): AccionPlan => ({
  id: uid(),
  descripcion: "",
  prioridad: "Media",
  responsable: "",
  fechaCompromiso: "",
  estado: "Pendiente",
  avance: 0,
});

export default function PlanPage() {
  const [items, setItems] = useState<AccionPlan[]>([]);
  const [form, setForm] = useState<AccionPlan>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { setItems(loadData().acciones); }, []);

  const persist = (next: AccionPlan[]) => {
    const d = loadData(); d.acciones = next; saveData(d); setItems(next);
  };

  const handleSave = () => {
    if (!form.descripcion) return;
    persist(editing ? items.map(i => i.id === editing ? form : i) : [...items, form]);
    setForm(empty()); setEditing(null); setShowForm(false);
  };

  const prioColor: Record<string, string> = {
    Alta: "bg-red-100 text-red-700",
    Media: "bg-yellow-100 text-yellow-700",
    Baja: "bg-green-100 text-green-700",
  };
  const estadoColor: Record<string, string> = {
    Pendiente: "text-gray-600",
    "En curso": "text-olive-600",
    Completada: "text-green-600",
    Vencida: "text-red-600",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plan de Acción</h2>
          <p className="text-sm text-gray-500 mt-0.5">{items.length} acciones cargadas</p>
        </div>
        <button onClick={() => { setForm(empty()); setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={16} /> Nueva Acción
        </button>
      </div>

      {showForm && (
        <div className="bg-olive-50/60 border border-olive-100 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-gray-800">{editing ? "Editar Acción" : "Nueva Acción"}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <FormField label="Descripción de la acción" required>
                <Textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción detallada de la acción a tomar..." />
              </FormField>
            </div>
            <FormField label="Prioridad">
              <Select value={form.prioridad} onChange={e => setForm({ ...form, prioridad: e.target.value as AccionPlan["prioridad"] })}>
                <option>Alta</option>
                <option>Media</option>
                <option>Baja</option>
              </Select>
            </FormField>
            <FormField label="Responsable">
              <Input value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre o cargo" />
            </FormField>
            <FormField label="Fecha Compromiso">
              <Input type="date" value={form.fechaCompromiso} onChange={e => setForm({ ...form, fechaCompromiso: e.target.value })} />
            </FormField>
            <FormField label="Estado">
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value as AccionPlan["estado"] })}>
                <option>Pendiente</option>
                <option>En curso</option>
                <option>Completada</option>
                <option>Vencida</option>
              </Select>
            </FormField>
            <FormField label="Avance (%)">
              <Input type="number" min={0} max={100} value={form.avance} onChange={e => setForm({ ...form, avance: Math.min(100, +e.target.value) })} />
            </FormField>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} className="px-5 py-2 bg-olive-600 hover:bg-olive-700 text-white text-sm font-semibold rounded-lg transition-colors">
              {editing ? "Guardar cambios" : "Agregar Acción"}
            </button>
            <button onClick={() => { setShowForm(false); setEditing(null); setForm(empty()); }}
              className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.id} className="bg-olive-50/60 border border-olive-100 rounded-xl p-4 flex items-start gap-4">
              <span className="w-7 h-7 rounded-full bg-olive-50 text-olive-600 font-bold text-xs flex items-center justify-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.descripcion}</p>
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prioColor[item.prioridad]}`}>{item.prioridad}</span>
                  <span className={`text-xs font-semibold ${estadoColor[item.estado]}`}>{item.estado}</span>
                  {item.responsable && <span className="text-xs text-gray-500">👤 {item.responsable}</span>}
                  {item.fechaCompromiso && <span className="text-xs text-gray-500">📅 {item.fechaCompromiso}</span>}
                </div>
                {item.avance > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-olive-500 h-1.5 rounded-full transition-all" style={{ width: `${item.avance}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{item.avance}%</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setForm(item); setEditing(item.id); setShowForm(true); }} className="text-gray-400 hover:text-olive-600 transition-colors"><Pencil size={14} /></button>
                <button onClick={() => persist(items.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-10 text-center text-gray-400">
          <p className="font-medium">Sin acciones cargadas</p>
          <p className="text-sm">Hacé clic en &ldquo;Nueva Acción&rdquo; para empezar</p>
        </div>
      )}
    </div>
  );
}
