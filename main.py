import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "imperio.db"

def iniciar_db():
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    
    # TABLA 1: Préstamos (Ahora con 'usuario_id')
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prestamos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id TEXT,  -- <--- ESTO ES NUEVO: ¿De quién es el préstamo?
            cliente TEXT,
            monto REAL,
            tasa REAL,
            plazo INTEGER,
            tipo_interes TEXT,
            total_final REAL,
            estado TEXT DEFAULT 'Activo',
            fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # TABLA 2: Cuotas (Igual que antes)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cuotas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prestamo_id INTEGER,
            numero_cuota INTEGER,
            monto_cuota REAL,
            estado TEXT DEFAULT 'Pendiente',
            FOREIGN KEY(prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
        )
    """)
    
    conexion.commit()
    conexion.close()

iniciar_db()

class PrestamoModel(BaseModel):
    usuario_id: str # <--- Ahora es obligatorio decir quién eres
    cliente: str
    monto: float
    tasa: float
    plazo: int
    tipo_interes: str

# --- RUTAS ---

@app.post("/crear-prestamo")
def crear(prestamo: PrestamoModel):
    tasa_decimal = prestamo.tasa / 100
    total = 0
    
    if prestamo.tipo_interes == "simple":
        total = prestamo.monto * (1 + tasa_decimal)
    else:
        total = prestamo.monto * ((1 + tasa_decimal) ** prestamo.plazo)
    
    valor_cuota = total / prestamo.plazo
    
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    
    cursor.execute("""
        INSERT INTO prestamos (usuario_id, cliente, monto, tasa, plazo, tipo_interes, total_final, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')
    """, (prestamo.usuario_id, prestamo.cliente, prestamo.monto, prestamo.tasa, prestamo.plazo, prestamo.tipo_interes, round(total)))
    
    id_prestamo = cursor.lastrowid
    
    for i in range(1, prestamo.plazo + 1):
        cursor.execute("""
            INSERT INTO cuotas (prestamo_id, numero_cuota, monto_cuota, estado)
            VALUES (?, ?, ?, 'Pendiente')
        """, (id_prestamo, i, round(valor_cuota)))
        
    conexion.commit()
    conexion.close()
    return {"mensaje": "Préstamo creado"}

# AHORA PEDIMOS EL USUARIO EN LA URL
@app.get("/mis-finanzas/{usuario}")
def obtener_todo(usuario: str):
    conexion = sqlite3.connect(DB_NAME)
    conexion.row_factory = sqlite3.Row
    cursor = conexion.cursor()
    
    # FILTRAMOS POR USUARIO
    cursor.execute("SELECT * FROM prestamos WHERE estado = 'Activo' AND usuario_id = ? ORDER BY id DESC", (usuario,))
    prestamos = [dict(row) for row in cursor.fetchall()]
    
    datos_completos = []
    for p in prestamos:
        cursor.execute("SELECT * FROM cuotas WHERE prestamo_id = ? ORDER BY numero_cuota ASC", (p["id"],))
        p["detalle_cuotas"] = [dict(row) for row in cursor.fetchall()]
        datos_completos.append(p)
        
    conexion.close()
    return datos_completos

@app.post("/pagar-cuota/{id_cuota}")
def pagar_cuota(id_cuota: int):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("UPDATE cuotas SET estado = 'Pagada' WHERE id = ?", (id_cuota,))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Cuota pagada"}

@app.put("/saldar-deuda-completa/{id_prestamo}")
def saldar_completo(id_prestamo: int):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("UPDATE prestamos SET estado = 'Finalizado' WHERE id = ?", (id_prestamo,))
    cursor.execute("UPDATE cuotas SET estado = 'Pagada' WHERE prestamo_id = ?", (id_prestamo,))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Deuda archivada"}

# DASHBOARD FILTRADO POR USUARIO
@app.get("/dashboard/{usuario}")
def obtener_metricas(usuario: str):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    
    # Agregamos "AND usuario_id = ?" a todas las consultas
    cursor.execute("SELECT SUM(monto) FROM prestamos WHERE usuario_id = ?", (usuario,))
    res = cursor.fetchone()[0]
    capital_total = res if res else 0
    
    cursor.execute("SELECT SUM(total_final) FROM prestamos WHERE usuario_id = ?", (usuario,))
    res = cursor.fetchone()[0]
    total_esperado = res if res else 0
    
    # Esta consulta es más compleja: Sumar cuotas pagadas DE LOS PRÉSTAMOS DE ESTE USUARIO
    cursor.execute("""
        SELECT SUM(c.monto_cuota) 
        FROM cuotas c
        JOIN prestamos p ON c.prestamo_id = p.id
        WHERE c.estado = 'Pagada' AND p.usuario_id = ?
    """, (usuario,))
    
    res = cursor.fetchone()[0]
    recaudado = res if res else 0
    
    por_cobrar = total_esperado - recaudado
    
    # Ganancia esperada total
    ganancia_esperada = total_esperado - capital_total

    conexion.close()
    
    return {
        "capital_invertido": capital_total,
        "ganancia_esperada": ganancia_esperada,
        "dinero_recaudado": recaudado,
        "por_cobrar": por_cobrar
    }

# --- ¡EL BOTÓN NUCLEAR! ---
# Borra TODO lo de un usuario específico
@app.delete("/reset-cuenta/{usuario}")
def borrar_cuenta(usuario: str):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    
    # Borramos todos los préstamos de ese usuario (las cuotas se borran solas por efecto cascada)
    cursor.execute("DELETE FROM prestamos WHERE usuario_id = ?", (usuario,))
    
    conexion.commit()
    conexion.close()
    return {"mensaje": "Cuenta reiniciada a cero"}