# webainimtest1
Web animation test 1

## Running the Three.js Object Viewer

To view and interact with this 3D scene:

1.  **Ensure you have a local web server.**
    If you have Python installed, you can use its built-in HTTP server.
    *   Open your terminal or command prompt.
    *   Navigate to the root directory of this project (where `index.html` is located).
    *   For Python 3, run: `python -m http.server`
    *   For Python 2, run: `python -m SimpleHTTPServer`
    This will typically start a server on `http://localhost:8000`.

2.  **Open the application in your browser.**
    *   Open your web browser (e.g., Chrome, Firefox, Edge).
    *   Go to the address `http://localhost:8000` (or the port your server is running on).

    **Note**: `main.js` uses ES6 module features (like `import`). The `script` tag in `index.html` that loads `main.js` must include the `type="module"` attribute for it to work correctly. This has been pre-configured in the provided `index.html`.

3.  **View the Scene.**
    *   You should see the `Shadowed_Gaze.obj` model rotating in the center of the page.
    *   You can use your mouse to orbit around the object (thanks to OrbitControls).

**Why use a local server?**
Modern browsers have security restrictions (CORS policies) that can prevent loading external files (like the `.obj` model or JavaScript modules) when an HTML file is opened directly from the local filesystem (using `file:///...`). A local server serves the files over HTTP, bypassing these restrictions for local development.
