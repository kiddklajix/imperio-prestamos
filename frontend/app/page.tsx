"use client";
import { useState, useEffect } from "react";

// --- TU URL DE RENDER ---
const API_URL = "https://backend-imperio-mgux.onrender.com"; 

export default function Home() {
  const [usuario, setUsuario] = useState("");
  const [tempUsuario, setTempUsuario] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [estaLogueado, setEstaLogueado] = useState(false);

  // Estados APP
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState(""); 
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

  // --- SEGURIDAD ---
  const registrarse = async () => {
    if (!tempUsuario || !password) return alert("Faltan datos");
    const res = await fetch(`${API_URL}/registro`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: tempUsuario, password })
    });
    if (res.ok) alert("¡Usuario creado! Ahora dale a ENTRAR.");
    else alert("Error al crear usuario");
  };

  const entrar = async () => {
    if (!tempUsuario || !password) return alert("Faltan datos");
    const res = await fetch(`${API_URL}/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: tempUsuario, password })
    });
    if (res.ok) { setUsuario(tempUsuario); setEstaLogueado(true); } 
    else alert("Datos incorrectos 🚫");
  };

  const logout = () => { setUsuario(""); setPassword(""); setEstaLogueado(false); setFinanzas([]); };

  // --- FUNCIONES DEL SISTEMA ---
  
  // 🔥 COBRANZA INTELIGENTE V4.0 (Saldo Real + Fix Teléfono) 🔥
  const cobrarPorWsp = (prestamo: any) => {
    // 1. Buscar la primera cuota pendiente
    const cuotaPendiente = prestamo.detalle_cuotas.find((c: any) => c.estado === 'Pendiente');
    
    if (!cuotaPendiente) {
        return alert("✅ ¡Este cliente ya pagó todo! No hay nada que cobrar.");
    }

    // 2. CALCULAR SALDO REAL (Sumar solo lo pendiente)
    // Recorremos todas las cuotas, filtramos las pendientes y sumamos sus montos
    const saldoReal = prestamo.detalle_cuotas
        .filter((c: any) => c.estado === 'Pendiente')
        .reduce((acumulado: number, c: any) => acumulado + c.monto_cuota, 0);

    const numeroCuota = cuotaPendiente.numero_cuota;
    const totalCuotas = prestamo.plazo;
    const montoACobrar = cuotaPendiente.monto_cuota;
    const nombreCliente = prestamo.cliente;
    const fono = prestamo.telefono;

    // 3. LIMPIEZA Y CORRECCIÓN DE TELÉFONO (+56 Automático)
    let numero = fono ? fono.toString().replace(/\D/g, "") : ""; // Borrar todo lo que no sea número

    if (!numero || numero.length < 8) {
        const ingreso = prompt(`⚠️ No hay teléfono para ${nombreCliente}.\nIngrésalo aquí (ej: 912345678):`);
        if (!ingreso) return;
        numero = ingreso.replace(/\D/g, "");
    }

    // SI EL NÚMERO EMPIEZA CON 9 Y TIENE 9 DÍGITOS (Formato chileno sin código) -> Le agregamos 56
    // O si simplemente no empieza con 56, se lo chantamos igual.
    if (!numero.startsWith("56")) {
        numero = "56" + numero;
    }

    // 4. MENSAJE CON SALDO ACTUALIZADO
    const mensaje = `Hola ${nombreCliente} 👋. Te recuerdo el pago de tu préstamo.\n\n🔔 Cuota: ${numeroCuota}/${totalCuotas}\n💰 Valor cuota: $${montoACobrar.toLocaleString()}\n📉 Saldo restante deuda: $${saldoReal.toLocaleString()}\n\nAtte, Imperio Financiero.`;
    
    // 5. Enviar
    const url = `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  const crearNuevo = async () => {
    if (!cliente || monto <= 0) return alert("Datos incorrectos");
    await fetch(`${API_URL}/crear-prestamo`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario_id: usuario, cliente, telefono, monto, tasa, plazo: meses, tipo_interes: tipoInteres }),
    });
    setCliente(""); setTelefono(""); actualizar(); 
  };

  const pagarCuota = async (id: number) => { await fetch(`${API_URL}/pagar-cuota/${id}`, { method: "POST" }); actualizar(); };
  
  const saldarDeuda = async (id: number) => { 
    if (!confirm("¿Saldar todo?")) return; 
    await fetch(`${API_URL}/saldar-deuda-completa/${id}`, { method: "PUT" }); actualizar(); 
  };
  
  const resetCuenta = async () => { 
    if (prompt("Escribe BORRAR") !== "BORRAR") return; 
    await fetch(`${API_URL}/reset-cuenta/${usuario}`, { method: "DELETE" }); actualizar(); 
  };

  const Card = ({ titulo, valor, color, icono }: any) => (
    <div className="p-4 rounded-xl shadow-lg border border-gray-700 bg-gray-800 flex justify-between items-center">
      <div><p className="text-gray-400 text-xs font-bold uppercase">{titulo}</p><p className={`text-2xl font-bold ${color}`}>${valor.toLocaleString()}</p></div>
      <div className="text-3xl opacity-50">{icono}</div>
    </div>
  );

  if (!estaLogueado) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 text-white font-sans">
        <h1 className="text-5xl font-bold text-yellow-500 mb-2">🏦 Imperio</h1>
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm space-y-4">
          <input type="text" placeholder="Usuario" className="w-full bg-gray-700 p-3 rounded text-white border border-gray-600 outline-none" onChange={e => setTempUsuario(e.target.value)} />
          <input type="password" placeholder="Contraseña" className="w-full bg-gray-700 p-3 rounded text-white border border-gray-600 outline-none" onChange={e => setPassword(e.target.value)} />
          <button onClick={entrar} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg">ENTRAR</button>
          <button onClick={registrarse} className="w-full text-gray-400 text-xs hover:text-white">Crear Cuenta</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="flex justify-between items-center mb-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400">Hola, {usuario} 👋</h1>
        <div className="flex gap-2">
           <button onClick={resetCuenta} className="bg-red-900/30 text-red-400 border border-red-900 px-3 py-1 rounded text-xs font-bold">RESET</button>
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <input type="text" placeholder="Nombre Cliente..." value={cliente} onChange={e => setCliente(e.target.value)} className="md:col-span-4 bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none" />
          <input type="text" placeholder="WhatsApp (ej: 912345678)" value={telefono} onChange={e => setTelefono(e.target.value)} className="md:col-span-4 bg-gray-700 p-2 rounded text-green-400 border border-gray-600 outline-none" />
          <input type="number" placeholder="Monto" value={monto} onChange={e => setMonto(Number(e.target.value))} className="md:col-span-2 bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none" />
          <input type="number" placeholder="%" value={tasa} onChange={e => setTasa(Number(e.target.value))} className="md:col-span-1 bg-gray-700 p-2 rounded text-yellow-400 font-bold border border-gray-600 outline-none text-center" />
          <input type="number" placeholder="Mes" value={meses} onChange={e => setMeses(Number(e.target.value))} className="md:col-span-1 bg-gray-700 p-2 rounded text-white border border-gray-600 outline-none text-center" />
          <button onClick={crearNuevo} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded md:col-span-12 mt-2">CREAR PRÉSTAMO</button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4">
        {finanzas.map((p) => (
          <div key={p.id} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-gray-800/50 border-b border-gray-700">
              <div>
                <h3 className="font-bold text-lg">{p.cliente}</h3>
                <p className="text-xs text-gray-400">📞 {p.telefono || "---"} | ${p.monto.toLocaleString()} | {p.tasa}%</p>
              </div>
              <div className="text-right flex items-center gap-4">
                <div><p className="text-xl font-bold text-green-400">${p.total_final.toLocaleString()}</p></div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => cobrarPorWsp(p)} 
                    className="bg-green-500 hover:bg-green-400 text-white p-2 rounded-full shadow border border-green-300 hover:scale-110 transition-transform"
                    title="Cobrar Siguiente Cuota"
                  >
                    📱
                  </button>
                  <button onClick={() => saldarDeuda(p.id)} className="bg-yellow-600 hover:bg-yellow-500 text-white p-2 rounded-full shadow hover:scale-110 transition-transform">💰</button>
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-900/30 grid grid-cols-3 md:grid-cols-6 gap-2">
              {p.detalle_cuotas.map((c: any) => (
                <div key={c.id} onClick={() => c.estado !== 'Pagada' && pagarCuota(c.id)} className={`p-2 rounded text-center border text-xs cursor-pointer select-none ${c.estado === 'Pagada' ? 'bg-green-900/30 border-green-800 text-green-400' : 'bg-gray-700 border-gray-600 text-gray-300'}`}>
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