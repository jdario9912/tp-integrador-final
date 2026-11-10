# Diagrama de Clases UML — App de Gestión Deportiva

TP Final · versión 1.1
Modelo de dominio derivado de la hoja de *Requerimientos de Diseño* y del *Product Backlog*.

Las clases `User`, `Coach`, `Athlete`, `RefreshToken`, `Exercise` (con los enums `MuscleGroup` y `MuscleRegion`), `Routine`, `RoutineDay`, `RoutineExercise` y `RoutineAssignment` reflejan el código implementado. El resto de las clases todavía es diseño y puede cambiar al implementarse.

---

## 1. Clases

### «abstract» User
| Miembro | Tipo |
|---|---|
| − id | UUID |
| − role | Role |
| − firstName | String |
| − lastName | String |
| − email | String |
| − passwordHash | String |
| − phone | String |
| − active | boolean |
| − createdAt | Instant |
| − updatedAt | Instant |
| − lastLoginAt | Instant |
| − deletedAt | Instant |
| + normalizeEmail(email: String) *{static}* | String |
| + fullName() | String |
| + changeEmail(newEmail: String) | void |
| + changePassword(newPasswordHash: String) | void |
| + recordLogin(at: Instant) | void |
| + deactivate() | void |
| + reactivate() | void |
| + markDeleted(at: Instant) | void |
| + isDeleted() | boolean |

### Coach *(extiende User)*
| Miembro | Tipo |
|---|---|
| − specialty | String |
| − licenseNumber | String |
| − bio | String |
| + builder() | CoachBuilder |
| + isOwnerOf(athlete: Athlete) | boolean |

### Athlete *(extiende User)*
| Miembro | Tipo |
|---|---|
| − coach | Coach |
| − sex | Sex |
| − experienceLevel | ExperienceLevel |
| − status | AthleteStatus |
| − birthDate | LocalDate |
| − heightCm | BigDecimal |
| − initialWeightKg | BigDecimal |
| − goal | String |
| − injuries | String |
| − limitations | String |
| − availableDays | Short |
| − startDate | LocalDate |
| + builder() | AthleteBuilder |
| + assignCoach(newCoach: Coach) | void |
| + unassignCoach() | void |
| + changeStatus(newStatus: AthleteStatus) | void |
| + setAvailableDays(days: Short) | void |
| + age(today: LocalDate) | OptionalInt |

### «abstract» UserFactory\<R, U extends User\> *(Factory Method)*
Centraliza la creación de usuarios: hashea la contraseña y delega en cada subclase qué `User` concreto arma. Las subclases usan el `builder()` de la entidad.

| Miembro | Tipo |
|---|---|
| − passwordEncoder | PasswordEncoder |
| + create(request: R) *{final}* | U |
| # rawPassword(request: R) *{abstract}* | String |
| # instantiate(request: R, passwordHash: String) *{abstract}* | U |

### CoachFactory *(extiende UserFactory\<RegisterCoachRequest, Coach\>)*
| Miembro | Tipo |
|---|---|
| # rawPassword(request: RegisterCoachRequest) | String |
| # instantiate(request: RegisterCoachRequest, passwordHash: String) | Coach |

### AthleteFactory *(extiende UserFactory\<NewAthlete, Athlete\>)*
`NewAthlete` agrupa el `CreateAthleteRequest` y el `Coach` autenticado.

| Miembro | Tipo |
|---|---|
| # rawPassword(newAthlete: NewAthlete) | String |
| # instantiate(newAthlete: NewAthlete, passwordHash: String) | Athlete |

### RefreshToken
| Miembro | Tipo |
|---|---|
| + HASH_LENGTH *{static}* | int = 64 |
| − id | UUID |
| − user | User |
| − tokenHash | String |
| − issuedAt | Instant |
| − expiresAt | Instant |
| − revoked | boolean |
| + revoke() | void |
| + isActive(now: Instant) | boolean |

### Exercise
Ejercicio del catálogo (US-38). Sin autor (`createdBy` null) es un ejercicio del sistema: lo ven todos los entrenadores y nadie lo edita. Baja lógica con `deletedAt`.

| Miembro | Tipo |
|---|---|
| − id | UUID |
| − muscleGroup | MuscleGroup |
| − createdBy | Coach [0..1] |
| − name | String |
| − description | String [0..1] |
| − videoUrl | String [0..1] |
| − createdAt | Instant |
| − updatedAt | Instant |
| − deletedAt | Instant |
| + builder() | ExerciseBuilder |
| + rename(newName: String) | void |
| + isGlobal() | boolean |
| + isOwnedBy(coachId: UUID) | boolean |
| + markDeleted(at: Instant) | void |
| + isDeleted() | boolean |

### Routine
Rutina de entrenamiento del entrenador (US-13). `template` la marca como plantilla reutilizable para distintos atletas. Sus días (`RoutineDay`) se configuran en US-14 y `duplicate` crea una copia independiente (US-15). Mientras se configura puede no tener días ni ejercicios: la multiplicidad 1..* se exige al asignarla a un atleta (US-16), con `isComplete`.

| Miembro | Tipo |
|---|---|
| − id | UUID |
| − coach | Coach |
| − name | String |
| − description | String [0..1] |
| − goal | String [0..1] |
| − daysPerWeek | Short [0..1] |
| − durationWeeks | Short [0..1] |
| − template | boolean |
| − createdAt | Instant |
| − updatedAt | Instant |
| − days | List&lt;RoutineDay&gt; |
| + builder() | RoutineBuilder |
| + rename(newName: String) | void |
| + isOwnedBy(coachId: UUID) | boolean |
| + isComplete() | boolean |
| + addDay(name: String) | RoutineDay |
| + newDay(name: String) | RoutineDay |
| + replaceDays(ordered: List&lt;RoutineDay&gt;) | void |
| + duplicate(newName: String) | Routine |

### RoutineDay
Día de una rutina (US-14). `dayNumber` es su posición dentro de la rutina, desde 1.

| Miembro | Tipo |
|---|---|
| − id | UUID |
| − routine | Routine |
| − dayNumber | short |
| − name | String |
| − exercises | List&lt;RoutineExercise&gt; |
| + rename(newName: String) | void |
| + addExercise(exercise: RoutineExercise) | void |
| + replaceExercises(ordered: List&lt;RoutineExercise&gt;) | void |

### RoutineExercise
Ejercicio del catálogo planificado en un día (US-14). `sortOrder` es su posición dentro del día, desde 0; `rest` está en segundos; `rirRpe` es «RIR n» (0 a 10) o «RPE n» (1 a 10, admite medios puntos).

| Miembro | Tipo |
|---|---|
| − id | UUID |
| − routineDay | RoutineDay |
| − exercise | Exercise |
| − sortOrder | short |
| − sets | short |
| − reps | short |
| − recommendedWeight | BigDecimal [0..1] |
| − rest | Short [0..1] |
| − rirRpe | String [0..1] |
| − techniqueNote | String [0..1] |
| + builder() | RoutineExerciseBuilder |

### RoutineAssignment
Rutina asignada a un atleta (US-16). `assignmentDate` es «hoy» en la zona de la app al asignarla. Cada atleta tiene a lo sumo una activa: al asignarle otra (con confirmación), la anterior pasa a inactiva con `deactivate` y queda en su historial.

| Miembro | Tipo |
|---|---|
| − id | UUID |
| − athlete | Athlete |
| − routine | Routine |
| − assignmentDate | LocalDate |
| − active | boolean |
| + builder() | RoutineAssignmentBuilder |
| + deactivate() | void |

### TrainingSession
`− id: UUID`, `− date: Date`, `− status: SessionStatus`, `− duration: int`, `− athleteComment: String`, `− coachFeedback: String`, `− reviewed: boolean`, `+ start(day): void`, `+ finish(comment): void`

### PerformedSet
`− id: UUID`, `− setNumber: int`, `− weightUsed: float`, `− reps: int`, `− rpe: String`, `− completed: boolean`, `− skipped: boolean`

### Meal
`− id: UUID`, `− date: Date`, `− mealType: String`, `− description: String`, `− approximateQuantity: String`, `− calories: float [0..1]`, `− protein: float [0..1]`, `− photo: String [0..1]`, `− comment: String`, `− coachFeedback: String`, `− reviewed: boolean`

### WeightLog
`− id: UUID`, `− date: Date`, `− weight: float`, `− comment: String`

### BodyMeasurement
`− id: UUID`, `− date: Date`, `− waist/chest/arm/leg/hip: float [0..1]`, `− comment: String`

### ProgressPhoto
`− id: UUID`, `− date: Date`, `− type: PhotoType`, `− url: String`

### Note
`− id: UUID`, `− date: Date`, `− title: String`, `− content: String`, `− type: NoteType`, `− read: boolean`

### Alert
`− id: UUID`, `− cause: String`, `− date: Date`, `− handled: boolean`

### Enumeraciones
- **Role**: COACH, ATHLETE
- **Sex**: MALE, FEMALE, OTHER
- **ExperienceLevel**: BEGINNER, INTERMEDIATE, ADVANCED
- **AthleteStatus**: ACTIVE, NEEDS_REVIEW, NO_ROUTINE, NO_ACTIVITY, INACTIVE
- **MuscleGroup** (`displayName`, `region`): CHEST, BACK, SHOULDERS, BICEPS, TRICEPS, FOREARMS, ABS, QUADRICEPS, HAMSTRINGS, GLUTES, CALVES, FULL_BODY
- **MuscleRegion**: UPPER, CORE, LOWER, FULL
- **SessionStatus**: IN_PROGRESS, FINISHED
- **PhotoType**: FRONT, SIDE, BACK
- **NoteType**: PRIVATE, VISIBLE_TO_ATHLETE

---

## 2. Relaciones

| Origen | Tipo | Destino | Multiplicidad | Etiqueta |
|---|---|---|---|---|
| User | generalización | Coach, Athlete | — | inheritance |
| User | asociación | RefreshToken | 1 → 0..* | issues |
| UserFactory | generalización | CoachFactory, AthleteFactory | — | inheritance |
| CoachFactory | dependencia | Coach | — | creates |
| AthleteFactory | dependencia | Athlete | — | creates |
| Coach | agregación | Athlete | 0..1 → 0..* | manages |
| Coach | asociación | Exercise | 0..1 → 0..* | contributes |
| MuscleGroup | asociación | Exercise | 1 → 0..* | classifies |
| Coach | asociación | Routine | 1 → 0..* | creates |
| Coach | asociación | Note | 1 → 0..* | writes |
| Routine | composición | RoutineDay | 1 → 1..* | contains |
| RoutineDay | composición | RoutineExercise | 1 → 1..* | contains |
| RoutineExercise | asociación dirigida | Exercise | → 1 | is planned from |
| Athlete | asociación | RoutineAssignment | 1 → 0..* | has |
| RoutineAssignment | asociación dirigida | Routine | → 1 | refers to |
| Athlete | asociación | TrainingSession | 1 → 0..* | logs |
| TrainingSession | composición | PerformedSet | 1 → 1..* | contains |
| TrainingSession | asociación dirigida | RoutineDay | → 1 | based on |
| PerformedSet | asociación dirigida | RoutineExercise | → 1 | corresponds to |
| Athlete | asociación | Meal | 1 → 0..* | logs |
| Athlete | asociación | WeightLog | 1 → 0..* | logs |
| Athlete | asociación | BodyMeasurement | 1 → 0..* | logs |
| Athlete | asociación | ProgressPhoto | 1 → 0..* | uploads |
| Athlete | asociación | Alert | 1 → 0..* | triggers |
| Note | asociación dirigida | Athlete | → 1 | about |

---

## 3. Pendiente de refinamiento (PO)
- Umbrales concretos del estado «necesita revisión» (`NEEDS_REVIEW`).

---

## 4. Fuente PlantUML

```plantuml
@startuml Class Diagram - Coaches and Athletes App
skinparam classAttributeIconSize 0
hide empty members

enum Role { COACH
ATHLETE }
enum Sex { MALE
FEMALE
OTHER }
enum ExperienceLevel { BEGINNER
INTERMEDIATE
ADVANCED }
enum AthleteStatus { ACTIVE
NEEDS_REVIEW
NO_ROUTINE
NO_ACTIVITY
INACTIVE }
enum MuscleGroup { CHEST
BACK
SHOULDERS
BICEPS
TRICEPS
FOREARMS
ABS
QUADRICEPS
HAMSTRINGS
GLUTES
CALVES
FULL_BODY }
enum MuscleRegion { UPPER
CORE
LOWER
FULL }
enum SessionStatus { IN_PROGRESS
FINISHED }
enum PhotoType { FRONT
SIDE
BACK }
enum NoteType { PRIVATE
VISIBLE_TO_ATHLETE }

abstract class User {
  - id: UUID
  - role: Role
  - firstName: String
  - lastName: String
  - email: String
  - passwordHash: String
  - phone: String
  - active: boolean
  - createdAt: Instant
  - updatedAt: Instant
  - lastLoginAt: Instant
  - deletedAt: Instant
  + {static} normalizeEmail(email: String): String
  + fullName(): String
  + changeEmail(newEmail: String): void
  + changePassword(newPasswordHash: String): void
  + recordLogin(at: Instant): void
  + deactivate(): void
  + reactivate(): void
  + markDeleted(at: Instant): void
  + isDeleted(): boolean
}

class Coach {
  - specialty: String
  - licenseNumber: String
  - bio: String
  + {static} builder(): CoachBuilder
  + isOwnerOf(athlete: Athlete): boolean
}

class Athlete {
  - coach: Coach
  - sex: Sex
  - experienceLevel: ExperienceLevel
  - status: AthleteStatus
  - birthDate: LocalDate
  - heightCm: BigDecimal
  - initialWeightKg: BigDecimal
  - goal: String
  - injuries: String
  - limitations: String
  - availableDays: Short
  - startDate: LocalDate
  + {static} builder(): AthleteBuilder
  + assignCoach(newCoach: Coach): void
  + unassignCoach(): void
  + changeStatus(newStatus: AthleteStatus): void
  + setAvailableDays(days: Short): void
  + age(today: LocalDate): OptionalInt
}

abstract class "UserFactory<R, U extends User>" as UserFactory {
  - passwordEncoder: PasswordEncoder
  + create(request: R): U {final}
  # {abstract} rawPassword(request: R): String
  # {abstract} instantiate(request: R, passwordHash: String): U
}

class CoachFactory {
  # rawPassword(request: RegisterCoachRequest): String
  # instantiate(request: RegisterCoachRequest, passwordHash: String): Coach
}

class AthleteFactory {
  # rawPassword(newAthlete: NewAthlete): String
  # instantiate(newAthlete: NewAthlete, passwordHash: String): Athlete
}

class RefreshToken {
  + {static} HASH_LENGTH: int = 64
  - id: UUID
  - user: User
  - tokenHash: String
  - issuedAt: Instant
  - expiresAt: Instant
  - revoked: boolean
  + revoke(): void
  + isActive(now: Instant): boolean
}

class Exercise {
  - id: UUID
  - muscleGroup: MuscleGroup
  - createdBy: Coach [0..1]
  - name: String
  - description: String [0..1]
  - videoUrl: String [0..1]
  - createdAt: Instant
  - updatedAt: Instant
  - deletedAt: Instant
  + {static} builder(): ExerciseBuilder
  + rename(newName: String): void
  + isGlobal(): boolean
  + isOwnedBy(coachId: UUID): boolean
  + markDeleted(at: Instant): void
  + isDeleted(): boolean
}

class Routine {
  - id: UUID
  - coach: Coach
  - name: String
  - description: String [0..1]
  - goal: String [0..1]
  - daysPerWeek: Short [0..1]
  - durationWeeks: Short [0..1]
  - template: boolean
  - createdAt: Instant
  - updatedAt: Instant
  - days: List<RoutineDay>
  + {static} builder(): RoutineBuilder
  + rename(newName: String): void
  + isOwnedBy(coachId: UUID): boolean
  + isComplete(): boolean
  + addDay(name: String): RoutineDay
  + newDay(name: String): RoutineDay
  + replaceDays(ordered: List<RoutineDay>): void
  + duplicate(newName: String): Routine
}

class RoutineDay {
  - id: UUID
  - routine: Routine
  - dayNumber: short
  - name: String
  - exercises: List<RoutineExercise>
  + rename(newName: String): void
  + addExercise(exercise: RoutineExercise): void
  + replaceExercises(ordered: List<RoutineExercise>): void
}

class RoutineExercise {
  - id: UUID
  - routineDay: RoutineDay
  - exercise: Exercise
  - sortOrder: short
  - sets: short
  - reps: short
  - recommendedWeight: BigDecimal [0..1]
  - rest: Short [0..1]
  - rirRpe: String [0..1]
  - techniqueNote: String [0..1]
  + {static} builder(): RoutineExerciseBuilder
}

class RoutineAssignment {
  - id: UUID
  - athlete: Athlete
  - routine: Routine
  - assignmentDate: LocalDate
  - active: boolean
  + {static} builder(): RoutineAssignmentBuilder
  + deactivate(): void
}

class TrainingSession {
  - id: UUID
  - date: Date
  - status: SessionStatus
  - duration: int
  - athleteComment: String
  - coachFeedback: String
  - reviewed: boolean
  + start(day): void
  + finish(comment): void
}

class PerformedSet {
  - id: UUID
  - setNumber: int
  - weightUsed: float
  - reps: int
  - rpe: String
  - completed: boolean
  - skipped: boolean
}

class Meal {
  - id: UUID
  - date: Date
  - mealType: String
  - description: String
  - approximateQuantity: String
  - calories: float
  - protein: float
  - photo: String
  - comment: String
  - coachFeedback: String
  - reviewed: boolean
}

class WeightLog {
  - id: UUID
  - date: Date
  - weight: float
  - comment: String
}

class BodyMeasurement {
  - id: UUID
  - date: Date
  - waist: float
  - chest: float
  - arm: float
  - leg: float
  - hip: float
  - comment: String
}

class ProgressPhoto {
  - id: UUID
  - date: Date
  - type: PhotoType
  - url: String
}

class Note {
  - id: UUID
  - date: Date
  - title: String
  - content: String
  - type: NoteType
  - read: boolean
}

class Alert {
  - id: UUID
  - cause: String
  - date: Date
  - handled: boolean
}

User <|-- Coach
User <|-- Athlete
User "1" -- "0..*" RefreshToken : issues >

UserFactory <|-- CoachFactory
UserFactory <|-- AthleteFactory
CoachFactory ..> Coach : creates >
AthleteFactory ..> Athlete : creates >

Coach "0..1" o-- "0..*" Athlete : manages >
Coach "0..1" -- "0..*" Exercise : contributes >
MuscleGroup "1" -- "0..*" Exercise : classifies >
Coach "1" -- "0..*" Routine : creates >
Coach "1" -- "0..*" Note : writes >

Routine "1" *-- "1..*" RoutineDay : contains >
RoutineDay "1" *-- "1..*" RoutineExercise : contains >
RoutineExercise --> "1" Exercise : is planned from >

Athlete "1" -- "0..*" RoutineAssignment : has >
RoutineAssignment --> "1" Routine : refers to >

Athlete "1" -- "0..*" TrainingSession : logs >
TrainingSession "1" *-- "1..*" PerformedSet : contains >
TrainingSession --> "1" RoutineDay : based on >
PerformedSet --> "1" RoutineExercise : corresponds to >

Athlete "1" -- "0..*" Meal : logs >
Athlete "1" -- "0..*" WeightLog : logs >
Athlete "1" -- "0..*" BodyMeasurement : logs >
Athlete "1" -- "0..*" ProgressPhoto : uploads >
Athlete "1" -- "0..*" Alert : triggers >

Note --> "1" Athlete : about >

User ..> Role
Athlete ..> Sex
Athlete ..> ExperienceLevel
Athlete ..> AthleteStatus
MuscleGroup ..> MuscleRegion
TrainingSession ..> SessionStatus
ProgressPhoto ..> PhotoType
Note ..> NoteType

note right of RoutineAssignment
  Una sola activa por atleta;
  las anteriores, inactivas (historial).
end note

note right of Athlete
  Pendiente PO: umbrales de
  NEEDS_REVIEW.
end note
@enduml
```
