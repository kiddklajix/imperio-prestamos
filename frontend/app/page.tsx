"use client";
import { useState, useEffect } from "react";

// --- TU URL DE NGROK ---
const API_URL = "https://backend-imperio-mgux.onrender.com";

export default function Home() {
  // ESTADO DE SESIÓN
  const [usuario, setUsuario] = useState("");
  const [tempUsuario, setTempUsuario] = useState(""); // Para el input del login
  const [estaLogueado, setEstaLogueado] = useState(false);

  // ESTADOS DE LA APP
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState(100000);
  const [tasa, setTasa] = useState(80);
  const [meses, setMeses] = useState(6);
  const [tipoInteres, setTipoInteres] = useState("simple"); 
  const [finanzas, setFinanzas] = useState<any[]>([]);
  
  const [dashboard, setDashboard] = useState({
    capital_invertido: 0,
    ganancia_esperada: 0,
    dinero_recaudado: 0,
    por_cobrar: 0
  });

  // CARGAR DATOS (Ahora filtramos por usuario)
  const actualizar = async () => {
    if (!usuario) return;
    try {
      const headers = { "ngrok-skip-browser-warning": "true" };

      const resLista = await fetch(`${API_URL}/mis-finanzas/${usuario}`, { headers });
      if (resLista.ok) setFinanzas(await resLista.json());

      const resDash = await fetch(`${API_URL}/dashboard/${usuario}`, { headers });
      if (resDash.ok) setDashboard(await resDash.json());

    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => { if (estaLogueado) actualizar(); }, [estaLogueado]);

  // LOGIN
  const manejarLogin = () => {
    if (!tempUsuario) return alert("Escribe un nombre");
    setUsuario(tempUsuario);
    setEstaLogueado(true);
  };

  // LOGOUT
  const manejarLogout = () => {
    setUsuario("");
    setEstaLogueado(false);
    setFinanzas([]);
    setDashboard({ capital_invertido: 0, ganancia_esperada: 0, dinero_recaudado: 0, por_cobrar: 0 });
  };

  // BOTÓN NUCLEAR (RESET)
  const resetearCuenta = async () => {
    const confirmacion = prompt(`PELIGRO: Esto borrará TODOS los datos de ${usuario}.\nEscribe "BORRAR" para confirmar.`);
    if (confirmacion !== "BORRAR") return;

    await fetch(`${API_URL}/reset-cuenta/${usuario}`, { 
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    actualizar();
    alert("Cuenta reiniciada a 0.");
  };

  const crearNuevo = async () => {
    if (!cliente || monto <= 0) return alert("Datos incorrectos");

    await fetch(`${API_URL}/crear-prestamo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ usuario_id: usuario, cliente, monto, tasa, plazo: meses, tipo_interes: tipoInteres }),
    });
    setCliente(""); 
    actualizar();
  };

  const pagarCuota = async (id: number) => {
    await fetch(`${API_URL}/pagar-cuota/${id}`, { 
      method: "POST", 
      headers: { "ngrok-skip-browser-warning": "true" } 
    });
    actualizar();
  };

  const saldarDeudaCompleta = async (id: number, nombre: string) => {
    if (!confirm(`¿CONFIRMAS QUE ${nombre} PAGÓ TODO?`)) return;
    await fetch(`${API_URL}/saldar-deuda-completa/${id}`, { 
      method: "PUT", 
      headers: { "ngrok-skip-browser-warning": "true" } 
    });
    actualizar();
  };

  const Card = ({ titulo, valor, color, icono }: any) => (
    <div className={`p-4 rounded-xl shadow-lg border border-gray-700 bg-gray-800 flex items-center justify-between`}>
      <div>
        <p className="text-gray-400 text-xs uppercase font-bold tracking-wider">{titulo}</p>
        <p className={`text-2xl font-bold ${color}`}>${valor.toLocaleString()}</p>
      </div>
      <div className="text-3xl opacity-50">{icono}</div>
    </div>
  );

  // --- PANTALLA DE LOGIN ---
  if (!estaLogueado) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white">
        <h1 className="text-5xl font-bold text-yellow-500 mb-8">🏦 Imperio Financiero</h1>
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
          <label className="block text-sm text-gray-400 mb-2">¿Quién está operando hoy?</label>
          <input 
            type="text" 
            placeholder="Tu Nombre (Ej: Marti)" 
            className="w-full bg-gray-700 p-4 rounded text-xl text-center border border-gray-600 focus:border-yellow-500 outline-none mb-6"
            onChange={(e) => setTempUsuario(e.target.value)}
          />
          <button 
            onClick={manejarLogin}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-lg text-xl transition-all"
          >
            ENTRAR AL SISTEMA 🚀
          </button>
        </div>
      </div>
    );
  }

  // --- PANTALLA PRINCIPAL (DASHBOARD) ---
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      
      {/* BARRA SUPERIOR CON USUARIO Y RESET */}
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-yellow-400">Hola, {usuario} 👋</h1>
        <div className="flex gap-4">
          <button onClick={resetearCuenta} className="bg-red-900/50 hover:bg-red-800 text-red-400 border border-red-800 px-4 py-2 rounded font-bold text-xs transition-all">
            🗑️ RESETEAR TODO
          </button>
          <button onClick={manejarLogout} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-xs">
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <Card titulo="Capital Invertido" valor={dashboard.capital_invertido} color="text-blue-400" icono="📉" />
        <Card titulo="Ganancia Esperada" valor={dashboard.ganancia_esperada} color="text-green-400" icono="📈" />
        <Card titulo="Dinero Recaudado" valor={dashboard.dinero_recaudado} color="text-yellow-400" icono="💰" />
        <Card titulo="Por Cobrar" valor={dashboard.por_cobrar} color="text-red-400" icono="⏳" />
      </div>

      <div className="bg-gray-800 p-6 rounded-xl max-w-6xl mx-auto mb-10 shadow-2xl border border-gray-700">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">📝 Registrar Nuevo Préstamo</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-1">
            <label className="text-xs text-gray-500 font-bold ml-1">Cliente</label>
            <input type="text" value={cliente} onChange={e => setCliente(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 focus:border-yellow-500 outline-none" placeholder="Nombre..." />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold ml-1">Monto ($)</label>
            <input type="number" value={monto} onChange={e => setMonto(Number(e.target.value))} className="w-full bg-gray-700 p-2 rounded border border-gray-600 outline-none" />
          </div>
          <div>
            <label className="text-xs text-yellow-500 font-bold ml-1">Interés (%)</label>
            <input type="number" value={tasa} onChange={e => setTasa(Number(e.target.value))} className="w-full bg-gray-900 text-yellow-300 p-2 rounded border border-yellow-600 outline-none font-bold" />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold ml-1">Tipo</label>
            <select value={tipoInteres} onChange={e => setTipoInteres(e.target.value)} className="w-full bg-gray-700 p-2 rounded border border-gray-600 outline-none cursor-pointer">
              <option value="simple">Simple</option>
              <option value="compuesto">Compuesto</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold ml-1">Cuotas</label>
            <input type="number" value={meses} onChange={e => setMeses(Number(e.target.value))} className="w-full bg-gray-700 p-2 rounded border border-gray-600 outline-none" />
          </div>
          <button onClick={crearNuevo} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded transition-all h-10 shadow-lg">CREAR</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {finanzas.map((prestamo) => (
          <div key={prestamo.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-4 border-b border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white uppercase">{prestamo.cliente}</h3>
                <div className="flex gap-4 text-sm text-gray-400 mt-1">
                  <span>Monto: <span className="text-white font-mono">${prestamo.monto.toLocaleString()}</span></span>
                  <span>Tasa: <span className="text-yellow-400 font-bold">{prestamo.tasa}%</span></span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400 font-mono">${prestamo.total_final.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">Total a Pagar</p>
                </div>
                <button onClick={() => saldarDeudaCompleta(prestamo.id, prestamo.cliente)} className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-full shadow-lg border-2 border-green-400 hover:scale-110 transition-all">💰</button>
              </div>
            </div>
            <div className="p-4 bg-gray-900/50">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {prestamo.detalle_cuotas.map((cuota: any) => (
                  <div key={cuota.id} 
                       className={`p-2 rounded text-center border text-xs cursor-pointer transition-all select-none ${
                         cuota.estado === 'Pagada' 
                         ? 'bg-green-900/40 border-green-800 text-green-400' 
                         : 'bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-300'
                       }`}
                       onClick={() => cuota.estado !== 'Pagada' && pagarCuota(cuota.id)}
                  >
                    <p className="text-[10px] uppercase">Cuota {cuota.numero_cuota}</p>
                    <p className="font-bold text-base my-1">${cuota.monto_cuota.toLocaleString()}</p>
                    {cuota.estado === 'Pagada' ? <span className="font-bold">✓</span> : <span>Pendiente</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}