# Universidad Tecnológica Nacional

## Tecnicatura Universitaria en Programación

**Trabajo Práctico Integrador Final**

**Alumnos:**

- Alexis Da Silva
- Joel Dario Muñoz

## Descripción del proyecto

**Plataforma de Gestión Deportiva**: una aplicación web centralizada para entrenadores personales y sus atletas, que reemplaza el seguimiento en hojas de Excel individuales por un único espacio de gestión.

- **Entrenador**: administra su cartera de atletas, crea y asigna rutinas, y sigue la evolución de cada atleta (entrenamientos, alimentación, peso y fotos de progreso) desde un panel propio.
- **Atleta**: consulta su rutina, registra sus entrenamientos en tiempo real, carga sus comidas y su peso, y ve su progreso desde una interfaz simple y adaptada al celular.

La solución sigue una arquitectura cliente-servidor: una API REST en Java con Spring Boot y PostgreSQL, y un frontend en React + TypeScript con Vite y Tailwind CSS.

## Estructura del repositorio

| Carpeta                            | Contenido                                                     | Repositorio                                                       |
| ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`backend/`](backend/README.md)    | API REST (Spring Boot, PostgreSQL, JWT)                       | [tpif-backend](https://github.com/jdario9912/tpif-backend)   |
| [`frontend/`](frontend/README.md)  | Aplicación web (React, TypeScript, Vite, Tailwind CSS)        | [tpif-frontend](https://github.com/jdario9912/tpif-frontend) |
| [`documentacion/`](documentacion/) | Definición de la problemática, propuesta técnica, DER y UML   | —                                                                 |

`backend/` y `frontend/` se sincronizan automáticamente desde sus repositorios mediante `git subtree` (ver `.github/workflows/`).

Para la puesta en marcha de cada parte, consultar su README:

- [README del backend](backend/README.md)
- [README del frontend](frontend/README.md)
