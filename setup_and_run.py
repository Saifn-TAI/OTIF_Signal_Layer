import os
import subprocess
import sys
import venv
from pathlib import Path

def print_step(msg):
    print(f"\n{'='*60}\n[+] {msg}\n{'='*60}")

def main():
    root_dir = Path(__file__).parent.absolute()
    backend_dir = root_dir / "backend"
    frontend_dir = root_dir / "frontend"
    
    # 1. Setup Virtual Environment
    print_step("1. Setting up Python Virtual Environment")
    venv_dir = backend_dir / "venv"
    if not venv_dir.exists():
        print("Creating virtual environment in backend/venv...")
        venv.create(venv_dir, with_pip=True)
    else:
        print("Virtual environment already exists.")

    # Determine executable paths based on OS Support
    if os.name == 'nt': # Windows
        python_exe = venv_dir / "Scripts" / "python.exe"
        pip_exe = venv_dir / "Scripts" / "pip.exe"
        npm_cmd = "npm.cmd"
    else: # Mac/Linux
        python_exe = venv_dir / "bin" / "python"
        pip_exe = venv_dir / "bin" / "pip"
        npm_cmd = "npm"

    # 2. Install Backend Dependencies
    print_step("2. Installing Backend Dependencies (Python)")
    try:
        subprocess.check_call([str(pip_exe), "install", "-r", "requirements.txt"], cwd=backend_dir)
    except subprocess.CalledProcessError:
        print("\n[ERROR] Failed to install backend dependencies.")
        sys.exit(1)

    # 3. Install Frontend Dependencies
    print_step("3. Installing Frontend Dependencies (Node.js)")
    try:
        subprocess.check_call([npm_cmd, "install"], cwd=frontend_dir)
    except subprocess.CalledProcessError:
        print("\n[ERROR] Failed to install frontend dependencies.")
        sys.exit(1)

    # 4. Start Both Servers Concurrently
    print_step("4. Starting Servers...")
    print("Backend: http://localhost:8000")
    print("Frontend: http://localhost:5173")
    print("Press Ctrl+C to stop both servers.\n")

    # Start Backend (using the virtual environment's python directly)
    backend_process = subprocess.Popen(
        [str(python_exe), "-m", "uvicorn", "main:app", "--reload"],
        cwd=backend_dir
    )

    # Start Frontend
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=frontend_dir
    )

    try:
        # Keep script running while servers are alive
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print_step("Shutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Goodbye!")
        sys.exit(0)

if __name__ == "__main__":
    main()
