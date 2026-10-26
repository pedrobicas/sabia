# Imagem única com front-end e back-end: o Spring Boot serve o Angular.

# 1) Build do front-end
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# 2) Build do back-end, com o front-end dentro de src/main/resources/static
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -B -q dependency:go-offline || true
COPY backend/src ./src
COPY --from=frontend /app/frontend/dist/frontend/browser/ ./src/main/resources/static/
RUN mvn -B -q package -DskipTests

# 3) Imagem final, só com o Java e o .jar
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN groupadd --system sabia && useradd --system --gid sabia sabia
COPY --from=backend /app/backend/target/sabia-*.jar app.jar
USER sabia
EXPOSE 8080
# SerialGC e MaxRAMPercentage ajudam a caber nos 512 MB dos planos gratuitos.
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseSerialGC -Djava.awt.headless=true"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
