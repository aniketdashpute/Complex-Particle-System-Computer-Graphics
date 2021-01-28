// Basic init code
// Render blue screen using canvas element

function main()
{
    // Get the canvas element to draw using WebGL
    const canvas = document.getElementById("glCanvas");
    // Initialize GL context
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

    // Only continue if WebGL is available and working
    if (gl == null)
    {
        console.log("Failed to get rendering context for WebGL");
        alert("Unable to initialize WebGL. Your browser or machine may not support it.");
        return;
    }

    // Set clear color to blue, fully opaque
    gl.clearColor(0.6, 0.0, 0.6, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);
}

window.onload = main();