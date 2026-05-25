# Multi-stage build: build Spring Boot jar (includes frontend copied via Maven)
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy backend sources
COPY backend/pom.xml backend/pom.xml
COPY backend/src backend/src

# Copy frontend (used by maven-resources-plugin execution)
COPY frontend frontend

WORKDIR /app/backend
RUN mvn -DskipTests package

# Runtime image
FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/backend/target/inventory-management-0.0.1-SNAPSHOT.jar /app/app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
