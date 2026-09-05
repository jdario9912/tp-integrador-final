# Diagrama de Clases UML — App de Entrenadores y Atletas

TP Final · versión 1.0
Modelo de dominio derivado de la hoja de *Requerimientos de Diseño* y del *Product Backlog*.

---

## 1. Clases

### «abstract» Usuario
| Miembro | Tipo |
|---|---|
| − id | UUID |
| − nombre | String |
| − apellido | String |
| − email | String |
| − passwordHash | String |
| − rol | Rol |
| − activo | boolean |
| − fechaRegistro | Date |
| + iniciarSesion(email, pass) | boolean |
| + cerrarSesion() | void |
| + recuperarAcceso(email) | void |

### Entrenador *(extiende Usuario)*
- `+ registrarAtleta(): Atleta`
- `+ crearRutina(): Rutina`
- `+ asignarRutina(a, r): void`
- `+ revisarSesion(s): void`
- `+ crearNota(a, n): void`

### Atleta *(extiende Usuario)*
| Miembro | Tipo |
|---|---|
| − edad | int |
| − altura | float |
| − pesoInicial | float |
| − objetivo | String |
| − nivel | String |
| − lesiones | String |
| − limitaciones | String |
| − fechaInicio | Date |
| − estado | EstadoAtleta |
| + pesoActual() | float |
| + cumplimientoSemanal() | float |

### Rutina
`− id: UUID`, `− nombre: String`, `− objetivo: String`, `− fechaInicio: Date`, `− fechaFin: Date`, `− diasPorSemana: int`, `+ agregarDia(d): void`

### DiaRutina
`− id: UUID`, `− numeroDia: int`, `− nombre: String`, `+ agregarEjercicio(e): void`

### EjercicioRutina
`− id: UUID`, `− nombre: String`, `− orden: int`, `− series: int`, `− repeticiones: int`, `− pesoRecomendado: float`, `− descanso: int`, `− rirRpe: String`, `− notaTecnica: String`

### AsignacionRutina
`− id: UUID`, `− fechaAsignacion: Date`, `− activa: boolean`

### SesionEntrenamiento
`− id: UUID`, `− fecha: Date`, `− estado: EstadoSesion`, `− duracion: int`, `− comentarioAtleta: String`, `− observacionEntrenador: String`, `− revisado: boolean`, `+ iniciar(dia): void`, `+ finalizar(comentario): void`

### SerieRealizada
`− id: UUID`, `− numeroSerie: int`, `− pesoUtilizado: float`, `− repeticiones: int`, `− rpe: String`, `− completada: boolean`, `− omitida: boolean`

### Comida
`− id: UUID`, `− fecha: Date`, `− tipoComida: String`, `− descripcion: String`, `− cantidadAproximada: String`, `− calorias: float [0..1]`, `− proteinas: float [0..1]`, `− foto: String [0..1]`, `− comentario: String`, `− observacionEntrenador: String`, `− revisado: boolean`

### RegistroPeso
`− id: UUID`, `− fecha: Date`, `− peso: float`, `− comentario: String`

### MedidaCorporal
`− id: UUID`, `− fecha: Date`, `− cintura/pecho/brazo/pierna/cadera: float [0..1]`, `− comentario: String`

### FotoProgreso
`− id: UUID`, `− fecha: Date`, `− tipo: TipoFoto`, `− url: String`

### Nota
`− id: UUID`, `− fecha: Date`, `− titulo: String`, `− contenido: String`, `− tipo: TipoNota`, `− leida: boolean`

### Alerta
`− id: UUID`, `− causa: String`, `− fecha: Date`, `− atendida: boolean`

### Enumeraciones
- **Rol**: ENTRENADOR, ATLETA
- **EstadoAtleta**: ACTIVO, NECESITA_REVISION, INACTIVO, SIN_RUTINA, SIN_ACTIVIDAD
- **EstadoSesion**: EN_PROGRESO, FINALIZADA
- **TipoFoto**: FRONTAL, LATERAL, ESPALDA
- **TipoNota**: PRIVADA, VISIBLE_ATLETA

---

## 2. Relaciones

| Origen | Tipo | Destino | Multiplicidad | Etiqueta |
|---|---|---|---|---|
| Usuario | generalización | Entrenador, Atleta | — | herencia |
| Entrenador | agregación | Atleta | 1 → 0..* | gestiona |
| Entrenador | asociación | Rutina | 1 → 0..* | crea |
| Entrenador | asociación | Nota | 1 → 0..* | crea |
| Rutina | composición | DiaRutina | 1 → 1..* | contiene |
| DiaRutina | composición | EjercicioRutina | 1 → 1..* | contiene |
| Atleta | asociación | AsignacionRutina | 1 → 0..* | tiene |
| AsignacionRutina | asociación dirigida | Rutina | → 1 | refiere |
| Atleta | asociación | SesionEntrenamiento | 1 → 0..* | registra |
| SesionEntrenamiento | composición | SerieRealizada | 1 → 1..* | contiene |
| SesionEntrenamiento | asociación dirigida | DiaRutina | → 1 | basada en |
| SerieRealizada | asociación dirigida | EjercicioRutina | → 1 | corresponde a |
| Atleta | asociación | Comida | 1 → 0..* | registra |
| Atleta | asociación | RegistroPeso | 1 → 0..* | registra |
| Atleta | asociación | MedidaCorporal | 1 → 0..* | registra |
| Atleta | asociación | FotoProgreso | 1 → 0..* | sube |
| Atleta | asociación | Alerta | 1 → 0..* | genera |
| Nota | asociación dirigida | Atleta | → 1 | sobre |

---

## 3. Pendiente de refinamiento (PO)
- ¿Una única rutina activa por atleta o varias simultáneas + historial?
- Umbrales concretos del estado «necesita revisión».

---

## 4. Fuente PlantUML

```plantuml
@startuml Diagrama de Clases - App de Entrenadores y Atletas
skinparam classAttributeIconSize 0
hide empty members

enum Rol { ENTRENADOR
ATLETA }
enum EstadoAtleta { ACTIVO
NECESITA_REVISION
INACTIVO
SIN_RUTINA
SIN_ACTIVIDAD }
enum EstadoSesion { EN_PROGRESO
FINALIZADA }
enum TipoFoto { FRONTAL
LATERAL
ESPALDA }
enum TipoNota { PRIVADA
VISIBLE_ATLETA }

abstract class Usuario {
  - id: UUID
  - nombre: String
  - apellido: String
  - email: String
  - passwordHash: String
  - rol: Rol
  - activo: boolean
  - fechaRegistro: Date
  + iniciarSesion(email, pass): boolean
  + cerrarSesion(): void
  + recuperarAcceso(email): void
}

class Entrenador {
  + registrarAtleta(): Atleta
  + crearRutina(): Rutina
  + asignarRutina(a, r): void
  + revisarSesion(s): void
  + crearNota(a, n): void
}

class Atleta {
  - edad: int
  - altura: float
  - pesoInicial: float
  - objetivo: String
  - nivel: String
  - lesiones: String
  - limitaciones: String
  - fechaInicio: Date
  - estado: EstadoAtleta
  + pesoActual(): float
  + cumplimientoSemanal(): float
}

class Rutina {
  - id: UUID
  - nombre: String
  - objetivo: String
  - fechaInicio: Date
  - fechaFin: Date
  - diasPorSemana: int
  + agregarDia(d): void
}

class DiaRutina {
  - id: UUID
  - numeroDia: int
  - nombre: String
  + agregarEjercicio(e): void
}

class EjercicioRutina {
  - id: UUID
  - nombre: String
  - orden: int
  - series: int
  - repeticiones: int
  - pesoRecomendado: float
  - descanso: int
  - rirRpe: String
  - notaTecnica: String
}

class AsignacionRutina {
  - id: UUID
  - fechaAsignacion: Date
  - activa: boolean
}

class SesionEntrenamiento {
  - id: UUID
  - fecha: Date
  - estado: EstadoSesion
  - duracion: int
  - comentarioAtleta: String
  - observacionEntrenador: String
  - revisado: boolean
  + iniciar(dia): void
  + finalizar(comentario): void
}

class SerieRealizada {
  - id: UUID
  - numeroSerie: int
  - pesoUtilizado: float
  - repeticiones: int
  - rpe: String
  - completada: boolean
  - omitida: boolean
}

class Comida {
  - id: UUID
  - fecha: Date
  - tipoComida: String
  - descripcion: String
  - cantidadAproximada: String
  - calorias: float
  - proteinas: float
  - foto: String
  - comentario: String
  - observacionEntrenador: String
  - revisado: boolean
}

class RegistroPeso {
  - id: UUID
  - fecha: Date
  - peso: float
  - comentario: String
}

class MedidaCorporal {
  - id: UUID
  - fecha: Date
  - cintura: float
  - pecho: float
  - brazo: float
  - pierna: float
  - cadera: float
  - comentario: String
}

class FotoProgreso {
  - id: UUID
  - fecha: Date
  - tipo: TipoFoto
  - url: String
}

class Nota {
  - id: UUID
  - fecha: Date
  - titulo: String
  - contenido: String
  - tipo: TipoNota
  - leida: boolean
}

class Alerta {
  - id: UUID
  - causa: String
  - fecha: Date
  - atendida: boolean
}

Usuario <|-- Entrenador
Usuario <|-- Atleta

Entrenador "1" o-- "0..*" Atleta : gestiona >
Entrenador "1" -- "0..*" Rutina : crea >
Entrenador "1" -- "0..*" Nota : crea >

Rutina "1" *-- "1..*" DiaRutina : contiene >
DiaRutina "1" *-- "1..*" EjercicioRutina : contiene >

Atleta "1" -- "0..*" AsignacionRutina : tiene >
AsignacionRutina --> "1" Rutina : refiere >

Atleta "1" -- "0..*" SesionEntrenamiento : registra >
SesionEntrenamiento "1" *-- "1..*" SerieRealizada : contiene >
SesionEntrenamiento --> "1" DiaRutina : basada en >
SerieRealizada --> "1" EjercicioRutina : corresponde a >

Atleta "1" -- "0..*" Comida : registra >
Atleta "1" -- "0..*" RegistroPeso : registra >
Atleta "1" -- "0..*" MedidaCorporal : registra >
Atleta "1" -- "0..*" FotoProgreso : sube >
Atleta "1" -- "0..*" Alerta : genera >

Nota --> "1" Atleta : sobre >

Atleta ..> EstadoAtleta
SesionEntrenamiento ..> EstadoSesion
FotoProgreso ..> TipoFoto
Nota ..> TipoNota
Usuario ..> Rol

note right of AsignacionRutina
  Pendiente PO: ¿una única rutina activa
  o varias simultáneas + historial?
end note

note right of Atleta
  Pendiente PO: umbrales de
  "necesita revisión".
end note
@enduml
```
