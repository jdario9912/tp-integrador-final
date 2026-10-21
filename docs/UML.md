# Diagrama de Clases UML — App de Gestión Deportiva

TP Final · versión 1.1
Modelo de dominio derivado de la hoja de *Requerimientos de Diseño* y del *Product Backlog*.

Las clases `User`, `Coach`, `Athlete` y `RefreshToken` reflejan el código implementado en `com.gestion_deportiva.api.model`. El resto de las clases todavía es diseño y puede cambiar al implementarse.

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
| + normalizeEmail(email: String) *{static}* | String |
| + fullName() | String |
| + changeEmail(newEmail: String) | void |
| + changePassword(newPasswordHash: String) | void |
| + recordLogin(at: Instant) | void |
| + deactivate() | void |
| + reactivate() | void |

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
| + assignCoach(newCoach: Coach) | void |
| + unassignCoach() | void |
| + changeStatus(newStatus: AthleteStatus) | void |
| + setAvailableDays(days: Short) | void |
| + age(today: LocalDate) | OptionalInt |

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

### Routine
`− id: UUID`, `− name: String`, `− goal: String`, `− startDate: Date`, `− endDate: Date`, `− daysPerWeek: int`, `+ addDay(day): void`

### RoutineDay
`− id: UUID`, `− dayNumber: int`, `− name: String`, `+ addExercise(exercise): void`

### RoutineExercise
`− id: UUID`, `− name: String`, `− sortOrder: int`, `− sets: int`, `− reps: int`, `− recommendedWeight: float`, `− rest: int`, `− rirRpe: String`, `− techniqueNote: String`

### RoutineAssignment
`− id: UUID`, `− assignmentDate: Date`, `− active: boolean`

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
- **SessionStatus**: IN_PROGRESS, FINISHED
- **PhotoType**: FRONT, SIDE, BACK
- **NoteType**: PRIVATE, VISIBLE_TO_ATHLETE

---

## 2. Relaciones

| Origen | Tipo | Destino | Multiplicidad | Etiqueta |
|---|---|---|---|---|
| User | generalización | Coach, Athlete | — | inheritance |
| User | asociación | RefreshToken | 1 → 0..* | issues |
| Coach | agregación | Athlete | 0..1 → 0..* | manages |
| Coach | asociación | Routine | 1 → 0..* | creates |
| Coach | asociación | Note | 1 → 0..* | writes |
| Routine | composición | RoutineDay | 1 → 1..* | contains |
| RoutineDay | composición | RoutineExercise | 1 → 1..* | contains |
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
- ¿Una única rutina activa por atleta o varias simultáneas + historial?
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
  + {static} normalizeEmail(email: String): String
  + fullName(): String
  + changeEmail(newEmail: String): void
  + changePassword(newPasswordHash: String): void
  + recordLogin(at: Instant): void
  + deactivate(): void
  + reactivate(): void
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
  + assignCoach(newCoach: Coach): void
  + unassignCoach(): void
  + changeStatus(newStatus: AthleteStatus): void
  + setAvailableDays(days: Short): void
  + age(today: LocalDate): OptionalInt
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

class Routine {
  - id: UUID
  - name: String
  - goal: String
  - startDate: Date
  - endDate: Date
  - daysPerWeek: int
  + addDay(day): void
}

class RoutineDay {
  - id: UUID
  - dayNumber: int
  - name: String
  + addExercise(exercise): void
}

class RoutineExercise {
  - id: UUID
  - name: String
  - sortOrder: int
  - sets: int
  - reps: int
  - recommendedWeight: float
  - rest: int
  - rirRpe: String
  - techniqueNote: String
}

class RoutineAssignment {
  - id: UUID
  - assignmentDate: Date
  - active: boolean
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

Coach "0..1" o-- "0..*" Athlete : manages >
Coach "1" -- "0..*" Routine : creates >
Coach "1" -- "0..*" Note : writes >

Routine "1" *-- "1..*" RoutineDay : contains >
RoutineDay "1" *-- "1..*" RoutineExercise : contains >

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
TrainingSession ..> SessionStatus
ProgressPhoto ..> PhotoType
Note ..> NoteType

note right of RoutineAssignment
  Pendiente PO: ¿una única rutina activa
  o varias simultáneas + historial?
end note

note right of Athlete
  Pendiente PO: umbrales de
  NEEDS_REVIEW.
end note
@enduml
```
