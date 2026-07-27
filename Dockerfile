# Build Stage
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run Stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
# Install Python 3
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
# Copy the compiled Spring Boot jar
COPY --from=build /app/target/puzzle-app-1.0.0.jar app.jar
# Copy the Python solver script to the runtime directory
COPY solver.py .
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
