"use client";
import { useState, useEffect } from "react";

// --- TU URL DE RENDER ---
const API_URL = "https://backend-imperio-mgux.onrender.com"; // <--- VERIFICA QUE SEA LA TUYA

export default function Home() {
  const [usuario, setUsuario] = useState("");
  const [tempUsuario, setTempUsuario] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [estaLogueado, setEstaLogueado] = useState(false);

  // Estados APP
  const [cliente, setCliente] = useState("");
  const [monto, setMonto] = useState(100000);
  const [tasa, setTasa] = useState(80);
  const [meses, setMeses] = useState(6);
  const [tipoInteres, setTipoInteres] = useState("simple"); 
  const [finanzas, setFinanzas] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState({ capital_invertido: 0, ganancia_esperada: 0, dinero_recaudado: 0, por_cobrar: 0 });

  const actualizar = async () => {
    if (!usuario) return;
    try {
      const resLista = await fetch(`${API_URL}/mis-finanzas/${usuario}`);
      if (resLista.ok) setFinanzas(await resLista.json());

      const resDash = await fetch(`${API_URL}/dashboard/${usuario}`);
      if (resDash.ok) setDashboard(await resDash.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { if (estaLogueado) actualizar(); }, [estaLogueado]);

  // --- FUNCIONES DE SEGURIDAD ---
  const registrarse = async () => {
    if (!tempUsuario || !password) return alert("Faltan datos");
    const res = await fetch(`${API_URL}/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: tempUsuario, password })
    });
    if (res.ok) {
      alert("¡Usuario creado! Ahora dale a ENTRAR.");
    } else {
      const error = await res.json();
      alert("Error: " + error.detail);
    }
  };

  const entrar = async () => {
    if (!tempUsuario || !password) return alert("Faltan datos");
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: tempUsuario, password })
    });
    if (res.ok) {
      setUsuario(tempUsuario);
      setEstaLogueado(true);
    } else {
      alert("Usuario o contraseña incorrectos 🚫");
    }
  };

  const logout = () => {
    setUsuario("");
    setPassword("");
    setEstaLogueado(false);
    setFinanzas([]);
  };

  // --- FUNCIONES DEL SISTEMA ---
  
  // 🔥 FUNCIÓN DE COBRANZA WHATSAPP 🔥
  const cobrarPorWsp = (cliente: string, monto: number, total: number) => {
    const mensaje = `Hola ${cliente} 👋. Te recuerdo que tienes un préstamo activo con nosotros.\n\n💰 Cuota pendiente: $${monto.toLocaleString()}\n📉 Deuda Total: $${total.toLocaleString()}\n\nPor favor regularizar a la brevedad. Atte, Imperio Financiero.`;
    
    // Esto abre WhatsApp automáticamente con el mensaje escrito
    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const crearNuevo = async () => {
    if (!cliente || monto <= 0) return alert("Datos incorrectos");
    await fetch(`${API_URL}/crear-prestamo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_id: usuario, cliente, monto, tasa, plazo: meses, tipo_interes: tipoInteres }),
    });
    setCliente(""); actualizar();
  };

  const pagarCuota = async (id: number) => {
    await fetch(`${API_URL}/pagar-cuota/${id}`, { method: "POST" }); actualizar();
  };

  const saldarDeuda = async (id: number) => {
    if (!confirm("¿Confirmas el pago total?")) return;
    await fetch(`${API_URL}/saldar-deuda-completa/${id}`, { method: "PUT" }); actualizar();
  };
  
  const resetCuenta = async () => {
    if (prompt(`Escribe BORRAR para eliminar todo de ${usuario}`) !== "BORRAR") return;
    await fetch(`${API_URL}/reset-cuenta/${usuario}`, { method: "DELETE" }); actualizar(); alert("Cuenta en 0");
  };

  const Card = ({ titulo, valor, color, icono }: any) => (
    <div className="p-4 rounded-xl shadow-lg border border-gray-700 bg-gray-800 flex justify-between items-center">
      <div><p className="text-gray-400 text-xs font-bold uppercase">{titulo}</p><p className={`text-2xl font-bold ${color}`}>${valor.toLocaleString()}</p></div>
      <div className="text-3xl opacity-50">{icono}</div>
    </div>
  );

  // --- PANTALLA DE LOGIN ---
  if (!estaLogueado) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <h1 className="text-5xl font-bold text-yellow-500 mb-2">🏦 Imperio</h1>
        <p className="text-gray-400 mb-8">Gestión de Préstamos Segura 🔒</p>
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm shadow-2xl space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-bold ml-1">USUARIO</label>
            <input type="text" placeholder="Ej: Marti" className="w-full bg-gray-700 p-3 rounded text-white border border-gray-600 focus:border-yellow-500 outline-none" onChange={e => setTempUsuario(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-bold ml-1">CONTRASEÑA</label>
            <input type="password" placeholder="******" className="w-full bg-gray-700 p-3 rounded text-white border border-gray-600 focus:border-yellow-500 outline-none" onChange={e => setPassword(e.target.value)} />
          </div>
          <button onClick={entrar} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg">ENTRAR 🚀</button>
          <button onClick={registrarse} className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 rounded-lg transition-all text-sm">Crear Cuenta Nueva</button>
        </div>
      </div>
    );
  }

  // --- PANTALLA PRINCIPAL ---
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400">Hola, {usuario} 👋</h1>
        <div className="flex gap-2">
           <button onClick={resetCuenta} className="bg-red-900/30 text-red-400 border border-red-900 px-3 py-1 rounded text-xs font-bold hover:bg-red-900/50">RESET</button>
           <button onClick={logout} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-xs font-bold">SALIR</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card titulo="Invertido" valor={dashboard.capital_invertido} color="text-blue-400" icono="📉" />
        <Card titulo="Ganancia" valor={dashboard.ganancia_esperada} color="text-green-400" icono="📈" />
        <Card titulo="Recaudado" valor={dashboard.dinero_recaudado} color="text-yellow-400" icono="💰" />
        <Card titulo="Por Cobrar" valor={dashboard.por_cobrar} color="text-red-400" icono="⏳" />
      </div>

      <div className="bg-gray-800 p-6 rounded-xl max-w-6xl mx-auto mb-8 border border-gray-700 shadow-xl">
        <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase">Nuevo Préstamo</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <input type="text" placeholder="Cliente..." value={cliente} onChange={e => setCliente(e.target.value)} className="md:col-span-2 bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none" />
          <input type="number" placeholder="Monto" value={monto} onChange={e => setMonto(Number(e.target.value))} className="bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none" />
          <input type="number" placeholder="Tasa %" value={tasa} onChange={e => setTasa(Number(e.target.value))} className="bg-gray-700 p-2 rounded text-yellow-400 font-bold border border-gray-600 outline-none" />
          <input type="number" placeholder="Meses" value={meses} onChange={e => setMeses(Number(e.target.value))} className="bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none" />
          <button onClick={crearNuevo} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded">CREAR</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4">
        {finanzas.map((p) => (
          <div key={p.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            
            {/* CABECERA DEL PRÉSTAMO */}
            <div className="p-4 flex justify-between items-center bg-gray-800/50 border-b border-gray-700">
              <div>
                <h3 className="font-bold text-lg">{p.cliente}</h3>
                <p className="text-xs text-gray-400">Prestado: ${p.monto.toLocaleString()} | Tasa: {p.tasa}%</p>
              </div>
              
              <div className="text-right flex items-center gap-4">
                <div>
                    <p className="text-xl font-bold text-green-400">${p.total_final.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-500">TOTAL</p>
                </div>
                
                {/* BOTONES DE ACCIÓN (WhatsApp + Pagar) */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => cobrarPorWsp(p.cliente, p.monto, p.total_final)}
                    className="bg-green-500 hover:bg-green-400 text-white p-2 rounded-full shadow border border-green-300 transition-transform hover:scale-110"
                    title="Cobrar por WhatsApp"
                  >
                    📱
                  </button>
                  
                  <button onClick={() => saldarDeuda(p.id)} className="bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded-full shadow transition-transform hover:scale-110">💰</button>
                </div>

              </div>
            </div>

            {/* CUOTAS */}
            <div className="p-3 bg-gray-900/30 grid grid-cols-3 md:grid-cols-6 gap-2">
              {p.detalle_cuotas.map((c: any) => (
                <div key={c.id} onClick={() => c.estado !== 'Pagada' && pagarCuota(c.id)} 
                     className={`p-2 rounded text-center border text-xs cursor-pointer select-none transition-all ${c.estado === 'Pagada' ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                  <p>Cuota {c.numero_cuota}</p><p className="font-bold">${c.monto_cuota.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}