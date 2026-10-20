# Universidad Tecnológica Nacional

### Tecnicatura Universitaria en Programación

**Alumnos**:

- Alexis
- Joel

**Ejecución**

Crear el archivo `.env` basado en `.env.example` y completar las variables de entorno

```shell
cp .env.example .env
```

Construir y ejecutar el contenedor de la API

```shell
docker compose up -d --build
```

Probar el endpoint del healt check

```shell
curl http://localhost:8080/actuator/health
```
**Desarrollo local (solo la base de datos en Docker)**

Para desarrollar no hace falta levantar el contenedor de la app: alcanza con levantar solo el servicio `postgres` del `docker-compose.yml` y correr la API desde el IDE o con Gradle.

1. Levantar solo la base de datos

```shell
docker compose up -d postgres
```

2. Verificar que el contenedor esté `healthy`

```shell
docker compose ps postgres
```

3. Ejecutar la API localmente (perfil `dev`, se conecta a `localhost:5432`)

```shell
./gradlew bootRun
```

Spring no lee el archivo `.env`. Si en `.env` cambiaste usuario, contraseña, base o puerto respecto a los valores por defecto, exportá las variables antes de ejecutar la API (todas las variables del `.env` tienen que tener valor; una variable vacía pisa el valor por defecto de Spring):

```shell
set -a && source .env && set +a
./gradlew bootRun
```

Detener la base de datos

```shell
docker compose stop postgres
```

Borrar la base de datos y empezar de cero (elimina el volumen con los datos)

```shell
docker compose down -v
```
