# Guía de contribución

Este documento define las convenciones a seguir al contribuir en este repositorio.

## Flujo de trabajo

Este proyecto sigue [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow):

1. Crea una rama a partir de `main`.
2. Realiza tus cambios en commits pequeños y descriptivos.
3. Abre un Pull Request hacia `main`.
4. Una vez aprobado y pasando las validaciones, se mergea a `main`.

## Convención de ramas

El nombre de la rama debe seguir el formato `tipo/descripcion-corta`, usando el mismo listado de tipos que los mensajes de commit:

- `feature/` — nueva funcionalidad.
- `fix/` — corrección de errores.
- `config/` — configuración del proyecto (herramientas, dependencias, build, etc).
- `style/` — cambios de estilos/UI que no afectan la lógica.
- `docs/` — documentación.
- `refactor/` — refactorización sin cambio de comportamiento.
- `perf/` — mejoras de rendimiento.
- `test/` — agregar o corregir tests.
- `chore/` — tareas varias de mantenimiento.

La descripción debe ir en minúsculas y usando guiones medios. Ejemplo:

```
feature/vite-react-tailwind-setup
fix/login-validation
```

## Idioma del código

- Nombres de variables, funciones, clases, componentes, archivos y carpetas: **en inglés**.
- El código debe leerse como inglés natural, evitando mezclar idiomas en los identificadores.

## Comentarios y documentación

- Los comentarios en el código y la documentación (README, este archivo, etc.) deben escribirse **en castellano**.
- Comenta solo cuando el _por qué_ no sea obvio (una restricción, un workaround, una decisión no evidente). Evita comentar lo que el código ya expresa por sí mismo.

## Mensajes de commit

Los commits deben seguir [Conventional Commits](https://www.conventionalcommits.org/) y pasan por un hook de `commit-msg` (husky + commitlint) que valida automáticamente el formato:

```
tipo: descripción
```

Tipos permitidos (ver `commitlint.config.js`): `feat`, `fix`, `config`, `style`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

- La descripción puede escribirse **en castellano o en inglés**, de forma consistente dentro del mismo commit.
- Antes de cada commit se ejecuta un hook de `pre-commit` (husky + lint-staged) que corre `prettier` y `oxlint` sobre los archivos modificados.

Ejemplos válidos:

```
feat: agregar formulario de login
fix: corregir validación de email
config: add husky pre-commit hooks
```

## Pull Requests

- El título del PR debe ser claro y resumir el cambio en una línea.
- La descripción debe explicar **qué** cambia y **por qué**, incluyendo contexto relevante para quien lo revisa (capturas, pasos de prueba, consideraciones especiales, etc.).
- Si el PR resuelve un Issue existente, vinculalo usando una palabra clave de cierre de GitHub en la descripción (por ejemplo `Closes #123`, `Fixes #123` o `Resolves #123`). Esto cierra el Issue automáticamente al mergear el PR.
- Si el PR está relacionado con un Issue pero no lo resuelve por completo, mencionalo sin palabra clave de cierre (por ejemplo `Relacionado a #123`).
- Si no existe un Issue asociado, no es obligatorio crear uno, salvo que el cambio sea lo suficientemente grande o relevante como para justificar su seguimiento.
- Si el Issue vive en otro repositorio, usá el formato `organización/repositorio#número` (por ejemplo `Closes mi-org/tpif-backend#45`).

Ejemplo de descripción de PR que vincula un Issue de otro repositorio:

```
## Descripción

Se agrega validación del lado del cliente para el formulario de login.

Closes mi-org/tpif-backend#45
```

## Testing

- **Unit tests**: obligatorios para lógica de negocio, hooks, utilidades y componentes con comportamiento no trivial.
- **E2E tests**: obligatorios para flujos críticos de usuario (ej. login, checkout, formularios principales).
- No es necesario testear componentes puramente presentacionales sin lógica.
- Todo Pull Request que agregue o modifique comportamiento debe incluir o actualizar los tests correspondientes.
