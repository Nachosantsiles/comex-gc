"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadData, saveData, Proveedor, EmpresaOC } from "@/lib/abastecimiento-store";
import FormField, { Input, Select, Textarea } from "@/components/abastecimiento/FormField";
import { Plus, Trash2, Pencil, X, CheckCircle2, Building2, Search, Star, ChevronRight, ShieldCheck, ShieldOff } from "lucide-react";

// Insumos organizados por grupo según stock real de fábrica
const CATEGORIAS_POR_GRUPO: Record<string, string[]> = {
  "Ácidos": [
    "Ácido Acético", "Ácido Cítrico", "Ácido Clorhídrico", "Ácido Láctico",
  ],
  "Sales": [
    "Sal Gruesa a Granel", "Sal Gruesa (25kg)", "Sal Gruesa (50kg)",
    "Sal Entrefina (25kg)", "Sal Entrefina (50kg)", "Sal Fina",
  ],
  "Álcalis": [
    "Soda (NaOH)", "Bicarbonato",
  ],
  "Sulfatos / Minerales": [
    "Sulfato de Cinc", "Sulfato Ferroso", "Sulfato de Cobre", "Cloruro de Calcio",
  ],
  "Gomas / Espesantes": [
    "Xanthana Gum", "Guar Gum", "Alguinato Sódico MV40", "Alguinato Sódico LTHGS",
  ],
  "Aditivos / Conservantes": [
    "Gluconato", "Metabisulfito", "Pimentón", "Orégano", "Ají Molido", "Pimienta Negra",
  ],
  "Material Auxiliar": [
    "Bolsas", "Cajas x10", "Cajas x12", "Separadores", "Etiquetas",
    "Pallets", "Film Stretch", "Cartopallet", "Cinta Embalar",
    "Bag in Box", "Big Box (Rafia)", "Cera Resina",
  ],
  "Servicios / Otros": [
    "Logística", "Servicios", "Mantenimiento",
  ],
};

const CATEGORIAS_SUGERIDAS = Object.values(CATEGORIAS_POR_GRUPO).flat();

const empty = (): Proveedor => ({
  id: crypto.randomUUID(),
  codigo: "",
  razonSocial: "",
  empresa: "Seville Cazorla",
  tipo: "Nacional",
  categorias: [],
  pais: "Argentina",
  contacto: "",
  email: "",
  telefono: "",
  cuit: "",
  condicionPago: "",
  moneda: "ARS",
  plazoEntregaDias: 0,
  calificacion: 3,
  homologado: false,
  fechaHomologacion: "",
  vencimientoHomologacion: "",
  numeroHomologacion: "",
  activo: true,
  observaciones: "",
  cotizaciones: [],
  preciosNegociados: [],
});

function Stars({ value, onChange }: { value: number; onChange?: (v: 1|2|3|4|5) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange?.(n as 1|2|3|4|5)}
          className={`transition-colors ${n <= value ? "text-yellow-400" : "text-gray-200"} ${onChange ? "hover:text-yellow-300 cursor-pointer" : "cursor-default"}`}>
          <Star size={16} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}

function CategoriaInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);

  const add = (cat: string) => {
    const c = cat.trim();
    if (c && !value.includes(c)) onChange([...value, c]);
    setInput("");
  };

  return (
    <div className="space-y-2">
      {/* Input libre */}
      <div className="flex gap-2">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(input); } }}
          placeholder="Escribir insumo y presionar Enter..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
        <button type="button" onClick={() => add(input)}
          className="px-3 py-2 bg-olive-50 text-olive-600 rounded-lg text-sm font-medium hover:bg-olive-100 transition-colors">
          + Agregar
        </button>
      </div>

      {/* Tags seleccionados */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(c => (
            <span key={c} className="flex items-center gap-1 px-2.5 py-1 bg-olive-100 text-olive-600 text-xs font-semibold rounded-full">
              {c}
              <button type="button" onClick={() => onChange(value.filter(x => x !== c))} className="text-olive-400 hover:text-olive-600 ml-0.5 font-bold">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Sugerencias agrupadas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <p className="text-xs text-gray-400 px-3 py-2 bg-gray-50 font-medium">Insumos de fábrica — clic para agregar</p>
        {Object.entries(CATEGORIAS_POR_GRUPO).map(([grupo, items]) => (
          <div key={grupo} className="border-t border-gray-100">
            <button type="button"
              onClick={() => setGrupoAbierto(grupoAbierto === grupo ? null : grupo)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              <span>{grupo}</span>
              <span className="text-gray-400">{grupoAbierto === grupo ? "▲" : "▼"}</span>
            </button>
            {grupoAbierto === grupo && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1">
                {items.map(s => {
                  const selected = value.includes(s);
                  return (
                    <button key={s} type="button"
                      onClick={() => selected ? onChange(value.filter(x => x !== s)) : add(s)}
                      className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
                        selected
                          ? "bg-olive-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-olive-50 hover:text-olive-600"
                      }`}>
                      {selected ? "✓ " : "+ "}{s}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProveedoresPage() {
  const router = useRouter();
  const [items, setItems]         = useState<Proveedor[]>([]);
  const [form, setForm]           = useState<Proveedor>(empty());
  const [editing, setEditing]     = useState<string | null>(null);
  const [modal, setModal]         = useState(false);
  const [saved, setSaved]         = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [search, setSearch]       = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState<"Todos"|EmpresaOC>("Todos");
  const [filtroTipo, setFiltroTipo]     = useState<"Todos"|"Nacional"|"Extranjero">("Todos");
  const [filtroActivo, setFiltroActivo] = useState<"Todos"|"Activos"|"Inactivos">("Activos");
  const [filtroHomol, setFiltroHomol]   = useState<"Todos"|"Homologados"|"No homologados">("Todos");

  useEffect(() => { setItems(loadData().proveedores ?? []); }, []);

  const persist = (next: Proveedor[]) => {
    const d = loadData(); d.proveedores = next; saveData(d); setItems(next);
  };

  const openNew  = () => { setForm(empty()); setEditing(null); setModal(true); };
  const openEdit = (p: Proveedor, e: React.MouseEvent) => { e.stopPropagation(); setForm({ ...p }); setEditing(p.id); setModal(true); };
  const closeModal = () => { setModal(false); setEditing(null); setForm(empty()); };

  const handleSave = () => {
    if (!form.razonSocial.trim()) return;
    const p = form.codigo.trim() ? form : { ...form, codigo: `PROV-${String(items.length + 1).padStart(3, "0")}` };
    persist(editing ? items.map(i => i.id === editing ? p : i) : [...items, p]);
    setSaved(true);
    setTimeout(() => { setSaved(false); closeModal(); }, 800);
  };

  const toggleActivo = (p: Proveedor, e: React.MouseEvent) => {
    e.stopPropagation();
    persist(items.map(i => i.id === p.id ? { ...i, activo: !i.activo } : i));
  };

  const visible = items.filter(p => {
    const q = search.toLowerCase();
    const ms = q === "" || p.razonSocial.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.categorias.some(c => c.toLowerCase().includes(q));
    const me = filtroEmpresa === "Todos" || (p.empresa ?? "Seville Cazorla") === filtroEmpresa;
    const mt = filtroTipo === "Todos" || p.tipo === filtroTipo;
    const ma = filtroActivo === "Todos" || (filtroActivo === "Activos" ? p.activo : !p.activo);
    const mh = filtroHomol === "Todos" || (filtroHomol === "Homologados" ? p.homologado : !p.homologado);
    return ms && me && mt && ma && mh;
  });

  const T = filtroEmpresa === "Tomalar";
  const th = {
    tab:        T ? "border-red-700 text-red-800"       : "border-olive-500 text-olive-600",
    btn:        T ? "bg-red-800 hover:bg-red-900"        : "bg-olive-600 hover:bg-olive-700",
    btnText:    "text-white",
    rowHover:   T ? "hover:bg-red-50/50"                 : "hover:bg-olive-50/30",
    badge:      T ? "bg-red-100 text-red-800"            : "bg-olive-100 text-olive-700",
    ring:       T ? "focus:ring-red-400"                 : "focus:ring-olive-400",
    chipActive: T ? "bg-red-800 text-white border-red-800" : "bg-olive-600 text-white border-olive-600",
  };

  const nacionales  = items.filter(p => p.tipo === "Nacional"   && p.activo).length;
  const extranjeros = items.filter(p => p.tipo === "Extranjero" && p.activo).length;
  const homologados = items.filter(p => p.homologado && p.activo).length;
  const inactivos   = items.filter(p => !p.activo).length;

  const diasVencHomol = (p: Proveedor) => {
    if (!p.vencimientoHomologacion) return null;
    return Math.round((new Date(p.vencimientoHomologacion).getTime() - Date.now()) / 86400000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maestro de Proveedores</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.filter(p => p.activo).length} activos
            {inactivos > 0 && <span className="ml-2 text-gray-400">· {inactivos} inactivos</span>}
          </p>
        </div>
        <button onClick={openNew}
          className={`flex items-center gap-2 px-5 py-2.5 active:scale-95 text-white text-sm font-semibold rounded-xl shadow transition-all ${th.btn}`}>
          <Plus size={18} /> Nuevo Proveedor
        </button>
      </div>

      {/* Pestañas empresa */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["Todos", "Seville Cazorla", "Tomalar"] as const).map(emp => {
          const count = emp === "Todos"
            ? items.filter(p => p.activo).length
            : items.filter(p => (p.empresa ?? "Seville Cazorla") === emp && p.activo).length;
          return (
            <button key={emp} onClick={() => setFiltroEmpresa(emp)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filtroEmpresa === emp
                  ? emp === "Tomalar" ? "border-red-700 text-red-800" : "border-olive-500 text-olive-600"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {emp}
              {count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* KPIs */}
      {items.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Nacionales", value: nacionales, color: "bg-olive-50 border-olive-100 text-olive-600" },
            { label: "Extranjeros", value: extranjeros, color: "bg-olive-50 border-olive-100 text-olive-600" },
            { label: "Homologados", value: homologados, color: "bg-green-50 border-green-100 text-green-700" },
            { label: "Inactivos", value: inactivos, color: "bg-gray-50 border-gray-200 text-gray-500" },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border px-4 py-3 text-center ${k.color}`}>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs font-semibold mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, código o categoría..."
              className={`w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 ${th.ring}`} />
          </div>
          {[
            { val: filtroTipo,   set: setFiltroTipo,   opts: ["Todos","Nacional","Extranjero"] },
            { val: filtroHomol,  set: setFiltroHomol,  opts: ["Todos","Homologados","No homologados"] },
            { val: filtroActivo, set: setFiltroActivo, opts: ["Activos","Inactivos","Todos"] },
          ].map((f, i) => (
            <select key={i} value={f.val} onChange={e => f.set(e.target.value as never)}
              className={`border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${th.ring} bg-white`}>
              {f.opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
        </div>
      )}

      {/* Lista */}
      {visible.length > 0 ? (
        <div className="space-y-2">
          {visible.map(p => {
            const dv = diasVencHomol(p);
            const homolVencido = dv !== null && dv < 0;
            const homolPorVencer = dv !== null && dv >= 0 && dv < 60;
            return (
              <div key={p.id} onClick={() => router.push(`/proveedores/${p.id}`)}
                className={`border rounded-xl px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-all cursor-pointer group ${T ? "bg-red-50/40 border-red-100 hover:border-red-300" : "bg-olive-50/60 border-olive-100 hover:border-olive-300"}`}>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${T ? "bg-red-100 text-red-800" : "bg-olive-50 text-olive-600"}`}>
                  {p.razonSocial.charAt(0).toUpperCase()}
                </div>

                {/* Info principal */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{p.razonSocial}</p>
                    <span className="text-xs text-gray-400 font-mono">{p.codigo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(p.empresa ?? "Seville Cazorla") === "Tomalar" ? "bg-red-100 text-red-800" : "bg-olive-100 text-olive-700"}`}>
                      {p.empresa ?? "Seville Cazorla"}
                    </span>
                    {/* Homologación */}
                    {p.homologado && !homolVencido && (
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${homolPorVencer ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                        <ShieldCheck size={11} />
                        {homolPorVencer ? `Vence en ${dv}d` : "Homologado"}
                      </span>
                    )}
                    {p.homologado && homolVencido && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                        <ShieldOff size={11} /> Homol. vencida
                      </span>
                    )}
                    {!p.homologado && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">No homologado</span>
                    )}
                  </div>
                  {/* Categorías */}
                  {p.categorias.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {p.categorias.slice(0, 4).map(c => (
                        <span key={c} className={`px-2 py-0.5 text-xs rounded-full ${T ? "bg-red-50 text-red-700" : "bg-olive-50 text-olive-600"}`}>{c}</span>
                      ))}
                      {p.categorias.length > 4 && <span className="text-xs text-gray-400">+{p.categorias.length - 4}</span>}
                    </div>
                  )}
                </div>

                {/* Cotizaciones y precios */}
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-gray-400">
                    {p.cotizaciones.length} cotiz. · {p.preciosNegociados.length} precios neg.
                  </p>
                  <Stars value={p.calificacion} />
                </div>

                {/* Tipo */}
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${p.tipo === "Nacional" ? "bg-olive-50 text-olive-600" : "bg-olive-50 text-olive-600"}`}>
                  {p.tipo}
                </span>

                {/* Estado */}
                <button onClick={e => toggleActivo(p, e)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 transition-all hover:opacity-80 ${p.activo ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                  {p.activo ? "Activo" : "Inactivo"}
                </button>

                {/* Acciones */}
                <div className="flex gap-1 shrink-0">
                  <button onClick={e => openEdit(p, e)} title="Editar datos"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-olive-600 hover:bg-olive-50 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteId(p.id); }} title="Eliminar"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-olive-400 transition-colors ml-1 self-center" />
                </div>
              </div>
            );
          })}
          {visible.length < items.length && (
            <p className="text-xs text-gray-400 text-center py-1">Mostrando {visible.length} de {items.length}</p>
          )}
        </div>
      ) : items.length === 0 ? (
        <div className={`${T ? "bg-red-50/40 border-red-200" : "bg-olive-50/40 border-olive-200"} border-2 border-dashed rounded-2xl p-14 text-center`}>
          <div className={`w-16 h-16 ${T ? "bg-red-50" : "bg-olive-50"} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
            <Building2 size={28} className={T ? "text-red-300" : "text-olive-400"} />
          </div>
          <p className="font-semibold text-gray-700 text-base">Sin proveedores cargados</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">Cargá los proveedores para gestionar cotizaciones y precios</p>
          <button onClick={openNew}
            className={`inline-flex items-center gap-2 px-6 py-3 ${th.btn} active:scale-95 text-white text-sm font-semibold rounded-xl shadow transition-all`}>
            <Plus size={16} /> Cargar primer proveedor
          </button>
        </div>
      ) : (
        <div className="text-center py-10 text-gray-400 text-sm">Sin resultados para los filtros aplicados</div>
      )}

      {/* Modal nuevo/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <h3 className="font-bold text-gray-900 text-base">{editing ? "Editar Proveedor" : "Nuevo Proveedor"}</h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Datos básicos */}
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Razón Social" required>
                  <Input value={form.razonSocial} onChange={e => setForm({ ...form, razonSocial: e.target.value })} placeholder="Nombre o razón social" autoFocus />
                </FormField>
                <FormField label="Empresa">
                  <Select value={form.empresa ?? "Seville Cazorla"} onChange={e => setForm({ ...form, empresa: e.target.value as EmpresaOC })}>
                    <option>Seville Cazorla</option>
                    <option>Tomalar</option>
                  </Select>
                </FormField>
                <FormField label="Código (opcional)">
                  <Input value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} placeholder="Auto si se deja vacío" />
                </FormField>
                <FormField label="Tipo">
                  <Select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as Proveedor["tipo"], pais: e.target.value === "Nacional" ? "Argentina" : form.pais })}>
                    <option>Nacional</option><option>Extranjero</option>
                  </Select>
                </FormField>
                <FormField label="País">
                  <Input value={form.pais} onChange={e => setForm({ ...form, pais: e.target.value })} placeholder="Argentina, España..." />
                </FormField>
                <FormField label="CUIT / Tax ID">
                  <Input value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })} placeholder="XX-XXXXXXXX-X" />
                </FormField>
                <FormField label="Condición de Pago">
                  <Input value={form.condicionPago} onChange={e => setForm({ ...form, condicionPago: e.target.value })} placeholder="30 días, contado..." />
                </FormField>
                <FormField label="Contacto">
                  <Input value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del contacto" />
                </FormField>
                <FormField label="Email">
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contacto@proveedor.com" />
                </FormField>
                <FormField label="Teléfono">
                  <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} placeholder="+54 9 ..." />
                </FormField>
                <FormField label="Moneda habitual">
                  <Select value={form.moneda} onChange={e => setForm({ ...form, moneda: e.target.value as Proveedor["moneda"] })}>
                    <option>ARS</option><option>USD</option><option>EUR</option>
                  </Select>
                </FormField>
                <FormField label="Plazo entrega (días)">
                  <Input type="number" value={form.plazoEntregaDias || ""} onChange={e => setForm({ ...form, plazoEntregaDias: +e.target.value })} placeholder="0" />
                </FormField>
              </div>

              {/* Categorías */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Categorías / Insumos</p>
                <CategoriaInput value={form.categorias} onChange={v => setForm({ ...form, categorias: v })} />
              </div>

              {/* Homologación */}
              <div className="bg-olive-50/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Homologación</p>
                  <button type="button" onClick={() => setForm({ ...form, homologado: !form.homologado })}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.homologado ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-200 text-gray-500 border-gray-300"}`}>
                    {form.homologado ? "✓ Homologado" : "No homologado"}
                  </button>
                </div>
                {form.homologado && (
                  <div className="grid grid-cols-3 gap-3">
                    <FormField label="N° Homologación">
                      <Input value={form.numeroHomologacion} onChange={e => setForm({ ...form, numeroHomologacion: e.target.value })} placeholder="HOM-001" />
                    </FormField>
                    <FormField label="Fecha">
                      <Input type="date" value={form.fechaHomologacion} onChange={e => setForm({ ...form, fechaHomologacion: e.target.value })} />
                    </FormField>
                    <FormField label="Vencimiento">
                      <Input type="date" value={form.vencimientoHomologacion} onChange={e => setForm({ ...form, vencimientoHomologacion: e.target.value })} />
                    </FormField>
                  </div>
                )}
              </div>

              {/* Calificación + Estado */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-olive-50/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Calificación</span>
                  <Stars value={form.calificacion} onChange={v => setForm({ ...form, calificacion: v })} />
                </div>
                <div className="bg-olive-50/40 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Estado</span>
                  <button type="button" onClick={() => setForm({ ...form, activo: !form.activo })}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${form.activo ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {form.activo ? "Activo" : "Inactivo"}
                  </button>
                </div>
              </div>

              <FormField label="Observaciones">
                <Textarea value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Historial, certificaciones, notas..." />
              </FormField>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl">
              <button onClick={closeModal} className="px-5 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={!form.razonSocial.trim()}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${saved ? "bg-green-500" : "bg-olive-600 hover:bg-olive-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"}`}>
                {saved ? <><CheckCircle2 size={16} /> Guardado</> : editing ? "Guardar cambios" : "Agregar proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto"><Trash2 size={22} className="text-red-500" /></div>
            <div>
              <p className="font-bold text-gray-900">¿Eliminar este proveedor?</p>
              <p className="text-sm text-gray-500 mt-1">Se borrarán también sus cotizaciones y precios.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={() => { persist(items.filter(i => i.id !== deleteId)); setDeleteId(null); }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
