import sqlite3
from fastapi import FastAPI, HTTPException
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
    
    # TABLA 1: Usuarios (NUEVA 🔒)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usuarios (
            nombre TEXT PRIMARY KEY,
            password TEXT
        )
    """)

    # TABLA 2: Préstamos
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS prestamos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            usuario_id TEXT,
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
    
    # TABLA 3: Cuotas
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

# --- MODELOS DE DATOS ---
class UsuarioModel(BaseModel):
    nombre: str
    password: str

class PrestamoModel(BaseModel):
    usuario_id: str
    cliente: str
    monto: float
    tasa: float
    plazo: int
    tipo_interes: str

# --- RUTAS DE SEGURIDAD 👮‍♂️ ---

@app.post("/registro")
def registrar_usuario(usuario: UsuarioModel):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    try:
        cursor.execute("INSERT INTO usuarios (nombre, password) VALUES (?, ?)", (usuario.nombre, usuario.password))
        conexion.commit()
        return {"mensaje": "Usuario creado con éxito"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="El usuario ya existe")
    finally:
        conexion.close()

@app.post("/login")
def login(usuario: UsuarioModel):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("SELECT password FROM usuarios WHERE nombre = ?", (usuario.nombre,))
    resultado = cursor.fetchone()
    conexion.close()
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    if resultado[0] != usuario.password:
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
        
    return {"mensaje": "Login exitoso", "usuario": usuario.nombre}

# --- RUTAS DEL SISTEMA (IGUAL QUE ANTES) ---

@app.post("/crear-prestamo")
def crear(prestamo: PrestamoModel):
    tasa_decimal = prestamo.tasa / 100
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
        cursor.execute("INSERT INTO cuotas (prestamo_id, numero_cuota, monto_cuota, estado) VALUES (?, ?, ?, 'Pendiente')", (id_prestamo, i, round(valor_cuota)))
        
    conexion.commit()
    conexion.close()
    return {"mensaje": "Préstamo creado"}

@app.get("/mis-finanzas/{usuario}")
def obtener_todo(usuario: str):
    conexion = sqlite3.connect(DB_NAME)
    conexion.row_factory = sqlite3.Row
    cursor = conexion.cursor()
    cursor.execute("SELECT * FROM prestamos WHERE estado = 'Activo' AND usuario_id = ? ORDER BY id DESC", (usuario,))
    prestamos = [dict(row) for row in cursor.fetchall()]
    datos = []
    for p in prestamos:
        cursor.execute("SELECT * FROM cuotas WHERE prestamo_id = ? ORDER BY numero_cuota ASC", (p["id"],))
        p["detalle_cuotas"] = [dict(row) for row in cursor.fetchall()]
        datos.append(p)
    conexion.close()
    return datos

@app.post("/pagar-cuota/{id_cuota}")
def pagar_cuota(id_cuota: int):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("UPDATE cuotas SET estado = 'Pagada' WHERE id = ?", (id_cuota,))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Pagada"}

@app.put("/saldar-deuda-completa/{id_prestamo}")
def saldar_completo(id_prestamo: int):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("UPDATE prestamos SET estado = 'Finalizado' WHERE id = ?", (id_prestamo,))
    cursor.execute("UPDATE cuotas SET estado = 'Pagada' WHERE prestamo_id = ?", (id_prestamo,))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Saldada"}

@app.get("/dashboard/{usuario}")
def obtener_metricas(usuario: str):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("SELECT SUM(monto) FROM prestamos WHERE usuario_id = ?", (usuario,))
    capital = cursor.fetchone()[0] or 0
    cursor.execute("SELECT SUM(total_final) FROM prestamos WHERE usuario_id = ?", (usuario,))
    esperado = cursor.fetchone()[0] or 0
    cursor.execute("SELECT SUM(c.monto_cuota) FROM cuotas c JOIN prestamos p ON c.prestamo_id = p.id WHERE c.estado = 'Pagada' AND p.usuario_id = ?", (usuario,))
    recaudado = cursor.fetchone()[0] or 0
    conexion.close()
    return {
        "capital_invertido": capital,
        "ganancia_esperada": esperado - capital,
        "dinero_recaudado": recaudado,
        "por_cobrar": esperado - recaudado
    }

@app.delete("/reset-cuenta/{usuario}")
def borrar_cuenta(usuario: str):
    conexion = sqlite3.connect(DB_NAME)
    cursor = conexion.cursor()
    cursor.execute("DELETE FROM prestamos WHERE usuario_id = ?", (usuario,))
    conexion.commit()
    conexion.close()
    return {"mensaje": "Reset"}