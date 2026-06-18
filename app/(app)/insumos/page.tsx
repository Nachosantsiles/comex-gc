"use client";
import { useEffect, useState } from "react";
import { loadData, saveData, InsumoStock, EmpresaOC } from "@/lib/abastecimiento-store";
import FormField, { Input, Textarea } from "@/components/abastecimiento/FormField";
import { X, CheckCircle2, History, AlertTriangle, ChevronDown, ChevronUp, Plus, Filter, FileSpreadsheet, PackagePlus } from "lucide-react";
import { PageHeader, PrimaryBtn, SecondaryBtn } from "@/components/abastecimiento/PageHeader";
import ExportModal, { type ExportOpts } from "@/components/abastecimiento/ExportModal";

type TabView = "todos" | "Nacional" | "IT" | "IC" | "Muestra";
type Columna = "stock" | "moa";
type Categoria = "todos" | "quimicos" | "auxiliar";

const GRUPOS_ALL = [
  "Ácidos", "Gomas / Espesantes", "Álcalis", "Sales",
  "Sulfatos / Minerales", "Aditivos / Conservantes",
  "Embalaje", "Limpieza", "Laboratorio", "Otros",
];

function emptyInsumo(): Omit<InsumoStock, "id"> {
  return {
    codigo: "",
    descripcion: "",
    empresa: "Seville Cazorla",
    unidad: "KG",
    factorKg: 1,
    tipo: "Nacional",
    grupo: "Otros",
    stockFisico: 0,
    fechaConteo: new Date().toISOString().slice(0, 10),
    enProduccion: 0,
    productoTerminado: 0,
    deposito: 0,
    saldoMOA: 0,
    unidadMOA: "KG",
    fechaMOA: "",
    historial: [],
    observaciones: "",
  };
}

const GRUPOS_QUIMICOS = new Set([
  "Ácidos", "Gomas / Espesantes", "Álcalis", "Sales",
  "Sulfatos / Minerales", "Aditivos / Conservantes",
]);
const categoriaDeGrupo = (g: string): "quimicos" | "auxiliar" =>
  GRUPOS_QUIMICOS.has(g) ? "quimicos" : "auxiliar";

function diffColor(diff: number): string {
  if (diff === 0) return "text-gray-400";
  if (diff > 0) return "text-green-600";
  return "text-red-600";
}

function diffBadge(diff: number): string {
  if (diff === 0) return "bg-gray-100 text-gray-500";
  if (diff > 0) return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-600";
}

export default function InsumosPage() {
  const [items, setItems]           = useState<InsumoStock[]>([]);
  const [modal, setModal]           = useState<InsumoStock | null>(null);
  const [form, setForm]             = useState<Partial<InsumoStock>>({});
  const [historialId, setHistorialId] = useState<string | null>(null);
  const [tab, setTab]               = useState<TabView>("todos");
  const [empresa, setEmpresa]       = useState<"Todos" | EmpresaOC>("Todos");
  const [categoria, setCategoria]   = useState<Categoria>("todos");
  const [grupo, setGrupo]           = useState("Todos");
  const [saved, setSaved]           = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState<Omit<InsumoStock, "id">>(emptyInsumo());
  const [newSaved, setNewSaved] = useState(false);

  useEffect(() => { setItems(loadData().insumosStock ?? []); }, []);

  const persist = (next: InsumoStock[]) => {
    const d = loadData(); d.insumosStock = next; saveData(d); setItems(next);
  };

  const openModal = (item: InsumoStock) => {
    setForm({
      tipo:              item.tipo,
      stockFisico:       item.stockFisico,
      enProduccion:      item.enProduccion,
      productoTerminado: item.productoTerminado,
      deposito:          item.deposito,
      saldoMOA:          item.saldoMOA,
      fechaMOA:          item.fechaMOA,
      fechaConteo:       new Date().toISOString().slice(0, 10),
      observaciones:     "",
    });
    setModal(item);
  };

  const handleSave = () => {
    if (!modal) return;
    const stockFisico = (form.enProduccion ?? 0) + (form.productoTerminado ?? 0) + (form.deposito ?? 0);
    const updated: InsumoStock = {
      ...modal,
      tipo:              (form.tipo as "Nacional" | "IT" | "IC" | "Muestra") ?? modal.tipo,
      stockFisico,
      enProduccion:      form.enProduccion      ?? modal.enProduccion,
      productoTerminado: form.productoTerminado ?? modal.productoTerminado,
      deposito:          form.deposito          ?? modal.deposito,
      saldoMOA:          form.saldoMOA          ?? modal.saldoMOA,
      unidadMOA:         (form as any).unidadMOA ?? (modal as any).unidadMOA ?? modal.unidad,
      fechaMOA:          form.fechaMOA          ?? modal.fechaMOA,
      fechaConteo:       form.fechaConteo       ?? modal.fechaConteo,
      historial: [
        {
          fecha:        modal.fechaConteo,
          stockFisico:  modal.stockFisico,
          saldoMOA:     modal.saldoMOA,
          observaciones: form.observaciones ?? "",
        },
        ...modal.historial,
      ].slice(0, 24), // max 24 entradas históricas
    };
    persist(items.map(i => i.id === modal.id ? updated : i));
    setSaved(true);
    setTimeout(() => { setSaved(false); setModal(null); }, 900);
  };

  // Filtros
  const itemsFiltradosCat = items.filter(i =>
    categoria === "todos" || categoriaDeGrupo(i.grupo) === categoria
  );
  const grupos = ["Todos", ...Array.from(new Set(itemsFiltradosCat.map(i => i.grupo)))];
  const visible = itemsFiltradosCat.filter(i => {
    const me = empresa === "Todos" || (i.empresa ?? "Seville Cazorla") === empresa;
    const mt = tab === "todos" || i.tipo === tab;
    const mg = grupo === "Todos" || i.grupo === grupo;
    return me && mt && mg;
  });

  const T = empresa === "Tomalar";
  const th = {
    tab:      T ? "border-red-700 text-red-800"         : "border-olive-500 text-olive-600",
    chipActive:T ? "bg-red-700 text-white"              : "bg-olive-600 text-white",
    groupBg:  T ? "bg-red-50/60 border-red-100"         : "bg-olive-50/60 border-olive-100",
    rowHover: T ? "hover:bg-red-50/40"                  : "hover:bg-olive-50/40",
    badge:    T ? "bg-red-100 text-red-700"             : "bg-olive-100 text-olive-600",
    ring:     T ? "focus:ring-red-400"                  : "focus:ring-olive-400",
    saveBtn:  T ? "bg-red-800 hover:bg-red-900"         : "bg-olive-600 hover:bg-olive-700",
  };

  const nQuimicos  = items.filter(i => categoriaDeGrupo(i.grupo) === "quimicos").length;
  const nAuxiliar  = items.filter(i => categoriaDeGrupo(i.grupo) === "auxiliar").length;

  // Totales IT para comparar con MOA
  const itItems = items.filter(i => i.tipo === "IT");
  const itConDiff = itItems.filter(i => i.saldoMOA > 0 && i.stockFisico !== i.saldoMOA).length;

  // Agrupar por grupo para la vista
  const porGrupo: Record<string, InsumoStock[]> = {};
  visible.forEach(i => {
    if (!porGrupo[i.grupo]) porGrupo[i.grupo] = [];
    porGrupo[i.grupo].push(i);
  });

  const toggleExp = (g: string) => {
    const s = new Set(expandidos);
    s.has(g) ? s.delete(g) : s.add(g);
    setExpandidos(s);
  };

  const kgTotal      = (i: InsumoStock) => (i.stockFisico * i.factorKg).toLocaleString();
  const kgMOA        = (i: InsumoStock) => (i.saldoMOA   * i.factorKg).toLocaleString();
  const unidMOA      = (i: InsumoStock) => (i as any).unidadMOA    || i.unidad;
  const factorConv   = (i: InsumoStock) => (i as any).factorConvMOA ?? 1;
  const unidDiff     = (i: InsumoStock) => unidMOA(i) !== i.unidad && factorConv(i) === 1;
  // saldo MOA convertido a la unidad del stock físico
  const moaConvertido = (i: InsumoStock) => Math.round(i.saldoMOA * factorConv(i) * 100) / 100;
  const diffVal      = (i: InsumoStock) => {
    if (i.saldoMOA <= 0) return null;
    if (unidDiff(i)) return null; // sin factor de conversión definido
    return Math.round((i.stockFisico - moaConvertido(i)) * 100) / 100;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      <PageHeader
        title="Control de Insumos"
        subtitle={`${nQuimicos} químicos · ${nAuxiliar} auxiliar · ${itItems.length} IT${itConDiff > 0 ? ` · ${itConDiff} diferencia${itConDiff !== 1 ? "s" : ""} con MOA` : ""}`}
        badge={itConDiff > 0 ? { label: `${itConDiff} dif. MOA`, variant: "alert" } : undefined}
        actions={
          <>
            <SecondaryBtn onClick={() => setExportOpen(true)} icon={FileSpreadsheet}>Exportar</SecondaryBtn>
            <PrimaryBtn onClick={() => { setNewForm(emptyInsumo()); setNewModal(true); }} icon={PackagePlus}>Nuevo Insumo</PrimaryBtn>
          </>
        }
      />
      {exportOpen && (
        <ExportModal
          seccionesPreset={["insumos"]}
          onClose={() => setExportOpen(false)}
          onExport={async (opts: ExportOpts) => {
            const { exportToExcel } = await import("@/lib/abastecimiento/exportExcel");
            await exportToExcel(opts);
          }}
        />
      )}

      {/* Pestañas empresa */}
      <div className="flex gap-1 border-b border-gray-200">
        {(["Todos", "Seville Cazorla", "Tomalar"] as const).map(emp => {
          const count = emp === "Todos" ? items.length : items.filter(i => (i.empresa ?? "Seville Cazorla") === emp).length;
          return (
            <button key={emp} onClick={() => setEmpresa(emp)}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                empresa === emp ? (emp === "Tomalar" ? "border-red-700 text-red-800" : "border-olive-500 text-olive-600") : "border-transparent text-gray-500 hover:text-gray-800"
              }`}>
              {emp}
              {count > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Selector de categoría principal */}
      <div className="grid grid-cols-3 gap-2">
        {([
          { key: "todos",    label: "Todos los insumos", sub: `${items.length} ítems`,         icon: "📦" },
          { key: "quimicos", label: "Insumos Químicos",  sub: `${nQuimicos} productos`,         icon: "🧪" },
          { key: "auxiliar", label: "Material Auxiliar", sub: `${nAuxiliar} ítems`,             icon: "📦" },
        ] as { key: Categoria; label: string; sub: string; icon: string }[]).map(c => (
          <button key={c.key} onClick={() => { setCategoria(c.key); setGrupo("Todos"); }}
            className={`rounded-xl px-4 py-3 text-left border-2 transition-all ${
              categoria === c.key
                ? "border-olive-500 bg-olive-50"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}>
            <p className={`text-sm font-bold ${categoria === c.key ? "text-olive-600" : "text-gray-700"}`}>
              {c.icon} {c.label}
            </p>
            <p className={`text-xs mt-0.5 ${categoria === c.key ? "text-olive-500" : "text-gray-400"}`}>{c.sub}</p>
          </button>
        ))}
      </div>

      {/* Tabs tipo / filtro grupo */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-medium">
          {(["todos", "Nacional", "IT", "IC", "Muestra"] as TabView[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 transition-colors ${tab === t ? `${th.chipActive}` : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {t === "todos" ? "Todos" : t}
            </button>
          ))}
        </div>
        <select value={grupo} onChange={e => setGrupo(e.target.value)}
          className={`border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 ${th.ring}`}>
          {grupos.map(g => <option key={g}>{g}</option>)}
        </select>
      </div>

      {/* Tabla por grupos */}
      {Object.entries(porGrupo).map(([grp, insumos]) => {
        const open = expandidos.has(grp) || Object.keys(porGrupo).length === 1;
        const conDiff = insumos.filter(i => {
          const d = diffVal(i);
          return d !== null && d !== 0;
        }).length;
        return (
          <div key={grp} className={`${th.groupBg} rounded-xl overflow-hidden shadow-sm`}>
            {/* Cabecera grupo */}
            <button onClick={() => toggleExp(grp)}
              className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800 text-sm">{grp}</span>
                <span className="text-xs text-gray-400">{insumos.length} insumos</span>
                {conDiff > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-600 text-xs font-semibold rounded-full">
                    <AlertTriangle size={10} /> {conDiff} dif. MOA
                  </span>
                )}
              </div>
              {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            {open && (() => {
              const showMOA = tab === "IT" || tab === "todos";
              return (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="px-4 py-2 text-left w-20">Cód.</th>
                    <th className="px-4 py-2 text-left">Descripción</th>
                    <th className="px-4 py-2 text-center">Tipo</th>
                    <th className="px-4 py-2 text-right">Depósito</th>
                    <th className="px-4 py-2 text-right bg-olive-50/50">En Producción</th>
                    <th className="px-4 py-2 text-right bg-green-50/50">Prod. Terminado</th>
                    <th className="px-4 py-2 text-right font-bold text-gray-600">TOTAL</th>
                    {showMOA && <th className="px-4 py-2 text-right bg-yellow-50/50">Saldo MOA/ARCA</th>}
                    {showMOA && <th className="px-4 py-2 text-right">Diferencia</th>}
                    <th className="px-4 py-2 text-left text-gray-300">Conteo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {insumos.map(item => {
                    const diff = diffVal(item);
                    return (
                      <tr key={item.id}
                        onClick={() => openModal(item)}
                        className={`${th.rowHover} cursor-pointer transition-colors group`}>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{item.codigo}</td>
                        <td className="px-4 py-2.5">
                          <p className={`font-medium text-gray-900 transition-colors ${T ? "group-hover:text-red-700" : "group-hover:text-olive-600"}`}>{item.descripcion}</p>
                          <p className="text-xs text-gray-400">{item.unidad}{item.factorKg > 1 ? ` · ${kgTotal(item)} kg totales` : ""}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.tipo === "IT" ? th.badge :
                            item.tipo === "IC" ? "bg-blue-100 text-blue-600" :
                            item.tipo === "Muestra" ? "bg-purple-100 text-purple-600" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {item.tipo}
                          </span>
                        </td>
                        {/* Depósito */}
                        <td className="px-4 py-2.5 text-right text-gray-700 font-medium">
                          {item.deposito.toLocaleString()}
                          <span className="text-xs text-gray-400 ml-1">{item.unidad}</span>
                        </td>
                        {/* En producción */}
                        <td className="px-4 py-2.5 text-right bg-olive-50/30">
                          <span className={`font-medium ${item.enProduccion > 0 ? "text-olive-600" : "text-gray-300"}`}>
                            {item.enProduccion > 0 ? item.enProduccion.toLocaleString() : "—"}
                          </span>
                        </td>
                        {/* Producto terminado */}
                        <td className="px-4 py-2.5 text-right bg-green-50/30">
                          <span className={`font-medium ${item.productoTerminado > 0 ? "text-green-700" : "text-gray-300"}`}>
                            {item.productoTerminado > 0 ? item.productoTerminado.toLocaleString() : "—"}
                          </span>
                        </td>
                        {/* Total */}
                        <td className="px-4 py-2.5 text-right font-bold text-gray-900">
                          {item.stockFisico.toLocaleString()}
                        </td>
                        {/* MOA — solo IT */}
                        {showMOA && (item.tipo === "IT" ? (
                          <td className="px-4 py-2.5 text-right bg-yellow-50/30">
                            {item.saldoMOA > 0 ? (
                              <>
                                <span className="font-medium text-yellow-700">
                                  {item.saldoMOA.toLocaleString()}
                                  <span className="text-xs font-normal ml-1 text-gray-400">{unidMOA(item)}</span>
                                </span>
                                {unidMOA(item) !== item.unidad && factorConv(item) !== 1 && (
                                  <p className="text-xs text-olive-600">
                                    ≈ {moaConvertido(item).toLocaleString()} {item.unidad}
                                  </p>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-300 text-sm">Sin datos</span>
                            )}
                          </td>
                        ) : (
                          <td className="px-4 py-2.5 text-right bg-yellow-50/30">
                            <span className="text-gray-200 text-xs">N/A</span>
                          </td>
                        ))}
                        {/* Diferencia — solo IT */}
                        {showMOA && (item.tipo === "IT" ? (
                          <td className="px-4 py-2.5 text-right">
                            {diff !== null ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${diffBadge(diff)}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            ) : unidDiff(item) && item.saldoMOA > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-500 cursor-help" title="Configurar factor de conversión en el modal">≠ ud</span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>
                        ) : (
                          <td className="px-4 py-2.5 text-right">
                            <span className="text-gray-200 text-xs">N/A</span>
                          </td>
                        ))}
                        {/* Fecha */}
                        <td className="px-4 py-2.5 text-xs text-gray-400">
                          {item.fechaConteo}
                          {item.historial.length > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); setHistorialId(historialId === item.id ? null : item.id); }}
                              className="ml-1 text-olive-500 hover:text-olive-600 transition-colors">
                              <History size={11} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              );
            })()}

            {/* Historial inline */}
            {open && insumos.some(i => i.id === historialId) && (() => {
              const item = insumos.find(i => i.id === historialId)!;
              return (
                <div className="border-t border-dashed border-olive-200 bg-olive-50/30 px-5 py-3">
                  <p className="text-xs font-semibold text-olive-600 mb-2">Historial — {item.descripcion}</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 font-semibold">
                        <td className="pr-4 py-1">Fecha</td>
                        <td className="pr-4 py-1 text-right">Stock físico</td>
                        <td className="pr-4 py-1 text-right">Saldo MOA</td>
                        <td className="py-1 text-right">Diferencia</td>
                        <td className="pl-4 py-1">Observaciones</td>
                      </tr>
                    </thead>
                    <tbody>
                      {item.historial.map((h, idx) => (
                        <tr key={idx} className="border-t border-olive-100/50">
                          <td className="pr-4 py-1 text-gray-600">{h.fecha}</td>
                          <td className="pr-4 py-1 text-right font-medium text-gray-700">{h.stockFisico.toLocaleString()}</td>
                          <td className="pr-4 py-1 text-right text-yellow-700">{h.saldoMOA > 0 ? h.saldoMOA.toLocaleString() : "—"}</td>
                          <td className={`py-1 text-right font-semibold ${diffColor(h.saldoMOA > 0 ? h.stockFisico - h.saldoMOA : 0)}`}>
                            {h.saldoMOA > 0 ? (h.stockFisico - h.saldoMOA > 0 ? "+" : "") + (h.stockFisico - h.saldoMOA) : "—"}
                          </td>
                          <td className="pl-4 py-1 text-gray-500">{h.observaciones || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        );
      })}

      {/* Modal nuevo insumo */}
      {newModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl w-full max-w-xl bg-white flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl flex-shrink-0">
              <div>
                <h3 className="font-bold text-gray-900">Nuevo Insumo</h3>
                <p className="text-xs text-gray-400 mt-0.5">Completá los datos del nuevo insumo</p>
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
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: "Nacional",  label: "🏭 Nacional",               cls: "border-gray-400 bg-gray-100 text-gray-700" },
                    { val: "IT",        label: "🛃 Importación Temporal",    cls: "border-olive-500 bg-olive-50 text-olive-700" },
                    { val: "IC",        label: "📦 Importación (IC)",        cls: "border-blue-500 bg-blue-50 text-blue-700" },
                    { val: "Muestra",   label: "🔬 Muestra",                 cls: "border-purple-400 bg-purple-50 text-purple-700" },
                  ] as const).map(({ val, label, cls }) => (
                    <button key={val} type="button"
                      onClick={() => setNewForm({ ...newForm, tipo: val })}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        newForm.tipo === val ? cls : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descripción y Código */}
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <FormField label="Descripción *">
                  <Input value={newForm.descripcion}
                    onChange={e => setNewForm({ ...newForm, descripcion: e.target.value })}
                    placeholder="Ej: Ácido Cítrico Monohidrato" />
                </FormField>
                <FormField label="Código">
                  <Input value={newForm.codigo} style={{ width: 110 }}
                    onChange={e => setNewForm({ ...newForm, codigo: e.target.value })}
                    placeholder="AC-001" />
                </FormField>
              </div>

              {/* Grupo y Unidad */}
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Grupo">
                  <select value={newForm.grupo}
                    onChange={e => setNewForm({ ...newForm, grupo: e.target.value })}
                    className="w-full h-[38px] border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-olive-400">
                    {GRUPOS_ALL.map(g => <option key={g}>{g}</option>)}
                  </select>
                </FormField>
                <FormField label="Unidad">
                  <select value={newForm.unidad}
                    onChange={e => setNewForm({ ...newForm, unidad: e.target.value, unidadMOA: e.target.value })}
                    className="w-full h-[38px] border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-olive-400">
                    {["KG","LTS","BULTOS","TN","UNID"].map(u => <option key={u}>{u}</option>)}
                  </select>
                </FormField>
              </div>

              {/* Factor KG */}
              <FormField label={`Factor kg por ${newForm.unidad} (ej: 25 para bolsas de 25 kg)`}>
                <Input type="number" min={0.001} step={0.001}
                  value={newForm.factorKg}
                  onChange={e => setNewForm({ ...newForm, factorKg: +e.target.value })} />
              </FormField>

              {/* Saldo inicial */}
              <div>
                <p className="text-xs text-olive-600 font-semibold uppercase tracking-wide bg-olive-50 px-3 py-2 rounded-lg mb-3">
                  📦 Saldo inicial
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label={`Depósito (${newForm.unidad})`}>
                    <Input type="number" min={0} value={newForm.deposito}
                      onChange={e => setNewForm({ ...newForm, deposito: +e.target.value })} />
                  </FormField>
                  <FormField label={`En producción (${newForm.unidad})`}>
                    <Input type="number" min={0} value={newForm.enProduccion}
                      onChange={e => setNewForm({ ...newForm, enProduccion: +e.target.value })} />
                  </FormField>
                  <FormField label={`Prod. terminado (${newForm.unidad})`}>
                    <Input type="number" min={0} value={newForm.productoTerminado}
                      onChange={e => setNewForm({ ...newForm, productoTerminado: +e.target.value })} />
                  </FormField>
                </div>
              </div>

              {/* Fecha conteo */}
              <FormField label="Fecha de conteo">
                <Input type="date" value={newForm.fechaConteo}
                  onChange={e => setNewForm({ ...newForm, fechaConteo: e.target.value })} />
              </FormField>

              {/* Observaciones */}
              <FormField label="Observaciones">
                <textarea value={newForm.observaciones} rows={2}
                  onChange={e => setNewForm({ ...newForm, observaciones: e.target.value })}
                  placeholder="Notas adicionales..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400 resize-none" />
              </FormField>
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
                  const stockFisico = newForm.deposito + newForm.enProduccion + newForm.productoTerminado;
                  const nuevo: InsumoStock = {
                    ...newForm,
                    id: `ins-${Date.now()}`,
                    stockFisico,
                  };
                  persist([...items, nuevo]);
                  setNewSaved(true);
                  setTimeout(() => { setNewSaved(false); setNewModal(false); }, 900);
                }}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${newSaved ? "bg-green-500" : `${th.saveBtn} active:scale-95`}`}>
                {newSaved ? <><CheckCircle2 size={16} /> Guardado</> : <><PackagePlus size={16} /> Crear Insumo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal actualizar saldo - footer fix */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-6 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div className="rounded-2xl shadow-2xl w-full max-w-xl my-auto">

            {/* Header — fijo visualmente dentro del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="font-bold text-gray-900">{modal.descripcion}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {modal.codigo} · <span className={`font-semibold ${(form.tipo ?? modal.tipo) === "IT" ? "text-olive-600" : "text-gray-600"}`}>{form.tipo ?? modal.tipo}</span> · Último conteo: {modal.fechaConteo}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>

            {/* Cuerpo con scroll */}
            <div className="px-6 py-5 space-y-5">

              {/* ── Empresa ── */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Empresa</p>
                <div className="flex gap-2">
                  {(["Seville Cazorla", "Tomalar"] as const).map(emp => (
                    <button key={emp} type="button"
                      onClick={() => setForm({ ...form, empresa: emp } as any)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        ((form as any).empresa ?? modal.empresa ?? "Seville Cazorla") === emp
                          ? emp === "Tomalar" ? "border-red-700 bg-red-50 text-red-800" : "border-olive-500 bg-olive-50 text-olive-700"
                          : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      }`}>
                      {emp}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Régimen ── */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Régimen del insumo</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { val: "Nacional",  label: "🏭 Nacional",               cls: "border-gray-400 bg-gray-100 text-gray-700" },
                    { val: "IT",        label: "🛃 Importación Temporal",    cls: "border-olive-500 bg-olive-50 text-olive-700" },
                    { val: "IC",        label: "📦 Importación (IC)",        cls: "border-blue-500 bg-blue-50 text-blue-700" },
                    { val: "Muestra",   label: "🔬 Muestra",                 cls: "border-purple-400 bg-purple-50 text-purple-700" },
                  ] as const).map(({ val, label, cls }) => (
                    <button key={val} type="button"
                      onClick={() => setForm({ ...form, tipo: val })}
                      className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                        (form.tipo ?? modal.tipo) === val ? cls : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                {form.tipo && form.tipo !== modal.tipo && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    ⚠️ Cambiando de <strong>{modal.tipo}</strong> a <strong>{form.tipo}</strong>. Esto afecta el seguimiento MOA.
                  </p>
                )}
              </div>

              {/* ── Stock físico ── */}
              <div className="space-y-3">
                <p className="text-xs text-olive-600 font-semibold uppercase tracking-wide bg-olive-50 px-3 py-2 rounded-lg">
                  📦 Nuevo saldo físico — desglose de ubicación
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label={`Depósito (${modal.unidad})`}>
                    <Input type="number" value={form.deposito ?? ""} min={0}
                      onChange={e => setForm({ ...form, deposito: +e.target.value })} />
                  </FormField>
                  <FormField label={`En producción (${modal.unidad})`}>
                    <Input type="number" value={form.enProduccion ?? ""} min={0}
                      onChange={e => setForm({ ...form, enProduccion: +e.target.value })} />
                  </FormField>
                  <FormField label={`Prod. terminado (${modal.unidad})`}>
                    <Input type="number" value={form.productoTerminado ?? ""} min={0}
                      onChange={e => setForm({ ...form, productoTerminado: +e.target.value })} />
                  </FormField>
                </div>
                {((form.deposito ?? 0) + (form.enProduccion ?? 0) + (form.productoTerminado ?? 0)) > 0 && (
                  <div className="bg-olive-50 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-olive-600">Total stock físico</span>
                    <span className="text-lg font-bold text-olive-600">
                      {((form.deposito ?? 0) + (form.enProduccion ?? 0) + (form.productoTerminado ?? 0)).toLocaleString()} {modal.unidad}
                      {modal.factorKg > 1 && (
                        <span className="text-sm font-normal ml-1 text-olive-600">
                          = {(((form.deposito ?? 0) + (form.enProduccion ?? 0) + (form.productoTerminado ?? 0)) * modal.factorKg).toLocaleString()} kg
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* ── Saldo MOA / ARCA ── */}
              <div className="border-t border-dashed border-gray-200 pt-4 space-y-3">
                <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide bg-yellow-50 px-3 py-2 rounded-lg">
                  📋 Saldo MOA / ARCA (según despachante)
                </p>

                {/* Fila 1: Saldo + Unidad + Fecha — misma altura */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                  <FormField label="Saldo MOA">
                    <Input type="number" value={form.saldoMOA ?? ""} min={0}
                      onChange={e => setForm({ ...form, saldoMOA: +e.target.value } as any)} />
                  </FormField>
                  <FormField label="Unidad">
                    <select
                      value={(form as any).unidadMOA ?? (modal as any).unidadMOA ?? modal.unidad}
                      onChange={e => setForm({ ...form, unidadMOA: e.target.value } as any)}
                      className="h-[38px] border border-gray-300 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-olive-400">
                      {["KG","LTS","BULTOS","TN","UNID"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Fecha MOA">
                    <Input type="date" value={form.fechaMOA ?? ""}
                      onChange={e => setForm({ ...form, fechaMOA: e.target.value })} />
                  </FormField>
                </div>

                {/* Panel de conversión — solo si unidades difieren */}
                {(() => {
                  const uMOA = (form as any).unidadMOA ?? (modal as any).unidadMOA ?? modal.unidad;
                  const factor: number = (form as any).factorConvMOA ?? (modal as any).factorConvMOA ?? 1;
                  const saldo = form.saldoMOA ?? 0;
                  const convertido = Math.round(saldo * factor * 100) / 100;

                  type Preset = { label: string; factor: number };
                  const presets: Preset[] = [];
                  if (uMOA === "TN" && modal.unidad === "KG")  presets.push({ label:"TN→KG (×1000)", factor:1000 });
                  if (uMOA === "TN" && modal.unidad === "LTS") presets.push({ label:"TN→LTS dens.1.0", factor:1000 }, { label:"TN→LTS dens.1.05", factor:952.381 });
                  if (uMOA === "KG" && modal.unidad === "LTS") presets.push({ label:"KG→LTS dens.1.0", factor:1 }, { label:"KG→LTS dens.1.05", factor:0.952 }, { label:"KG→LTS dens.1.1", factor:0.909 });
                  if (uMOA === "LTS" && modal.unidad === "KG") presets.push({ label:"LTS→KG dens.1.0", factor:1 }, { label:"LTS→KG dens.1.05", factor:1.05 });
                  if (uMOA === "KG" && modal.unidad === "TN")  presets.push({ label:"KG→TN (÷1000)", factor:0.001 });

                  return (
                    <div className="bg-olive-50 border border-olive-100 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-olive-600 uppercase tracking-wide">🔄 Conversión de unidades</p>
                        <span className="text-xs text-olive-400">{uMOA} → {modal.unidad}</span>
                      </div>

                      {/* Presets en fila */}
                      {presets.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {presets.map(p => (
                            <button key={p.label} type="button"
                              onClick={() => setForm({ ...form, factorConvMOA: p.factor } as any)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                                Math.abs(factor - p.factor) < 0.001
                                  ? "bg-olive-600 text-white border-olive-500"
                                  : "bg-white text-olive-600 border-olive-200 hover:border-olive-400"
                              }`}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Factor manual + preview en la misma fila */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500 shrink-0">Factor:</label>
                          <input type="number" step="0.001" min="0.001"
                            value={factor}
                            onChange={e => setForm({ ...form, factorConvMOA: +e.target.value } as any)}
                            className="w-24 h-8 border border-gray-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400" />
                        </div>
                        {saldo > 0 && (
                          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 flex-1 min-w-0">
                            <span className="text-xs text-gray-400 shrink-0">{saldo.toLocaleString()} {uMOA} × {factor} =</span>
                            <span className="font-bold text-olive-600 ml-auto">{convertido.toLocaleString()} {modal.unidad}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Preview diferencia */}
                {(form.saldoMOA ?? 0) > 0 && (() => {
                  const total = (form.deposito ?? 0) + (form.enProduccion ?? 0) + (form.productoTerminado ?? 0);
                  const factor: number = (form as any).factorConvMOA ?? (modal as any).factorConvMOA ?? 1;
                  const uMOA = (form as any).unidadMOA ?? (modal as any).unidadMOA ?? modal.unidad;
                  const moaConv = Math.round((form.saldoMOA ?? 0) * factor * 100) / 100;
                  const diff = Math.round((total - moaConv) * 100) / 100;
                  return (
                    <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${diff === 0 ? "bg-green-50" : "bg-red-50"}`}>
                      <div>
                        <p className={`text-sm font-medium ${diff === 0 ? "text-green-700" : "text-red-700"}`}>
                          Diferencia físico vs MOA
                        </p>
                        {uMOA !== modal.unidad && (
                          <p className="text-xs text-gray-400 mt-0.5">MOA convertido: {moaConv.toLocaleString()} {modal.unidad}</p>
                        )}
                      </div>
                      <span className={`text-xl font-bold ${diff === 0 ? "text-green-600" : "text-red-600"}`}>
                        {diff > 0 ? "+" : ""}{diff.toLocaleString()} {modal.unidad}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* ── Fecha conteo + Observaciones ── */}
              <FormField label="Fecha de conteo">
                <Input type="date" value={form.fechaConteo ?? ""}
                  onChange={e => setForm({ ...form, fechaConteo: e.target.value })} />
              </FormField>
              <FormField label="Observaciones">
                <textarea value={form.observaciones ?? ""} rows={2}
                  onChange={e => setForm({ ...form, observaciones: e.target.value })}
                  placeholder="Notas del conteo, diferencias detectadas..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-400 resize-none" />
              </FormField>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-olive-50/40 rounded-b-2xl sticky bottom-0">
              <button onClick={() => setModal(null)}
                className="px-5 py-2 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-100 transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave}
                className={`px-6 py-2 text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 ${saved ? "bg-green-500" : `${th.saveBtn} active:scale-95`}`}>
                {saved ? <><CheckCircle2 size={16} /> Guardado</> : "Actualizar saldo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
