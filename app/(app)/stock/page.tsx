"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, DestinaciónIT, EmpresaOC } from "@/lib/abastecimiento-store";
import { X, CheckCircle2, PackagePlus } from "lucide-react";
import { PageHeader, PrimaryBtn } from "@/components/abastecimiento/PageHeader";

function emptyStock(): Omit<DestinaciónIT, "id"> {
  return {
    numero: "",
    descripcion: "",
    empresa: "Seville Cazorla",
    regimen: "IT",
    categoria: "MATERIAL AUXILIAR",
    codigoProducto: "",
    proveedor: "",
    precioUnitarioUSD: 0,
    valorUSD: 0,
    fechaAltaARCA: "",
    fechaVtoOriginal: "",
    fechaVtoProrroga: "",
    fechaVencimiento: "",
    stockDocumental: 0,
    stockFisico: 0,
    enProduccion: 0,
    desperdicios: 0,
    ptSeville: 0,
    ptTomalar: 0,
    unidad: "UNID",
    estado: "",
    observaciones: "",
  };
}

const CATEGORIAS = ["BOLSAS", "ETIQUETAS", "CAJAS METÁLICAS", "INSUMOS QUÍMICOS", "MATERIAL AUXILIAR"] as const;

const CATEGORIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "BOLSAS":           { bg: "bg-olive-100",  text: "text-olive-800",  border: "border-olive-300" },
  "ETIQUETAS":        { bg: "bg-amber-100",   text: "text-amber-800",  border: "border-amber-300" },
  "CAJAS METÁLICAS":  { bg: "bg-blue-100",    text: "text-blue-800",   border: "border-blue-300" },
  "INSUMOS QUÍMICOS": { bg: "bg-purple-100",  text: "text-purple-800", border: "border-purple-300" },
  "MATERIAL AUXILIAR":{ bg: "bg-gray-100",    text: "text-gray-800",   border: "border-gray-300" },
};

function fmt(n: number, dec = 0) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function diffColor(diff: number) {
  if (diff === 0) return "text-gray-400";
  if (diff < 0) return "text-red-600 font-semibold";
  return "text-amber-600 font-semibold";
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    "Prórroga otorgada":    "bg-green-100 text-green-700",
    "Prórroga solicitada":  "bg-yellow-100 text-yellow-700",
    "Próxima a vencer":     "bg-orange-100 text-orange-700",
    "Solicitar Baja":       "bg-red-100 text-red-700",
    "Con solicitud de baja":"bg-red-100 text-red-700",
    "Sin info":             "bg-gray-100 text-gray-500",
  };
  if (!estado) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${map[estado] ?? "bg-gray-100 text-gray-600"}`}>
      {estado}
    </span>
  );
}

export default function StockPage() {
  const [items, setItems] = useState<DestinaciónIT[]>([]);
  const [empresa, setEmpresa] = useState<"Todos" | EmpresaOC>("Todos");
  const [regimen, setRegimen] = useState<"Todos" | "IT" | "IC" | "Nacional">("Todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState<Partial<DestinaciónIT>>({});
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(CATEGORIAS));
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState<Omit<DestinaciónIT, "id">>(emptyStock());
  const [newSaved, setNewSaved] = useState(false);

  useEffect(() => { setItems(loadData().destinaciones); }, []);

  function toggleCat(cat: string) {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  function startEdit(item: DestinaciónIT) {
    setEditingId(item.id);
    setEditVal({ stockFisico: item.stockFisico, enProduccion: item.enProduccion, desperdicios: item.desperdicios, ptSeville: item.ptSeville, ptTomalar: item.ptTomalar, empresa: item.empresa ?? "Seville Cazorla" });
  }

  function saveEdit(item: DestinaciónIT) {
    const data = loadData();
    data.destinaciones = data.destinaciones.map(d =>
      d.id === item.id ? { ...d, ...editVal } : d
    );
    saveData(data);
    setItems(data.destinaciones);
    setEditingId(null);
  }

  const itemsFiltrados = items.filter(i => {
    const me = empresa === "Todos" || (i.empresa ?? "Seville Cazorla") === empresa;
    const mr = regimen === "Todos" || (i.regimen ?? "IT") === regimen;
    return me && mr;
  });
  const withCat = itemsFiltrados.filter(i => i.categoria);
  const sinCat  = itemsFiltrados.filter(i => !i.categoria);

  const totalDoc = withCat.reduce((a, i) => a + i.stockDocumental, 0);
  const totalFis = withCat.reduce((a, i) => a + i.stockFisico, 0);
  const totalDiff = totalFis - totalDoc;

  const T = empresa === "Tomalar";
  const th = {
    btn:        T ? "bg-red-800 hover:bg-red-900 text-white"  : "bg-olive-600 hover:bg-olive-700 text-white",
    filterBg:   T ? "border-red-200 bg-red-50/40"             : "border-gray-200 bg-white",
    chipActive: T ? "bg-red-800 text-white border-red-800"    : "bg-olive-600 text-white border-olive-600",
    regimenIT:  T ? "bg-red-700 text-white border-red-700"    : "bg-olive-600 text-white border-olive-600",
    light:      T ? "bg-red-50"                               : "bg-olive-50",
    lightText:  T ? "text-red-800"                            : "text-olive-600",
    lightBorder:T ? "border-red-200"                          : "border-olive-200",
    rowEdit:    T ? "bg-red-50"                               : "bg-olive-50",
    rowHover:   T ? "hover:bg-red-50/60"                      : "hover:bg-gray-50",
    inputBorder:T ? "border-red-300 focus:ring-red-400"       : "border-olive-300 focus:ring-olive-400",
    editBtn:    T ? "text-red-700 border-red-200 hover:bg-red-50" : "text-olive-700 border-olive-200 hover:bg-olive-50",
    saveBtn:    T ? "bg-red-800 hover:bg-red-900"             : "bg-olive-600 hover:bg-olive-700",
    badgeIT:    T ? "bg-red-100 text-red-700"                 : "bg-olive-100 text-olive-600",
    kpiAccent:  T ? "text-red-800"                            : "text-gray-900",
    sectionBorder: T ? "border-red-100"                       : "border-gray-200",
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Filtros */}
      <div className={`border rounded-xl px-5 py-4 space-y-3 transition-colors duration-300 ${th.filterBg}`}>
        {/* Empresa */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Empresa</span>
          <div className="flex gap-2 flex-wrap">
            {(["Todos", "Seville Cazorla", "Tomalar"] as const).map(emp => {
              const count = emp === "Todos" ? items.length : items.filter(i => (i.empresa ?? "Seville Cazorla") === emp).length;
              const active = empresa === emp;
              return (
                <button key={emp} onClick={() => setEmpresa(emp)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? emp === "Tomalar" ? "bg-red-800 text-white border-red-800" : "bg-olive-600 text-white border-olive-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}>
                  {emp}
                  {count > 0 && <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "text-gray-400"}`}>({count})</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Régimen */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-16 shrink-0">Régimen</span>
          <div className="flex gap-2 flex-wrap">
            {([
              { val: "Todos",    label: "Todos",               activeClass: "bg-gray-700 text-white border-gray-700" },
              { val: "IT",       label: "🛃 IT",               activeClass: th.regimenIT },
              { val: "IC",       label: "📦 Importación (IC)", activeClass: "bg-blue-600 text-white border-blue-600" },
              { val: "Nacional", label: "🏭 Nacional",         activeClass: "bg-gray-500 text-white border-gray-500" },
            ] as const).map(({ val, label, activeClass }) => {
              const count = val === "Todos" ? items.length : items.filter(i => (i.regimen ?? "IT") === val).length;
              const active = regimen === val;
              return (
                <button key={val} onClick={() => setRegimen(val)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    active ? activeClass : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}>
                  {label}
                  {count > 0 && <span className={`ml-1.5 text-xs ${active ? "opacity-80" : "text-gray-400"}`}>({count})</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <PageHeader
        title="Stock por Categoría"
        subtitle="Comparativo documental vs físico. Editá el stock físico, en producción y consumos."
        actions={
          <PrimaryBtn onClick={() => { setNewForm(emptyStock()); setNewModal(true); }} icon={PackagePlus}>
            Nuevo Item
          </PrimaryBtn>
        }
      />

      {/* Resumen global */}
      <div className="flex gap-3">
        {[
          { label: "Destinaciones", val: itemsFiltrados.length.toString() },
          ...(regimen !== "IC" && regimen !== "Nacional" ? [{ label: "Total documental", val: fmt(totalDoc) }] : []),
          { label: "Total físico", val: fmt(totalFis) },
          ...(regimen !== "IC" && regimen !== "Nacional" ? [{ label: "Diferencia", val: (totalDiff >= 0 ? "+" : "") + fmt(totalDiff), red: totalDiff < 0 }] : []),
        ].map(s => (
          <div key={s.label} className="bg-white border border-stone-200 rounded-xl px-4 py-3 text-center min-w-[110px]">
            <div className={`text-lg font-bold ${s.red ? "text-red-600" : "text-stone-900"}`}>{s.val}</div>
            <div className="text-xs text-stone-500 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Por categoría */}
      {CATEGORIAS.map(cat => {
        const grupo = itemsFiltrados.filter(i => i.categoria === cat);
        if (grupo.length === 0) return null;
        const colors = CATEGORIA_COLORS[cat] ?? CATEGORIA_COLORS["MATERIAL AUXILIAR"];
        const open = openCats.has(cat);
        const gDoc  = grupo.reduce((a, i) => a + i.stockDocumental, 0);
        const gFis  = grupo.reduce((a, i) => a + i.stockFisico, 0);
        const gDiff = gFis - gDoc;

        return (
          <div key={cat} className={`bg-white border rounded-xl overflow-hidden transition-colors ${th.sectionBorder}`}>
            {/* Cabecera categoría */}
            <button
              onClick={() => toggleCat(cat)}
              className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${th.rowHover}`}
            >
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                  {cat}
                </span>
                <span className="text-sm text-gray-500">{grupo.length} destinación{grupo.length !== 1 ? "es" : ""}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                {regimen !== "IC" && regimen !== "Nacional" && <span className="text-gray-600">Doc: <strong>{fmt(gDoc)}</strong></span>}
                <span className="text-gray-600">Fís: <strong>{fmt(gFis)}</strong></span>
                {regimen !== "IC" && regimen !== "Nacional" && <span className={`${diffColor(gDiff)}`}>Δ {gDiff >= 0 ? "+" : ""}{fmt(gDiff)}</span>}
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Tabla */}
            {open && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["N° Dest.", "Descripción / Cód.", "Und.", ...(regimen !== "IC" && regimen !== "Nacional" ? ["Documental"] : []), "Físico", "En Prod.", "Desperdicios", "PT Seville", "PT Tomalar", "Empresa", ...(regimen !== "IC" && regimen !== "Nacional" ? ["Diferencia"] : []), "Estado", ""].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {grupo.map(item => {
                      const diff = item.stockFisico - item.stockDocumental;
                      const editing = editingId === item.id;
                      return (
                        <tr key={item.id} className={`transition-colors ${editing ? th.rowEdit : th.rowHover}`}>
                          <td className="px-3 py-2.5 font-mono text-xs text-gray-500 whitespace-nowrap">{item.numero}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 leading-tight">{item.descripcion}</span>
                              {item.regimen && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  item.regimen === "IT" ? th.badgeIT :
                                  item.regimen === "IC" ? "bg-blue-100 text-blue-600" :
                                  "bg-gray-100 text-gray-500"
                                }`}>{item.regimen}</span>
                              )}
                            </div>
                            {item.codigoProducto && <div className="text-xs text-gray-400">Cód: {item.codigoProducto}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{item.unidad}</td>
                          {regimen !== "IC" && regimen !== "Nacional" && (
                            <td className="px-3 py-2.5 text-gray-700 tabular-nums">
                              {(item.regimen ?? "IT") === "IT" ? fmt(item.stockDocumental) : <span className="text-gray-300 text-xs">N/A</span>}
                            </td>
                          )}

                          {/* Campos editables */}
                          {editing ? (
                            <>
                              {(["stockFisico","enProduccion","desperdicios","ptSeville","ptTomalar"] as const).map(field => (
                                <td key={field} className="px-1 py-1">
                                  <input
                                    type="number"
                                    className={`w-20 border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 ${th.inputBorder}`}
                                    value={(editVal[field] as number) ?? 0}
                                    onChange={e => setEditVal(v => ({ ...v, [field]: Number(e.target.value) }))}
                                  />
                                </td>
                              ))}
                              <td className="px-1 py-1" colSpan={2}>
                                <select
                                  value={(editVal.empresa as string) ?? "Seville Cazorla"}
                                  onChange={e => setEditVal(v => ({ ...v, empresa: e.target.value as EmpresaOC }))}
                                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-olive-400"
                                >
                                  <option value="Seville Cazorla">Seville Cazorla</option>
                                  <option value="Tomalar">Tomalar</option>
                                </select>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2.5 text-gray-700 tabular-nums">{fmt(item.stockFisico)}</td>
                              <td className="px-3 py-2.5 text-gray-500 tabular-nums">{fmt(item.enProduccion ?? 0)}</td>
                              <td className="px-3 py-2.5 text-gray-500 tabular-nums">{fmt(item.desperdicios ?? 0)}</td>
                              <td className="px-3 py-2.5 text-gray-500 tabular-nums">{fmt(item.ptSeville ?? 0)}</td>
                              <td className="px-3 py-2.5 text-gray-500 tabular-nums">{fmt(item.ptTomalar ?? 0)}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${(item.empresa ?? "Seville Cazorla") === "Tomalar" ? "bg-red-100 text-red-700" : "bg-olive-100 text-olive-700"}`}>
                                  {(item.empresa ?? "Seville Cazorla") === "Tomalar" ? "TOM" : "SC"}
                                </span>
                              </td>
                            </>
                          )}

                          {regimen !== "IC" && regimen !== "Nacional" && (
                            <td className={`px-3 py-2.5 tabular-nums ${(item.regimen ?? "IT") === "IT" ? diffColor(diff) : "text-gray-300"}`}>
                              {(item.regimen ?? "IT") === "IT" ? <>{diff >= 0 ? "+" : ""}{fmt(diff)}</> : <span className="text-xs">N/A</span>}
                            </td>
                          )}
                          <td className="px-3 py-2.5">
                            <EstadoBadge estado={item.estado ?? ""} />
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {editing ? (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveEdit(item)}
                                  className={`px-2 py-1 text-xs font-semibold rounded text-white ${th.saveBtn}`}
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-600 hover:bg-gray-300"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(item)}
                                className={`px-2 py-1 text-xs font-semibold rounded border ${th.editBtn}`}
                              >
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totales del grupo */}
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Total {cat}</td>
                      {regimen !== "IC" && regimen !== "Nacional" && <td className="px-3 py-2 font-bold text-gray-700 tabular-nums">{fmt(gDoc)}</td>}
                      <td className="px-3 py-2 font-bold text-gray-700 tabular-nums">{fmt(gFis)}</td>
                      <td className="px-3 py-2 text-gray-500 tabular-nums">{fmt(grupo.reduce((a,i) => a + (i.enProduccion ?? 0), 0))}</td>
                      <td className="px-3 py-2 text-gray-500 tabular-nums">{fmt(grupo.reduce((a,i) => a + (i.desperdicios ?? 0), 0))}</td>
                      <td className="px-3 py-2 text-gray-500 tabular-nums">{fmt(grupo.reduce((a,i) => a + (i.ptSeville ?? 0), 0))}</td>
                      <td className="px-3 py-2 text-gray-500 tabular-nums">{fmt(grupo.reduce((a,i) => a + (i.ptTomalar ?? 0), 0))}</td>
                      <td />
                      {regimen !== "IC" && regimen !== "Nacional" && <td className={`px-3 py-2 font-bold tabular-nums ${diffColor(gDiff)}`}>{gDiff >= 0 ? "+" : ""}{fmt(gDiff)}</td>}
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Destinaciones sin categoría */}
      {sinCat.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 text-sm font-semibold text-gray-500 border-b border-gray-100">
            Sin categoría asignada ({sinCat.length})
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-50">
              {sinCat.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{item.numero}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{item.descripcion}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.unidad}</td>
                  <td className="px-3 py-2.5 text-gray-500">{fmt(item.stockDocumental)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo item de stock */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-xl bg-white flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Nuevo Item de Stock</h3>
                <p className="text-xs text-gray-400 mt-0.5">Completá los datos del nuevo ítem</p>
              </div>
              <button onClick={() => setNewModal(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Empresa */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Empresa</p>
                <div className="flex gap-2">
                  {(["Seville Cazorla", "Tomalar"] as const).map(emp => (
                    <button key={emp} type="button"
                      onClick={() => setNewForm({ ...newForm, empresa: emp })}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        newForm.empresa === emp
                          ? emp === "Seville Cazorla" ? "border-olive-500 bg-olive-50 text-olive-700" : "border-red-700 bg-red-50 text-red-800"
                          : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      }`}>
                      {emp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Régimen */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Régimen</p>
                <div className="flex gap-2">
                  {([
                    { val: "IT",       label: "🛃 Importación Temporal", cls: "border-olive-500 bg-olive-50 text-olive-700" },
                    { val: "IC",       label: "📦 Importación (IC)",      cls: "border-blue-500 bg-blue-50 text-blue-700" },
                    { val: "Nacional", label: "🏭 Nacional",              cls: "border-gray-400 bg-gray-100 text-gray-700" },
                  ] as const).map(({ val, label, cls }) => (
                    <button key={val} type="button"
                      onClick={() => setNewForm({ ...newForm, regimen: val })}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        newForm.regimen === val ? cls : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción y Número */}
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
                  <input value={newForm.descripcion}
                    onChange={e => setNewForm({ ...newForm, descripcion: e.target.value })}
                    placeholder="Ej: Bolsa polietileno 200g"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">N° Destinación</label>
                  <input value={newForm.numero}
                    onChange={e => setNewForm({ ...newForm, numero: e.target.value })}
                    placeholder="26001IT..."
                    style={{ width: 140 }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                </div>
              </div>

              {/* Categoría y Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                  <select value={newForm.categoria}
                    onChange={e => setNewForm({ ...newForm, categoria: e.target.value })}
                    className="w-full h-[38px] border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-olive-400">
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unidad</label>
                  <select value={newForm.unidad}
                    onChange={e => setNewForm({ ...newForm, unidad: e.target.value })}
                    className="w-full h-[38px] border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-olive-400">
                    {["UNID","KG","LTS","BULTOS","TN"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Código y Proveedor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Código producto</label>
                  <input value={newForm.codigoProducto}
                    onChange={e => setNewForm({ ...newForm, codigoProducto: e.target.value })}
                    placeholder="67450"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                  <input value={newForm.proveedor}
                    onChange={e => setNewForm({ ...newForm, proveedor: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                </div>
              </div>

              {/* Stock inicial */}
              <div>
                <p className="text-xs text-olive-600 font-semibold uppercase tracking-wide bg-olive-50 px-3 py-2 rounded-lg mb-3">
                  📦 Stock inicial
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Stock documental</label>
                    <input type="number" min={0} value={newForm.stockDocumental}
                      onChange={e => setNewForm({ ...newForm, stockDocumental: +e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Stock físico</label>
                    <input type="number" min={0} value={newForm.stockFisico}
                      onChange={e => setNewForm({ ...newForm, stockFisico: +e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha alta ARCA</label>
                  <input type="date" value={newForm.fechaAltaARCA}
                    onChange={e => setNewForm({ ...newForm, fechaAltaARCA: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha vencimiento</label>
                  <input type="date" value={newForm.fechaVencimiento}
                    onChange={e => setNewForm({ ...newForm, fechaVencimiento: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                <textarea value={newForm.observaciones} rows={2}
                  onChange={e => setNewForm({ ...newForm, observaciones: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl flex-shrink-0">
              <button onClick={() => setNewModal(false)}
                className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button
                disabled={!newForm.descripcion.trim()}
                onClick={() => {
                  if (!newForm.descripcion.trim()) return;
                  const nuevo: DestinaciónIT = { ...newForm, id: `dest-${Date.now()}` };
                  const data = loadData();
                  data.destinaciones = [...data.destinaciones, nuevo];
                  saveData(data);
                  setItems(data.destinaciones);
                  setNewSaved(true);
                  setTimeout(() => { setNewSaved(false); setNewModal(false); }, 900);
                }}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${newSaved ? "bg-green-500" : `${th.saveBtn} active:scale-95`}`}>
                {newSaved ? <><CheckCircle2 size={16} /> Guardado</> : <><PackagePlus size={16} /> Crear Item</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
