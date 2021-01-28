// Basic init code
// Render blue screen using canvas element

function main()
{
    // Get the canvas element to draw using WebGL
    const canvas = document.getElementById("glCanvas");
    // Initialize GL context
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

    // Only continue if WebGL is available and working
    if (null == gl)
    {
        console.log("main() Failed to get rendering context for WebGL");
        return;
    }

    // Set clear color to black, fully opaque
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    // get the vertex and fragment shader strings
    var vsSource = document.getElementById("vertex-shader").textContent;
    var fsSource = document.getElementById("fragment-shader").textContent;
    // Initialize shaders
    if (!initShaders(gl, vsSource, fsSource))
    {
		console.log('main() Failed to intialize shaders.');
		return;
    }
    
    // Write the positions of vertices to a vertex shader
    var n = initVertexBuffers(gl);
    if (n < 0)
    {
        console.log('Failed to set the positions of the vertices');
        return;
    }

    // Draw the triangle
    draw(gl, n);
}

function initVertexBuffers(gl)
{
    // array of vertex positions collection of (x,y,z)'s
    var vertices = new Float32Array ([
       0.0,  0.5, 0.5,
      -0.5, -0.5, 0.5,
       0.5, -0.8, 0.5
    ]);

    // # vertices
    var n = 3;

    // # bytes per floating-point value;
    FSIZE = vertices.BYTES_PER_ELEMENT;
    
    // Create a buffer object
    var vertexBuffer = gl.createBuffer();
    if (!vertexBuffer)
    {
        console.log('Failed to create the buffer object');
        return -1;
    }
  
    // Bind the buffer object to target (gl.ARRAY_BUFFER = vertexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Write data into the buffer object (vertexBuffer.data = vertices)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
    // Assign the buffer object to a_Position variable
    var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if(a_Position < 0)
    {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    // specify the layout of the vertex buffer
    gl.vertexAttribPointer(a_Position, 
                            3,  // # of values in this attrib (1,2,3,4) 
                            gl.FLOAT, // data type (usually gl.FLOAT)
                            false,  // use integer normalizing? (usually false)
                            0,  // Stride: #bytes from 1st stored value to next 
                            0); // Offiset; #bytes from start of buffer to the
                                // 1st stored attrib value we will actually use.                                      
                                
    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);
  
    return n;
}

function draw(gl, n)
{
    // specify the colour that we want for clearing
    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT);
  
    // Draw the rectangle
    gl.drawArrays(gl.TRIANGLES, 0, n);
}

window.onload = main();