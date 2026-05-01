#!/bin/bash

# OpenContext Build Script
# Packages the project into a single executable using PyInstaller.

set -e

echo "=== OpenContext Build Script ==="

# 1. Dependency Check
echo "--> Checking for python3..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not found. Please install Python 3."
    exit 1
fi

# 2. Use existing venv if available, otherwise create one
VENV_PYTHON=""
if [ -f ".venv/bin/python3" ]; then
    echo "--> Using existing .venv..."
    VENV_PYTHON=".venv/bin/python3"
elif command -v uv &> /dev/null; then
    echo "--> Creating venv with uv..."
    uv venv .venv
    uv sync
    VENV_PYTHON=".venv/bin/python3"
else
    echo "--> Using pip to install..."
    python3 -m pip install -e .
fi

PYTHON_BIN=${VENV_PYTHON:-python3}
PYINSTALLER_CMD=${VENV_PYTHON:+.venv/bin/}:pyinstaller

# 3. Install PyInstaller if not present
if ! $PYTHON_BIN -c "import PyInstaller" 2>/dev/null; then
    echo "--> Installing PyInstaller..."
    $PYTHON_BIN -m pip install pyinstaller
fi

# 4. Clean up previous builds
echo "--> Cleaning up previous build directories..."
rm -rf dist/ build/

# 5. Run PyInstaller build
echo "--> Starting application build with PyInstaller..."
$PYTHON_BIN -m PyInstaller --clean --noconfirm --log-level INFO opencontext.spec

# 6. Verify build and package
echo "--> Verifying build output..."
EXECUTABLE_NAME="main" # As defined in the original script
ONEDIR_EXECUTABLE="dist/$EXECUTABLE_NAME/$EXECUTABLE_NAME"
ONEDIR_EXECUTABLE_WIN="dist/$EXECUTABLE_NAME/$EXECUTABLE_NAME.exe"

if [ -f "$ONEDIR_EXECUTABLE" ]; then
    BUILT_EXECUTABLE="$ONEDIR_EXECUTABLE"
elif [ -f "$ONEDIR_EXECUTABLE_WIN" ]; then
    BUILT_EXECUTABLE="$ONEDIR_EXECUTABLE_WIN"
else
    BUILT_EXECUTABLE=""
fi

if [ -n "$BUILT_EXECUTABLE" ]; then
    echo "✅ Build successful!"

    # Ad-hoc sign for macOS to avoid Gatekeeper issues
    if [[ "$OSTYPE" == "darwin"* ]] && [ -f "$BUILT_EXECUTABLE" ]; then
        echo "--> Performing ad-hoc sign for macOS executable..."
        codesign -s - --force --all-architectures --timestamp=none --deep "$BUILT_EXECUTABLE" 2>/dev/null || {
            echo "⚠️ Warning: Ad-hoc signing failed. The app might still run, but you may see security warnings."
        }
    fi

    echo "--> Executable is available in the 'dist/' directory."
    ls -la dist/

    # Copy config directory
    if [ -d "config" ]; then
        echo "--> Copying 'config' directory to 'dist/'..."
        cp -r config dist/
        echo "✅ Config directory copied."
    else
        echo "⚠️ Warning: 'config' directory not found."
    fi

    echo
    echo "✅ Build complete!"
    echo
    echo "To run:"
    if [ -f "$ONEDIR_EXECUTABLE" ]; then
        echo "  cd dist/main && ./main start"
    else
        echo "  cd dist/main && main.exe start"
    fi
    echo
    echo "Options: --port 9000 | --host 0.0.0.0 | --config config/config.yaml"
    echo
else
    echo "❌ Build failed. Check the PyInstaller logs above for errors."
    exit 1
fi
