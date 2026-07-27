# 🧩 15-Puzzle Sliding Tile Game

A premium sliding tile puzzle game built with **Spring Boot (Java 17)** and integrated with an **A* AI Solver (Python)**. 

### 🚀 Live Demo
Play the game live here: **[https://puzzle-app-53uh.onrender.com](https://puzzle-app-53uh.onrender.com)**

---

## ✨ Features

- **🎮 Dynamic Difficulty Levels**:
  - **Easy (3×3 Grid / 8-Puzzle)**: A quick, classic puzzle size.
  - **Medium (4×4 Grid / 15-Puzzle)**: The standard slider layout.
  - **Hard (5×5 Grid / 24-Puzzle)**: A massive board for advanced challenge.
- **💡 AI Hints**: Get instant highlighting showing the next optimal tile to move.
- **🤖 Auto-Solve**: Watch the A* heuristic solver play and solve the puzzle step-by-step with smooth slide animations.
- **⏱️ Game Metrics**: Track your move counts, game timer, and **high scores (best moves)** kept separate for each difficulty level.
- **🎨 Glassmorphic Interface**: Sleek dark mode aesthetics, smooth gradients, pulsing hover cues, and animations.
- **📱 Fully Responsive**: Custom CSS layouts that scale tiles down dynamically to fit mobile devices perfectly.

---

## 🛠️ Tech Stack
- **Backend**: Spring Boot 3.3 (Java 17)
- **AI Solver**: Python 3 (using Weighted A* with Manhattan Distance + Linear Conflict heuristics)
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (Thymeleaf templates)
- **Deployment**: Dockerized container deployment on Render

---

## 📦 Running Locally

### 1. Prerequisites
- Java 17 or higher
- Python 3.11+

### 2. Startup
Clone the repo and run using the Maven wrapper:
```bash
# Clone the repository
git clone https://github.com/bishtprateek270-hue/puzzle-app.git
cd puzzle-app

# Run the Spring Boot application
./mvnw spring-boot:run
```
Open **[http://localhost:8081](http://localhost:8081)** in your browser.

### 3. Run with Docker
You can also run the prepackaged container environment:
```bash
# Build the Docker image
docker build -t puzzle-app .

# Run the container
docker run -p 8081:8081 puzzle-app
```
