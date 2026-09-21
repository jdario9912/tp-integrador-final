# DER — Mermaid (`erDiagram`)

App de Entrenadores y Atletas · 33 tablas · BCNF · PostgreSQL

```mermaid
erDiagram
    %% ============ A · IDENTIDAD, ROLES Y ACCESO ============
    ROLES ||--o{ USUARIOS : clasifica
    USUARIOS ||--o| ENTRENADORES : "especializa (PK=FK)"
    USUARIOS ||--o| ATLETAS : "especializa (PK=FK)"
    USUARIOS ||--o{ REFRESH_TOKENS : emite
    USUARIOS ||--o{ TOKENS_RECUPERACION : solicita
    ENTRENADORES ||--o{ ATLETAS : gestiona
    SEXOS ||--o{ ATLETAS : clasifica
    NIVELES_EXPERIENCIA ||--o{ ATLETAS : clasifica
    ESTADOS_ATLETA ||--o{ ATLETAS : clasifica

    %% ============ B · PLANIFICACION ============
    ENTRENADORES ||--o{ RUTINAS : crea
    ENTRENADORES ||--o{ EJERCICIOS_CATALOGO : "aporta (NULL = global)"
    ENTRENADORES ||--o{ ASIGNACIONES_RUTINA : "asigna (asignada_por)"
    RUTINAS ||--|{ DIAS_RUTINA : contiene
    DIAS_RUTINA ||--|{ EJERCICIOS_RUTINA : contiene
    GRUPOS_MUSCULARES ||--o{ EJERCICIOS_CATALOGO : clasifica
    EJERCICIOS_CATALOGO ||--o{ EJERCICIOS_RUTINA : "se planifica en"
    ATLETAS ||--o{ ASIGNACIONES_RUTINA : recibe
    RUTINAS ||--o{ ASIGNACIONES_RUTINA : "se asigna en"

    %% ============ C · EJECUCION REGISTRADA ============
    ATLETAS ||--o{ SESIONES_ENTRENAMIENTO : registra
    DIAS_RUTINA ||--o{ SESIONES_ENTRENAMIENTO : "es el plan de"
    ASIGNACIONES_RUTINA ||--o{ SESIONES_ENTRENAMIENTO : "encuadra"
    ESTADOS_SESION ||--o{ SESIONES_ENTRENAMIENTO : clasifica
    ENTRENADORES ||--o{ SESIONES_ENTRENAMIENTO : "revisa (revisado_por)"
    SESIONES_ENTRENAMIENTO ||--|{ SERIES_REALIZADAS : contiene
    EJERCICIOS_RUTINA ||--o{ SERIES_REALIZADAS : "es el plan de"

    %% ============ D · ALIMENTACION ============
    ATLETAS ||--o{ COMIDAS : registra
    TIPOS_COMIDA ||--o{ COMIDAS : clasifica
    ENTRENADORES ||--o{ COMIDAS : "revisa (revisado_por)"
    COMIDAS ||--o{ COMIDA_DETALLE : desglosa
    ALIMENTOS ||--o{ COMIDA_DETALLE : "aparece en"

    %% ============ E · PROGRESO FISICO ============
    ATLETAS ||--o{ REGISTROS_PESO : registra
    ATLETAS ||--o{ MEDIDAS_REGISTRO : registra
    MEDIDAS_REGISTRO ||--|{ MEDIDA_VALORES : detalla
    TIPOS_MEDIDA ||--o{ MEDIDA_VALORES : define
    ATLETAS ||--o{ FOTOS_PROGRESO : sube
    TIPOS_FOTO ||--o{ FOTOS_PROGRESO : clasifica

    %% ============ F · COMUNICACION Y ALERTAS ============
    ATLETAS ||--o{ NOTAS : "es sujeto de"
    ENTRENADORES ||--o{ NOTAS : "escribe (autor_id)"
    TIPOS_NOTA ||--o{ NOTAS : clasifica
    ATLETAS ||--o{ ALERTAS : genera
    TIPOS_ALERTA ||--o{ ALERTAS : tipifica
    SEVERIDADES ||--o{ TIPOS_ALERTA : gradua
    ENTRENADORES ||--o{ ALERTAS : "atiende (atendida_por)"

    %% ==================== TABLAS ====================
    ROLES {
        smallint id PK
        varchar codigo UK "ENTRENADOR | ATLETA"
        varchar nombre
        varchar descripcion "NULL"
    }
    USUARIOS {
        uuid id PK
        smallint rol_id FK
        varchar nombre
        varchar apellido
        varchar email UK
        char password_hash "BCrypt(60)"
        varchar telefono "NULL"
        boolean activo
        timestamptz fecha_registro
        timestamptz fecha_actualizacion
        timestamptz ultimo_acceso "NULL"
    }
    ENTRENADORES {
        uuid usuario_id PK_FK "ON DELETE CASCADE"
        varchar especialidad "NULL"
        varchar matricula UK "NULL"
        text biografia "NULL"
    }
    ATLETAS {
        uuid usuario_id PK_FK "ON DELETE CASCADE"
        uuid entrenador_id FK
        smallint sexo_id FK "NULL"
        smallint nivel_id FK "NULL"
        smallint estado_id FK
        date fecha_nacimiento "NULL"
        numeric altura_cm "NULL"
        numeric peso_inicial_kg "NULL"
        varchar objetivo "NULL"
        text lesiones "NULL"
        text limitaciones "NULL"
        smallint dias_disponibles "NULL"
        date fecha_inicio
    }
    REFRESH_TOKENS {
        uuid id PK
        uuid usuario_id FK
        char token_hash UK "SHA-256"
        timestamptz emitido_en
        timestamptz expira_en
        boolean revocado
    }
    TOKENS_RECUPERACION {
        uuid id PK
        uuid usuario_id FK
        char token_hash UK
        timestamptz expira_en
        timestamptz usado_en "NULL"
    }
    SEXOS {
        smallint id PK
        varchar codigo UK
        varchar nombre
    }
    NIVELES_EXPERIENCIA {
        smallint id PK
        varchar codigo UK
        varchar nombre
        smallint orden
    }
    ESTADOS_ATLETA {
        smallint id PK
        varchar codigo UK
        varchar nombre
        boolean requiere_atencion
    }

    RUTINAS {
        uuid id PK
        uuid entrenador_id FK
        varchar nombre UK "UNIQUE(entrenador_id, nombre)"
        text descripcion "NULL"
        varchar objetivo "NULL"
        smallint dias_por_semana
        smallint duracion_semanas "NULL"
        boolean es_plantilla
        timestamptz fecha_creacion
    }
    DIAS_RUTINA {
        uuid id PK
        uuid rutina_id FK "ON DELETE CASCADE"
        smallint numero_dia UK "UNIQUE(rutina_id, numero_dia)"
        varchar nombre
        text notas "NULL"
    }
    EJERCICIOS_CATALOGO {
        uuid id PK
        smallint grupo_muscular_id FK
        uuid creado_por FK "NULL = global"
        varchar nombre UK
        text descripcion "NULL"
        varchar url_video "NULL"
    }
    GRUPOS_MUSCULARES {
        smallint id PK
        varchar codigo UK
        varchar nombre
        varchar region
    }
    EJERCICIOS_RUTINA {
        uuid id PK
        uuid dia_rutina_id FK "ON DELETE CASCADE"
        uuid ejercicio_id FK
        smallint orden UK "UNIQUE(dia_rutina_id, orden)"
        smallint series
        smallint reps_min "1FN: rango descompuesto"
        smallint reps_max "NULL"
        numeric peso_recomendado_kg "NULL"
        smallint descanso_seg
        varchar rir_rpe "NULL"
        varchar tempo "NULL"
        text nota_tecnica "NULL"
    }
    ASIGNACIONES_RUTINA {
        uuid id PK
        uuid atleta_id FK
        uuid rutina_id FK
        uuid asignada_por FK
        date fecha_asignacion
        date fecha_inicio
        date fecha_fin "NULL"
        boolean activa "indice unico parcial WHERE activa"
        text observaciones "NULL"
    }

    SESIONES_ENTRENAMIENTO {
        uuid id PK
        uuid atleta_id FK
        uuid dia_rutina_id FK "NULL"
        uuid asignacion_id FK "NULL"
        smallint estado_id FK
        uuid revisado_por FK "NULL"
        date fecha
        timestamptz hora_inicio
        timestamptz hora_fin "NULL"
        text comentario_atleta "NULL"
        smallint sensacion_general "NULL (1-5)"
        text observacion_entrenador "NULL"
        timestamptz fecha_revision "NULL"
    }
    ESTADOS_SESION {
        smallint id PK
        varchar codigo UK
        varchar nombre
        boolean es_final
    }
    SERIES_REALIZADAS {
        uuid id PK
        uuid sesion_id FK "ON DELETE CASCADE"
        uuid ejercicio_rutina_id FK
        smallint numero_serie UK "UNIQUE(sesion_id, ejercicio_rutina_id, numero_serie)"
        numeric peso_kg "NULL"
        smallint repeticiones "NULL"
        varchar rpe "NULL"
        boolean completada
        varchar motivo_omision "NULL"
        text comentario "NULL"
    }

    COMIDAS {
        uuid id PK
        uuid atleta_id FK
        smallint tipo_comida_id FK
        uuid revisado_por FK "NULL"
        date fecha
        time hora "NULL"
        text descripcion
        varchar url_foto "NULL"
        text comentario_atleta "NULL"
        text observacion_entrenador "NULL"
        timestamptz fecha_revision "NULL"
    }
    TIPOS_COMIDA {
        smallint id PK
        varchar codigo UK
        varchar nombre
        smallint orden_dia
    }
    COMIDA_DETALLE {
        uuid comida_id PK_FK
        uuid alimento_id PK_FK
        numeric cantidad_g "2FN: depende de la clave completa"
    }
    ALIMENTOS {
        uuid id PK
        varchar nombre UK
        numeric porcion_referencia_g
        numeric calorias_kcal "NULL"
        numeric proteinas_g "NULL"
        numeric carbohidratos_g "NULL"
        numeric grasas_g "NULL"
    }

    REGISTROS_PESO {
        uuid id PK
        uuid atleta_id FK
        date fecha UK "UNIQUE(atleta_id, fecha)"
        numeric peso_kg
        text comentario "NULL"
    }
    MEDIDAS_REGISTRO {
        uuid id PK
        uuid atleta_id FK
        date fecha UK "UNIQUE(atleta_id, fecha)"
        numeric porcentaje_grasa "NULL"
        text comentario "NULL"
    }
    MEDIDA_VALORES {
        uuid medida_registro_id PK_FK
        smallint tipo_medida_id PK_FK
        char lado PK "I | D | U"
        numeric valor_cm "1FN: reemplaza 8 columnas"
    }
    TIPOS_MEDIDA {
        smallint id PK
        varchar codigo UK
        varchar nombre
        varchar unidad
        boolean bilateral
    }
    FOTOS_PROGRESO {
        uuid id PK
        uuid atleta_id FK
        smallint tipo_foto_id FK
        date fecha UK "UNIQUE(atleta_id, tipo_foto_id, fecha)"
        varchar url
        varchar nombre_archivo "NULL"
        varchar content_type "NULL"
        bigint tamanio_bytes "NULL"
        text comentario "NULL"
    }
    TIPOS_FOTO {
        smallint id PK
        varchar codigo UK
        varchar nombre
    }

    NOTAS {
        uuid id PK
        uuid atleta_id FK
        uuid autor_id FK
        smallint tipo_nota_id FK
        varchar titulo
        text contenido
        timestamptz fecha
        timestamptz fecha_lectura "NULL — 3FN: leida es derivado"
    }
    TIPOS_NOTA {
        smallint id PK
        varchar codigo UK
        varchar nombre
        boolean visible_atleta "3FN: depende del tipo"
    }
    ALERTAS {
        uuid id PK
        uuid atleta_id FK
        smallint tipo_alerta_id FK
        uuid atendida_por FK "NULL"
        varchar mensaje
        timestamptz fecha_generacion
        timestamptz fecha_atencion "NULL"
    }
    TIPOS_ALERTA {
        smallint id PK
        varchar codigo UK
        smallint severidad_id FK "3FN: depende del tipo"
        varchar nombre
        varchar plantilla_mensaje
        smallint umbral_dias "NULL"
    }
    SEVERIDADES {
        smallint id PK
        varchar codigo UK
        varchar nombre
        smallint orden
    }
```
